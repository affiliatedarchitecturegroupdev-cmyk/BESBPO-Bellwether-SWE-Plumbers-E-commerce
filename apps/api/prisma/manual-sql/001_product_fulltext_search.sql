-- Postgres full-text search setup for products.
-- Run this once, after `prisma migrate deploy` has created the products table.
-- Not managed by Prisma's schema — tsvector/GIN/triggers aren't well supported
-- by Prisma Migrate, so this lives as a plain SQL step in the deploy pipeline.

-- Trigram support for typo-tolerant fuzzy matching (e.g. "vavle" -> "valve")
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- The generated search column
ALTER TABLE products ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Keep it updated automatically on insert/update
CREATE OR REPLACE FUNCTION products_search_vector_update() RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.name, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.sku, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')), 'B');
  RETURN NEW;
END
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS products_search_vector_trigger ON products;
CREATE TRIGGER products_search_vector_trigger
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION products_search_vector_update();

-- Indexes: GIN for the tsvector ranked search, trigram GIN for fuzzy fallback
CREATE INDEX IF NOT EXISTS idx_products_search_vector ON products USING GIN (search_vector);
CREATE INDEX IF NOT EXISTS idx_products_name_trgm ON products USING GIN (name gin_trgm_ops);

-- Backfill existing rows (safe to re-run)
UPDATE products SET search_vector =
  setweight(to_tsvector('english', coalesce(name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(sku, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(description, '')), 'B');
