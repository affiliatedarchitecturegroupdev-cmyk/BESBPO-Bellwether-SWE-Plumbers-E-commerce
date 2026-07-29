// The single place the 8 known notification job types are listed for
// anything OTHER than the actual rendering switch in
// notification.templates.ts (which stays a TypeScript discriminated
// union there, for real compile-time exhaustiveness checking). Used for
// DTO validation (CreateNotificationTemplateDto's @IsIn) and the admin
// UI's placeholder reference — not a Prisma enum, to avoid keeping the
// same list in sync across a TS union AND a separate DB-level enum.
export const NOTIFICATION_TYPES = [
  'order.confirmed',
  'order.shipped',
  'cart.abandoned',
  'order.cancelled',
  'warranty.issued',
  'booking.scheduled',
  'compliance.coc-issued',
  'quote.priced',
  'recurring-order.placed',
  'recurring-order.failed',
  'trade-application.approved',
  'trade-application.rejected',
  'return.status-changed',
  'product.back-in-stock',
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// Informational only, for the admin UI — not enforced at the API level
// (a custom template referencing an unknown placeholder just renders
// that placeholder literally, per substitutePlaceholders' own design;
// see that function's comment for why silently dropping an unknown
// placeholder would be worse than leaving it visible).
export const NOTIFICATION_TYPE_PLACEHOLDERS: Record<NotificationType, string[]> = {
  'order.confirmed': ['orderNumber', 'total'],
  'order.shipped': ['orderNumber', 'trackingLine'],
  'cart.abandoned': ['itemCount', 'itemPlural', 'cartUrl'],
  'order.cancelled': ['orderNumber', 'total', 'refundText'],
  'warranty.issued': ['termMonths', 'warrantyId', 'expiresAt'],
  'booking.scheduled': ['scheduledFor', 'siteAddress', 'bookingId'],
  'compliance.coc-issued': ['certificateNumber', 'documentUrl'],
  'quote.priced': ['quotedTotal', 'validUntil'],
  'recurring-order.placed': ['templateName', 'orderNumber'],
  'recurring-order.failed': ['templateName', 'reason'],
  'trade-application.approved': ['companyName'],
  'trade-application.rejected': ['companyName', 'rejectionReason'],
  'return.status-changed': ['orderNumber', 'newStatus'],
  'product.back-in-stock': ['productName', 'productSlug'],
};
