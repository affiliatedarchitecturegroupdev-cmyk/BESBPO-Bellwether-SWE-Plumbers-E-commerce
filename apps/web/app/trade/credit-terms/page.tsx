import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

interface TradeCreditAccount {
  creditPath: 'INTERNAL_INCIDENTAL' | 'THIRD_PARTY_INTERMEDIARY';
  creditLimit: string;
  creditUsed: string;
  paymentTermDays: number;
  intermediaryProvider: string | null;
  approvedAt: string | null;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const CREDIT_PATH_LABELS: Record<TradeCreditAccount['creditPath'], string> = {
  INTERNAL_INCIDENTAL: 'Standard trade account',
  THIRD_PARTY_INTERMEDIARY: 'Third-party credit facility',
};

export default async function CreditTermsPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const account = await fetchTradeCredit(session.accessToken);

  if (!account) {
    return (
      <div>
        <h1 className="font-display text-xl font-bold mb-4">Credit Terms</h1>
        <p className="text-sm text-steel">
          No trade credit account has been set up for your business yet. Contact us to apply.
        </p>
      </div>
    );
  }

  const available = Number(account.creditLimit) - Number(account.creditUsed);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Credit Terms</h1>

      <div className="grid grid-cols-2 gap-1 bg-black/10 border border-black/10 mb-8">
        <div className="bg-white p-5">
          <div className="font-display text-2xl font-bold text-hydra">{zar.format(available)}</div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mt-1">Available</div>
        </div>
        <div className="bg-white p-5">
          <div className="font-display text-2xl font-bold">{zar.format(Number(account.creditLimit))}</div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mt-1">Credit Limit</div>
        </div>
      </div>

      <dl className="space-y-3 text-sm">
        <Row label="Credit Used" value={zar.format(Number(account.creditUsed))} />
        <Row label="Payment Terms" value={`Net ${account.paymentTermDays} days`} />
        <Row label="Facility Type" value={CREDIT_PATH_LABELS[account.creditPath]} />
        {account.intermediaryProvider && <Row label="Credit Provider" value={account.intermediaryProvider} />}
        <Row
          label="Approved"
          value={account.approvedAt ? dateFormatter.format(new Date(account.approvedAt)) : 'Pending'}
        />
      </dl>

      <p className="text-[12.5px] text-steel mt-8">
        To pay an order using this facility, choose &ldquo;Pay via Trade Credit&rdquo; at checkout.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between py-2.5 border-b border-black/5">
      <dt className="text-steel">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}

async function fetchTradeCredit(accessToken: string): Promise<TradeCreditAccount | null> {
  try {
    return await apiClient.get<TradeCreditAccount>('/v1/trade-credit/me', { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
