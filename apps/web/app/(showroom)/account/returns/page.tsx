import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

interface ReturnRequestItem {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  lineItems: { quantity: number; orderLineItem: { productName: string } }[];
}

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Awaiting review',
  APPROVED: 'Approved — please ship the item back',
  REJECTED: 'Rejected',
  RECEIVED: 'Received — under inspection',
  REFUNDED: 'Refunded',
  REPLACED: 'Replacement sent',
};

export default async function ReturnsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const returns = await apiClient.get<ReturnRequestItem[]>('/v1/returns', { accessToken: session.accessToken });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Returns</h1>
      <p className="text-sm text-steel mb-8">
        Requested from a delivered order&apos;s own page — see &quot;Request a Return&quot; there.
      </p>

      {returns.length === 0 ? (
        <p className="text-sm text-steel">No return requests yet.</p>
      ) : (
        <ul className="space-y-4">
          {returns.map((r) => (
            <li key={r.id} className="border border-black/10 rounded-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[11px] uppercase tracking-wide text-hydra">
                  {STATUS_LABELS[r.status] ?? r.status}
                </span>
                <span className="font-mono text-[11px] text-steel">
                  {new Date(r.createdAt).toLocaleDateString('en-ZA')}
                </span>
              </div>
              <p className="text-sm text-steel mb-1">Reason: {r.reason.replace(/_/g, ' ').toLowerCase()}</p>
              <ul className="text-sm">
                {r.lineItems.map((li, i) => (
                  <li key={i}>
                    {li.quantity} × {li.orderLineItem.productName}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
