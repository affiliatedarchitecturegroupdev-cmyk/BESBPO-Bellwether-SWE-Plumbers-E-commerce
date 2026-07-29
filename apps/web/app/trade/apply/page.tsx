import { Metadata } from 'next';
import { auth } from '@/auth';
import { getCurrentAccount } from '@/lib/get-current-account';
import { apiClient } from '@/lib/api-client';
import { TradeApplicationForm } from '@/components/trade/TradeApplicationForm';

export const metadata: Metadata = { title: 'Apply for a Trade Account | Bellwether SWE Plumbers' };

interface Application {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  companyName: string;
  rejectionReason: string | null;
  createdAt: string;
}

// Real self-service application for trade PRICING (Account.type) — a
// genuinely separate thing from trade CREDIT (payment terms), which
// stays administrative and is applied for separately once an account is
// already trade type. See TradeAccountApplicationsService's own comment
// for why this had to build the full approve/reject mechanism too, not
// just this form — nothing set Account.type to TRADE anywhere before
// this.
export default async function TradeApplyPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in to apply for a trade account.</p>;
  }

  const account = await getCurrentAccount();
  if (account?.type === 'TRADE') {
    return (
      <div className="max-w-[600px] mx-auto px-8 py-16">
        <h1 className="font-display text-2xl font-bold mb-3">You Already Have Trade Pricing</h1>
        <p className="text-sm text-steel">
          Your account already has trade pricing applied. If you&apos;re also interested in trade credit
          (payment terms), see your{' '}
          <a href="/trade/dashboard" className="text-hydra">
            trade dashboard
          </a>
          .
        </p>
      </div>
    );
  }

  const applications = await apiClient.get<Application[]>('/v1/trade-account-applications/me', {
    accessToken: session.accessToken,
  });
  const pending = applications.find((a) => a.status === 'PENDING');
  const mostRecent = applications[0];

  return (
    <div className="max-w-[600px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Apply for a Trade Account</h1>
      <p className="text-sm text-steel mb-8">
        Trade accounts get discounted pricing on the full catalog. We review every application — this
        usually takes a day or two.
      </p>

      {pending ? (
        <div className="border border-black/10 rounded-sm p-5">
          <p className="text-sm font-semibold mb-1">Application submitted — under review</p>
          <p className="text-[13px] text-steel">
            Submitted for {pending.companyName} on {new Date(pending.createdAt).toLocaleDateString('en-ZA')}.
            We&apos;ll be in touch once it&apos;s been reviewed.
          </p>
        </div>
      ) : (
        <>
          {mostRecent?.status === 'REJECTED' && (
            <div className="border border-red-200 bg-red-50 rounded-sm p-4 mb-6 text-[13px] text-red-700">
              Your previous application wasn&apos;t approved
              {mostRecent.rejectionReason ? `: ${mostRecent.rejectionReason}` : '.'} You&apos;re welcome to
              apply again below.
            </div>
          )}
          <TradeApplicationForm />
        </>
      )}
    </div>
  );
}
