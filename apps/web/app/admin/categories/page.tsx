import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { CategoryTreeNode, flattenCategoryTree } from '@/lib/flatten-category-tree';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteCategoryAction } from '@/lib/actions/admin-categories';

export default async function AdminCategoriesPage() {
  const tree = await apiClient.get<CategoryTreeNode[]>('/v1/categories');
  const flat = flattenCategoryTree(tree);

  return (
    <div>
      <div className="flex justify-between items-baseline mb-6">
        <h1 className="font-display text-xl font-bold">Categories</h1>
        <Link href="/admin/categories/new" className="font-mono text-[12px] text-hydra">
          + New category
        </Link>
      </div>

      {flat.length === 0 ? (
        <p className="text-sm text-steel">No categories yet.</p>
      ) : (
        <ul>
          {flat.map((category) => (
            <li
              key={category.id}
              className="flex justify-between items-center py-2.5 border-b border-black/5 text-sm"
              style={{ paddingLeft: `${category.depth * 20}px` }}
            >
              <Link href={`/admin/categories/${category.slug}`} className="hover:text-hydra">
                {category.depth > 0 && <span className="text-steel mr-1.5">└</span>}
                {category.name}
              </Link>
              <DeleteButton action={deleteCategoryAction} id={category.id} itemLabel={category.name} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
