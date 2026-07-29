import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { ReviewsService } from './reviews.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('ReviewsService', () => {
  let service: ReviewsService;
  let prisma: DeepMockProxy<PrismaService>;

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };
  const baseDto = { productId: 'prod-1', rating: 5, body: 'Great product' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReviewsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) } },
      ],
    }).compile();

    service = module.get(ReviewsService);
  });

  describe('create', () => {
    it('throws BadRequestException when the account has no qualifying order for this product', async () => {
      prisma.orderLineItem.findFirst.mockResolvedValue(null);
      await expect(service.create('sub-1', 'buyer@example.com', baseDto)).rejects.toThrow(BadRequestException);
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('checks for a qualifying order restricted to completed-enough statuses', async () => {
      prisma.orderLineItem.findFirst.mockResolvedValue({ id: 'li-1' } as never);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ id: 'review-1' } as never);

      await service.create('sub-1', 'buyer@example.com', baseDto);

      expect(prisma.orderLineItem.findFirst).toHaveBeenCalledWith({
        where: {
          productId: 'prod-1',
          order: { accountId: 'acc-1', status: { in: ['CONFIRMED', 'PROCESSING', 'DISPATCHED', 'DELIVERED'] } },
        },
      });
    });

    it('throws ConflictException when the account already reviewed this product', async () => {
      prisma.orderLineItem.findFirst.mockResolvedValue({ id: 'li-1' } as never);
      prisma.review.findUnique.mockResolvedValue({ id: 'existing-review' } as never);

      await expect(service.create('sub-1', 'buyer@example.com', baseDto)).rejects.toThrow(ConflictException);
      expect(prisma.review.create).not.toHaveBeenCalled();
    });

    it('creates the review when the purchase is verified and no review exists yet', async () => {
      prisma.orderLineItem.findFirst.mockResolvedValue({ id: 'li-1' } as never);
      prisma.review.findUnique.mockResolvedValue(null);
      prisma.review.create.mockResolvedValue({ id: 'review-1' } as never);

      await service.create('sub-1', 'buyer@example.com', baseDto);

      expect(prisma.review.create).toHaveBeenCalledWith({
        data: { productId: 'prod-1', accountId: 'acc-1', rating: 5, title: undefined, body: 'Great product' },
      });
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the review belongs to a different account', async () => {
      prisma.review.findUnique.mockResolvedValue({ id: 'r-1', accountId: 'someone-else' } as never);
      await expect(service.remove('sub-1', 'buyer@example.com', 'r-1')).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException when the review does not exist', async () => {
      prisma.review.findUnique.mockResolvedValue(null);
      await expect(service.remove('sub-1', 'buyer@example.com', 'missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('findByProduct', () => {
    it('returns the average rating alongside the paginated list', async () => {
      prisma.review.findMany.mockResolvedValue([{ id: 'r-1', rating: 4 }] as never);
      prisma.review.count.mockResolvedValue(1);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4 } } as never);

      const result = await service.findByProduct({ productId: 'prod-1', page: 1, pageSize: 20 });

      expect(result.averageRating).toBe(4);
      expect(result.total).toBe(1);
    });

    it('returns null averageRating when a product has no reviews yet', async () => {
      prisma.review.findMany.mockResolvedValue([] as never);
      prisma.review.count.mockResolvedValue(0);
      prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null } } as never);

      const result = await service.findByProduct({ productId: 'prod-1', page: 1, pageSize: 20 });

      expect(result.averageRating).toBeNull();
    });
  });
});
