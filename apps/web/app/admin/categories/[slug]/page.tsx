import { notFound } from 'next/navigation';
import { apiClient, ApiError } from '@/lib/api-client';
import { CategoryTreeNode, flattenCategoryTree } from '@/lib/flatten-category-tree';
import { updateCategoryAction } from '@/lib/actions/admin-categories';
import { SelectField, TextField } from '@/components/admin/FormFields';
import { SubmitButton } from '@/components/admin/SubmitButton';

interface CategoryDetail {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
}

interface Props {
  params: { slug: string };
}

export default async function EditCategoryPage({ params }: Props) {
  const [category, tree] = await Promise.all([
    fetchCategory(params.slug),
    apiClient.get<CategoryTreeNode[]>('/v1/categories'),
  ]);

  if (!category) notFound();

  const flat = flattenCategoryTree(tree).filter((c) => c.id !== category.id); // a category can't be its own parent
  const boundUpdateAction = updateCategoryAction.bind(null, category.id);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-1">{category.name}</h1>
      <p className="font-mono text-[11px] text-steel mb-6">Slug: {category.slug} (not editable)</p>

      <form action={boundUpdateAction} className="max-w-md">
        <TextField label="Name" name="name" defaultValue={category.name} required />
        <SelectField label="Parent Category" name="parentId" defaultValue={category.parentId ?? ''}>
          <option value="">— None (top-level) —</option>
          {flat.map((c) => (
            <option key={c.id} value={c.id}>
              {'—'.repeat(c.depth)} {c.name}
            </option>
          ))}
        </SelectField>
        <SubmitButton>Save Changes</SubmitButton>
      </form>
    </div>
  );
}

async function fetchCategory(slug: string): Promise<CategoryDetail | null> {
  try {
    return await apiClient.get<CategoryDetail>(`/v1/categories/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
