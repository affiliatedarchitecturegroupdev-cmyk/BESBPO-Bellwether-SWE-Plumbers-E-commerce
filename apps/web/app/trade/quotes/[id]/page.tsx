import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { QuoteResponseButtons } from '@/components/trade/QuoteResponseButtons';

interface QuoteDetail {
  id: string;
  description: string;
  status: 'REQUESTED' | 'QUOTED' | 'ACCEPTED' | 'DECLINED';
  quotedTotal: string | null;
  validUntil: string | null;
  adminNotes: string | null;
  orderId: string | null;
  items: { id: string; description: string; quantity: number; unitPrice: string | null }[];
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });
const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

const STATUS_LABELS: Record<string, string> = {
  REQUESTED: 'Awaiting review',
  QUOTED: 'Priced — awaiting your response',
  ACCEPTED: 'Accepted',
  DECLINED: 'Declined',
};

interface Props {
  params: { id: string };
}

export default async function QuoteDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const quote = await fetchQuote(params.id, session.accessToken);
  if (!quote) notFound();

  const isExpired = quote.validUntil ? new Date(quote.validUntil) < new Date() : false;
  const canRespond = quote.status === 'QUOTED' && !isExpired;

  return (
    <div className="max-w-[600px]">
      <h1 className="font-display text-xl font-bold mb-1">Quote Request</h1>
      <p className="font-mono text-[11px] text-steel mb-6">{STATUS_LABELS[quote.status]}</p>

      <p className="text-sm text-[#4A5157] mb-6">{quote.description}</p>

      <h2 className="font-mono text-[10.5px] uppercase tracking-wide text-steel mb-3">Items</h2>
      <ul className="mb-6">
        {quote.items.map((item) => (
          <li key={item.id} className="flex justify-between text-sm py-2 border-b border-black/5">
            <span>
              {item.quantity}× {item.description}
            </span>
            {item.unitPrice && <span className="font-mono">{zar.format(Number(item.unitPrice) * item.quantity)}</span>}
          </li>
        ))}
      </ul>

      {quote.quotedTotal && (
        <div className="border border-black/10 rounded-sm p-5 mb-6">
          <div className="flex justify-between font-semibold text-[15px] mb-2">
            <span>Total</span>
            <span>{zar.format(Number(quote.quotedTotal))}</span>
          </div>
          {quote.validUntil && (
            <p className={`text-[12px] ${isExpired ? 'text-red-600' : 'text-steel'}`}>
              {isExpired ? 'Expired' : 'Valid until'} {dateFormatter.format(new Date(quote.validUntil))}
            </p>
          )}
          {quote.adminNotes && <p className="text-[13px] text-[#4A5157] mt-3">{quote.adminNotes}</p>}
        </div>
      )}

      {canRespond && <QuoteResponseButtons quoteId={quote.id} />}

      {quote.orderId && (
        <p className="text-sm text-steel mt-4">
          This quote became an order.{' '}
          <Link href={`/account/orders/${quote.orderId}`} className="text-hydra">
            View order
          </Link>
        </p>
      )}
    </div>
  );
}

async function fetchQuote(id: string, accessToken: string): Promise<QuoteDetail | null> {
  try {
    return await apiClient.get<QuoteDetail>(`/v1/quotes/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}
