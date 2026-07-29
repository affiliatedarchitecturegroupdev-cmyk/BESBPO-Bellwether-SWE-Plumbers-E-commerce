import { notFound } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { updateBundleAction } from '@/lib/actions/admin-bundles';
import { SelectField, TextAreaField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';

const SECTORS = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Civil', 'Infrastructure'];

interface BundleDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sector: string;
  bundlePrice: string;
  items: { id: string; quantity: number; product: { name: string; sku: string } }[];
}

interface Props {
  params: { slug: string };
}

export default async function EditBundlePage({ params }: Props) {
  const bundle = await fetchBundle(params.slug);
  if (!bundle) notFound();

  const boundUpdateAction = updateBundleAction.bind(null, bundle.id);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-1">{bundle.name}</h1>
      <p className="font-mono text-[11px] text-steel mb-6">Slug: {bundle.slug} (not editable)</p>

      <div className="mb-8">
        <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">
          Items (not editable here)
        </h2>
        <ul className="text-sm space-y-1">
          {bundle.items.map((item) => (
            <li key={item.id} className="text-steel">
              {item.quantity}× {item.product.name} ({item.product.sku})
            </li>
          ))}
        </ul>
        <p className="text-[11.5px] text-steel mt-2">
          Item composition isn&apos;t editable from this panel yet — see docs/GAP-ANALYSIS-ROADMAP.md.
          Delete and recreate the bundle to change its items.
        </p>
      </div>

      <form action={boundUpdateAction} className="max-w-lg">
        <TextField label="Name" name="name" defaultValue={bundle.name} required />
        <TextAreaField label="Description" name="description" defaultValue={bundle.description ?? ''} />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Sector" name="sector" defaultValue={bundle.sector} required>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Bundle Price (R)"
            name="bundlePrice"
            type="number"
            step="0.01"
            min={0}
            defaultValue={bundle.bundlePrice}
            required
          />
        </div>
        <SubmitButton>Save Changes</SubmitButton>
      </form>
    </div>
  );
}

async function fetchBundle(slug: string): Promise<BundleDetail | null> {
  try {
    return await apiClient.get<BundleDetail>(`/v1/bundles/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
