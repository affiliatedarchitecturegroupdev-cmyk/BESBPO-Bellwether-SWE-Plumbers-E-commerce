import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { ReturnRequestCard } from '@/components/admin/ReturnRequestCard';

interface ReturnRequestItem {
  id: string;
  status: string;
  reason: string;
  reasonDetail: string | null;
  orderId: string;
  createdAt: string;
  lineItems: { quantity: number; orderLineItem: { productName: string; unitPrice: string } }[];
}

interface Props {
  searchParams: { status?: string };
}

const STATUSES = ['REQUESTED', 'APPROVED', 'RECEIVED', 'REJECTED', 'REFUNDED', 'REPLACED'];

export default async function AdminReturnsPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const status = searchParams.status;
  const returns = await apiClient.get<ReturnRequestItem[]>(`/v1/returns/admin${status ? `?status=${status}` : ''}`, {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Returns</h1>
      <p className="text-sm text-steel mb-6">
        Distinct from order cancellation — this is post-delivery only. See docs/AGENTS.md&apos;s returns/RMA
        section for the full status lifecycle.
      </p>

      <div className="flex gap-2 mb-6 flex-wrap">
        <a
          href="/admin/returns"
          className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm ${
            !status ? 'bg-ink text-white' : 'border border-black/15'
          }`}
        >
          All
        </a>
        {STATUSES.map((s) => (
          <a
            key={s}
            href={`/admin/returns?status=${s}`}
            className={`font-mono text-[11px] uppercase tracking-wide px-3 py-1.5 rounded-sm ${
              status === s ? 'bg-ink text-white' : 'border border-black/15'
            }`}
          >
            {s}
          </a>
        ))}
      </div>

      {returns.length === 0 ? (
        <p className="text-sm text-steel">No return requests{status ? ` with status ${status}` : ''}.</p>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <ReturnRequestCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}
