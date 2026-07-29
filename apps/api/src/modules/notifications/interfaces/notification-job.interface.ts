// Payloads are deliberately self-contained (recipient email, order number,
// amounts — not just IDs) rather than requiring the worker to look
// anything up from the database. That's what lets worker.ts run as a
// minimal process with no PrismaModule at all: everything a template needs
// to render is already in the job by the time it's queued.

export interface OrderConfirmedJob {
  type: 'order.confirmed';
  recipientEmail: string;
  orderNumber: string;
  total: string; // formatted, e.g. "1,240.00" — see NotificationsService for why formatting happens at enqueue time
}

export interface OrderShippedJob {
  type: 'order.shipped';
  recipientEmail: string;
  // Only real field addition needed for SMS (see SmsService /
  // NotificationsProcessor) — null when the account has no phone number
  // on file, or SMS just isn't attempted for this send. Deliberately
  // only added to this ONE job type for this pass, not every
  // notification — see docs/AGENTS.md's SMS section for why
  // order.shipped specifically was chosen as the starting point.
  recipientPhone: string | null;
  orderNumber: string;
  courierName: string | null;
  trackingNumber: string | null;
  trackingUrl: string | null; // already resolved via resolveTrackingUrl at enqueue time — the template just renders it, doesn't look anything up
}

export interface CartAbandonedJob {
  type: 'cart.abandoned';
  recipientEmail: string;
  itemCount: number; // deliberately not full line-item detail or prices — the queued job payload stays lightweight and stable even if cart contents keep changing between when this is queued and when it's actually sent
  cartUrl: string; // direct link back to /cart, so the reminder is one click from checkout
}

export interface OrderCancelledJob {
  type: 'order.cancelled';
  recipientEmail: string;
  orderNumber: string;
  wasRefunded: boolean; // true if a CONFIRMED (paid) order was refunded; false if it was only ever PENDING (nothing to refund)
  total: string;
}

export interface WarrantyIssuedJob {
  type: 'warranty.issued';
  recipientEmail: string;
  warrantyId: string;
  termMonths: number;
  expiresAt: string; // ISO date string
}

export interface BookingScheduledJob {
  type: 'booking.scheduled';
  recipientEmail: string;
  bookingId: string;
  scheduledFor: string; // ISO date string
  siteAddress: string;
}

export interface CoCIssuedJob {
  type: 'compliance.coc-issued';
  recipientEmail: string;
  certificateNumber: string;
  documentUrl: string;
}

export interface QuotePricedJob {
  type: 'quote.priced';
  recipientEmail: string;
  quoteId: string;
  quotedTotal: string; // formatted, same convention as OrderConfirmedJob.total
  validUntil: string; // ISO date string
}

export interface RecurringOrderPlacedJob {
  type: 'recurring-order.placed';
  recipientEmail: string;
  templateName: string;
  orderNumber: string;
}

export interface RecurringOrderFailedJob {
  type: 'recurring-order.failed';
  recipientEmail: string;
  templateName: string;
  reason: string; // the same error message logged server-side — a real, specific reason, not a generic "something went wrong"
}

// The two gaps found in Gap Analysis V: real, multi-stage customer
// workflows (trade applications, returns) that updated their own
// database state on every transition but never told the customer.

export interface TradeApplicationApprovedJob {
  type: 'trade-application.approved';
  recipientEmail: string;
  companyName: string;
}

export interface TradeApplicationRejectedJob {
  type: 'trade-application.rejected';
  recipientEmail: string;
  companyName: string;
  rejectionReason: string; // the same reason an admin entered — a real, specific reason, not a generic rejection notice
}

// One job type covers every ReturnRequest status transition (APPROVED,
// RECEIVED, REFUNDED, REPLACED, REJECTED) rather than five near-
// identical job types — the status itself is the only thing that
// varies per transition, and the template renders different copy per
// status from that one field (see notification.templates.ts).
export interface ReturnStatusChangedJob {
  type: 'return.status-changed';
  recipientEmail: string;
  orderNumber: string;
  newStatus: string;
}

export interface BackInStockJob {
  type: 'product.back-in-stock';
  recipientEmail: string;
  productName: string;
  productSlug: string;
}

export type NotificationJob =
  | OrderConfirmedJob
  | OrderShippedJob
  | OrderCancelledJob
  | WarrantyIssuedJob
  | BookingScheduledJob
  | CoCIssuedJob
  | QuotePricedJob
  | CartAbandonedJob
  | RecurringOrderPlacedJob
  | RecurringOrderFailedJob
  | TradeApplicationApprovedJob
  | TradeApplicationRejectedJob
  | ReturnStatusChangedJob
  | BackInStockJob;
