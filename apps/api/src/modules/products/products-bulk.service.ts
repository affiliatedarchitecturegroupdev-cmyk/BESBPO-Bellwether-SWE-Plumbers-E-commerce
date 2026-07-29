import { BadRequestException, Injectable } from '@nestjs/common';
import { parse } from 'csv-parse/sync';
import { PrismaService } from '../prisma/prisma.service';

// The general, reusable bulk import/export UI the original gap analysis
// (§5.1) asked for — distinct from the one-time prisma/import-catalog.ts
// script, which was built to load one specific real catalog feed and
// documents its own policy decisions in docs/CATALOG-IMPORT.md. This
// service handles ANY future CSV an admin uploads through the UI, with
// no advance knowledge of its shape beyond the column schema below.
const CSV_COLUMNS = [
  'sku',
  'slug',
  'name',
  'description',
  'categorySlug',
  'retailPrice',
  'tradePrice',
  'stockQty',
  'brand',
  'weightKg',
  'lengthCm',
  'widthCm',
  'heightCm',
  'sansCompliant',
] as const;

export interface BulkImportError {
  row: number; // 1-indexed against the data rows, not counting the header
  sku: string;
  message: string;
}

export interface BulkImportResult {
  ok: boolean;
  created: number;
  updated: number;
  errors: BulkImportError[];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

interface ParsedRow {
  row: number;
  sku: string;
  slug: string;
  name: string;
  description?: string;
  categorySlug: string;
  retailPrice: number;
  tradePrice: number;
  stockQty?: number;
  brand?: string;
  weightKg?: number;
  lengthCm?: number;
  widthCm?: number;
  heightCm?: number;
  sansCompliant?: boolean;
}

@Injectable()
export class ProductsBulkService {
  constructor(private readonly prisma: PrismaService) {}

  // Validates every row before writing anything at all — same
  // discipline as CartService.bulkAddItems (check every product ID
  // exists BEFORE any cart mutation happens), applied here to an entire
  // uploaded file: if row 4,000 of a 5,000-row file is invalid, rows
  // 1-3,999 are never touched. An admin re-uploading after fixing just
  // that one row is a far better experience than partially-applied,
  // hard-to-reason-about state from a batch that failed partway
  // through.
  async importFromCsv(csvContent: string): Promise<BulkImportResult> {
    const records: Record<string, string>[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    if (records.length === 0) {
      throw new BadRequestException('CSV file contains no data rows');
    }

    const categories = await this.prisma.category.findMany({ select: { id: true, slug: true } });
    const categoryIdBySlug = new Map(categories.map((c) => [c.slug, c.id]));

    const existingProducts = await this.prisma.product.findMany({ select: { id: true, sku: true } });
    const existingIdBySku = new Map(existingProducts.map((p) => [p.sku, p.id]));

    const errors: BulkImportError[] = [];
    const parsedRows: ParsedRow[] = [];
    const seenSkusInFile = new Set<string>();

    records.forEach((record, index) => {
      const rowNum = index + 1;
      const sku = record.sku?.trim() ?? '';

      if (!sku) {
        errors.push({ row: rowNum, sku: '(missing)', message: 'sku is required' });
        return;
      }
      if (seenSkusInFile.has(sku)) {
        errors.push({ row: rowNum, sku, message: `Duplicate sku within this file: '${sku}'` });
        return;
      }
      seenSkusInFile.add(sku);

      const name = record.name?.trim() ?? '';
      if (!name) {
        errors.push({ row: rowNum, sku, message: 'name is required' });
        return;
      }

      const categorySlug = record.categorySlug?.trim() ?? '';
      if (!categorySlug || !categoryIdBySlug.has(categorySlug)) {
        errors.push({ row: rowNum, sku, message: `Unknown categorySlug: '${categorySlug}'` });
        return;
      }

      const retailPrice = Number(record.retailPrice);
      if (!Number.isFinite(retailPrice) || retailPrice < 0) {
        errors.push({ row: rowNum, sku, message: `Invalid retailPrice: '${record.retailPrice}'` });
        return;
      }

      const tradePrice = Number(record.tradePrice);
      if (!Number.isFinite(tradePrice) || tradePrice < 0) {
        errors.push({ row: rowNum, sku, message: `Invalid tradePrice: '${record.tradePrice}'` });
        return;
      }

      let stockQty: number | undefined;
      if (record.stockQty?.trim()) {
        stockQty = Number(record.stockQty);
        if (!Number.isInteger(stockQty) || stockQty < 0) {
          errors.push({ row: rowNum, sku, message: `Invalid stockQty: '${record.stockQty}'` });
          return;
        }
      }

      // Optional numeric fields: only validated if actually provided —
      // an omitted value means "use the schema's own default," not
      // "invalid."
      const optionalNumeric = (field: 'weightKg' | 'lengthCm' | 'widthCm' | 'heightCm'): number | undefined => {
        if (!record[field]?.trim()) return undefined;
        const value = Number(record[field]);
        if (!Number.isFinite(value) || value <= 0) {
          errors.push({ row: rowNum, sku, message: `Invalid ${field}: '${record[field]}'` });
          return undefined;
        }
        return value;
      };

      parsedRows.push({
        row: rowNum,
        sku,
        slug: record.slug?.trim() || slugify(name),
        name,
        description: record.description?.trim() || undefined,
        categorySlug,
        retailPrice,
        tradePrice,
        stockQty,
        brand: record.brand?.trim() || undefined,
        weightKg: optionalNumeric('weightKg'),
        lengthCm: optionalNumeric('lengthCm'),
        widthCm: optionalNumeric('widthCm'),
        heightCm: optionalNumeric('heightCm'),
        sansCompliant: record.sansCompliant?.trim()
          ? record.sansCompliant.trim().toLowerCase() === 'true'
          : undefined,
      });
    });

    // Whole-batch rejection — nothing below this point runs if even one
    // row failed any check above.
    if (errors.length > 0) {
      return { ok: false, created: 0, updated: 0, errors };
    }

    let created = 0;
    let updated = 0;

    await this.prisma.$transaction(async (tx) => {
      for (const row of parsedRows) {
        const existingId = existingIdBySku.get(row.sku);
        const data = {
          slug: row.slug,
          name: row.name,
          description: row.description,
          categoryId: categoryIdBySlug.get(row.categorySlug)!,
          retailPrice: row.retailPrice,
          tradePrice: row.tradePrice,
          ...(row.stockQty !== undefined ? { stockQty: row.stockQty } : {}),
          brand: row.brand,
          ...(row.weightKg !== undefined ? { weightKg: row.weightKg } : {}),
          ...(row.lengthCm !== undefined ? { lengthCm: row.lengthCm } : {}),
          ...(row.widthCm !== undefined ? { widthCm: row.widthCm } : {}),
          ...(row.heightCm !== undefined ? { heightCm: row.heightCm } : {}),
          ...(row.sansCompliant !== undefined ? { sansCompliant: row.sansCompliant } : {}),
        };

        if (existingId) {
          await tx.product.update({ where: { id: existingId }, data });
          updated += 1;
        } else {
          await tx.product.create({ data: { sku: row.sku, ...data } });
          created += 1;
        }
      }
    });

    return { ok: true, created, updated, errors: [] };
  }

  // Column order deliberately matches importFromCsv's own expected
  // columns exactly — an unmodified export is a valid, round-trippable
  // import on its own (the "export → edit offline → re-import" workflow
  // the original gap asked for), not just a one-way backup dump.
  async exportToCsv(): Promise<string> {
    const products = await this.prisma.product.findMany({
      include: { category: { select: { slug: true } } },
      orderBy: { sku: 'asc' },
    });

    const header = CSV_COLUMNS.join(',');
    const rows = products.map((p) =>
      CSV_COLUMNS.map((col) => {
        let value: string;
        switch (col) {
          case 'categorySlug':
            value = p.category.slug;
            break;
          case 'retailPrice':
            value = p.retailPrice.toString();
            break;
          case 'tradePrice':
            value = p.tradePrice.toString();
            break;
          case 'weightKg':
            value = p.weightKg.toString();
            break;
          default:
            value = String((p as unknown as Record<string, unknown>)[col] ?? '');
        }
        // Minimal CSV escaping — wrap in quotes and double any embedded
        // quote whenever a value could otherwise break column
        // boundaries (a comma, quote, or newline).
        if (/[",\n]/.test(value)) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(','),
    );

    return [header, ...rows].join('\n');
  }
}
