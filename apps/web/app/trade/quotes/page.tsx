import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { Paginated } from '@/lib/types';

interface QuoteListItem {
  id: string;
  description: string;
  status: 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';
  quotedTotal: string | null;
  createdAt: string;
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_STYLES: Record<string, string> = {
  REQUESTED: 'text-steel',
  QUOTED: 'text-hydra',
  ACCEPTED: 'text-[#1E8E5A]',
  DECLINED: 'text-red-600',
};

export default async function QuotesPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const quotes = await apiClient.get<Paginated<QuoteListItem>>('/v1/quotes?pageSize=50', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <div className="flex justify-between items-baseline mb-6">
        <h1 className="font-display text-xl font-bold">Quotes</h1>
        <Link href="/trade/quotes/new" className="font-mono text-[12px] text-hydra">
          + Request a Quote
        </Link>
      </div>

      {quotes.items.length === 0 ? (
        <p className="text-sm text-steel">No quote requests yet.</p>
      ) : (
        <ul>
          {quotes.items.map((quote) => (
            <li key={quote.id} className="border-b border-black/5 py-3.5">
              <Link href={`/trade/quotes/${quote.id}`} className="flex justify-between items-start">
                <div className="max-w-[70%]">
                  <p className="text-sm line-clamp-1">{quote.description}</p>
                  <p className="text-[11px] text-steel mt-0.5">
                    {dateFormatter.format(new Date(quote.createdAt))}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`font-mono text-[11px] block ${STATUS_STYLES[quote.status]}`}>
                    {quote.status}
                  </span>
                  {quote.quotedTotal && (
                    <span className="font-mono text-sm">{zar.format(Number(quote.quotedTotal))}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
