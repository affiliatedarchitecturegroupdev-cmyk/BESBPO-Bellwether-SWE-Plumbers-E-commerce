import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { WishlistService } from './wishlist.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('WishlistService', () => {
  let service: WishlistService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WishlistService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();

    service = module.get(WishlistService);
  });

  describe('add', () => {
    it('throws NotFoundException for a product that does not exist', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(service.add('sub-1', 'buyer@example.com', 'missing-product')).rejects.toThrow(
        NotFoundException,
      );
      expect(prisma.wishlistItem.upsert).not.toHaveBeenCalled();
    });

    it('is idempotent — adding an already-wishlisted product upserts rather than erroring', async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.wishlistItem.upsert.mockResolvedValue({ id: 'wish-1' } as never);

      await service.add('sub-1', 'buyer@example.com', 'prod-1');

      expect(prisma.wishlistItem.upsert).toHaveBeenCalledWith({
        where: { accountId_productId: { accountId: 'acc-1', productId: 'prod-1' } },
        update: {},
        create: { accountId: 'acc-1', productId: 'prod-1' },
      });
    });
  });

  describe('remove', () => {
    it('is idempotent — removing a product not on the wishlist succeeds as a no-op, not a 404', async () => {
      prisma.wishlistItem.deleteMany.mockResolvedValue({ count: 0 } as never);

      await expect(service.remove('sub-1', 'buyer@example.com', 'never-wishlisted')).resolves.not.toThrow();
      expect(prisma.wishlistItem.deleteMany).toHaveBeenCalledWith({
        where: { accountId: 'acc-1', productId: 'never-wishlisted' },
      });
    });
  });

  describe('list', () => {
    it("scopes to the caller's own account only", async () => {
      prisma.wishlistItem.findMany.mockResolvedValue([]);

      await service.list('sub-1', 'buyer@example.com');

      expect(prisma.wishlistItem.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { accountId: 'acc-1' } }),
      );
    });
  });
});
