import { NotificationJob } from '../interfaces/notification-job.interface';

// A flat Record<string,string> of placeholder values per job type — used
// by NotificationTemplatesService when a custom (admin-edited) template
// exists, to substitute into it. The SAME conditional logic
// notification.templates.ts's own hardcoded defaults use (e.g. whether a
// tracking number was supplied) — computed here once, not duplicated
// independently in two places that could drift out of sync with each
// other over time.
export function buildTemplateContext(job: NotificationJob): Record<string, string> {
  switch (job.type) {
    case 'order.confirmed':
      return { orderNumber: job.orderNumber, total: String(job.total) };

    case 'order.shipped': {
      const trackingLine = job.trackingNumber
        ? `\n\nTracking number: ${job.trackingNumber}${job.courierName ? ` (${job.courierName})` : ''}${
            job.trackingUrl ? `\nTrack your delivery: ${job.trackingUrl}` : ''
          }`
        : '';
      return { orderNumber: job.orderNumber, trackingLine };
    }

    case 'cart.abandoned':
      return {
        itemCount: String(job.itemCount),
        itemPlural: job.itemCount === 1 ? '' : 's',
        cartUrl: job.cartUrl,
      };

    case 'order.cancelled':
      return {
        orderNumber: job.orderNumber,
        total: String(job.total),
        refundText: job.wasRefunded
          ? `has been cancelled and refunded.\n\nRefund amount: R ${job.total}. Please allow a few business days for it to reflect, depending on your bank.`
          : `has been cancelled. No payment was ever collected for this order, so there's nothing to refund.`,
      };

    case 'warranty.issued':
      return { termMonths: String(job.termMonths), warrantyId: job.warrantyId, expiresAt: job.expiresAt };

    case 'booking.scheduled':
      return { scheduledFor: job.scheduledFor, siteAddress: job.siteAddress, bookingId: job.bookingId };

    case 'compliance.coc-issued':
      return { certificateNumber: job.certificateNumber, documentUrl: job.documentUrl };

    case 'quote.priced':
      return { quotedTotal: String(job.quotedTotal), validUntil: job.validUntil };

    case 'recurring-order.placed':
      return { templateName: job.templateName, orderNumber: job.orderNumber };

    case 'recurring-order.failed':
      return { templateName: job.templateName, reason: job.reason };

    case 'trade-application.approved':
      return { companyName: job.companyName };

    case 'trade-application.rejected':
      return { companyName: job.companyName, rejectionReason: job.rejectionReason };

    case 'return.status-changed':
      return { orderNumber: job.orderNumber, newStatus: job.newStatus };

    case 'product.back-in-stock':
      return { productName: job.productName, productSlug: job.productSlug };
  }
}
