import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { DeepMockProxy } from 'jest-mock-extended';
import { ProductsBulkService } from './products-bulk.service';
import { PrismaService } from '../prisma/prisma.service';
import { createPrismaMock } from '../../test-utils/prisma-mock';

describe('ProductsBulkService', () => {
  let service: ProductsBulkService;
  let prisma: DeepMockProxy<PrismaService>;

  const CATEGORIES = [{ id: 'cat-1', slug: 'pipes-fittings' }];

  beforeEach(async () => {
    prisma = createPrismaMock();
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProductsBulkService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get(ProductsBulkService);
    prisma.category.findMany.mockResolvedValue(CATEGORIES as never);
    prisma.product.findMany.mockResolvedValue([]);
  });

  const HEADER =
    'sku,slug,name,description,categorySlug,retailPrice,tradePrice,stockQty,brand,weightKg,lengthCm,widthCm,heightCm,sansCompliant';

  describe('importFromCsv', () => {
    it('throws BadRequestException for a CSV with no data rows at all', async () => {
      await expect(service.importFromCsv(HEADER)).rejects.toThrow(BadRequestException);
    });

    it('rejects the WHOLE batch when even one row is invalid — nothing gets created', async () => {
      const csv = [
        HEADER,
        'SKU-1,sku-1,Valid Product,,pipes-fittings,100,85,10,,,,,',
        'SKU-2,sku-2,Bad Product,,unknown-category,100,85,10,,,,,',
      ].join('\n');

      const result = await service.importFromCsv(csv);

      expect(result.ok).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual(
        expect.objectContaining({ row: 2, sku: 'SKU-2', message: expect.stringContaining('unknown-category') }),
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
      expect(prisma.product.update).not.toHaveBeenCalled();
    });

    it('rejects a file with a duplicate SKU within itself', async () => {
      const csv = [
        HEADER,
        'SKU-1,sku-1,First,,pipes-fittings,100,85,10,,,,,',
        'SKU-1,sku-1-again,Second,,pipes-fittings,200,170,5,,,,,',
      ].join('\n');

      const result = await service.importFromCsv(csv);

      expect(result.ok).toBe(false);
      expect(result.errors[0].message).toContain('Duplicate sku within this file');
    });

    it('rejects a row missing a required field (name)', async () => {
      const csv = [HEADER, 'SKU-1,sku-1,,,pipes-fittings,100,85,10,,,,,'].join('\n');
      const result = await service.importFromCsv(csv);
      expect(result.ok).toBe(false);
      expect(result.errors[0].message).toContain('name is required');
    });

    it('rejects an invalid numeric field (retailPrice) rather than silently coercing it', async () => {
      const csv = [HEADER, 'SKU-1,sku-1,Valid,,pipes-fittings,not-a-number,85,10,,,,,'].join('\n');
      const result = await service.importFromCsv(csv);
      expect(result.ok).toBe(false);
      expect(result.errors[0].message).toContain('Invalid retailPrice');
    });

    it('creates a genuinely new SKU', async () => {
      const csv = [HEADER, 'SKU-NEW,sku-new,Brand New Product,,pipes-fittings,150,127.5,20,Cobra,,,,'].join('\n');

      const result = await service.importFromCsv(csv);

      expect(result.ok).toBe(true);
      expect(result.created).toBe(1);
      expect(result.updated).toBe(0);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ sku: 'SKU-NEW', name: 'Brand New Product' }) }),
      );
    });

    it('updates an already-existing SKU instead of creating a duplicate — the "bulk-edit offline" workflow', async () => {
      prisma.product.findMany.mockResolvedValue([{ id: 'prod-1', sku: 'SKU-EXISTING' }] as never);
      const csv = [HEADER, 'SKU-EXISTING,sku-existing,Updated Name,,pipes-fittings,199,169.15,50,,,,,'].join('\n');

      const result = await service.importFromCsv(csv);

      expect(result.ok).toBe(true);
      expect(result.created).toBe(0);
      expect(result.updated).toBe(1);
      expect(prisma.product.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'prod-1' }, data: expect.objectContaining({ name: 'Updated Name' }) }),
      );
      expect(prisma.product.create).not.toHaveBeenCalled();
    });

    it('auto-generates a slug from the name when the slug column is left blank', async () => {
      const csv = [HEADER, 'SKU-NEW,,My Great Product!,,pipes-fittings,100,85,,,,,,'].join('\n');
      await service.importFromCsv(csv);
      expect(prisma.product.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ slug: 'my-great-product' }) }),
      );
    });

    it('leaves optional numeric fields (e.g. weightKg) unset when omitted, rather than defaulting to zero or erroring', async () => {
      const csv = [HEADER, 'SKU-NEW,sku-new,Product,,pipes-fittings,100,85,,,,,,'].join('\n');
      await service.importFromCsv(csv);
      const [call] = prisma.product.create.mock.calls;
      expect(call[0].data).not.toHaveProperty('weightKg');
    });
  });

  describe('exportToCsv', () => {
    it('produces a header row matching the exact columns importFromCsv expects', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      const csv = await service.exportToCsv();
      const [headerLine] = csv.split('\n');
      expect(headerLine).toBe(HEADER);
    });

    it('quotes a field containing a comma, matching real CSV escaping rules', async () => {
      prisma.product.findMany.mockResolvedValue([
        {
          sku: 'SKU-1',
          slug: 'sku-1',
          name: 'Product, With Comma',
          description: '',
          category: { slug: 'pipes-fittings' },
          retailPrice: { toString: () => '100' },
          tradePrice: { toString: () => '85' },
          stockQty: 10,
          brand: '',
          weightKg: { toString: () => '1' },
          lengthCm: 20,
          widthCm: 15,
          heightCm: 10,
          sansCompliant: false,
        },
      ] as never);

      const csv = await service.exportToCsv();
      expect(csv).toContain('"Product, With Comma"');
    });
  });
});
