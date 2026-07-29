import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: DeepMockProxy<PrismaService>;

  const percentageCoupon = {
    id: 'coupon-1',
    code: 'SAVE10',
    discountType: 'PERCENTAGE',
    discountValue: 10,
    minSubtotal: null,
    maxUses: null,
    maxUsesPerAccount: null,
    active: true,
    validFrom: null,
    validUntil: null,
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CouponsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CouponsService);
  });

  describe('create', () => {
    it('rejects a percentage discount over 100 — a data-entry error, not a valid discount', async () => {
      await expect(
        service.create({ code: 'HUGE', discountType: 'PERCENTAGE' as never, discountValue: 150 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.coupon.create).not.toHaveBeenCalled();
    });

    it('normalizes the code to uppercase and rejects a duplicate', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon as never);

      await expect(
        service.create({ code: 'save10', discountType: 'PERCENTAGE' as never, discountValue: 10 }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'SAVE10' } });
    });

    it('stores the code uppercase on a genuinely new coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(percentageCoupon as never);

      await service.create({ code: 'save10', discountType: 'PERCENTAGE' as never, discountValue: 10 });

      expect(prisma.coupon.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ code: 'SAVE10' }) }),
      );
    });
  });

  describe('setActive', () => {
    it('throws NotFoundException for an unknown coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.setActive('missing', false)).rejects.toThrow(NotFoundException);
      expect(prisma.coupon.update).not.toHaveBeenCalled();
    });
  });

  describe('validateAndCompute', () => {
    it('throws with a specific message for a code that does not exist', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      await expect(service.validateAndCompute('NOPE', 'acc-1', 200)).rejects.toThrow("Coupon code 'NOPE'");
    });

    it('throws for an inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, active: false } as never);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow(
        'This coupon is no longer active',
      );
    });

    it('throws for a coupon not yet valid (validFrom in the future)', async () => {
      const future = new Date(Date.now() + 86400000);
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, validFrom: future } as never);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow(
        'This coupon is not active yet',
      );
    });

    it('throws for an expired coupon (validUntil in the past)', async () => {
      const past = new Date(Date.now() - 86400000);
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, validUntil: past } as never);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow('This coupon has expired');
    });

    it('throws with the specific minimum when the subtotal is below minSubtotal', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, minSubtotal: 500 } as never);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow(
        'This coupon requires a minimum order of R500.00',
      );
    });

    it('throws once the total usage limit is reached', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, maxUses: 5 } as never);
      prisma.couponRedemption.count.mockResolvedValue(5);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow(
        'This coupon has reached its usage limit',
      );
    });

    it('throws once this specific account has used it the max number of times, even if the total limit has room', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...percentageCoupon, maxUsesPerAccount: 1 } as never);
      prisma.couponRedemption.count.mockResolvedValue(1);
      await expect(service.validateAndCompute('SAVE10', 'acc-1', 200)).rejects.toThrow(
        "You've already used this coupon the maximum number of times",
      );
    });

    it('computes a percentage discount correctly', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon as never);
      const result = await service.validateAndCompute('SAVE10', 'acc-1', 200);
      expect(result.discountAmount).toBe(20);
    });

    it('computes a fixed-amount discount correctly', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...percentageCoupon,
        discountType: 'FIXED_AMOUNT',
        discountValue: 50,
      } as never);
      const result = await service.validateAndCompute('SAVE10', 'acc-1', 200);
      expect(result.discountAmount).toBe(50);
    });

    it('caps a fixed-amount discount at the subtotal — never produces a negative total', async () => {
      prisma.coupon.findUnique.mockResolvedValue({
        ...percentageCoupon,
        discountType: 'FIXED_AMOUNT',
        discountValue: 500,
      } as never);
      const result = await service.validateAndCompute('SAVE10', 'acc-1', 200);
      expect(result.discountAmount).toBe(200);
    });

    it('matches lowercase-entered codes to the same uppercase-stored coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon as never);
      await service.validateAndCompute('save10', 'acc-1', 200);
      expect(prisma.coupon.findUnique).toHaveBeenCalledWith({ where: { code: 'SAVE10' } });
    });
  });
});
