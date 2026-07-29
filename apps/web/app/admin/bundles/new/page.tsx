import { createBundleAction } from '@/lib/actions/admin-bundles';
import { SelectField, TextAreaField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';
import { BundleItemsPicker } from '@/components/admin/BundleItemsPicker';

const SECTORS = ['Residential', 'Commercial', 'Industrial', 'Institutional', 'Civil', 'Infrastructure'];

// No longer pre-fetches a static product list here — see
// BundleItemsPicker/ProductCombobox's own comments for why (the old
// pageSize=200 fetch was silently failing against the API's own cap).
export default async function NewBundlePage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">New Bundle</h1>
      <form action={createBundleAction} className="max-w-lg">
        <div className="grid grid-cols-2 gap-4">
          <TextField label="Name" name="name" required />
          <TextField label="Slug" name="slug" required />
        </div>
        <TextAreaField label="Description" name="description" />
        <div className="grid grid-cols-2 gap-4">
          <SelectField label="Sector" name="sector" required>
            {SECTORS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </SelectField>
          <TextField label="Bundle Price (R)" name="bundlePrice" type="number" step="0.01" min={0} required />
        </div>
        <div className="mb-6">
          <BundleItemsPicker />
        </div>
        <SubmitButton>Create Bundle</SubmitButton>
      </form>
    </div>
  );
}
