export interface CategoryTreeNode {
  id: string;
  slug: string;
  name: string;
  parentId: string | null;
  children: CategoryTreeNode[];
}

export interface FlatCategory {
  id: string;
  slug: string;
  name: string;
  depth: number;
}

// GET /v1/categories returns a nested tree (CategoriesService.findTree) —
// both the admin table and the parent-category dropdown want a flat list
// with depth for indentation instead.
export function flattenCategoryTree(nodes: CategoryTreeNode[], depth = 0): FlatCategory[] {
  return nodes.flatMap((node) => [
    { id: node.id, slug: node.slug, name: node.name, depth },
    ...flattenCategoryTree(node.children, depth + 1),
  ]);
}
