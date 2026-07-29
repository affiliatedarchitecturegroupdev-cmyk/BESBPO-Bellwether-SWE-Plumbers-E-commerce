import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { InvoiceService } from './invoice.service';

// pdfkit produces binary output — these verify the config-driven
// branching logic runs cleanly across every real configuration state
// (VAT number set/unset, coupon/delivery-fee/PO-number present/absent)
// and that a real, well-formed PDF buffer comes out (starts with the
// standard PDF magic bytes). They do NOT parse rendered text content
// back out of the PDF to assert the exact "TAX INVOICE" vs "INVOICE"
// wording — that would need an extra dependency (a PDF text extractor)
// just for this one assertion. The underlying logic deciding which
// title to use is a single, simple Boolean(vatNumber) ternary passed
// directly to pdfkit's own well-established .text() API — reviewed
// carefully by hand instead, same as everywhere else in this codebase
// that can't be executed in this sandbox.
describe('InvoiceService', () => {
  let service: InvoiceService;
  let config: Record<string, string | undefined>;

  const baseOrder = {
    orderNumber: 'BSWE-1001',
    status: 'CONFIRMED',
    shippingAddress: { line1: '1 Main Rd', city: 'Cape Town', province: 'Western Cape', postalCode: '8001' },
    subtotal: 200,
    vatAmount: 30,
    deliveryFee: 0,
    discountAmount: 0,
    couponCode: null,
    total: 230,
    poNumber: null,
    createdAt: new Date('2026-01-15'),
    account: { email: 'buyer@example.com', companyName: 'Acme Plumbing' },
    lineItems: [{ productName: 'Copper Pipe 15mm', quantity: 2, unitPrice: 100, lineTotal: 200 }],
  };

  beforeEach(async () => {
    config = {};
    const module: TestingModule = await Test.createTestingModule({
      providers: [InvoiceService, { provide: ConfigService, useValue: { get: (key: string) => config[key] } }],
    }).compile();

    service = module.get(InvoiceService);
  });

  it('produces a real, well-formed PDF buffer (starts with the PDF magic bytes) for a minimal valid order', async () => {
    const buffer = await service.generate(baseOrder as never);
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 5).toString('ascii')).toBe('%PDF-');
  });

  it('does not throw when INVOICE_VAT_NUMBER is unset — the common, honest default state', async () => {
    config.INVOICE_VAT_NUMBER = undefined;
    await expect(service.generate(baseOrder as never)).resolves.toBeInstanceOf(Buffer);
  });

  it('does not throw when a coupon, delivery fee, and PO number are all present — exercises every conditional branch', async () => {
    config.INVOICE_VAT_NUMBER = '4123456789';
    config.INVOICE_COMPANY_ADDRESS = '1 Industrial Way, Durban';
    const order = {
      ...baseOrder,
      deliveryFee: 150,
      discountAmount: 20,
      couponCode: 'SAVE10',
      poNumber: 'PO-2026-042',
    };
    await expect(service.generate(order as never)).resolves.toBeInstanceOf(Buffer);
  });

  it('does not throw for a shipping address with no line2 and a company-less account', async () => {
    const order = {
      ...baseOrder,
      account: { email: 'guest@example.com', companyName: null },
    };
    await expect(service.generate(order as never)).resolves.toBeInstanceOf(Buffer);
  });
});
