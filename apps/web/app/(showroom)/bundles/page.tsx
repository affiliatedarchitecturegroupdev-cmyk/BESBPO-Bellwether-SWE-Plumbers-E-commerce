import { Metadata } from 'next';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

// Force dynamic rendering - this page fetches from API
export const dynamic = 'force-dynamic';

interface BundleSummary {
  slug: string;
  name: string;
  sector: string;
  bundlePrice: string;
  description: string | null;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export const metadata: Metadata = {
  title: 'Project Bundles | Bellwether SWE Plumbers',
  description: 'Pre-packaged plumbing bundles for common project types — residential, commercial, and industrial.',
};

export default async function BundlesPage() {
  const bundles = await apiClient.get<Paginated<BundleSummary>>('/v1/bundles?pageSize=48');

  return (
    <div className="max-w-[1240px] mx-auto px-8 py-14">
      <h1 className="font-display text-2xl font-bold mb-2">Project Bundles</h1>
      <p className="text-sm text-steel mb-10">
        Pre-packaged combinations of commonly-used items for a specific project type.
      </p>

      {bundles.items.length === 0 ? (
        <p className="text-sm text-steel">No bundles available right now.</p>
      ) : (
        <div className="grid grid-cols-3 gap-5">
          {bundles.items.map((bundle) => (
            <a
              key={bundle.slug}
              href={`/bundle/${bundle.slug}`}
              className="block border border-black/10 rounded-md p-5 hover:border-hydra transition-colors"
            >
              <div className="font-mono text-[10px] uppercase tracking-wide text-hydra mb-2.5">
                {bundle.sector}
              </div>
              <h2 className="text-base font-semibold mb-2">{bundle.name}</h2>
              {bundle.description && (
                <p className="text-[12.5px] text-steel mb-4 line-clamp-2">{bundle.description}</p>
              )}
              <div className="font-display text-lg font-bold">{zar.format(Number(bundle.bundlePrice))}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
