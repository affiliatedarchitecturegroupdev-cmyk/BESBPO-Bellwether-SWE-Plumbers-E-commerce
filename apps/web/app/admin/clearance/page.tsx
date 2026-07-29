import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { ClearanceCandidateRow } from '@/components/admin/ClearanceCandidateRow';
import { Paginated } from '@/lib/types';

interface CandidateProduct {
  id: string;
  sku: string;
  name: string;
  stockQty: number;
  retailPrice: string;
  salePrice: string | null;
  saleEndsAt: string | null;
}

// The actual "smart" part of Clearance lives on the backend
// (ProductsService.findClearanceCandidates) — this page is just the
// human-review step: candidates are genuinely slow movers (real stock,
// real order history showing no recent activity), never auto-applied.
// An admin sets the real price here before anything reaches the
// customer-facing /v1/products/on-sale query.
export default async function AdminClearancePage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const [candidates, activeResult] = await Promise.all([
    apiClient.get<CandidateProduct[]>('/v1/products/clearance-candidates', { accessToken: session.accessToken }),
    apiClient.get<Paginated<CandidateProduct>>('/v1/products/on-sale?page=1&pageSize=20'),
  ]);
  const active = activeResult.items;

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Clearance</h1>
      <p className="text-sm text-steel mb-8">
        Candidates below are products with real stock and no order activity in the last 60 days — genuinely
        slow movers, not arbitrary picks. Nothing here is on sale until you set a price and confirm.
      </p>

      {active.length > 0 && (
        <>
          <h2 className="text-sm font-semibold mb-3">Currently On Sale</h2>
          <div className="space-y-3 mb-10">
            {active.map((product) => (
              <ClearanceCandidateRow key={product.id} product={product} />
            ))}
          </div>
        </>
      )}

      <h2 className="text-sm font-semibold mb-3">Clearance Candidates</h2>
      {candidates.length === 0 ? (
        <p className="text-sm text-steel">No candidates right now — no slow-moving overstock detected.</p>
      ) : (
        <div className="space-y-3">
          {candidates.map((product) => (
            <ClearanceCandidateRow key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
