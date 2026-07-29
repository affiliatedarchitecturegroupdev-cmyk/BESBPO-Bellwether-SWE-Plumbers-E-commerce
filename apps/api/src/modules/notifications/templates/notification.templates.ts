import { NotificationJob } from '../interfaces/notification-job.interface';
import { RenderedNotification } from '../channels/notification-channel.interface';

// Plain text, not branded HTML — deliberately kept simple for this
// foundational pass rather than building a full HTML email template system
// (layout, brand colors, logo) as a side effect of wiring up notifications
// infrastructure. That's a real, worthwhile follow-up (the brand kit and
// corporate site's design tokens already exist to draw from), just a
// different piece of work from "does the pipeline work end to end."
export function renderNotification(job: NotificationJob): RenderedNotification {
  switch (job.type) {
    case 'order.confirmed':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Order ${job.orderNumber} confirmed — Bellwether SWE`,
        body: `Thanks for your order.\n\nOrder ${job.orderNumber} has been confirmed. Total: R ${job.total}.\n\nWe'll be in touch with delivery or installation details shortly.\n\n— Bellwether SWE Plumbers`,
      };

    case 'order.shipped': {
      const trackingLine = job.trackingNumber
        ? `\n\nTracking number: ${job.trackingNumber}${job.courierName ? ` (${job.courierName})` : ''}${
            job.trackingUrl ? `\nTrack your delivery: ${job.trackingUrl}` : ''
          }`
        : '';
      return {
        recipientEmail: job.recipientEmail,
        subject: `Order ${job.orderNumber} has shipped — Bellwether SWE`,
        body: `Good news — order ${job.orderNumber} is on its way.${trackingLine}\n\n— Bellwether SWE Plumbers`,
      };
    }

    case 'cart.abandoned':
      return {
        recipientEmail: job.recipientEmail,
        subject: `You left something in your cart — Bellwether SWE`,
        body: `You still have ${job.itemCount} item${job.itemCount === 1 ? '' : 's'} waiting in your cart.\n\n${job.cartUrl}\n\n— Bellwether SWE Plumbers`,
      };

    case 'order.cancelled':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Order ${job.orderNumber} cancelled — Bellwether SWE`,
        body: job.wasRefunded
          ? `Order ${job.orderNumber} has been cancelled and refunded.\n\nRefund amount: R ${job.total}. Please allow a few business days for it to reflect, depending on your bank.\n\n— Bellwether SWE Plumbers`
          : `Order ${job.orderNumber} has been cancelled. No payment was ever collected for this order, so there's nothing to refund.\n\n— Bellwether SWE Plumbers`,
      };

    case 'warranty.issued':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Your warranty is active — Bellwether SWE`,
        body: `Your ${job.termMonths}-month warranty is now active.\n\nWarranty reference: ${job.warrantyId}\nExpires: ${job.expiresAt}\n\nKeep this email for your records.\n\n— Bellwether SWE Plumbers`,
      };

    case 'booking.scheduled':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Your appointment is scheduled — Bellwether SWE`,
        body: `Your field service appointment has been scheduled for ${job.scheduledFor}.\n\nSite: ${job.siteAddress}\nBooking reference: ${job.bookingId}\n\n— Bellwether SWE Plumbers`,
      };

    case 'compliance.coc-issued':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Certificate of Compliance issued — Bellwether SWE`,
        body: `A Certificate of Compliance has been issued for your installation.\n\nCertificate number: ${job.certificateNumber}\nDocument: ${job.documentUrl}\n\n— Bellwether SWE Plumbers`,
      };

    case 'quote.priced':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Your quote is ready — Bellwether SWE`,
        body: `We've priced your quote request.\n\nTotal: R ${job.quotedTotal}\nValid until: ${job.validUntil}\n\nSign in to your account to review and accept or decline.\n\n— Bellwether SWE Plumbers`,
      };

    case 'recurring-order.placed':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Recurring order placed: ${job.templateName} — Bellwether SWE`,
        body: `Your recurring order "${job.templateName}" was placed automatically.\n\nOrder number: ${job.orderNumber}\n\nSign in to your account if you'd like to review or adjust this recurring order.\n\n— Bellwether SWE Plumbers`,
      };

    case 'recurring-order.failed':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Recurring order couldn't be placed: ${job.templateName} — Bellwether SWE`,
        body: `Your recurring order "${job.templateName}" couldn't be placed automatically this cycle.\n\nReason: ${job.reason}\n\nIt will be tried again next cycle. Sign in to your account to review or fix this recurring order sooner.\n\n— Bellwether SWE Plumbers`,
      };

    case 'trade-application.approved':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Your trade account is approved — Bellwether SWE`,
        body: `Good news — your trade account application for ${job.companyName} has been approved. Trade pricing is now live on your account.\n\nSign in and shop as usual — trade pricing applies automatically wherever you qualify.\n\n— Bellwether SWE Plumbers`,
      };

    case 'trade-application.rejected':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Update on your trade account application — Bellwether SWE`,
        body: `Thanks for applying for a trade account for ${job.companyName}. We weren't able to approve this application: ${job.rejectionReason}\n\nYou're welcome to apply again once that's addressed.\n\n— Bellwether SWE Plumbers`,
      };

    case 'return.status-changed':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Return update for order ${job.orderNumber} — Bellwether SWE`,
        body: `${describeReturnStatus(job.newStatus)}\n\nOrder: ${job.orderNumber}\n\nSign in to your account to see the full details of this return.\n\n— Bellwether SWE Plumbers`,
      };

    case 'product.back-in-stock':
      return {
        recipientEmail: job.recipientEmail,
        subject: `Back in stock: ${job.productName} — Bellwether SWE`,
        body: `Good news — ${job.productName} is back in stock.\n\nhttps://bellwetherswe.shop/product/${job.productSlug}\n\nStock moves quickly on popular items, so we'd order soon if you still need it.\n\n— Bellwether SWE Plumbers`,
      };
  }
}

// Plain, human copy per status — kept separate from the switch above so
// the switch itself stays a simple map of job type to template, not a
// place that also has to reason about ReturnRequest's own status
// vocabulary.
function describeReturnStatus(status: string): string {
  switch (status) {
    case 'APPROVED':
      return 'Your return has been approved. We\'ll be in touch with instructions for sending the item back.';
    case 'RECEIVED':
      return 'We\'ve received your returned item and are inspecting it now.';
    case 'REFUNDED':
      return 'Your return has been refunded to your original payment method.';
    case 'REPLACED':
      return 'Your return has been resolved with a replacement.';
    case 'REJECTED':
      return 'Your return request was not approved.';
    default:
      return `Your return status has changed to ${status}.`;
  }
}
