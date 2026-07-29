import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Order, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CartService } from '../cart/cart.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { InvoiceService } from './invoice.service';
import { round2 } from '../../common/utils/money.util';
import { generateOrderNumber } from '../../common/utils/order-number.util';
import { resolveTrackingUrl } from '../../common/utils/courier.util';
import { CheckoutDto, CheckoutPaymentMethod } from './dto/checkout.dto';
import { ShippingAddressDto } from './dto/shipping-address.dto';
import { GuestCheckoutDto } from './dto/guest-checkout.dto';
import { QueryOrdersDto } from './dto/query-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

const ORDER_INCLUDE = { lineItems: { include: { product: true } } } as const;

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly cartService: CartService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
    private readonly invoiceService: InvoiceService,
  ) {}

  // The cart is the source of pricing truth right up until this point — from
  // here on, the order is an immutable snapshot. Later cart/price changes
  // (a product's price updates, a promotion ends) must never retroactively
  // change what an already-placed order shows or charges.
  //
  // Known limitation: the cart is priced (read) before the transaction
  // starts, so a concurrent cart edit between that read and the write below
  // wins the race silently rather than being detected and rejected. Fine
  // for expected traffic patterns (a customer isn't editing their own cart
  // from two tabs simultaneously in practice), but worth knowing about
  // before assuming this is airtight under real concurrency.
  async checkout(keycloakSub: string, email: string, dto: CheckoutDto): Promise<Order> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const pricedCart = dto.cartItemIds
      ? await this.cartService.getCartForItems(keycloakSub, email, dto.cartItemIds)
      : await this.cartService.getCart(keycloakSub, email);

    if (pricedCart.lines.length === 0) {
      throw new BadRequestException('Cannot check out an empty cart');
    }

    // A coupon's own minSubtotal/usage rules were validated against the
    // WHOLE cart's subtotal (see CouponsService.validateAndCompute, and
    // CartService.price, which is what actually ran that check). Once
    // split, each destination has its own, smaller subtotal — which one
    // (if any) should legitimately keep the discount is genuinely
    // ambiguous, not just an inconvenient edge case, so this blocks the
    // combination outright with a clear, actionable message rather than
    // silently picking an answer (applying it to every split, which
    // could multiply a percentage discount well beyond what the coupon's
    // own rules ever intended, or arbitrarily to just the first one).
    if (dto.cartItemIds && pricedCart.couponCode) {
      throw new BadRequestException(
        'Remove the applied coupon before splitting checkout across multiple addresses',
      );
    }

    const deliveryFee = dto.deliveryFee ?? 0;
    const total = round2(pricedCart.total + deliveryFee);
    const paymentMethod = dto.paymentMethod ?? CheckoutPaymentMethod.PAYFAST;
    const isTradeCredit = paymentMethod === CheckoutPaymentMethod.TRADE_CREDIT;

    // Resolved BEFORE the transaction starts — a missing or unapproved
    // trade credit account should fail fast with a clear error, not
    // partway through a transaction that's already decremented stock.
    let tradeCreditAccountId: string | null = null;
    if (isTradeCredit) {
      const tradeCreditAccount = await this.prisma.tradeCreditAccount.findUnique({
        where: { accountId: account.id },
      });
      if (!tradeCreditAccount || !tradeCreditAccount.approvedAt) {
        throw new BadRequestException('No approved trade credit account — contact us to set one up');
      }
      tradeCreditAccountId = tradeCreditAccount.id;
    }

    // Order creation and the stock check-and-decrement happen in one
    // transaction: either both succeed or neither does. Cart-clearing is
    // part of this transaction ONLY for trade credit (see below) — for
    // PayFast it moved to payment confirmation instead of order creation
    // (see PaymentsService.handleItn for why).
    const order = await this.prisma.$transaction(async (tx) => {
      // Stock check-and-decrement, one product at a time, each atomic at
      // the database level: updateMany's WHERE only matches if stockQty is
      // still >= what's being ordered, so the decrement and the check
      // can't be separated by a race the way a read-then-write would allow
      // (two concurrent checkouts both reading "5 in stock" and both
      // deciding it's fine to take 3). If two checkouts race for the last
      // units, exactly one succeeds; the other's updateMany matches zero
      // rows and the whole transaction rolls back for that request.
      for (const line of pricedCart.lines) {
        const result = await tx.product.updateMany({
          where: { id: line.productId, stockQty: { gte: line.quantity } },
          data: { stockQty: { decrement: line.quantity } },
        });
        if (result.count === 0) {
          throw new ConflictException(
            `Insufficient stock for '${line.name}' — it may have just sold out or dropped below the quantity in your cart.`,
          );
        }
      }

      // Credit check-and-drawdown — same atomic pattern as
      // TradeCreditService.recordDrawdown (raw SQL, since it compares two
      // columns of the same row: creditUsed + amount vs creditLimit,
      // which Prisma's query builder can't express as a single atomic
      // WHERE condition). Deliberately duplicated here rather than
      // calling that service method: this needs to run inside THIS
      // transaction, using `tx` not the shared PrismaService — a credit
      // reservation that committed on its own, before knowing whether the
      // order itself would succeed, could reserve credit for an order
      // that's about to fail on stock and never actually get created. See
      // docs/AGENTS.md for the cross-reference to keep both copies of
      // this logic in sync if the rule ever changes.
      if (isTradeCredit && tradeCreditAccountId) {
        const creditResult = await tx.$executeRaw`
          UPDATE trade_credit_accounts
          SET "creditUsed" = "creditUsed" + ${total}, "updatedAt" = now()
          WHERE id = ${tradeCreditAccountId}
            AND "creditUsed" + ${total} <= "creditLimit"
        `;
        if (creditResult === 0) {
          throw new BadRequestException('This order would exceed your available trade credit');
        }
      }

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          accountId: account.id,
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          subtotal: pricedCart.subtotal,
          vatAmount: pricedCart.vatAmount,
          deliveryFee,
          total,
          usedTradePricing: pricedCart.usingTradePricing,
          poNumber: dto.poNumber,
          placedByEmail: email,
          // Both sourced from pricedCart, which already ran the discount
          // through CouponsService.validateAndCompute as part of pricing
          // this exact cart (see CartService.price) — this is a snapshot
          // of what that computed, not a second, separate calculation.
          // If the coupon had become invalid by checkout time,
          // pricedCart.discountAmount is already 0 and pricedCart.total
          // already reflects full price — nothing extra to handle here.
          couponCode: pricedCart.couponCode,
          discountAmount: pricedCart.discountAmount,
          // Trade credit confirms immediately — there's no separate
          // payment step to wait for the way PayFast's redirect+ITN flow
          // has. PayFast orders stay PENDING until handleItn confirms them.
          status: isTradeCredit ? 'CONFIRMED' : 'PENDING',
          paymentGateway: isTradeCredit ? 'trade_credit' : null,
          lineItems: {
            create: pricedCart.lines.map((line) => ({
              productId: line.productId,
              productName: line.name,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              lineTotal: line.lineTotal,
            })),
          },
        },
        include: ORDER_INCLUDE,
      });

      // Only when a discount actually applied — pricedCart.discountAmount
      // is 0 whenever couponCode is null OR the coupon stopped validating
      // between apply-time and checkout (see CartService.price), so this
      // condition alone correctly covers both "no coupon" and "coupon
      // became invalid" without needing to check couponCode separately.
      // Same transaction as order creation — a CouponRedemption can never
      // exist without the order it belongs to, or vice versa.
      if (pricedCart.couponCode && pricedCart.discountAmount > 0) {
        await tx.couponRedemption.create({
          data: {
            couponId: (await tx.coupon.findUniqueOrThrow({ where: { code: pricedCart.couponCode } })).id,
            accountId: account.id,
            orderId: created.id,
            discountAmount: pricedCart.discountAmount,
          },
        });
      }

      // Trade credit orders clear the cart immediately, in the same
      // transaction as everything above — unlike PayFast, there's no
      // async confirmation step to wait for; the instant this transaction
      // commits, the order is paid. PayFast orders deliberately do NOT
      // clear the cart here — see the comment on PaymentsService.handleItn
      // for why that moved to payment confirmation (fixes losing a cart
      // on a cancelled payment).
      //
      // Cart.couponCode itself is deliberately NOT cleared here, for
      // either payment method — a stated, deliberate scope decision, not
      // an oversight. A limited-use coupon self-corrects on its own: the
      // NEXT price() call re-validates via CouponsService, finds the
      // fresh CouponRedemption row just created above, and surfaces
      // couponError once maxUsesPerAccount is hit. An unlimited coupon
      // staying applied to a new cart is treated as acceptable standing-
      // promo behavior, not a bug worth the extra complexity of also
      // clearing it in PaymentsService.handleItn for the PayFast path.
      if (isTradeCredit) {
        const cart = await tx.cart.findUnique({ where: { accountId: account.id } });
        if (cart) {
          // Scoped to just the checked-out items when this is one leg of
          // a split checkout — clearing the WHOLE cart here would wrongly
          // remove items still destined for a sibling split order not
          // yet checked out. Omitted (normal, non-split checkout),
          // clears everything, exactly as before this field existed.
          await tx.cartItem.deleteMany({
            where: { cartId: cart.id, ...(dto.cartItemIds ? { id: { in: dto.cartItemIds } } : {}) },
          });
        }
      }

      return created;
    });

    // Queued after the transaction commits, not before — a customer
    // should never get "your order is confirmed" if the transaction
    // actually rolled back. PayFast orders get this same notification
    // later, from PaymentsService.handleItn once their ITN confirms.
    if (isTradeCredit) {
      await this.notificationsService.queueOrderConfirmed({
        recipientEmail: email,
        orderNumber: order.orderNumber,
        total: Number(order.total).toFixed(2),
      });
    }

    return order;
  }

  // Guest checkout — completes a purchase without ever requiring a real
  // Keycloak login first. Deliberately a thin wrapper around checkout()
  // above, not a parallel implementation: resolve/create a guest Account
  // (see AccountsService.resolveOrCreateGuest), add the requested items
  // to THAT account's cart, then call this same service's own checkout()
  // with its synthetic keycloakSub/email — every atomic stock-decrement,
  // pricing, and order-creation guarantee checkout() already has applies
  // here too, for free, rather than needing to be reimplemented and
  // re-verified separately.
  //
  // NOT exposed as its own HTTP endpoint — order creation alone leaves a
  // guest with no way to ever pay for it (no PayFast fields, and no way
  // to retroactively call the guarded payfast/checkout endpoint without a
  // real JWT). PaymentsService.guestCheckoutWithPayment is the actual
  // public entry point, calling this method as one step before also
  // initiating PayFast payment in the same response.
  //
  // PayFast only, not a client-supplied choice — a guest account was
  // never approved for trade credit (there's no TradeCreditAccount row
  // for it, so checkout() would reject TRADE_CREDIT anyway), but this
  // makes the restriction explicit at the guest-checkout entry point
  // rather than relying on that fallback rejection alone.
  async guestCheckout(dto: GuestCheckoutDto): Promise<Order> {
    const account = await this.accountsService.resolveOrCreateGuest(dto.email, dto.companyName, dto.phone);

    await this.cartService.bulkAddItems(account.keycloakSub, account.email, { items: dto.items });

    return this.checkout(account.keycloakSub, account.email, {
      shippingAddress: dto.shippingAddress,
      poNumber: dto.poNumber,
      paymentMethod: CheckoutPaymentMethod.PAYFAST,
    });
  }

  async findMine(keycloakSub: string, email: string, query: QueryOrdersDto) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        where: { accountId: account.id },
        include: ORDER_INCLUDE,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where: { accountId: account.id } }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  // Admin path — every order, not scoped to a single account, plus the
  // account it belongs to (an admin managing order status needs to know
  // whose order this is; a customer viewing their own via findMine
  // already knows).
  async findAllAdmin(query: QueryOrdersDto) {
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.order.findMany({
        include: { ...ORDER_INCLUDE, account: true },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count(),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async findOneForAccount(keycloakSub: string, email: string, orderId: string): Promise<Order> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const order = await this.findByIdOrThrow(orderId);

    if (order.accountId !== account.id) {
      throw new ForbiddenException(`Order '${orderId}' does not belong to your account`);
    }
    return order;
  }

  // Public, no-auth order lookup for guest checkout customers — "check
  // my order status" without ever needing to create an account. Matches
  // by orderNumber (the human-readable reference a guest would actually
  // have from their confirmation email) + email together, and
  // deliberately throws the exact same NotFoundException for "no such
  // order number" as for "that email doesn't match this order" — an
  // attacker probing real order numbers shouldn't be able to tell the
  // two apart, since a distinguishable error would confirm which order
  // numbers are real.
  async findByOrderNumberAndEmail(orderNumber: string, email: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { orderNumber },
      include: { ...ORDER_INCLUDE, account: { select: { email: true } } },
    });

    if (!order || order.account.email.toLowerCase() !== email.trim().toLowerCase()) {
      throw new NotFoundException(`No order found for that order number and email`);
    }
    return order;
  }

  // Customer self-service — same ownership check as findOneForAccount
  // above, not a separate concern. Fetches its own include shape
  // (lineItems + account's email/companyName) rather than reusing
  // ORDER_INCLUDE, since nothing else needs the account relation and
  // adding it there would be a small, permanent over-fetch on every
  // other order lookup for the sake of this one use. Returns the order
  // number alongside the buffer so the controller can build a real,
  // meaningful downloaded filename rather than a generic "invoice.pdf".
  async getInvoicePdf(
    keycloakSub: string,
    email: string,
    orderId: string,
  ): Promise<{ buffer: Buffer; orderNumber: string }> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const order = await this.fetchOrderForInvoice(orderId);

    if (order.accountId !== account.id) {
      throw new ForbiddenException(`Order '${orderId}' does not belong to your account`);
    }
    return { buffer: await this.invoiceService.generate(order), orderNumber: order.orderNumber };
  }

  async getInvoicePdfAdmin(orderId: string): Promise<{ buffer: Buffer; orderNumber: string }> {
    const order = await this.fetchOrderForInvoice(orderId);
    return { buffer: await this.invoiceService.generate(order), orderNumber: order.orderNumber };
  }

  private async fetchOrderForInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { lineItems: true, account: { select: { email: true, companyName: true } } },
    });
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }

  // Customer self-service — deliberately narrow. Only the delivery
  // address, not line items or quantities: those would touch payment
  // already captured via PayFast for the original total and stock
  // already decremented at checkout, both real, separate undertakings
  // (a partial refund/re-charge reconciliation, and releasing/
  // re-reserving stock) not attempted here — see
  // docs/GAP-ANALYSIS-III-FEATURE-EXPANSION.md §6.7. An address
  // correction touches neither, so it's safe to allow directly.
  // Same status boundary as cancellation's spirit, but not identical:
  // PROCESSING still allows an address fix (the order hasn't left yet),
  // where PaymentsService.cancelOrder itself stops at CONFIRMED — a
  // deliberate difference, not an inconsistency: cancelling an order
  // already being prepared undoes real work in progress, correcting
  // where it's going does not.
  async amendAddress(
    keycloakSub: string,
    email: string,
    orderId: string,
    shippingAddress: ShippingAddressDto,
  ): Promise<Order> {
    const order = await this.findOneForAccount(keycloakSub, email, orderId);

    if (!['PENDING', 'CONFIRMED', 'PROCESSING'].includes(order.status)) {
      throw new ConflictException(
        `Order '${orderId}' has already been dispatched and its delivery address can no longer be changed`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { shippingAddress: shippingAddress as unknown as Prisma.InputJsonValue },
      include: ORDER_INCLUDE,
    });

    await this.auditLogService.record({
      actorEmail: email,
      action: 'order.address_amended',
      targetType: 'Order',
      targetId: orderId,
      metadata: {},
    });

    return updated;
  }

  // Admin path — bypasses the ownership check entirely. Needed because
  // findOneForAccount above checks order.accountId against the CALLER's
  // own account — for an admin looking at a customer's order, those are
  // almost never the same account, so findOneForAccount would incorrectly
  // 403 an admin trying to view any order that isn't their own personal
  // purchase history. Caught while building the admin order detail page,
  // not before. Includes account (unlike findByIdOrThrow's shape) since
  // the admin page needs to show whose order this is.
  async findOneAdmin(orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ...ORDER_INCLUDE, account: true },
    });
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }

  // Admin/webhook path — not account-scoped, gated by the 'orders:manage'
  // scope in the controller instead. PaymentsService's PayFast ITN handler
  // calls this with paymentRef set; the admin panel calls it without one
  // for manual status changes (e.g. DISPATCHED).
  // actorEmail defaults to 'system:payfast-itn' because this method has
  // two callers: a human admin via the controller (passes their real
  // email), and PaymentsService.handleItn's webhook confirming a payment
  // (no human involved at all) — the audit trail should say so honestly
  // rather than attribute a webhook-triggered change to whichever admin
  // happened to be logged in most recently, or leave it blank.
  async updateStatus(
    orderId: string,
    dto: UpdateOrderStatusDto,
    actorEmail: string = 'system:payfast-itn',
  ): Promise<Order> {
    const before = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { ...ORDER_INCLUDE, account: true },
    });
    if (!before) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: dto.status,
        ...(dto.paymentRef ? { paymentRef: dto.paymentRef } : {}),
        ...(dto.courierName !== undefined ? { courierName: dto.courierName } : {}),
        ...(dto.trackingNumber !== undefined ? { trackingNumber: dto.trackingNumber } : {}),
        ...(dto.trackingUrl !== undefined ? { trackingUrl: dto.trackingUrl } : {}),
      },
      include: ORDER_INCLUDE,
    });

    await this.auditLogService.record({
      actorEmail,
      action: 'order.status_updated',
      targetType: 'Order',
      targetId: orderId,
      metadata: { from: before.status, to: dto.status },
    });

    // Only on a genuine transition — an admin re-saving DISPATCHED (e.g.
    // correcting a typo'd tracking number) shouldn't re-send the "your
    // order has shipped" email a second time. Fires even without tracking
    // info supplied: "it's on its way" is still worth telling the
    // customer, the tracking section of the email just stays empty in
    // that case (see the template's conditional trackingLine).
    if (before.status !== 'DISPATCHED' && dto.status === 'DISPATCHED') {
      await this.notificationsService.queueOrderShipped({
        recipientEmail: before.account.email,
        recipientPhone: before.account.phone,
        orderNumber: updated.orderNumber,
        courierName: updated.courierName,
        trackingNumber: updated.trackingNumber,
        trackingUrl: resolveTrackingUrl(updated.courierName, updated.trackingUrl),
      });
    }

    return updated;
  }

  private async findByIdOrThrow(orderId: string): Promise<Order> {
    const order = await this.prisma.order.findUnique({ where: { id: orderId }, include: ORDER_INCLUDE });
    if (!order) {
      throw new NotFoundException(`Order '${orderId}' not found`);
    }
    return order;
  }
}
