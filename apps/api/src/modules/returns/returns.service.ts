import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ReturnRequest, ReturnStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { PaymentsService } from '../payments/payments.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReturnRequestDto } from './dto/create-return-request.dto';
import { ResolveAsRefundDto } from './dto/resolve-as-refund.dto';

// Extended to include order (for orderNumber) and account (for email) —
// both needed now that every status transition below queues a real
// customer notification (a gap found directly in Gap Analysis V: a real,
// multi-stage state machine that updated its own status on every
// transition but never told the customer any of it).
const RETURN_INCLUDE = {
  lineItems: { include: { orderLineItem: true } },
  order: { select: { orderNumber: true } },
  account: { select: { email: true } },
} as const;

@Injectable()
export class ReturnsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly paymentsService: PaymentsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Only a DELIVERED order can have a return requested against it —
  // that's the entire reason this workflow exists, distinct from
  // PaymentsService.cancelOrder, which only ever applies before
  // delivery. Each requested line item's quantity is checked against
  // what's actually still available to return: the line's own original
  // quantity, minus whatever quantity is already tied up in a PRIOR,
  // non-rejected return request against that same line — so a customer
  // can't request 3 units back on a return, have it approved, then
  // request the same 3 units again on a second request.
  async create(keycloakSub: string, email: string, dto: CreateReturnRequestDto): Promise<ReturnRequest> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { lineItems: true },
    });
    if (!order) {
      throw new NotFoundException(`Order '${dto.orderId}' not found`);
    }
    if (order.accountId !== account.id) {
      throw new ForbiddenException(`Order '${dto.orderId}' does not belong to your account`);
    }
    if (order.status !== 'DELIVERED') {
      throw new BadRequestException('Returns can only be requested for delivered orders');
    }

    for (const item of dto.lineItems) {
      const orderLineItem = order.lineItems.find((li) => li.id === item.orderLineItemId);
      if (!orderLineItem) {
        throw new BadRequestException(`Line item '${item.orderLineItemId}' does not belong to this order`);
      }

      const alreadyRequested = await this.prisma.returnLineItem.aggregate({
        where: { orderLineItemId: item.orderLineItemId, returnRequest: { status: { not: ReturnStatus.REJECTED } } },
        _sum: { quantity: true },
      });
      const availableToReturn = orderLineItem.quantity - (alreadyRequested._sum.quantity ?? 0);
      if (item.quantity > availableToReturn) {
        throw new BadRequestException(
          `Only ${availableToReturn} unit(s) of '${orderLineItem.productName}' are available to return`,
        );
      }
    }

    return this.prisma.returnRequest.create({
      data: {
        orderId: dto.orderId,
        accountId: account.id,
        reason: dto.reason,
        reasonDetail: dto.reasonDetail,
        lineItems: {
          create: dto.lineItems.map((li) => ({ orderLineItemId: li.orderLineItemId, quantity: li.quantity })),
        },
      },
      include: RETURN_INCLUDE,
    });
  }

  async findMine(keycloakSub: string, email: string) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.returnRequest.findMany({
      where: { accountId: account.id },
      include: RETURN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<ReturnRequest> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const request = await this.findByIdOrThrow(id);
    if (request.accountId !== account.id) {
      throw new ForbiddenException(`Return request '${id}' does not belong to your account`);
    }
    return request;
  }

  async findAllAdmin(status?: ReturnStatus) {
    return this.prisma.returnRequest.findMany({
      where: status ? { status } : undefined,
      include: RETURN_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneAdmin(id: string): Promise<ReturnRequest> {
    return this.findByIdOrThrow(id);
  }

  async approve(id: string, adminNote?: string): Promise<ReturnRequest> {
    const request = await this.requireStatus(id, ReturnStatus.REQUESTED);
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.APPROVED, adminNote },
      include: RETURN_INCLUDE,
    });
    await this.notifyStatusChanged(request, 'APPROVED');
    return updated;
  }

  // Rejectable from either REQUESTED (e.g. outside the return window,
  // rejected before the customer ships anything back) or RECEIVED (the
  // item arrived and inspection didn't support the claimed reason) — two
  // genuinely different rejection points, not the same thing, and both
  // real.
  async reject(id: string, adminNote: string): Promise<ReturnRequest> {
    const request = await this.findByIdOrThrow(id);
    if (request.status !== ReturnStatus.REQUESTED && request.status !== ReturnStatus.RECEIVED) {
      throw new BadRequestException(
        `Return request '${id}' cannot be rejected from its current status (${request.status})`,
      );
    }
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.REJECTED, adminNote },
      include: RETURN_INCLUDE,
    });
    await this.notifyStatusChanged(request, 'REJECTED');
    return updated;
  }

  async markReceived(id: string, adminNote?: string): Promise<ReturnRequest> {
    const request = await this.requireStatus(id, ReturnStatus.APPROVED);
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.RECEIVED, adminNote },
      include: RETURN_INCLUDE,
    });
    await this.notifyStatusChanged(request, 'RECEIVED');
    return updated;
  }

  // Actually processes a real refund via PaymentsService — not just a
  // status change. If the refund call throws, this method throws too,
  // and the return stays in RECEIVED rather than being marked REFUNDED
  // for money that was never actually returned. The notification is
  // queued only after the refund itself succeeds, for the same reason.
  async resolveAsRefund(id: string, dto: ResolveAsRefundDto): Promise<ReturnRequest> {
    const request = await this.requireStatus(id, ReturnStatus.RECEIVED);
    await this.paymentsService.refundForReturn(
      request.orderId,
      dto.refundAmount,
      `Return ${id} resolved via refund`,
    );
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.REFUNDED, refundAmount: dto.refundAmount, adminNote: dto.adminNote },
      include: RETURN_INCLUDE,
    });
    await this.notifyStatusChanged(request, 'REFUNDED');
    return updated;
  }

  // Deliberately does NOT create a new replacement order automatically
  // in this pass — marks the return resolved, but actually sending a
  // replacement is a manual step outside this system for now. A real,
  // stated scope boundary, not an oversight.
  async resolveAsReplacement(id: string, adminNote?: string): Promise<ReturnRequest> {
    const request = await this.requireStatus(id, ReturnStatus.RECEIVED);
    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: { status: ReturnStatus.REPLACED, adminNote },
      include: RETURN_INCLUDE,
    });
    await this.notifyStatusChanged(request, 'REPLACED');
    return updated;
  }

  // One shared helper rather than repeating the same three-line queue
  // call at the end of five different methods — the request fetched
  // BEFORE the update (via requireStatus/findByIdOrThrow, both already
  // using RETURN_INCLUDE) already carries the account email and order
  // number this needs, so no extra query.
  private async notifyStatusChanged(
    request: ReturnRequest & { order: { orderNumber: string }; account: { email: string } },
    newStatus: string,
  ): Promise<void> {
    await this.notificationsService.queueReturnStatusChanged({
      recipientEmail: request.account.email,
      orderNumber: request.order.orderNumber,
      newStatus,
    });
  }

  private async requireStatus(
    id: string,
    expected: ReturnStatus,
  ): Promise<ReturnRequest & { order: { orderNumber: string }; account: { email: string } }> {
    const request = await this.findByIdOrThrow(id);
    if (request.status !== expected) {
      throw new BadRequestException(
        `Return request '${id}' must be in ${expected} status for this action (currently ${request.status})`,
      );
    }
    return request;
  }

  private async findByIdOrThrow(
    id: string,
  ): Promise<ReturnRequest & { order: { orderNumber: string }; account: { email: string } }> {
    const request = await this.prisma.returnRequest.findUnique({ where: { id }, include: RETURN_INCLUDE });
    if (!request) {
      throw new NotFoundException(`Return request '${id}' not found`);
    }
    return request;
  }
}
