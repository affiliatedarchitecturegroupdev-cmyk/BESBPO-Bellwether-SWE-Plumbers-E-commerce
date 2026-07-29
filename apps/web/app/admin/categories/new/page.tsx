import { apiClient } from '@/lib/api-client';
import { CategoryTreeNode, flattenCategoryTree } from '@/lib/flatten-category-tree';
import { createCategoryAction } from '@/lib/actions/admin-categories';
import { SelectField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';

export default async function NewCategoryPage() {
  const tree = await apiClient.get<CategoryTreeNode[]>('/v1/categories');
  const flat = flattenCategoryTree(tree);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">New Category</h1>
      <form action={createCategoryAction} className="max-w-md">
        <TextField label="Name" name="name" required />
        <TextField label="Slug" name="slug" required />
        <SelectField label="Parent Category" name="parentId" defaultValue="">
          <option value="">— None (top-level) —</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {'—'.repeat(c.depth)} {c.name}
            </option>
          ))}
        </SelectField>
        <SubmitButton>Create Category</SubmitButton>
      </form>
    </div>
  );
}
