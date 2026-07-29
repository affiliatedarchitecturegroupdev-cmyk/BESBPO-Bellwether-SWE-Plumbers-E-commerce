import { BadRequestException, ConflictException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { GuestCheckoutDto } from '../orders/dto/guest-checkout.dto';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { CHECKOUT_SIGNATURE_FIELD_ORDER, generateApiSignature, generatePayfastSignature } from './payfast/payfast-signature.util';
import { isValidPayfastSourceIp } from './payfast/payfast-ip.util';
import { PayfastCheckoutFields, PayfastItnPayload } from './interfaces/payfast-itn.interface';

const AMOUNT_TOLERANCE = 0.01; // matches PayFast's own documented comparison tolerance for float rounding

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
    private readonly accountsService: AccountsService,
    private readonly cartService: CartService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async initiateCheckout(
    keycloakSub: string,
    email: string,
    orderId: string,
  ): Promise<{ actionUrl: string; fields: PayfastCheckoutFields }> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    if (order.accountId !== account.id) {
      throw new ForbiddenException(`Order '${orderId}' does not belong to your account`);
    }
    if (order.status !== 'PENDING') {
      throw new ConflictException(`Order '${orderId}' is not awaiting payment (status: ${order.status})`);
    }

    const merchantId = this.requireConfig('PAYFAST_MERCHANT_ID');
    const merchantKey = this.requireConfig('PAYFAST_MERCHANT_KEY');
    const passphrase = this.config.get<string>('PAYFAST_PASSPHRASE') || undefined;
    const isSandbox = this.config.get<string>('PAYFAST_MODE') !== 'production';
    const publicApiUrl = this.requireConfig('PUBLIC_API_URL');
    const publicWebUrl = this.requireConfig('PUBLIC_WEB_URL');

    // name_first/name_last aren't collected anywhere in the account model
    // yet (see schema.prisma — Account only has email/companyName/phone) —
    // splitting the account's email local-part is a placeholder, not a
    // real name. Worth fixing once a proper name field exists; not
    // blocking payments on that in the meantime.
    const [emailLocalPart] = account.email.split('@');

    const orderedFields: [string, string][] = [
      ['merchant_id', merchantId],
      ['merchant_key', merchantKey],
      ['return_url', `${publicWebUrl}/checkout/success?orderId=${order.id}`],
      ['cancel_url', `${publicWebUrl}/checkout/cancelled?orderId=${order.id}`],
      ['notify_url', `${publicApiUrl}/v1/payments/payfast/notify`],
      ['name_first', emailLocalPart],
      ['name_last', account.companyName ?? 'Customer'],
      ['email_address', account.email],
      ['m_payment_id', order.id],
      ['amount', Number(order.total).toFixed(2)],
      ['item_name', `Bellwether SWE Order ${order.orderNumber}`],
      ['item_description', `${order.orderNumber} — Bellwether SWE Plumbers`],
    ];

    // CHECKOUT_SIGNATURE_FIELD_ORDER is the source of truth for field
    // order — orderedFields above is written in that same order for
    // readability, but this assertion catches the two ever drifting apart
    // silently if one is edited without the other (a wrong-order signature
    // fails silently as "Signature mismatch" on PayFast's side, which is
    // exactly the class of bug this guards against).
    this.assertFieldOrderMatches(orderedFields);

    const signature = generatePayfastSignature(orderedFields, passphrase);
    const fields = Object.fromEntries([...orderedFields, ['signature', signature]]) as unknown as PayfastCheckoutFields;

    return {
      actionUrl: isSandbox ? 'https://sandbox.payfast.co.za/eng/process' : 'https://www.payfast.co.za/eng/process',
      fields,
    };
  }

  // Customer-initiated. Lives here in PaymentsService rather than
  // Lives here, not on OrdersService, for the same circular-module-
  // dependency reason cancelOrder below already explains: PaymentsModule
  // imports OrdersModule (not the other way around), so orchestrating
  // "create the guest order, then initiate its PayFast payment" has to
  // happen on this side of that relationship. OrdersService.guestCheckout
  // itself only creates the order — no payment step — precisely so it
  // stays usable on its own without needing to know about Payments at
  // all.
  //
  // Re-resolves the guest account by email rather than having
  // OrdersService.guestCheckout hand it back directly — resolveOrCreateGuest
  // is idempotent by design (see its own comment: same email always
  // finds the same account), so this is a safe, cheap second call, not a
  // risk of creating a duplicate account.
  async guestCheckoutWithPayment(
    dto: GuestCheckoutDto,
  ): Promise<{ order: Order; payfast: { actionUrl: string; fields: PayfastCheckoutFields } }> {
    const order = await this.ordersService.guestCheckout(dto);
    const guestAccount = await this.accountsService.resolveOrCreateGuest(dto.email, dto.companyName, dto.phone);
    const payfast = await this.initiateCheckout(guestAccount.keycloakSub, guestAccount.email, order.id);
    return { order, payfast };
  }

  // OrdersService deliberately: a refund needs PayFast's separate
  // Refunds API (see refundPayment below), and OrdersService already gets
  // called BY this service (updateStatus, in handleItn) — having
  // OrdersModule import PaymentsModule back would create a circular
  // module dependency. PaymentsService already has everything this needs
  // (Prisma directly, OrdersService, AccountsService), so the
  // orchestration sits here instead. See docs/AGENTS.md.
  async cancelOrder(keycloakSub: string, email: string, orderId: string, reason?: string): Promise<Order> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lineItems: true },
    });

    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    if (order.accountId !== account.id) {
      throw new ForbiddenException(`Order '${orderId}' does not belong to your account`);
    }
    // Only before the field/warehouse team has acted on it — once an
    // order is PROCESSING or further, cancelling it is an operational
    // decision (stock may already be picked, a booking may be scheduled),
    // not something this self-service endpoint should do unilaterally.
    if (order.status !== 'PENDING' && order.status !== 'CONFIRMED') {
      throw new ConflictException(`Order '${orderId}' can no longer be cancelled (status: ${order.status})`);
    }

    const wasConfirmed = order.status === 'CONFIRMED';

    if (wasConfirmed) {
      if (!order.paymentRef) {
        // Shouldn't happen — a CONFIRMED order is only ever set by
        // handleItn, which always supplies paymentRef in the same call.
        // Thrown, not silently skipped, because refunding nothing while
        // marking the order REFUNDED would be worse than failing loudly.
        throw new Error(`Order '${orderId}' is CONFIRMED but has no paymentRef — cannot refund`);
      }
      // Refund happens BEFORE stock is restored or status changes below —
      // if the refund call fails, the order stays exactly as it was
      // (still CONFIRMED, stock still decremented), not partially
      // cancelled with no money actually returned.
      await this.refundPayment(order.paymentRef, Number(order.total), reason ?? 'Order cancelled by customer');
    }

    const finalStatus = wasConfirmed ? 'REFUNDED' : 'CANCELLED';

    // Stock restoration and the status change happen together, atomically
    // — both are pure DB operations (unlike the refund call above, which
    // is an external HTTP request and deliberately kept outside this
    // transaction).
    await this.prisma.$transaction([
      ...order.lineItems.map((item) =>
        this.prisma.product.update({
          where: { id: item.productId },
          data: { stockQty: { increment: item.quantity } },
        }),
      ),
      this.prisma.order.update({ where: { id: order.id }, data: { status: finalStatus } }),
    ]);

    await this.notificationsService.queueOrderCancelled({
      recipientEmail: account.email,
      orderNumber: order.orderNumber,
      wasRefunded: wasConfirmed,
      total: Number(order.total).toFixed(2),
    });

    // Self-service, not admin-triggered — actorEmail is the customer's
    // own email, and the action name says "by_customer" explicitly so
    // this doesn't read as an admin action in the audit trail later.
    await this.auditLogService.record({
      actorEmail: account.email,
      action: 'order.cancelled_by_customer',
      targetType: 'Order',
      targetId: order.id,
      metadata: { wasRefunded: wasConfirmed, reason: reason ?? null },
    });

    return this.prisma.order.findUniqueOrThrow({ where: { id: order.id }, include: { lineItems: true } });
  }

  // PayFast's separate Refunds API (api.payfast.co.za) — a different
  // surface entirely from the checkout/ITN flow above. Different base
  // URL, different auth (signed custom headers, not form fields), and
  // critically: ALPHABETICAL field order for its signature (see
  // generateApiSignature in payfast-signature.util.ts), the opposite of
  // checkout's declared order.
  //
  // Amount unit for this API: STRENGTHENED evidence since this was first
  // flagged, though still not an explicit documented confirmation — no
  // live sandbox account exists in this environment to actually test
  // against. Checked the official Payfast/payfast-php-sdk README
  // (github.com/Payfast/payfast-php-sdk): its checkout/onsite examples
  // both use a STRING decimal Rand amount ('amount' => '100.00'), but
  // its Refunds, Recurring Billing (adhoc), and other api.payfast.co.za
  // endpoint examples all use a bare INTEGER instead (['amount' => 50],
  // ['amount' => 500 for a "Test adhoc"]) — a consistent structural
  // difference across three separate REST-style endpoints, not just
  // refunds. A bare integer for a "test" amount reads far more plausibly
  // as cents (R5.00, R5.00) than as Rands (R50, R500) for example/demo
  // values. This is circumstantial, not a slam-dunk — verify against a
  // real sandbox refund before this goes live, and remove this comment
  // once confirmed either way, but proceeding with CENTS is now better
  // supported than it was when this was first written.

  // Public entry point for ReturnsService — a returns refund can be
  // PARTIAL (only some returned line items approved), unlike
  // cancelOrder's always-full-order refund above, so this takes an
  // explicit amount rather than always using order.total. Reuses the
  // exact same refundPayment call beneath it — there is only one place
  // in this codebase that actually talks to PayFast's Refunds API,
  // regardless of which workflow triggered the refund.
  async refundForReturn(orderId: string, amountRands: number, reason: string): Promise<void> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    if (!order.paymentRef) {
      throw new BadRequestException(`Order '${orderId}' has no paymentRef — cannot refund`);
    }
    await this.refundPayment(order.paymentRef, amountRands, reason);
  }

  private async refundPayment(pfPaymentId: string, amountRands: number, reason: string): Promise<void> {
    const merchantId = this.requireConfig('PAYFAST_MERCHANT_ID');
    const passphrase = this.config.get<string>('PAYFAST_PASSPHRASE') || undefined;
    const isSandbox = this.config.get<string>('PAYFAST_MODE') !== 'production';

    const amountInCents = Math.round(amountRands * 100);
    const timestamp = new Date().toISOString().split('.')[0];

    const bodyFields: Record<string, string> = {
      amount: String(amountInCents),
      reason,
      notify_buyer: '1',
    };
    const headerFields: Record<string, string> = {
      'merchant-id': merchantId,
      version: 'v1',
      timestamp,
    };
    const signature = generateApiSignature({ ...bodyFields, ...headerFields }, passphrase);

    const url = `https://api.payfast.co.za/refunds/${pfPaymentId}${isSandbox ? '?testing=true' : ''}`;

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { ...headerFields, signature, 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyFields),
      });
    } catch (err) {
      this.logger.error(`PayFast refund request failed for payment ${pfPaymentId}: ${err}`);
      throw new BadRequestException('Could not reach PayFast to process the refund — please try again shortly');
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      this.logger.error(`PayFast refund rejected for payment ${pfPaymentId}: ${response.status} ${text}`);
      throw new BadRequestException('PayFast declined the refund request');
    }
  }


  // Public endpoint — PayFast calls this directly, server-to-server, with
  // no auth token. Every one of the four checks below is required by
  // PayFast's own integration guide; skipping any of them means accepting
  // unverified claims about a payment having succeeded. A failure at any
  // step throws rather than silently ignoring the notification — see
  // PaymentsController for the reasoning on what that means for the HTTP
  // response PayFast receives.
  async handleItn(rawBody: PayfastItnPayload, sourceIp: string): Promise<void> {
    const merchantId = this.requireConfig('PAYFAST_MERCHANT_ID');
    const passphrase = this.config.get<string>('PAYFAST_PASSPHRASE') || undefined;
    const isSandbox = this.config.get<string>('PAYFAST_MODE') !== 'production';

    // 1. Signature — recompute over the fields AS RECEIVED, in the order
    // they arrived (not CHECKOUT_SIGNATURE_FIELD_ORDER, which is only for
    // the outbound checkout request). Object.entries on a body parsed from
    // application/x-www-form-urlencoded preserves the original field
    // order, which is what PayFast's own signature was computed over.
    const receivedEntries = Object.entries(rawBody).filter(
      ([key]) => key !== 'signature',
    ) as [string, string][];
    const expectedSignature = generatePayfastSignature(receivedEntries, passphrase);
    if (expectedSignature !== rawBody.signature) {
      throw new BadRequestException('PayFast ITN signature mismatch');
    }

    // 2. Merchant ID — confirms this notification is actually addressed to
    // this merchant account, not (for instance) replayed from a different
    // integration sharing the same notify_url by mistake.
    if (rawBody.merchant_id !== merchantId) {
      throw new BadRequestException('PayFast ITN merchant_id does not match this account');
    }

    // 3. Source IP — must resolve to one of PayFast's own hostnames.
    const validIp = await isValidPayfastSourceIp(sourceIp);
    if (!validIp) {
      throw new ForbiddenException(`PayFast ITN received from an unrecognized source IP: ${sourceIp}`);
    }

    // 4. Server-to-server confirmation — POST the raw received data back
    // to PayFast and require them to echo "VALID". This is what actually
    // defeats a forged request that happens to have a correct-looking
    // signature (e.g. from a leaked passphrase) — PayFast confirming they
    // actually sent this exact payload is the strongest of the four checks.
    const validateUrl = isSandbox
      ? 'https://sandbox.payfast.co.za/eng/query/validate'
      : 'https://www.payfast.co.za/eng/query/validate';
    const isConfirmedByPayfast = await this.confirmWithPayfast(validateUrl, rawBody);
    if (!isConfirmedByPayfast) {
      throw new BadRequestException('PayFast did not confirm this ITN as valid');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: rawBody.m_payment_id },
      include: { account: true, lineItems: true },
    });
    if (!order) {
      throw new NotFoundException(`Order '${rawBody.m_payment_id}' referenced by ITN not found`);
    }

    const amountReceived = Number(rawBody.amount_gross);
    if (Math.abs(Number(order.total) - amountReceived) > AMOUNT_TOLERANCE) {
      throw new BadRequestException(
        `PayFast ITN amount (${amountReceived}) does not match order total (${order.total})`,
      );
    }

    if (rawBody.payment_status === 'COMPLETE') {
      await this.ordersService.updateStatus(order.id, { status: 'CONFIRMED', paymentRef: rawBody.pf_payment_id });

      // Cart-clearing lives here now, not in OrdersService.checkout — see
      // the comment there for why. Only a *confirmed* payment should
      // empty the cart; a cancelled or failed one (the `else` branch
      // below) leaves it exactly as the customer had it, so they don't
      // lose their selections over a payment that didn't go through.
      //
      // Scoped to THIS order's own line-item product IDs, not "clear
      // everything" — equivalent to a full clear for a normal order
      // (every cart item's product necessarily matches one of the
      // order's own lines), but for a split order (see
      // OrdersService.checkout's cartItemIds), this is what stops
      // confirming one destination's payment from wrongly wiping out a
      // sibling split order's items still awaiting their own payment.
      await this.cartService.clear(
        order.account.keycloakSub,
        order.account.email,
        order.lineItems.map((li) => li.productId),
      );

      // Queued after the status update succeeds, not before — a customer
      // should never get "your order is confirmed" if the actual status
      // change failed for some reason.
      await this.notificationsService.queueOrderConfirmed({
        recipientEmail: order.account.email,
        orderNumber: order.orderNumber,
        total: Number(order.total).toFixed(2),
      });
    } else {
      // FAILED, CANCELLED, or any other PayFast status — logged, not
      // thrown, since receiving and correctly not-confirming a failed
      // payment is success from this method's point of view, not an error.
      this.logger.log(`PayFast ITN for order ${order.id}: payment_status=${rawBody.payment_status} (no status change applied)`);
    }
  }

  private async confirmWithPayfast(validateUrl: string, rawBody: PayfastItnPayload): Promise<boolean> {
    const body = new URLSearchParams(
      Object.entries(rawBody).filter((entry): entry is [string, string] => entry[1] !== undefined),
    ).toString();

    try {
      const response = await fetch(validateUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
      const text = await response.text();
      return text.trim() === 'VALID';
    } catch (err) {
      this.logger.error(`PayFast validate-endpoint confirmation request failed: ${err}`);
      return false;
    }
  }

  private assertFieldOrderMatches(entries: [string, string][]): void {
    const actualOrder = entries.map(([key]) => key);
    const expectedOrder = [...CHECKOUT_SIGNATURE_FIELD_ORDER];
    const mismatch = actualOrder.some((key, i) => key !== expectedOrder[i]);
    if (mismatch) {
      throw new Error(
        'PayFast checkout field order does not match CHECKOUT_SIGNATURE_FIELD_ORDER — signature would be wrong',
      );
    }
  }

  private requireConfig(key: string): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new Error(`Missing required config for PayFast integration: ${key}`);
    }
    return value;
  }
}
