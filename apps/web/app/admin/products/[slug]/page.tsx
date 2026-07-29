import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { Product } from '@/lib/types';
import { updateProductAction } from '@/lib/actions/admin-products';
import { SelectField, TextAreaField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { ProductImageUploader } from '@/components/admin/ProductImageUploader';
import { WarehouseStockRow } from '@/components/admin/WarehouseStockRow';
import { PriceTiersPanel } from '@/components/admin/PriceTiersPanel';

interface CategoryOption {
  id: string;
  name: string;
}

interface VariantGroupOption {
  id: string;
  name: string;
  optionLabel: string;
}

interface WarehouseStockEntry {
  warehouse: { id: string; name: string };
  quantity: number;
}

interface Props {
  params: { slug: string };
}

export default async function EditProductPage({ params }: Props) {
  const session = await auth();
  const [product, categories, variantGroups] = await Promise.all([
    fetchProduct(params.slug),
    apiClient.get<CategoryOption[]>('/v1/categories'),
    // Admin-scoped, unlike categories/product lookups above — needs the
    // session's own token, not a public, unauthenticated call.
    session?.accessToken
      ? apiClient.get<VariantGroupOption[]>('/v1/products/variant-groups', { accessToken: session.accessToken })
      : Promise.resolve([]),
  ]);

  if (!product) notFound();

  // Needs product.id, so fetched after the above rather than in the same
  // Promise.all — same admin-scoped-token reasoning as variantGroups.
  const warehouseStock =
    session?.accessToken
      ? await apiClient.get<WarehouseStockEntry[]>(`/v1/warehouses/stock/${product.id}`, {
          accessToken: session.accessToken,
        })
      : [];

  // Publicly readable (customers see tier pricing on the PDP too), so
  // no accessToken needed here unlike warehouseStock above.
  const priceTiers = await apiClient.get<{ id: string; minQuantity: number; discountPercent: string }[]>(
    `/v1/price-tiers?productId=${product.id}`,
  );

  // Bound here, not read from a hidden form field — the product's id
  // never changes across a resubmission the way form field values could
  // be tampered with client-side, so binding it into the action itself is
  // both simpler and marginally safer than trusting a hidden input for it.
  const boundUpdateAction = updateProductAction.bind(null, product.id);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-1">{product.name}</h1>
      <p className="font-mono text-[11px] text-steel mb-6">SKU: {product.sku} (not editable)</p>

      <div className="mb-8">
        <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">Images</h2>
        <ProductImageUploader productId={product.id} images={product.images} />
      </div>

      <PriceTiersPanel productId={product.id} productSlug={product.slug} tiers={priceTiers} />

      {warehouseStock.length > 0 && (
        <div className="mb-8 max-w-lg">
          <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1">
            Stock by Warehouse
          </h2>
          <p className="text-[12px] text-steel mb-3">
            Total across every warehouse: {product.stockQty}. Checkout has no location awareness — a sale
            decrements this total, not a specific warehouse below.
          </p>
          {warehouseStock.map((entry) => (
            <WarehouseStockRow
              key={entry.warehouse.id}
              warehouseId={entry.warehouse.id}
              warehouseName={entry.warehouse.name}
              productId={product.id}
              productSlug={product.slug}
              currentQuantity={entry.quantity}
            />
          ))}
        </div>
      )}

      <form action={boundUpdateAction} className="max-w-lg">
        <TextField label="Name" name="name" defaultValue={product.name} required />
        <TextAreaField label="Description" name="description" defaultValue={product.description ?? ''} />
        <SelectField label="Category" name="categoryId" defaultValue={product.categoryId} required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-3 gap-4">
          <TextField
            label="Retail Price (R)"
            name="retailPrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={product.retailPrice}
            required
          />
          <TextField
            label="Trade Price (R)"
            name="tradePrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={product.tradePrice}
            required
          />
          <TextField
            label="Stock Qty"
            name="stockQty"
            type="number"
            min={0}
            defaultValue={product.stockQty}
          />
        </div>
        <TextField
          label="Brand (optional — powers the storefront's brand filter)"
          name="brand"
          defaultValue={product.brand ?? ''}
        />
        <label className="flex items-center gap-2 text-sm mb-6">
          <input type="checkbox" name="sansCompliant" defaultChecked={product.sansCompliant} />
          SANS-compliant
        </label>
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">
          Variant (optional — for size/option families; see /admin/variant-groups)
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <SelectField label="Variant Group" name="variantGroupId" defaultValue={product.variantGroupId ?? ''}>
            <option value="">None</option>
            {variantGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.optionLabel})
              </option>
            ))}
          </SelectField>
          <TextField
            label="Variant Value"
            name="variantValue"
            defaultValue={product.variantValue ?? ''}
            placeholder="e.g. 15mm — required if a group is set"
          />
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">
          Shipping (used for real courier rate quotes — see ShippingService)
        </p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <TextField
            label="Weight (kg)"
            name="weightKg"
            type="number"
            step="0.01"
            min={0.01}
            defaultValue={product.weightKg}
          />
          <TextField label="Length (cm)" name="lengthCm" type="number" min={1} defaultValue={product.lengthCm} />
          <TextField label="Width (cm)" name="widthCm" type="number" min={1} defaultValue={product.widthCm} />
          <TextField label="Height (cm)" name="heightCm" type="number" min={1} defaultValue={product.heightCm} />
        </div>
        <SubmitButton>Save Changes</SubmitButton>
      </form>
    </div>
  );
}

async function fetchProduct(slug: string): Promise<Product | null> {
  try {
    return await apiClient.get<Product>(`/v1/products/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
