import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { RecurringOrderTemplate } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateRecurringOrderTemplateDto } from './dto/create-recurring-order-template.dto';
import { UpdateRecurringOrderTemplateDto } from './dto/update-recurring-order-template.dto';
import { CheckoutPaymentMethod } from '../orders/dto/checkout.dto';
import { computeNextRunAt } from '../../common/utils/recurring-schedule.util';

const TEMPLATE_INCLUDE = { items: { include: { product: true } } } as const;

@Injectable()
export class RecurringOrdersService {
  private readonly logger = new Logger(RecurringOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Trade-credit only — see RecurringOrderTemplate's own schema comment
  // for why (no human present for a PayFast redirect on an automatic
  // run). Requires an APPROVED trade credit account specifically, not
  // just any TradeCreditAccount row — mirrors the exact same
  // approvedAt check OrdersService.checkout and the checkout page's own
  // eligibility check already use, so a template can't be created for an
  // account whose application is still pending.
  async create(
    keycloakSub: string,
    email: string,
    dto: CreateRecurringOrderTemplateDto,
  ): Promise<RecurringOrderTemplate> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    await this.requireApprovedTradeCredit(account.id);

    for (const item of dto.items) {
      const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        throw new BadRequestException(`Product '${item.productId}' not found`);
      }
    }

    return this.prisma.recurringOrderTemplate.create({
      data: {
        accountId: account.id,
        name: dto.name,
        frequency: dto.frequency,
        shippingAddress: dto.shippingAddress as never,
        poNumber: dto.poNumber,
        nextRunAt: computeNextRunAt(dto.frequency, new Date()),
        items: { create: dto.items.map((i) => ({ productId: i.productId, quantity: i.quantity })) },
      },
      include: TEMPLATE_INCLUDE,
    });
  }

  async findMine(keycloakSub: string, email: string): Promise<RecurringOrderTemplate[]> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.recurringOrderTemplate.findMany({
      where: { accountId: account.id },
      include: TEMPLATE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<RecurringOrderTemplate> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const template = await this.findByIdOrThrow(id);
    if (template.accountId !== account.id) {
      throw new ForbiddenException(`Recurring order template '${id}' does not belong to your account`);
    }
    return template;
  }

  async update(
    keycloakSub: string,
    email: string,
    id: string,
    dto: UpdateRecurringOrderTemplateDto,
  ): Promise<RecurringOrderTemplate> {
    const template = await this.findOneForAccount(keycloakSub, email, id);

    if (dto.items) {
      for (const item of dto.items) {
        const product = await this.prisma.product.findUnique({ where: { id: item.productId } });
        if (!product) {
          throw new BadRequestException(`Product '${item.productId}' not found`);
        }
      }
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.items) {
        await tx.recurringOrderTemplateItem.deleteMany({ where: { templateId: id } });
        await tx.recurringOrderTemplateItem.createMany({
          data: dto.items.map((i) => ({ templateId: id, productId: i.productId, quantity: i.quantity })),
        });
      }

      return tx.recurringOrderTemplate.update({
        where: { id },
        data: {
          name: dto.name,
          poNumber: dto.poNumber,
          active: dto.active,
          shippingAddress: dto.shippingAddress as never,
          frequency: dto.frequency,
          // A frequency change reschedules from NOW, not from whenever
          // the template was originally created or last ran — a
          // customer switching from monthly to weekly clearly wants the
          // NEXT run to reflect that change, not to keep counting from
          // an old monthly anchor point.
          nextRunAt: dto.frequency ? computeNextRunAt(dto.frequency, new Date()) : template.nextRunAt,
        },
        include: TEMPLATE_INCLUDE,
      });
    });
  }

  async remove(keycloakSub: string, email: string, id: string): Promise<void> {
    await this.findOneForAccount(keycloakSub, email, id);
    await this.prisma.recurringOrderTemplate.delete({ where: { id } });
  }

  // Runs daily, not hourly like CartAbandonmentService — a recurring
  // order schedule is measured in weeks/months, so checking once a day
  // is more than enough resolution and doesn't re-scan every template
  // 24x as often as it needs to.
  //
  // One template's failure never stops the rest from processing — each
  // is wrapped in its own try/catch, same principle as
  // CartAbandonmentService's own per-cart loop not letting one bad
  // record halt the whole scan.
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async processRecurringOrders(): Promise<void> {
    const now = new Date();
    const due = await this.prisma.recurringOrderTemplate.findMany({
      where: { active: true, nextRunAt: { lte: now } },
      include: { account: true, items: { include: { product: true } } },
    });

    if (due.length === 0) return;

    let succeeded = 0;
    for (const template of due) {
      try {
        await this.runOne(template);
        succeeded += 1;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        this.logger.error(`Recurring order template '${template.id}' failed: ${message}`);
        // Rescheduled to the next cycle REGARDLESS of this failure —
        // not retried at the next cron tick. A persistently-failing
        // template (e.g. a discontinued product) would otherwise retry
        // every single day and spam the customer with daily failure
        // notifications instead of one per actual cycle.
        await this.prisma.recurringOrderTemplate.update({
          where: { id: template.id },
          data: { nextRunAt: computeNextRunAt(template.frequency, now), lastRunError: message },
        });
        await this.notificationsService.queueRecurringOrderFailed({
          recipientEmail: template.account.email,
          templateName: template.name,
          reason: message,
        });
      }
    }

    this.logger.log(`Processed ${due.length} due recurring order template(s), ${succeeded} succeeded.`);
  }

  // Adds the template's own items to the account's cart, then checks out
  // ONLY those specific cart items (via cartItemIds — the exact same
  // mechanism split checkout uses) rather than the whole cart. This
  // matters for real correctness, not just tidiness: if the customer
  // happens to have unrelated items already sitting in their own cart
  // when this runs, a whole-cart checkout would wrongly sweep those into
  // the automatic order too.
  private async runOne(
    template: RecurringOrderTemplate & {
      account: { keycloakSub: string; email: string };
      items: { productId: string; quantity: number }[];
    },
  ): Promise<void> {
    const priced = await this.cartService.bulkAddItems(template.account.keycloakSub, template.account.email, {
      items: template.items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    });

    const templateProductIds = new Set(template.items.map((i) => i.productId));
    const cartItemIds = priced.lines.filter((l) => templateProductIds.has(l.productId)).map((l) => l.cartItemId);

    const order = await this.ordersService.checkout(template.account.keycloakSub, template.account.email, {
      shippingAddress: template.shippingAddress as never,
      poNumber: template.poNumber ?? undefined,
      paymentMethod: CheckoutPaymentMethod.TRADE_CREDIT,
      cartItemIds,
    });

    await this.prisma.recurringOrderTemplate.update({
      where: { id: template.id },
      data: {
        lastRunAt: new Date(),
        nextRunAt: computeNextRunAt(template.frequency, new Date()),
        lastRunError: null,
      },
    });

    await this.notificationsService.queueRecurringOrderPlaced({
      recipientEmail: template.account.email,
      templateName: template.name,
      orderNumber: order.orderNumber,
    });
  }

  private async requireApprovedTradeCredit(accountId: string): Promise<void> {
    const tradeCreditAccount = await this.prisma.tradeCreditAccount.findUnique({ where: { accountId } });
    if (!tradeCreditAccount || !tradeCreditAccount.approvedAt) {
      throw new ForbiddenException('Recurring orders require an approved trade credit account');
    }
  }

  private async findByIdOrThrow(id: string): Promise<RecurringOrderTemplate> {
    const template = await this.prisma.recurringOrderTemplate.findUnique({
      where: { id },
      include: TEMPLATE_INCLUDE,
    });
    if (!template) {
      throw new NotFoundException(`Recurring order template '${id}' not found`);
    }
    return template;
  }
}
