import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { DeleteButton } from '@/components/admin/DeleteButton';
import { deleteBundleAction } from '@/lib/actions/admin-bundles';

interface BundleListItem {
  id: string;
  slug: string;
  name: string;
  sector: string;
  bundlePrice: string;
  items: { id: string }[];
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export default async function AdminBundlesPage() {
  const bundles = await apiClient.get<{ items: BundleListItem[] }>('/v1/bundles?pageSize=100');

  return (
    <div>
      <div className="flex justify-between items-baseline mb-6">
        <h1 className="font-display text-xl font-bold">Bundles</h1>
        <Link href="/admin/bundles/new" className="font-mono text-[12px] text-hydra">
          + New bundle
        </Link>
      </div>

      {bundles.items.length === 0 ? (
        <p className="text-sm text-steel">No bundles yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Name</th>
              <th className="pb-2 font-normal">Sector</th>
              <th className="pb-2 font-normal text-right">Items</th>
              <th className="pb-2 font-normal text-right">Price</th>
              <th className="pb-2 font-normal"></th>
            </tr>
          </thead>
          <tbody>
            {bundles.items.map((bundle) => (
              <tr key={bundle.id} className="border-b border-black/5">
                <td className="py-2.5">
                  <Link href={`/admin/bundles/${bundle.slug}`} className="hover:text-hydra">
                    {bundle.name}
                  </Link>
                </td>
                <td className="py-2.5 text-steel">{bundle.sector}</td>
                <td className="py-2.5 text-right">{bundle.items.length}</td>
                <td className="py-2.5 text-right font-mono">{zar.format(Number(bundle.bundlePrice))}</td>
                <td className="py-2.5 text-right">
                  <DeleteButton action={deleteBundleAction} id={bundle.id} itemLabel={bundle.name} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
