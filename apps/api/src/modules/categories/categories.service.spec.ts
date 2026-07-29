import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: DeepMockProxy<PrismaService>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CategoriesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(CategoriesService);
  });

  describe('update — cycle protection', () => {
    it('throws BadRequestException when a category is set as its own parent', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' } as never);

      await expect(service.update('cat-1', { parentId: 'cat-1' })).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when the proposed parent is actually a descendant, preventing a cycle', async () => {
      // Tree: cat-1 (root) -> cat-2 -> cat-3. Moving cat-1 under cat-3
      // would make cat-1 both an ancestor and a descendant of itself.
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1' } as never) // assertExists(id)
        .mockResolvedValueOnce({ id: 'cat-3' } as never); // assertExists(dto.parentId)
      prisma.category.findUnique.mockImplementation(((args: { where: { id: string } }) => {
        const ancestry: Record<string, { parentId: string | null }> = {
          'cat-3': { parentId: 'cat-2' },
          'cat-2': { parentId: 'cat-1' },
          'cat-1': { parentId: null },
        };
        return Promise.resolve(ancestry[args.where.id] ?? null);
      }) as never);

      await expect(service.update('cat-1', { parentId: 'cat-3' })).rejects.toThrow(BadRequestException);
      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('allows a legitimate re-parent to an unrelated category', async () => {
      prisma.category.findUnique.mockImplementation(((args: { where: { id: string } }) => {
        const rows: Record<string, { id: string; parentId: string | null }> = {
          'cat-1': { id: 'cat-1', parentId: null },
          'cat-9': { id: 'cat-9', parentId: null }, // a sibling root category, unrelated to cat-1's tree
        };
        return Promise.resolve(rows[args.where.id] ?? null);
      }) as never);
      prisma.category.update.mockResolvedValue({ id: 'cat-1', parentId: 'cat-9' } as never);

      await service.update('cat-1', { parentId: 'cat-9' });

      expect(prisma.category.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { parentId: 'cat-9' },
      });
    });

    it('throws NotFoundException when the proposed parent does not exist at all', async () => {
      prisma.category.findUnique
        .mockResolvedValueOnce({ id: 'cat-1' } as never) // assertExists(id)
        .mockResolvedValueOnce(null); // assertExists(dto.parentId) — missing

      await expect(service.update('cat-1', { parentId: 'missing' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws ConflictException when the category still has children or products', async () => {
      prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' } as never);
      prisma.category.count.mockResolvedValue(1);
      prisma.product.count.mockResolvedValue(0);

      await expect(service.remove('cat-1')).rejects.toThrow(ConflictException);
      expect(prisma.category.delete).not.toHaveBeenCalled();
    });
  });
});
