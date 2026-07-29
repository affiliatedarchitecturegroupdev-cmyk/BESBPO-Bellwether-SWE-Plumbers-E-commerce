import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BackInStockService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // Upsert, not create — see the schema's own comment on
  // BackInStockRequest for why: a customer re-requesting after already
  // being notified once (the product went out of stock again) is the
  // same real intent as a first-time request, not a duplicate to
  // reject. Rejects outright if the product is currently in stock —
  // "notify me when back in stock" for something already in stock isn't
  // a real request, it's almost certainly the customer looking at stale
  // page state.
  async requestNotification(productId: string, email: string): Promise<{ alreadyRequested: boolean }> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }
    if (product.stockQty > 0) {
      throw new BadRequestException('This product is currently in stock.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await this.prisma.backInStockRequest.findUnique({
      where: { email_productId: { email: normalizedEmail, productId } },
    });
    if (existing && existing.notifiedAt === null) {
      return { alreadyRequested: true };
    }

    await this.prisma.backInStockRequest.upsert({
      where: { email_productId: { email: normalizedEmail, productId } },
      update: { notifiedAt: null },
      create: { email: normalizedEmail, productId },
    });
    return { alreadyRequested: false };
  }

  // Called by ProductsService whenever a real stock transition from
  // "none" to "some" happens (restock() or a direct stockQty edit via
  // update()) — deliberately NOT triggered by every stock change, only
  // the specific 0-to-positive transition, since that's the only
  // transition anyone actually asked to be told about. Marks each
  // notified request's notifiedAt so the SAME restock never re-notifies
  // the same request twice, while leaving the row in place (not
  // deleted) so a customer's history of having asked isn't lost.
  async notifyIfBackInStock(productId: string, previousStockQty: number, newStockQty: number): Promise<void> {
    if (previousStockQty > 0 || newStockQty <= 0) return;

    const pending = await this.prisma.backInStockRequest.findMany({
      where: { productId, notifiedAt: null },
      include: { product: { select: { name: true, slug: true } } },
    });
    if (pending.length === 0) return;

    await this.prisma.backInStockRequest.updateMany({
      where: { productId, notifiedAt: null },
      data: { notifiedAt: new Date() },
    });

    for (const request of pending) {
      await this.notificationsService.queueBackInStock({
        recipientEmail: request.email,
        productName: request.product.name,
        productSlug: request.product.slug,
      });
    }
  }
}
