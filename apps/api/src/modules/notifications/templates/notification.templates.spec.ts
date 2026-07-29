import { renderNotification } from './notification.templates';

describe('renderNotification', () => {
  it('renders order.confirmed with the order number and total in the subject/body', () => {
    const result = renderNotification({
      type: 'order.confirmed',
      recipientEmail: 'buyer@example.com',
      orderNumber: 'BSWE-20260722-ABC123',
      total: '1,240.00',
    });

    expect(result.recipientEmail).toBe('buyer@example.com');
    expect(result.subject).toContain('BSWE-20260722-ABC123');
    expect(result.body).toContain('1,240.00');
  });

  it('renders warranty.issued with the term and expiry', () => {
    const result = renderNotification({
      type: 'warranty.issued',
      recipientEmail: 'buyer@example.com',
      warrantyId: 'warranty-1',
      termMonths: 24,
      expiresAt: '2028-07-22T00:00:00.000Z',
    });

    expect(result.body).toContain('24-month');
    expect(result.body).toContain('2028-07-22');
  });

  it('renders booking.scheduled with the site address', () => {
    const result = renderNotification({
      type: 'booking.scheduled',
      recipientEmail: 'buyer@example.com',
      bookingId: 'booking-1',
      scheduledFor: '2026-08-01T09:00:00.000Z',
      siteAddress: '12 Demo Street, Durban',
    });

    expect(result.body).toContain('12 Demo Street, Durban');
  });

  it('renders compliance.coc-issued with the certificate number and document link', () => {
    const result = renderNotification({
      type: 'compliance.coc-issued',
      recipientEmail: 'buyer@example.com',
      certificateNumber: 'COC-2026-001',
      documentUrl: 'https://bellwether-swe-catalog.s3.af-south-1.amazonaws.com/coc/COC-2026-001.pdf',
    });

    expect(result.body).toContain('COC-2026-001');
    expect(result.body).toContain('.pdf');
  });

  it('renders order.cancelled with refund messaging when a paid order was refunded', () => {
    const result = renderNotification({
      type: 'order.cancelled',
      recipientEmail: 'buyer@example.com',
      orderNumber: 'BSWE-1',
      wasRefunded: true,
      total: '150.00',
    });

    expect(result.body).toContain('refunded');
    expect(result.body).toContain('150.00');
  });

  it('renders order.cancelled without refund messaging when nothing was ever paid', () => {
    const result = renderNotification({
      type: 'order.cancelled',
      recipientEmail: 'buyer@example.com',
      orderNumber: 'BSWE-1',
      wasRefunded: false,
      total: '150.00',
    });

    expect(result.body).toContain('nothing to refund');
  });

  it('renders quote.priced with the total and validity date', () => {
    const result = renderNotification({
      type: 'quote.priced',
      recipientEmail: 'buyer@example.com',
      quoteId: 'quote-1',
      quotedTotal: '4,250.00',
      validUntil: '2026-08-15',
    });

    expect(result.body).toContain('4,250.00');
    expect(result.body).toContain('2026-08-15');
  });
});
