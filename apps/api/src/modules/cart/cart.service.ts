import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AccountType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CouponsService } from '../coupons/coupons.service';
import { round2, VAT_RATE } from '../../common/utils/money.util';
import { resolveBestTier } from '../../common/utils/price-tier.util';
import { AddCartItemDto, BulkAddCartItemsDto, UpdateCartItemDto } from './dto/cart-item.dto';
import { PricedCart } from './cart.interface';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accountsService: AccountsService,
    private readonly couponsService: CouponsService,
  ) {}

  async getCart(keycloakSub: string, email: string): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    return this.price(cart.id);
  }

  // Used by split checkout — prices only the specified subset of the
  // caller's own cart items, for one destination address at a time. Does
  // NOT verify the given item IDs actually belong to this account's own
  // cart here; OrdersService.checkout does that check itself (via the
  // Prisma where clause on cart.id already scoping to this account's own
  // cart row), since price()'s own query is already scoped that way —
  // an itemId belonging to someone else's cart simply wouldn't match and
  // would be silently excluded, not leak into this result.
  async getCartForItems(keycloakSub: string, email: string, itemIds: string[]): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    return this.price(cart.id, itemIds);
  }

  async addItem(keycloakSub: string, email: string, dto: AddCartItemDto): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    await this.assertProductExists(dto.productId);

    const existingLine = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId: dto.productId },
    });

    if (existingLine) {
      // Adding a product already in the cart increments quantity rather than
      // creating a duplicate line — one line per product, always.
      await this.prisma.cartItem.update({
        where: { id: existingLine.id },
        data: { quantity: existingLine.quantity + dto.quantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, productId: dto.productId, quantity: dto.quantity },
      });
    }

    await this.touchCart(cart.id);
    return this.price(cart.id);
  }

  // Trade portal's bulk-order page — one request instead of the client
  // looping N calls to addItem. Validates every product exists upfront in
  // a single query (not one findUnique per line) before touching the cart
  // at all: a bulk order with one bad productId should reject the whole
  // batch with a clear error, not partially apply and leave the customer
  // guessing which lines actually landed.
  async bulkAddItems(keycloakSub: string, email: string, dto: BulkAddCartItemsDto): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);

    const productIds = dto.items.map((item) => item.productId);
    const foundProducts = await this.prisma.product.findMany({ where: { id: { in: productIds } } });
    if (foundProducts.length !== new Set(productIds).size) {
      const foundIds = new Set(foundProducts.map((p) => p.id));
      const missing = productIds.filter((id) => !foundIds.has(id));
      throw new NotFoundException(`Unknown product id(s): ${missing.join(', ')}`);
    }

    const existingLines = await this.prisma.cartItem.findMany({
      where: { cartId: cart.id, productId: { in: productIds } },
    });
    const existingByProductId = new Map(existingLines.map((line) => [line.productId, line]));

    for (const item of dto.items) {
      const existing = existingByProductId.get(item.productId);
      if (existing) {
        await this.prisma.cartItem.update({
          where: { id: existing.id },
          data: { quantity: existing.quantity + item.quantity },
        });
      } else {
        await this.prisma.cartItem.create({
          data: { cartId: cart.id, productId: item.productId, quantity: item.quantity },
        });
      }
    }

    await this.touchCart(cart.id);
    return this.price(cart.id);
  }

  async updateItem(
    keycloakSub: string,
    email: string,
    cartItemId: string,
    dto: UpdateCartItemDto,
  ): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    await this.assertLineBelongsToCart(cartItemId, cart.id);

    await this.prisma.cartItem.update({ where: { id: cartItemId }, data: { quantity: dto.quantity } });
    await this.touchCart(cart.id);
    return this.price(cart.id);
  }

  async removeItem(keycloakSub: string, email: string, cartItemId: string): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    await this.assertLineBelongsToCart(cartItemId, cart.id);

    await this.prisma.cartItem.delete({ where: { id: cartItemId } });
    await this.touchCart(cart.id);
    return this.price(cart.id);
  }

  // productIds is optional — omitted, clears the whole cart (used
  // wherever a caller genuinely wants everything gone). Provided, clears
  // only cart items for those specific products — used by
  // PaymentsService.handleItn, which now ALWAYS passes the confirmed
  // order's own line-item product IDs rather than unconditionally
  // clearing everything. For a normal, non-split order this is exactly
  // equivalent to clearing the whole cart (every cart item's product
  // necessarily matches one of the order's own line items) — but for a
  // split order, it's the difference between correctly removing just
  // this destination's items and wrongly wiping out a sibling split
  // order's items that are still awaiting their own payment
  // confirmation.
  async clear(keycloakSub: string, email: string, productIds?: string[]): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id, ...(productIds ? { productId: { in: productIds } } : {}) },
    });
    return this.price(cart.id);
  }

  // Same upsert reasoning as AccountsService.resolveOrCreate — a
  // findUnique-then-create here raced two concurrent "first cart action"
  // requests against Cart.accountId's unique constraint.
  private async getOrCreateCart(keycloakSub: string, email: string) {
    const account = await this.accountsService.resolveOrCreate(keycloakSub, email);
    return this.prisma.cart.upsert({
      where: { accountId: account.id },
      update: {},
      create: { accountId: account.id },
    });
  }

  // The one place cart totals get computed — the frontend never sums line
  // items itself, it always renders whatever this returns.
  // itemIds is optional and additive — omitted (the default, existing
  // behavior everywhere except split checkout), this prices the whole
  // cart exactly as before. Provided, it scopes pricing to just that
  // subset — used by OrdersService.checkout when splitting one cart
  // across multiple destination addresses, where each split needs its
  // own independent subtotal/VAT/total for just the items going to that
  // address, not the whole cart's.
  private async price(cartId: string, itemIds?: string[]): Promise<PricedCart> {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        account: true,
        items: {
          where: itemIds ? { id: { in: itemIds } } : undefined,
          include: {
            product: {
              include: {
                images: { orderBy: { sortOrder: 'asc' }, take: 1 },
                priceTiers: true,
              },
            },
          },
        },
      },
    });

    const usingTradePricing = cart.account.type === AccountType.TRADE;

    const lines = cart.items.map((item) => {
      const baseUnitPrice = Number(usingTradePricing ? item.product.tradePrice : item.product.retailPrice);

      // The highest-qualifying tier for THIS line's own quantity — a
      // cart with the same product split across two separate line items
      // (which doesn't happen today, since adding an existing product
      // increments its one line rather than creating a second, but this
      // stays correct regardless) is only ever a per-line concept, not
      // a whole-cart running total across every line.
      const tier = resolveBestTier(
        (item.product.priceTiers ?? []).map((t) => ({
          minQuantity: t.minQuantity,
          discountPercent: Number(t.discountPercent),
        })),
        item.quantity,
      );
      const unitPrice = tier ? round2(baseUnitPrice * (1 - tier.discountPercent / 100)) : baseUnitPrice;

      return {
        cartItemId: item.id,
        productId: item.productId,
        productSlug: item.product.slug,
        name: item.product.name,
        imageUrl: item.product.images[0]?.url ?? null,
        unitPrice,
        baseUnitPrice,
        appliedTierDiscount: tier ? tier.discountPercent : null,
        quantity: item.quantity,
        lineTotal: round2(unitPrice * item.quantity),
      };
    });

    const subtotal = round2(lines.reduce((sum, l) => sum + l.lineTotal, 0));

    // Re-validated fresh here, every time — not just at apply-time. A
    // cart can change after a coupon is applied (an item removed drops
    // the subtotal below the coupon's minimum, or enough time passes
    // that it expires) — this is the one function every price a
    // customer sees goes through, so it's also the one place that must
    // never keep honoring a coupon that's stopped being valid, right up
    // to and including the final calculation checkout() itself uses.
    let discountAmount = 0;
    let couponError: string | null = null;
    if (cart.couponCode) {
      try {
        const result = await this.couponsService.validateAndCompute(cart.couponCode, cart.accountId, subtotal);
        discountAmount = result.discountAmount;
      } catch (err) {
        couponError = err instanceof Error ? err.message : 'This coupon is no longer valid';
      }
    }

    const discountedSubtotal = round2(subtotal - discountAmount);
    const vatAmount = round2(discountedSubtotal * VAT_RATE);
    const total = round2(discountedSubtotal + vatAmount);

    return {
      cartId,
      usingTradePricing,
      lines,
      subtotal,
      couponCode: cart.couponCode,
      discountAmount,
      couponError,
      vatAmount,
      total,
    };
  }

  // Validates immediately (via CouponsService, the single source of
  // truth for coupon rules — see its own comment) rather than just
  // saving whatever code the customer typed and letting the next
  // price() call discover it's invalid — applying a coupon should fail
  // loudly right away if it's wrong, not silently produce a couponError
  // the customer has to notice on their own.
  async applyCoupon(keycloakSub: string, email: string, code: string): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    const priced = await this.price(cart.id);

    // Validates against the CURRENT subtotal, throws with the specific
    // reason on failure — that exception propagates straight out of this
    // method, so an invalid code never gets saved onto the cart at all.
    await this.couponsService.validateAndCompute(code, cart.accountId, priced.subtotal);

    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: code.toUpperCase() } });
    return this.price(cart.id);
  }

  async removeCoupon(keycloakSub: string, email: string): Promise<PricedCart> {
    const cart = await this.getOrCreateCart(keycloakSub, email);
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: null } });
    return this.price(cart.id);
  }

  // Refreshes Cart.updatedAt (via Prisma's @updatedAt, which fires on any
  // write to the record, not just ones that explicitly set it) and clears
  // reminderSentAt — genuine cart-content activity should make a
  // previously-abandoned cart eligible for a fresh reminder again, not
  // stay permanently excluded by one sent long ago. Before this, nothing
  // ever wrote to the Cart row itself on item changes (only CartItem
  // rows) — Cart.updatedAt reflected cart CREATION, not last activity, a
  // real gap for anything that needs to know "when was this cart last
  // touched" (see CartAbandonmentService in the worker process).
  private async touchCart(cartId: string): Promise<void> {
    await this.prisma.cart.update({ where: { id: cartId }, data: { reminderSentAt: null } });
  }

  private async assertProductExists(productId: string): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException(`Product '${productId}' not found`);
    }
  }

  private async assertLineBelongsToCart(cartItemId: string, cartId: string): Promise<void> {
    const line = await this.prisma.cartItem.findUnique({ where: { id: cartItemId } });
    if (!line) {
      throw new NotFoundException(`Cart item '${cartItemId}' not found`);
    }
    if (line.cartId !== cartId) {
      // Deliberately not NotFound here — the item exists, it just isn't
      // this account's, and that distinction matters for anyone auditing
      // access-control behavior later.
      throw new ForbiddenException(`Cart item '${cartItemId}' does not belong to your cart`);
    }
  }
}
