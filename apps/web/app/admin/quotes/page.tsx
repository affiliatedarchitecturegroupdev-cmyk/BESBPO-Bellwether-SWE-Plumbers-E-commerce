import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface AdminQuoteItem {
  id: string;
  description: string;
  status: string;
  quotedTotal: string | null;
  account: { email: string };
  createdAt: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'text-red-600 font-semibold', // needs attention
  QUOTED: 'text-hydra',
  ACCEPTED: 'text-[#1E8E5A]',
  DECLINED: 'text-steel',
};

export default async function AdminQuotesPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const quotes = await apiClient.get<Paginated<AdminQuoteItem>>('/v1/quotes/admin?pageSize=100', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-6">Quotes</h1>

      {quotes.items.length === 0 ? (
        <p className="text-sm text-steel">No quote requests yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left font-mono text-[10.5px] uppercase tracking-wide text-steel border-b border-black/10">
              <th className="pb-2 font-normal">Customer</th>
              <th className="pb-2 font-normal">Request</th>
              <th className="pb-2 font-normal">Status</th>
              <th className="pb-2 font-normal text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {quotes.items.map((quote) => (
              <tr key={quote.id} className="border-b border-black/5">
                <td className="py-2.5 text-steel">{quote.account.email}</td>
                <td className="py-2.5">
                  <Link href={`/admin/quotes/${quote.id}`} className="hover:text-hydra line-clamp-1">
                    {quote.description}
                  </Link>
                </td>
                <td className={`py-2.5 font-mono text-[11px] ${STATUS_STYLES[quote.status] ?? 'text-steel'}`}>
                  {quote.status}
                </td>
                <td className="py-2.5 text-right font-mono">
                  {quote.quotedTotal ? zar.format(Number(quote.quotedTotal)) : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
