import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { createProductAction } from '@/lib/actions/admin-products';
import { SelectField, TextAreaField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';

interface CategoryOption {
  id: string;
  name: string;
}

interface VariantGroupOption {
  id: string;
  name: string;
  optionLabel: string;
}

export default async function NewProductPage() {
  const session = await auth();
  const [categories, variantGroups] = await Promise.all([
    apiClient.get<CategoryOption[]>('/v1/categories'),
    // Admin-scoped, unlike categories above — needs the session's own
    // token, not a public, unauthenticated call.
    session?.accessToken
      ? apiClient.get<VariantGroupOption[]>('/v1/products/variant-groups', { accessToken: session.accessToken })
      : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">New Product</h1>
      <form action={createProductAction} className="max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="SKU" name="sku" required />
          <TextField label="Slug" name="slug" required />
        </div>
        <TextField label="Name" name="name" required />
        <TextAreaField label="Description" name="description" />
        <SelectField label="Category" name="categoryId" required>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </SelectField>
        <div className="grid grid-cols-3 gap-4">
          <TextField label="Retail Price (R)" name="retailPrice" type="number" step="0.01" min={0} required />
          <TextField label="Trade Price (R)" name="tradePrice" type="number" step="0.01" min={0} required />
          <TextField label="Stock Qty" name="stockQty" type="number" min={0} defaultValue={0} />
        </div>
        <TextField label="Brand (optional — powers the storefront's brand filter)" name="brand" />
        <label className="flex items-center gap-2 text-sm mb-6">
          <input type="checkbox" name="sansCompliant" />
          SANS-compliant
        </label>
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">
          Variant (optional — for size/option families; see /admin/variant-groups)
        </p>
        <div className="grid grid-cols-2 gap-4 mb-6">
          <SelectField label="Variant Group" name="variantGroupId" defaultValue="">
            <option value="">None</option>
            {variantGroups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} ({group.optionLabel})
              </option>
            ))}
          </SelectField>
          <TextField label="Variant Value" name="variantValue" placeholder="e.g. 15mm — required if a group is set" />
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-2">
          Shipping (used for real courier rate quotes — see ShippingService)
        </p>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <TextField label="Weight (kg)" name="weightKg" type="number" step="0.01" min={0.01} defaultValue={1} />
          <TextField label="Length (cm)" name="lengthCm" type="number" min={1} defaultValue={20} />
          <TextField label="Width (cm)" name="widthCm" type="number" min={1} defaultValue={15} />
          <TextField label="Height (cm)" name="heightCm" type="number" min={1} defaultValue={10} />
        </div>
        <SubmitButton>Create Product</SubmitButton>
      </form>
    </div>
  );
}
