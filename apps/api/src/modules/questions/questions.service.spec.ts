import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';
import { AccountsService } from '../accounts/accounts.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('QuestionsService', () => {
  let service: QuestionsService;
  let prisma: DeepMockProxy<PrismaService>;
  let accountsService: { resolveOrCreate: jest.Mock };

  const mockAccount = { id: 'acc-1', keycloakSub: 'sub-1', email: 'buyer@example.com' };

  beforeEach(async () => {
    prisma = createPrismaMock();
    accountsService = { resolveOrCreate: jest.fn().mockResolvedValue(mockAccount) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AccountsService, useValue: accountsService },
      ],
    }).compile();

    service = module.get(QuestionsService);
  });

  describe('ask', () => {
    it('throws NotFoundException for a product that does not exist, without creating a question', async () => {
      prisma.product.findUnique.mockResolvedValue(null);
      await expect(
        service.ask('sub-1', 'buyer@example.com', { productId: 'missing', question: 'Does this fit 15mm pipe?' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.productQuestion.create).not.toHaveBeenCalled();
    });

    it("creates the question under the caller's own account", async () => {
      prisma.product.findUnique.mockResolvedValue({ id: 'prod-1' } as never);
      prisma.productQuestion.create.mockResolvedValue({ id: 'q-1' } as never);

      await service.ask('sub-1', 'buyer@example.com', { productId: 'prod-1', question: 'Does this fit 15mm pipe?' });

      expect(prisma.productQuestion.create).toHaveBeenCalledWith({
        data: { productId: 'prod-1', accountId: 'acc-1', question: 'Does this fit 15mm pipe?' },
      });
    });
  });

  describe('answer', () => {
    it('throws NotFoundException for a question that does not exist', async () => {
      prisma.productQuestion.findUnique.mockResolvedValue(null);
      await expect(
        service.answer('sub-1', 'buyer@example.com', [], 'missing', { answer: 'Yes, it does.' }),
      ).rejects.toThrow(NotFoundException);
      expect(prisma.productAnswer.create).not.toHaveBeenCalled();
    });

    it('marks isFromStaff false for a plain customer account (no scopes at all)', async () => {
      prisma.productQuestion.findUnique.mockResolvedValue({ id: 'q-1' } as never);
      prisma.productAnswer.create.mockResolvedValue({ id: 'ans-1' } as never);

      await service.answer('sub-1', 'buyer@example.com', [], 'q-1', { answer: 'Yes, it does.' });

      expect(prisma.productAnswer.create).toHaveBeenCalledWith({
        data: { questionId: 'q-1', accountId: 'acc-1', answer: 'Yes, it does.', isFromStaff: false },
      });
    });

    it('marks isFromStaff true for an account with ANY scope at all, not just one specific scope', async () => {
      prisma.productQuestion.findUnique.mockResolvedValue({ id: 'q-1' } as never);
      prisma.productAnswer.create.mockResolvedValue({ id: 'ans-1' } as never);

      await service.answer('sub-1', 'staff@example.com', ['orders:manage'], 'q-1', { answer: 'Confirmed, yes.' });

      expect(prisma.productAnswer.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isFromStaff: true }) }),
      );
    });
  });

  describe('findByProduct', () => {
    it('scopes to the given productId', async () => {
      prisma.productQuestion.findMany.mockResolvedValue([]);
      prisma.productQuestion.count.mockResolvedValue(0);

      await service.findByProduct({ productId: 'prod-1', page: 1, pageSize: 20 });

      expect(prisma.productQuestion.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { productId: 'prod-1' } }),
      );
    });
  });
});
