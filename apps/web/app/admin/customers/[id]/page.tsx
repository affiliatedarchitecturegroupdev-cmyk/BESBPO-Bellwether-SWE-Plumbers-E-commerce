import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

interface AccountDetail {
  id: string;
  type: 'RETAIL' | 'TRADE';
  email: string;
  companyName: string | null;
  phone: string | null;
  isGuest: boolean;
  createdAt: string;
  tradeCreditAccount: { creditLimit: string; creditUsed: string; paymentTermDays: number } | null;
  _count: { orders: number };
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  params: { id: string };
}

export default async function AdminCustomerDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="text-sm text-steel">Please sign in.</p>;
  }

  const account = await fetchAccount(params.id, session.accessToken);
  if (!account) notFound();

  return (
    <div className="max-w-[640px]">
      <div className="flex items-center justify-between mb-1">
        <h1 className="font-display text-xl font-bold">{account.companyName ?? account.email}</h1>
        <span
          className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm ${
            account.type === 'TRADE' ? 'bg-[#EAF3F8] text-hydra' : 'bg-black/5 text-steel'
          }`}
        >
          {account.type}
        </span>
      </div>
      <p className="text-sm text-steel mb-8">
        {account.email}
        {account.isGuest && ' · Guest account'}
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Phone</div>
          <div className="text-sm">{account.phone ?? '—'}</div>
        </div>
        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Joined</div>
          <div className="text-sm">{new Date(account.createdAt).toLocaleDateString('en-ZA')}</div>
        </div>
        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Total Orders</div>
          <div className="text-sm">{account._count.orders}</div>
        </div>
        <div className="border border-black/10 rounded-sm p-4">
          <div className="font-mono text-[10px] uppercase tracking-wide text-steel mb-1">Trade Credit</div>
          <div className="text-sm">
            {account.tradeCreditAccount
              ? `${zar.format(Number(account.tradeCreditAccount.creditUsed))} / ${zar.format(Number(account.tradeCreditAccount.creditLimit))} used`
              : 'None'}
          </div>
        </div>
      </div>

      <p className="text-[12px] text-steel">
        Order history, trade applications, and returns for this customer are managed from their respective
        admin sections (Orders, Trade Applications, Returns) — this page is a summary view, not a
        duplicate of those.
      </p>
    </div>
  );
}

async function fetchAccount(id: string, accessToken: string): Promise<AccountDetail | null> {
  try {
    return await apiClient.get<AccountDetail>(`/v1/accounts/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
