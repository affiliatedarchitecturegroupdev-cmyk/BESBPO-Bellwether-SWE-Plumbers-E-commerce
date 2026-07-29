import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Read via fs/JSON.parse rather than a direct `import ... from
// './data/x.json'` statement — the latter needs resolveJsonModule
// enabled in tsconfig.json, a shared, build-wide compiler option this
// one script isn't worth changing for the entire apps/api project.
const DATA_DIR = path.join(__dirname, 'data');
const categoriesData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog-categories.json'), 'utf-8'));
const productsData = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'catalog-products.json'), 'utf-8'));

// Loads the REAL Bellwether SWE product catalog (originally a 10,250-row
// XLSX feed), pre-transformed into two flat JSON files by a one-time
// Python pass over the raw file — not re-parsed from XLSX here, since
// the transformation (deduplication, slug generation, trade pricing)
// only needs to happen once and is easier to review as static,
// versioned JSON than to re-derive on every run. See
// docs/CATALOG-IMPORT.md for the full policy rationale behind every
// decision baked into this data — this script's own job is just to
// load it, not to re-decide any of those judgment calls.
//
// Every decision below was a real judgment call, not a technical
// default — documented here AND in docs/CATALOG-IMPORT.md so a human
// reviewer can see and revisit each one:
//
// 1. TRADE PRICE: retailPrice × 0.85 (a 15% trade discount), rounded to
//    the nearest cent. The raw feed had no trade/retail split at all.
//    15% is an industry-typical starting point for a trade account
//    discount, not a business decision — every imported product's
//    tradePrice is independently editable afterward via the existing
//    admin product edit page, exactly like any other product.
//
// 2. DUPLICATES: 1,468 groups (3,227 rows) shared identical name +
//    specifications but different SKU/price/stock — most plausibly
//    data-entry duplication in however the raw feed was produced, not
//    genuinely distinct products (nothing else distinguishes them: no
//    supplier field, no batch/lot identifier). Resolved by keeping the
//    LOWEST-priced row per group and SUMMING stock across the whole
//    group — preserves total real stock quantity while not cluttering
//    the catalog with indistinguishable near-duplicate listings. The
//    full list of which SKUs were dropped, and which SKU absorbed each
//    group's stock, is preserved in
//    prisma/data/catalog-import-dropped-duplicates.json — nothing was
//    silently discarded without a record.
//
// 3. CATEGORIES: imported as 19 FLAT, top-level categories (no
//    parentId) — the raw feed had no hierarchy information at all, and
//    inventing a nested structure not actually present in the source
//    data would be fabricating organization that isn't there. Category
//    is optionally nestable in the schema already
//    (Category.parentId) — reorganizing into a real hierarchy later,
//    if the business wants one, is a normal admin action, not a schema
//    change.
//
// 4. WEIGHT/DIMENSIONS: every imported product uses the schema's
//    existing placeholder default (1kg, 20x15x10cm — see Product's own
//    schema comment) because the raw feed had no weight or dimension
//    data at all. NOT a new decision specific to this import; this
//    import just means ALL 8,491 products currently rely on that
//    existing placeholder. Real courier rate quotes (ShipLogicService)
//    will be inaccurate for these until real measurements are entered
//    product-by-product — a real, known limitation, not hidden.
//
// 5. DESCRIPTIONS: the raw feed's Description column was 100%
//    boilerplate ("Premium plumbing product - {name}") — identical
//    shape for every single row, carrying no actual product
//    information. Replaced with a plain "Key: Value" list built
//    directly from that row's own Specifications JSON (e.g. "Brand:
//    Duravit; Shape: Asymmetric; Size: 400mm; Type: Ceramic") — a
//    faithful restatement of data already on the row, not invented
//    marketing copy. An earlier attempt at natural-language prose
//    produced awkward, redundant text (duplicating words already in
//    the product name) across the 14 different specification-key
//    shapes this catalog uses; a plain key:value list sidesteps that
//    entirely.
async function main(): Promise<void> {
  console.log(`Importing ${categoriesData.length} categories...`);
  const categoryIdBySlug = new Map<string, string>();
  for (const cat of categoriesData as { slug: string; name: string }[]) {
    const created = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: { slug: cat.slug, name: cat.name },
    });
    categoryIdBySlug.set(cat.slug, created.id);
  }

  type CatalogProduct = {
    sku: string;
    slug: string;
    name: string;
    description: string;
    categorySlug: string;
    retailPrice: string;
    tradePrice: string;
    stockQty: number;
    brand: string | null;
    mergedFromCount: number;
  };

  const products = productsData as CatalogProduct[];
  console.log(`Importing ${products.length} products (deduplicated from a 10,250-row source feed)...`);

  const BATCH_SIZE = 500;
  let imported = 0;
  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);
    const result = await prisma.product.createMany({
      data: batch.map((p) => ({
        sku: p.sku,
        slug: p.slug,
        name: p.name,
        description: p.description,
        categoryId: categoryIdBySlug.get(p.categorySlug)!,
        retailPrice: p.retailPrice,
        tradePrice: p.tradePrice,
        stockQty: p.stockQty,
        brand: p.brand ?? undefined,
        // weightKg/lengthCm/widthCm/heightCm deliberately omitted — the
        // schema's own defaults (1kg, 20x15x10cm) apply, exactly as
        // documented above.
      })),
      // Safe to re-run: an already-imported SKU/slug is skipped rather
      // than erroring the whole batch, so a partial or repeated run
      // never duplicates rows or crashes partway through.
      skipDuplicates: true,
    });
    imported += result.count;
    console.log(
      `  ${Math.min(i + BATCH_SIZE, products.length)}/${products.length} processed, ${imported} created so far`,
    );
  }

  const mergedCount = products.filter((p) => p.mergedFromCount > 1).length;
  console.log(`\nDone. ${imported} products created.`);
  console.log(`${mergedCount} of those absorbed stock from duplicate rows — see`);
  console.log(`prisma/data/catalog-import-dropped-duplicates.json for the full audit trail.`);
}

main()
  .catch((err) => {
    console.error('Catalog import failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
