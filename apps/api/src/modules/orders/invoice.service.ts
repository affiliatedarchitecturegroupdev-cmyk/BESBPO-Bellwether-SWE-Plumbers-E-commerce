import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { Order, OrderLineItem } from '@prisma/client';
import { VAT_RATE } from '../../common/utils/money.util';

type OrderWithLineItems = Order & {
  lineItems: OrderLineItem[];
  account: { email: string; companyName: string | null };
};

interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
}

const zar = (value: number | string): string => `R${Number(value).toFixed(2)}`;

@Injectable()
export class InvoiceService {
  constructor(private readonly config: ConfigService) {}

  // Buffers the whole PDF in memory rather than streaming it directly to
  // an HTTP response — an invoice is small (one or two pages), and
  // buffering first lets the controller set Content-Length correctly and
  // handle the response the same way as any other binary download in
  // this codebase, rather than needing pdfkit's stream wired directly
  // into Express's response object.
  async generate(order: OrderWithLineItems): Promise<Buffer> {
    const companyName =
      this.config.get<string>('INVOICE_COMPANY_NAME') || 'Bellwether Systems & Water Engineering (Pty) Ltd';
    const companyAddress = this.config.get<string>('INVOICE_COMPANY_ADDRESS');
    const vatNumber = this.config.get<string>('INVOICE_VAT_NUMBER');
    // A document without a real VAT number isn't a "Tax Invoice" under
    // South African VAT law — a legal term with real requirements, not
    // just a label. Rather than print "Tax Invoice" on something that
    // doesn't actually qualify (or fabricate a VAT number to make it
    // look like it does), this deployment's own configuration state
    // decides the document's own title honestly.
    const isTaxInvoice = Boolean(vatNumber);
    const address = order.shippingAddress as unknown as ShippingAddress;

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 50 });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // ─── Header ───
      doc.fontSize(16).font('Helvetica-Bold').text(companyName);
      doc.fontSize(9).font('Helvetica').fillColor('#555555');
      if (companyAddress) doc.text(companyAddress);
      doc.text(vatNumber ? `VAT Registration No: ${vatNumber}` : 'VAT Registration No: not configured');
      doc.fillColor('#000000');
      doc.moveDown(1.5);

      doc.fontSize(18).font('Helvetica-Bold').text(isTaxInvoice ? 'TAX INVOICE' : 'INVOICE');
      doc.moveDown(0.5);

      // ─── Invoice + order meta ───
      doc.fontSize(10).font('Helvetica');
      doc.text(`Invoice number: ${order.orderNumber}`);
      doc.text(`Invoice date: ${order.createdAt.toLocaleDateString('en-ZA')}`);
      doc.text(`Order status: ${order.status}`);
      if (order.poNumber) doc.text(`PO / Reference: ${order.poNumber}`);
      doc.moveDown(1);

      // ─── Bill to ───
      doc.font('Helvetica-Bold').text('Bill To');
      doc.font('Helvetica');
      if (order.account.companyName) doc.text(order.account.companyName);
      doc.text(order.account.email);
      doc.text(address.line1);
      if (address.line2) doc.text(address.line2);
      doc.text(`${address.city}, ${address.province} ${address.postalCode}`);
      doc.moveDown(1.5);

      // ─── Line items table ───
      const tableTop = doc.y;
      const col = { name: 50, qty: 320, unitPrice: 390, lineTotal: 470 };
      doc.font('Helvetica-Bold').fontSize(9);
      doc.text('Item', col.name, tableTop);
      doc.text('Qty', col.qty, tableTop);
      doc.text('Unit Price', col.unitPrice, tableTop);
      doc.text('Total', col.lineTotal, tableTop);
      doc
        .moveTo(50, tableTop + 14)
        .lineTo(545, tableTop + 14)
        .strokeColor('#CCCCCC')
        .stroke();

      let y = tableTop + 20;
      doc.font('Helvetica').fontSize(9);
      for (const line of order.lineItems) {
        doc.text(line.productName, col.name, y, { width: 260 });
        doc.text(String(line.quantity), col.qty, y);
        doc.text(zar(line.unitPrice), col.unitPrice, y);
        doc.text(zar(line.lineTotal), col.lineTotal, y);
        y += 18;
      }
      doc
        .moveTo(50, y + 4)
        .lineTo(545, y + 4)
        .strokeColor('#CCCCCC')
        .stroke();
      y += 14;

      // ─── Totals ───
      const totalsLabelX = 380;
      const totalsValueX = 470;
      doc.text('Subtotal', totalsLabelX, y);
      doc.text(zar(order.subtotal), totalsValueX, y);
      y += 16;

      if (Number(order.discountAmount) > 0) {
        doc.text(order.couponCode ? `Discount (${order.couponCode})` : 'Discount', totalsLabelX, y);
        doc.text(`-${zar(order.discountAmount)}`, totalsValueX, y);
        y += 16;
      }

      doc.text(`VAT (${(VAT_RATE * 100).toFixed(0)}%)`, totalsLabelX, y);
      doc.text(zar(order.vatAmount), totalsValueX, y);
      y += 16;

      if (Number(order.deliveryFee) > 0) {
        doc.text('Delivery', totalsLabelX, y);
        doc.text(zar(order.deliveryFee), totalsValueX, y);
        y += 16;
      }

      doc
        .moveTo(totalsLabelX, y + 2)
        .lineTo(545, y + 2)
        .strokeColor('#000000')
        .stroke();
      y += 10;
      doc.font('Helvetica-Bold');
      doc.text('Total', totalsLabelX, y);
      doc.text(zar(order.total), totalsValueX, y);

      doc.end();
    });
  }
}
