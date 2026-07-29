import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { TradeApplicationRow } from '@/components/admin/TradeApplicationRow';

interface Application {
  id: string;
  companyName: string;
  companyRegNumber: string | null;
  yearsInBusiness: number | null;
  message: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason: string | null;
  createdAt: string;
  account: { email: string; companyName: string | null; phone: string | null };
}

export default async function AdminTradeApplicationsPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const applications = await apiClient.get<Application[]>('/v1/trade-account-applications', {
    accessToken: session.accessToken,
  });
  const pending = applications.filter((a) => a.status === 'PENDING');
  const reviewed = applications.filter((a) => a.status !== 'PENDING');

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Trade Account Applications</h1>
      <p className="text-sm text-steel mb-8">
        Approving an application switches that customer&apos;s account to trade pricing immediately. This is
        separate from trade credit (payment terms) — see Trade Credit for that.
      </p>

      <h2 className="text-sm font-semibold mb-3">Pending ({pending.length})</h2>
      {pending.length === 0 ? (
        <p className="text-sm text-steel mb-10">No pending applications.</p>
      ) : (
        <div className="space-y-3 mb-10">
          {pending.map((application) => (
            <TradeApplicationRow key={application.id} application={application} />
          ))}
        </div>
      )}

      {reviewed.length > 0 && (
        <>
          <h2 className="text-sm font-semibold mb-3">Previously Reviewed</h2>
          <div className="space-y-3">
            {reviewed.map((application) => (
              <TradeApplicationRow key={application.id} application={application} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
