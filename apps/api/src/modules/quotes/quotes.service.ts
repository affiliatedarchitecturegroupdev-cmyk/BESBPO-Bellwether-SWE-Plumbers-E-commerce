import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Order, Prisma, Quote } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { round2, VAT_RATE } from '../../common/utils/money.util';
import { generateOrderNumber } from '../../common/utils/order-number.util';
import { CreateQuoteDto } from './dto/create-quote.dto';
import { PriceQuoteDto } from './dto/price-quote.dto';
import { RespondToQuoteDto } from './dto/respond-to-quote.dto';
import { QueryQuotesDto } from './dto/query-quotes.dto';
import { ConvertQuoteToOrderDto } from './dto/convert-quote-to-order.dto';

const QUOTE_INCLUDE = { items: { include: { product: true } } } as const;

@Injectable()
export class QuotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly notificationsService: NotificationsService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async create(keycloakSub: string, email: string, dto: CreateQuoteDto): Promise<Quote> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);

    // Only validates that referenced products actually exist — doesn't
    // require every item to have one. A quote request can be entirely
    // custom line items (no productId at all), which is the whole reason
    // this isn't just "add these products to your cart" with a discount.
    const productIds = dto.items.map((item) => item.productId).filter((id): id is string => Boolean(id));
    if (productIds.length > 0) {
      const foundCount = await this.prisma.product.count({ where: { id: { in: productIds } } });
      if (foundCount !== new Set(productIds).size) {
        throw new BadRequestException('One or more referenced products do not exist');
      }
    }

    return this.prisma.quote.create({
      data: {
        accountId: account.id,
        description: dto.description,
        items: {
          create: dto.items.map((item) => ({
            productId: item.productId,
            description: item.description,
            quantity: item.quantity,
          })),
        },
      },
      include: QUOTE_INCLUDE,
    });
  }

  async findMine(keycloakSub: string, email: string, query: QueryQuotesDto) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const skip = (query.page - 1) * query.pageSize;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        where: { accountId: account.id },
        include: QUOTE_INCLUDE,
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count({ where: { accountId: account.id } }),
    ]);

    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async findOneForAccount(keycloakSub: string, email: string, id: string): Promise<Quote> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const quote = await this.findByIdOrThrow(id);

    if (quote.accountId !== account.id) {
      throw new ForbiddenException(`Quote '${id}' does not belong to your account`);
    }
    return quote;
  }

  // Admin path — every quote, plus the account it belongs to. Same
  // reasoning as OrdersService.findAllAdmin/findOneAdmin: the customer-
  // scoped methods above check ownership against the CALLER's own
  // account, which would incorrectly 403 an admin reviewing anyone else's
  // quote request.
  async findAllAdmin(query: QueryQuotesDto) {
    const skip = (query.page - 1) * query.pageSize;
    const [items, total] = await this.prisma.$transaction([
      this.prisma.quote.findMany({
        include: { ...QUOTE_INCLUDE, account: true },
        skip,
        take: query.pageSize,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.quote.count(),
    ]);
    return { items, page: query.page, pageSize: query.pageSize, total };
  }

  async findOneAdmin(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { ...QUOTE_INCLUDE, account: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quote '${id}' not found`);
    }
    return quote;
  }

  // Admin action, gated by 'quotes:manage' in the controller. Allowed
  // while REQUESTED or already QUOTED (correcting a mistake before the
  // customer responds) — not once ACCEPTED or DECLINED, since re-pricing
  // after the customer has already made a decision on different numbers
  // would be misleading.
  async priceQuote(id: string, dto: PriceQuoteDto, actorEmail: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, account: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quote '${id}' not found`);
    }
    if (quote.status !== 'REQUESTED' && quote.status !== 'QUOTED') {
      throw new ConflictException(`Quote '${id}' can no longer be priced (status: ${quote.status})`);
    }

    const itemIds = new Set(quote.items.map((item) => item.id));
    for (const priced of dto.itemPrices) {
      if (!itemIds.has(priced.itemId)) {
        throw new BadRequestException(`Item '${priced.itemId}' does not belong to quote '${id}'`);
      }
    }

    await this.prisma.$transaction([
      ...dto.itemPrices.map((priced) =>
        this.prisma.quoteItem.update({ where: { id: priced.itemId }, data: { unitPrice: priced.unitPrice } }),
      ),
      this.prisma.quote.update({
        where: { id },
        data: {
          status: 'QUOTED',
          quotedTotal: dto.quotedTotal,
          validUntil: new Date(dto.validUntil),
          adminNotes: dto.adminNotes,
        },
      }),
    ]);

    await this.notificationsService.queueQuotePriced({
      recipientEmail: quote.account.email,
      quoteId: quote.id,
      quotedTotal: dto.quotedTotal.toFixed(2),
      validUntil: dto.validUntil,
    });

    // Money-adjacent action (sets the price the customer will be asked to
    // pay) — same reasoning as the other 6 audited actions.
    await this.auditLogService.record({
      actorEmail,
      action: 'quote.priced',
      targetType: 'Quote',
      targetId: id,
      metadata: { quotedTotal: dto.quotedTotal, validUntil: dto.validUntil },
    });

    return this.findOneAdmin(id);
  }

  // Customer action — accept or decline a quoted price. Only valid while
  // QUOTED and not yet past its validity window; there's no separate
  // EXPIRED status, this checks validUntil directly at response time
  // instead.
  async respondToQuote(
    keycloakSub: string,
    email: string,
    id: string,
    dto: RespondToQuoteDto,
  ): Promise<Quote> {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    const quote = await this.findByIdOrThrow(id);

    if (quote.accountId !== account.id) {
      throw new ForbiddenException(`Quote '${id}' does not belong to your account`);
    }
    if (quote.status !== 'QUOTED') {
      throw new ConflictException(`Quote '${id}' is not awaiting a response (status: ${quote.status})`);
    }
    if (quote.validUntil && quote.validUntil < new Date()) {
      throw new ConflictException(`Quote '${id}' has expired — contact us for an updated price`);
    }

    const updated = await this.prisma.quote.update({
      where: { id },
      data: { status: dto.response },
      include: QUOTE_INCLUDE,
    });

    // Self-service, like OrdersService's customer-initiated cancellation —
    // actorEmail is the customer's own, not an admin's.
    await this.auditLogService.record({
      actorEmail: email,
      action: dto.response === 'ACCEPTED' ? 'quote.accepted_by_customer' : 'quote.declined_by_customer',
      targetType: 'Quote',
      targetId: id,
      metadata: { quotedTotal: quote.quotedTotal?.toString() ?? null },
    });

    return updated;
  }

  // Admin action — creates a real Order directly from an ACCEPTED quote's
  // negotiated prices, bypassing the normal cart/checkout flow entirely.
  // Rejected outright, not silently worked around, if any item has no
  // productId: OrderLineItem.productId is a required FK in the schema,
  // so a pure free-text/custom line item (e.g. "on-site labour, 2 days")
  // cannot become an order line item today. Each QuoteItem.unitPrice is
  // treated as VAT-INCLUSIVE — the price actually quoted to and accepted
  // by the customer — and VAT is backed out of that total rather than
  // added on top, so the order's total always matches what was actually
  // agreed, never a recalculated figure that could drift from it.
  async convertToOrder(id: string, dto: ConvertQuoteToOrderDto, actorEmail: string): Promise<Order> {
    const quote = await this.prisma.quote.findUnique({
      where: { id },
      include: { items: true, account: true },
    });
    if (!quote) {
      throw new NotFoundException(`Quote '${id}' not found`);
    }
    if (quote.status !== 'ACCEPTED') {
      throw new ConflictException(`Quote '${id}' must be ACCEPTED before it can become an order`);
    }
    if (quote.orderId) {
      throw new ConflictException(`Quote '${id}' has already been converted to an order`);
    }

    const nonCatalogItems = quote.items.filter((item) => !item.productId);
    if (nonCatalogItems.length > 0) {
      throw new BadRequestException(
        `Quote '${id}' has custom line item(s) with no catalog product and cannot be converted automatically: ` +
          nonCatalogItems.map((item) => item.description).join(', '),
      );
    }

    const totalInclusive = round2(
      quote.items.reduce((sum, item) => sum + Number(item.unitPrice ?? 0) * item.quantity, 0),
    );
    const subtotal = round2(totalInclusive / (1 + VAT_RATE));
    const vatAmount = round2(totalInclusive - subtotal);

    const order = await this.prisma.$transaction(async (tx) => {
      // Same atomic check-and-decrement as OrdersService.checkout — the
      // WHERE clause only matches if stock still covers the quantity, so
      // this can't be separated by a race from a concurrent sale of the
      // same product. Duplicated here rather than calling OrdersService,
      // for the same reason TradeCreditService's drawdown logic is
      // duplicated in OrdersService.checkout: this needs to run inside
      // THIS transaction, using `tx`, not a separate service call against
      // the shared, non-transactional PrismaService.
      for (const item of quote.items) {
        const result = await tx.product.updateMany({
          where: { id: item.productId as string, stockQty: { gte: item.quantity } },
          data: { stockQty: { decrement: item.quantity } },
        });
        if (result.count === 0) {
          throw new ConflictException(
            `Insufficient stock for '${item.description}' — it may have sold out since this quote was accepted.`,
          );
        }
      }

      const products = await tx.product.findMany({ where: { id: { in: quote.items.map((i) => i.productId as string) } } });
      const productsById = new Map(products.map((p) => [p.id, p]));

      const created = await tx.order.create({
        data: {
          orderNumber: generateOrderNumber(),
          accountId: quote.accountId,
          shippingAddress: dto.shippingAddress as unknown as Prisma.InputJsonValue,
          subtotal,
          vatAmount,
          deliveryFee: 0,
          total: totalInclusive,
          usedTradePricing: false, // pricing here is the quote's own negotiated figure, not derived from either retail or trade price lists
          status: 'CONFIRMED', // already accepted and (per this workflow's design) invoiced/paid for outside the storefront
          lineItems: {
            create: quote.items.map((item) => ({
              productId: item.productId as string,
              productName: productsById.get(item.productId as string)?.name ?? item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice as Prisma.Decimal,
              lineTotal: round2(Number(item.unitPrice) * item.quantity),
            })),
          },
        },
        include: { lineItems: true },
      });

      await tx.quote.update({ where: { id }, data: { orderId: created.id } });

      return created;
    });

    await this.notificationsService.queueOrderConfirmed({
      recipientEmail: quote.account.email,
      orderNumber: order.orderNumber,
      total: totalInclusive.toFixed(2),
    });

    await this.auditLogService.record({
      actorEmail,
      action: 'quote.converted_to_order',
      targetType: 'Quote',
      targetId: id,
      metadata: { orderId: order.id, total: totalInclusive },
    });

    return order;
  }

  private async findByIdOrThrow(id: string): Promise<Quote> {
    const quote = await this.prisma.quote.findUnique({ where: { id }, include: QUOTE_INCLUDE });
    if (!quote) {
      throw new NotFoundException(`Quote '${id}' not found`);
    }
    return quote;
  }
}
