import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

interface AuditLogEntry {
  id: string;
  actorEmail: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

const dateTimeFormatter = new Intl.DateTimeFormat('en-ZA', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

// Read-only — covers order status changes, customer-initiated
// cancellations/refunds, trade-credit account creation/drawdown/repayment,
// warranty issuance, and CoC issuance. Product/category/bundle CRUD and
// booking status changes aren't audited yet — see
// docs/GAP-ANALYSIS-ROADMAP.md for the explicit scope boundary.
export default async function AdminAuditLogPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const entries = await apiClient.get<AuditLogEntry[]>('/v1/audit-log?limit=100', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Audit Log</h1>
      <p className="text-sm text-steel mb-6">
        Order status changes, customer cancellations/refunds, trade-credit transactions, and warranty/CoC
        issuance. Product and booking changes aren&apos;t logged here yet.
      </p>

      {entries.length === 0 ? (
        <p className="text-sm text-steel">No activity recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">When</th>
              <th className="pb-2 font-normal">Actor</th>
              <th className="pb-2 font-normal">Action</th>
              <th className="pb-2 font-normal">Target</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id} className="border-b border-black/5">
                <td className="py-2.5 text-[#4A5157] whitespace-nowrap">
                  {dateTimeFormatter.format(new Date(entry.createdAt))}
                </td>
                <td className="py-2.5 text-steel">{entry.actorEmail}</td>
                <td className="py-2.5 font-mono text-[12px]">{entry.action}</td>
                <td className="py-2.5 font-mono text-[11px] text-steel">
                  {entry.targetType} · {entry.targetId.slice(0, 8)}…
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
