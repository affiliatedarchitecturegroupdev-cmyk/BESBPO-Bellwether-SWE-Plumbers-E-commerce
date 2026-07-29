import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

const HOUR_MS = 60 * 60 * 1000;
const ABANDONED_AFTER_HOURS = 24;
const STOP_REMINDING_AFTER_DAYS = 7;

// Runs in the API process, not the worker — every other notification
// producer in this codebase (OrdersService, QuotesService, etc.) already
// lives in the API process and calls NotificationsService directly; this
// follows the same shape rather than expanding the worker's
// responsibilities beyond "consume the queue and send" for a feature
// that doesn't actually need to. The worker stays exactly what
// docs/AGENTS.md already describes it as.
//
// This is also the first real scheduled/cron job anywhere in this
// codebase — see docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md §2.3, which
// named "no Render Cron jobs" as a gap. The mechanism now exists
// (@nestjs/schedule, not a separate Render Cron Job service — no reason
// to run a second process for a job this lightweight); the SPECIFIC jobs
// that document originally named (price-book sync, PIRB batching) are
// still unbuilt, only this one is.
@Injectable()
export class CartAbandonmentService {
  private readonly logger = new Logger(CartAbandonmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkAbandonedCarts(): Promise<void> {
    const now = new Date();
    const abandonedSince = new Date(now.getTime() - ABANDONED_AFTER_HOURS * HOUR_MS);
    // No point reminding about a cart abandoned weeks ago — that
    // customer has either moved on or will come back on their own; an
    // old reminder reads as spam, not a helpful nudge.
    const tooOldToBother = new Date(now.getTime() - STOP_REMINDING_AFTER_DAYS * 24 * HOUR_MS);

    const candidates = await this.prisma.cart.findMany({
      where: {
        updatedAt: { lte: abandonedSince, gte: tooOldToBother },
        reminderSentAt: null, // CartService.touchCart clears this on real activity — see that method's comment
        items: { some: {} }, // an empty cart was never "abandoned," it just has nothing in it
      },
      include: { account: true, items: true },
    });

    if (candidates.length === 0) return;

    const webUrl = this.config.get<string>('PUBLIC_WEB_URL') ?? '';

    for (const cart of candidates) {
      await this.notificationsService.queueCartAbandoned({
        recipientEmail: cart.account.email,
        itemCount: cart.items.length,
        cartUrl: `${webUrl}/cart`,
      });
      // Set immediately after queuing, not batched at the end — if this
      // scan were interrupted partway through a large candidate list,
      // carts already queued stay marked (no duplicate reminder next
      // hour); only the ones not yet reached remain eligible.
      await this.prisma.cart.update({ where: { id: cart.id }, data: { reminderSentAt: now } });
    }

    this.logger.log(`Queued ${candidates.length} abandoned-cart reminder(s).`);
  }
}
