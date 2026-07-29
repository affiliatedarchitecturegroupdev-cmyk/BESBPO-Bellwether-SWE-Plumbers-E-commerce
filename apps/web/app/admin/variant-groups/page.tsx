import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { CreateVariantGroupForm } from '@/components/admin/CreateVariantGroupForm';

interface VariantGroup {
  id: string;
  name: string;
  optionLabel: string;
}

export default async function AdminVariantGroupsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const groups = await apiClient.get<VariantGroup[]>('/v1/products/variant-groups', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Variant Groups</h1>
      <p className="text-sm text-steel mb-6">
        Groups related products together for a size/option selector on the product page — e.g. every
        diameter of the same fitting. Assign a product to a group from its own edit page.
      </p>

      {groups.length === 0 ? (
        <p className="text-sm text-steel mb-8">No variant groups yet.</p>
      ) : (
        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Option Label</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <tr key={group.id} className="border-b border-black/5">
                <td className="py-2.5">{group.name}</td>
                <td className="py-2.5 text-steel">{group.optionLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold mb-4">Create New Group</h2>
      <CreateVariantGroupForm />
    </div>
  );
}
