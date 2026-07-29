import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { NOTIFICATIONS_QUEUE_NAME, buildRedisConnectionOptions } from './queue.config';
import {
  BookingScheduledJob,
  CoCIssuedJob,
  QuotePricedJob,
  NotificationJob,
  OrderConfirmedJob,
  OrderShippedJob,
  CartAbandonedJob,
  OrderCancelledJob,
  WarrantyIssuedJob,
  RecurringOrderPlacedJob,
  RecurringOrderFailedJob,
  TradeApplicationApprovedJob,
  TradeApplicationRejectedJob,
  ReturnStatusChangedJob,
  BackInStockJob,
} from './interfaces/notification-job.interface';

const RETRY_OPTIONS = {
  attempts: 5,
  backoff: { type: 'exponential' as const, delay: 5000 }, // 5s, 10s, 20s, 40s, 80s — generous enough to ride out a brief SES/network blip without giving up too fast
};

// Producer only — this class adds jobs to the queue and never processes
// them. The consumer (NotificationsProcessor) runs in a separate process
// (see worker.ts and render.yaml's bellwetherswe-worker) specifically so a
// slow or failing notification never blocks or crashes the API's request
// handling. Don't import NotificationsProcessor into AppModule — that
// would make the API process also start consuming jobs, defeating the
// point of the separate worker.
@Injectable()
export class NotificationsService implements OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly queue: Queue<NotificationJob>;

  constructor(config: ConfigService) {
    this.queue = new Queue<NotificationJob>(NOTIFICATIONS_QUEUE_NAME, {
      connection: buildRedisConnectionOptions(config),
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.queue.close();
  }

  async queueOrderConfirmed(payload: Omit<OrderConfirmedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'order.confirmed', ...payload });
  }

  async queueOrderShipped(payload: Omit<OrderShippedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'order.shipped', ...payload });
  }

  async queueCartAbandoned(payload: Omit<CartAbandonedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'cart.abandoned', ...payload });
  }

  async queueOrderCancelled(payload: Omit<OrderCancelledJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'order.cancelled', ...payload });
  }

  async queueWarrantyIssued(payload: Omit<WarrantyIssuedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'warranty.issued', ...payload });
  }

  async queueBookingScheduled(payload: Omit<BookingScheduledJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'booking.scheduled', ...payload });
  }

  async queueCoCIssued(payload: Omit<CoCIssuedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'compliance.coc-issued', ...payload });
  }

  async queueQuotePriced(payload: Omit<QuotePricedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'quote.priced', ...payload });
  }

  async queueRecurringOrderPlaced(payload: Omit<RecurringOrderPlacedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'recurring-order.placed', ...payload });
  }

  async queueRecurringOrderFailed(payload: Omit<RecurringOrderFailedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'recurring-order.failed', ...payload });
  }

  async queueTradeApplicationApproved(payload: Omit<TradeApplicationApprovedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'trade-application.approved', ...payload });
  }

  async queueTradeApplicationRejected(payload: Omit<TradeApplicationRejectedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'trade-application.rejected', ...payload });
  }

  async queueReturnStatusChanged(payload: Omit<ReturnStatusChangedJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'return.status-changed', ...payload });
  }

  async queueBackInStock(payload: Omit<BackInStockJob, 'type'>): Promise<void> {
    await this.enqueue({ type: 'product.back-in-stock', ...payload });
  }

  private async enqueue(job: NotificationJob): Promise<void> {
    try {
      await this.queue.add(job.type, job, RETRY_OPTIONS);
    } catch (err) {
      // A queue failure (Redis briefly unreachable) shouldn't fail the
      // calling request — a customer's order confirms successfully even if
      // the confirmation email couldn't be queued this instant. Logged so
      // it's visible, not silently lost.
      this.logger.error(`Failed to queue notification job '${job.type}': ${err}`);
    }
  }
}
