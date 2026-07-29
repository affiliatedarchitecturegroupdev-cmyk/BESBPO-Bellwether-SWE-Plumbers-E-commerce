import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { CouponsService } from '../coupons/coupons.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('CartService', () => {
  let service: CartService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };
  let couponsService: { validateAndCompute: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const mockCart = { id: 'cart-1', accountId: 'acc-1' };

  const productFixture = {
    id: 'prod-1',
    slug: 'test-product',
    name: 'Test Product',
    retailPrice: 100,
    tradePrice: 80,
    images: [{ url: 'https://bucket.s3.af-south-1.amazonaws.com/products/prod-1/img.jpg' }],
    priceTiers: [] as { minQuantity: number; discountPercent: number }[],
  };

  function cartWithAccountType(type: 'RETAIL' | 'TRADE') {
    return {
      id: 'cart-1',
      accountId: 'acc-1',
      account: { type },
      items: [{ id: 'ci-1', productId: 'prod-1', quantity: 2, product: productFixture }],
    };
  }

  function cartWithCoupon(couponCode: string | null) {
    return { ...cartWithAccountType('RETAIL'), couponCode };
  }

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };
    couponsService = { validateAndCompute: jest.fn() };
    prisma.cart.upsert.mockResolvedValue(mockCart as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
        { provide: CouponsService, useValue: couponsService },
      ],
    }).compile();

    service = module.get(CartService);
  });

  describe('getCart — pricing', () => {
    it('prices lines at retail rate for a RETAIL account', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.usingTradePricing).toBe(false);
      expect(result.lines[0].unitPrice).toBe(100);
      expect(result.lines[0].lineTotal).toBe(200);
      expect(result.subtotal).toBe(200);
    });

    it('prices lines at trade rate for a TRADE account', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('TRADE') as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.usingTradePricing).toBe(true);
      expect(result.lines[0].unitPrice).toBe(80);
      expect(result.lines[0].lineTotal).toBe(160);
    });

    it('includes the product slug and first image on each line', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].productSlug).toBe('test-product');
      expect(result.lines[0].imageUrl).toBe('https://bucket.s3.af-south-1.amazonaws.com/products/prod-1/img.jpg');
    });

    it('sets imageUrl to null for a product with no images, rather than throwing', async () => {
      const cart = cartWithAccountType('RETAIL');
      cart.items[0].product = { ...productFixture, images: [] };
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cart as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].imageUrl).toBeNull();
    });

    it('computes VAT at 15% of subtotal, and total as subtotal + VAT', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.vatAmount).toBe(30); // 15% of 200
      expect(result.total).toBe(230);
    });
  });

  describe('addItem', () => {
    it('increments quantity on the existing line rather than creating a duplicate', async () => {
      prisma.product.findUnique.mockResolvedValue(productFixture as never);
      prisma.cartItem.findFirst.mockResolvedValue({ id: 'ci-1', quantity: 2 } as never);
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.addItem('sub-1', 'buyer@example.com', { productId: 'prod-1', quantity: 3 });

      expect(prisma.cartItem.update).toHaveBeenCalledWith({
        where: { id: 'ci-1' },
        data: { quantity: 5 },
      });
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
    });

    it('creates a new line when the product is not already in the cart', async () => {
      prisma.product.findUnique.mockResolvedValue(productFixture as never);
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.addItem('sub-1', 'buyer@example.com', { productId: 'prod-1', quantity: 1 });

      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', productId: 'prod-1', quantity: 1 },
      });
    });

    it('throws NotFoundException for an unknown product', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.addItem('sub-1', 'buyer@example.com', { productId: 'missing', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('bulkAddItems', () => {
    const bulkDto = { items: [{ productId: 'prod-1', quantity: 5 }, { productId: 'prod-2', quantity: 10 }] };

    it('throws NotFoundException listing every missing product, without touching the cart', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }] as never); // prod-2 missing

      await expect(service.bulkAddItems('sub-1', 'buyer@example.com', bulkDto)).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.cartItem.create).not.toHaveBeenCalled();
      expect(prisma.cartItem.update).not.toHaveBeenCalled();
    });

    it('increments existing lines and creates new ones in the same batch', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1' }, { id: 'prod-2' }] as never);
      prisma.cartItem.findMany.mockResolvedValue([{ id: 'ci-1', productId: 'prod-1', quantity: 2 }] as never);
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.bulkAddItems('sub-1', 'buyer@example.com', bulkDto);

      // prod-1 already had a line (qty 2) — bulk adds 5 more, becomes 7.
      expect(prisma.cartItem.update).toHaveBeenCalledWith({ where: { id: 'ci-1' }, data: { quantity: 7 } });
      // prod-2 had no line yet — created fresh with the requested quantity.
      expect(prisma.cartItem.create).toHaveBeenCalledWith({
        data: { cartId: 'cart-1', productId: 'prod-2', quantity: 10 },
      });
    });
  });

  describe('ownership checks (updateItem/removeItem)', () => {
    it('throws ForbiddenException when the cart item belongs to a different cart', async () => {
      prisma.cartItem.findUnique.mockResolvedValue({ id: 'ci-1', cartId: 'someone-elses-cart' } as never);

      await expect(
        service.updateItem('sub-1', 'buyer@example.com', 'ci-1', { quantity: 2 }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the cart item does not exist at all', async () => {
      prisma.cartItem.findUnique.mockResolvedValue(null);
      await expect(service.removeItem('sub-1', 'buyer@example.com', 'missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('touchCart — clears reminder eligibility and refreshes updatedAt on real activity', () => {
    beforeEach(() => {
      prisma.cartItem.findFirst.mockResolvedValue(null);
      prisma.cartItem.findUnique.mockResolvedValue({ id: 'ci-1', cartId: 'cart-1' } as never);
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);
    });

    it('resets reminderSentAt on addItem', async () => {
      await service.addItem('sub-1', 'buyer@example.com', { productId: 'prod-1', quantity: 1 });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { reminderSentAt: null },
      });
    });

    it('resets reminderSentAt on updateItem', async () => {
      await service.updateItem('sub-1', 'buyer@example.com', 'ci-1', { quantity: 3 });
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { reminderSentAt: null },
      });
    });

    it('resets reminderSentAt on removeItem', async () => {
      await service.removeItem('sub-1', 'buyer@example.com', 'ci-1');
      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { reminderSentAt: null },
      });
    });

    it('does NOT touch the cart on a plain getCart read — only real content changes count as activity', async () => {
      await service.getCart('sub-1', 'buyer@example.com');
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });
  });

  describe('price() — coupon behavior', () => {
    it('applies zero discount and no error when no coupon is on the cart', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon(null) as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.couponCode).toBeNull();
      expect(result.discountAmount).toBe(0);
      expect(result.couponError).toBeNull();
      expect(couponsService.validateAndCompute).not.toHaveBeenCalled();
    });

    it('reduces VAT and total correctly — VAT is calculated on the DISCOUNTED subtotal, not the original', async () => {
      // subtotal is 200 (2 x R100 retail) from productFixture/cartWithAccountType
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon('SAVE50') as never);
      couponsService.validateAndCompute.mockResolvedValue({ coupon: { code: 'SAVE50' }, discountAmount: 50 });

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.discountAmount).toBe(50);
      expect(result.vatAmount).toBe(22.5); // 15% of (200 - 50) = 22.5, not 15% of 200
      expect(result.total).toBe(172.5); // 150 + 22.5
    });

    it('re-validates the coupon against the CURRENT subtotal on every price() call, not just at apply time', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon('SAVE50') as never);
      couponsService.validateAndCompute.mockResolvedValue({ coupon: { code: 'SAVE50' }, discountAmount: 50 });

      await service.getCart('sub-1', 'buyer@example.com');

      expect(couponsService.validateAndCompute).toHaveBeenCalledWith('SAVE50', 'acc-1', 200);
    });

    it('surfaces a specific couponError and applies zero discount when the coupon no longer validates — never silently drops it without explanation', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon('EXPIRED10') as never);
      couponsService.validateAndCompute.mockRejectedValue(new Error('This coupon has expired'));

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.couponCode).toBe('EXPIRED10'); // still shown — the customer's entered code isn't hidden
      expect(result.discountAmount).toBe(0);
      expect(result.couponError).toBe('This coupon has expired');
      expect(result.total).toBe(230); // full price, no discount applied
    });
  });

  describe('applyCoupon', () => {
    it('validates before saving — an invalid code is never persisted onto the cart', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon(null) as never);
      couponsService.validateAndCompute.mockRejectedValue(new Error("Coupon code 'BADCODE' doesn't exist"));

      await expect(service.applyCoupon('sub-1', 'buyer@example.com', 'BADCODE')).rejects.toThrow(
        "Coupon code 'BADCODE' doesn't exist",
      );
      expect(prisma.cart.update).not.toHaveBeenCalled();
    });

    it('normalizes the code to uppercase when saving, matching CouponsService\u2019s own normalization', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon(null) as never);
      couponsService.validateAndCompute.mockResolvedValue({ coupon: {}, discountAmount: 20 });

      await service.applyCoupon('sub-1', 'buyer@example.com', 'save10');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponCode: 'SAVE10' },
      });
    });
  });

  describe('removeCoupon', () => {
    it('clears couponCode on the cart', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithCoupon(null) as never);

      await service.removeCoupon('sub-1', 'buyer@example.com');

      expect(prisma.cart.update).toHaveBeenCalledWith({
        where: { id: 'cart-1' },
        data: { couponCode: null },
      });
    });
  });

  describe('price() — tiered/volume pricing', () => {
    function cartWithQuantityAndTiers(quantity: number, priceTiers: { minQuantity: number; discountPercent: number }[]) {
      return {
        id: 'cart-1',
        accountId: 'acc-1',
        account: { type: 'RETAIL' },
        items: [
          {
            id: 'ci-1',
            productId: 'prod-1',
            quantity,
            product: { ...productFixture, priceTiers },
          },
        ],
      };
    }

    it('charges the plain base price when the quantity does not qualify for any tier', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(
        cartWithQuantityAndTiers(5, [{ minQuantity: 10, discountPercent: 5 }]) as never,
      );

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].unitPrice).toBe(100);
      expect(result.lines[0].baseUnitPrice).toBe(100);
      expect(result.lines[0].appliedTierDiscount).toBeNull();
      expect(result.lines[0].lineTotal).toBe(500);
    });

    it('applies the qualifying tier discount to unitPrice and lineTotal, while baseUnitPrice stays the undiscounted price', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(
        cartWithQuantityAndTiers(10, [{ minQuantity: 10, discountPercent: 5 }]) as never,
      );

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].baseUnitPrice).toBe(100);
      expect(result.lines[0].unitPrice).toBe(95); // 100 * (1 - 5/100)
      expect(result.lines[0].appliedTierDiscount).toBe(5);
      expect(result.lines[0].lineTotal).toBe(950); // 95 * 10
    });

    it('applies the highest-qualifying tier, and the discounted subtotal correctly flows into VAT and total', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(
        cartWithQuantityAndTiers(50, [
          { minQuantity: 10, discountPercent: 5 },
          { minQuantity: 50, discountPercent: 12 },
        ]) as never,
      );

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].appliedTierDiscount).toBe(12);
      expect(result.lines[0].unitPrice).toBe(88); // 100 * (1 - 12/100)
      expect(result.subtotal).toBe(4400); // 88 * 50
      expect(result.vatAmount).toBe(660); // 15% of 4400
      expect(result.total).toBe(5060);
    });

    it('applies the tier discount to the TRADE price for a trade account, not the retail price', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue({
        id: 'cart-1',
        accountId: 'acc-1',
        account: { type: 'TRADE' },
        items: [
          {
            id: 'ci-1',
            productId: 'prod-1',
            quantity: 10,
            product: { ...productFixture, priceTiers: [{ minQuantity: 10, discountPercent: 10 }] },
          },
        ],
      } as never);

      const result = await service.getCart('sub-1', 'buyer@example.com');

      expect(result.lines[0].baseUnitPrice).toBe(80); // tradePrice, not retailPrice
      expect(result.lines[0].unitPrice).toBe(72); // 80 * (1 - 10/100)
    });
  });

  describe('getCartForItems — split checkout', () => {
    it('passes the given item IDs through as a where filter on the underlying query', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.getCartForItems('sub-1', 'buyer@example.com', ['ci-1', 'ci-2']);

      const [args] = prisma.cart.findUniqueOrThrow.mock.calls[0];
      expect(args.include.items.where).toEqual({ id: { in: ['ci-1', 'ci-2'] } });
    });

    it('does not filter items at all when getCart (the plain, whole-cart path) is used instead', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.getCart('sub-1', 'buyer@example.com');

      const [args] = prisma.cart.findUniqueOrThrow.mock.calls[0];
      expect(args.include.items.where).toBeUndefined();
    });
  });

  describe('clear', () => {
    it('deletes every cart item when no productIds filter is given — existing, unchanged behavior', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.clear('sub-1', 'buyer@example.com');

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 'cart-1' } });
    });

    it('deletes only cart items matching the given productIds when a filter IS provided', async () => {
      prisma.cart.findUniqueOrThrow.mockResolvedValue(cartWithAccountType('RETAIL') as never);

      await service.clear('sub-1', 'buyer@example.com', ['prod-1', 'prod-2']);

      expect(prisma.cartItem.deleteMany).toHaveBeenCalledWith({
        where: { cartId: 'cart-1', productId: { in: ['prod-1', 'prod-2'] } },
      });
    });
  });
});
