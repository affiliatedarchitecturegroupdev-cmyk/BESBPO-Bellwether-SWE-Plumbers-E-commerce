import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';
import { CreateTradeCreditAccountForm } from '@/components/admin/CreateTradeCreditAccountForm';
import { CreditTransactionForm } from '@/components/admin/CreditTransactionForm';

interface AdminTradeCreditAccount {
  id: string;
  creditLimit: string;
  creditUsed: string;
  paymentTermDays: number;
  account: { email: string };
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

export default async function AdminTradeCreditPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const accounts = await apiClient.get<Paginated<AdminTradeCreditAccount>>('/v1/trade-credit?pageSize=100', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Trade Credit Accounts</h1>

      {accounts.items.length === 0 ? (
        <p className="text-sm text-steel mb-10">No trade credit accounts yet.</p>
      ) : (
        <table className="w-full text-sm mb-10">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal text-right">Used / Limit</th>
              <th className="pb-2 font-normal">Terms</th>
              <th className="pb-2 font-normal">Record Transaction</th>
            </tr>
          </thead>
          <tbody>
            {accounts.items.map((account) => (
              <tr key={account.id} className="border-b border-black/5">
                <td className="py-2.5 text-steel">{account.account.email}</td>
                <td className="py-2.5 text-right font-mono">
                  {zar.format(Number(account.creditUsed))} / {zar.format(Number(account.creditLimit))}
                </td>
                <td className="py-2.5 text-[#4A5157]">Net {account.paymentTermDays}</td>
                <td className="py-2.5">
                  <CreditTransactionForm accountId={account.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h2 className="text-base font-semibold mb-4">Create New Account</h2>
      <CreateTradeCreditAccountForm />
    </div>
  );
}
