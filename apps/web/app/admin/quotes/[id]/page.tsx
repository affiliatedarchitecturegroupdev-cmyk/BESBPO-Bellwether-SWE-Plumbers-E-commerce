import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { PriceQuoteForm } from '@/components/admin/PriceQuoteForm';
import { ConvertToOrderForm } from '@/components/admin/ConvertToOrderForm';

interface AdminQuoteDetail {
  id: string;
  description: string;
  status: string;
  quotedTotal: string | null;
  adminNotes: string | null;
  orderId: string | null;
  account: { email: string };
  items: { id: string; description: string; quantity: number; unitPrice: string | null }[];
}

interface Props {
  params: { id: string };
}

// Uses GET /v1/quotes/admin/:id, not the customer-facing GET /v1/quotes/:id
// — same reasoning as the admin order/booking detail pages: the
// customer-scoped endpoint checks ownership against the CALLING account,
// which would 403 an admin reviewing anyone else's request.
export default async function AdminQuoteDetailPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const quote = await fetchQuote(params.id, session.accessToken);
  if (!quote) notFound();

  const canPrice = quote.status === 'REQUESTED' || quote.status === 'QUOTED';
  const canConvert = quote.status === 'ACCEPTED' && !quote.orderId;

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-1">{quote.account.email}</h1>
      <p className="font-mono text-[11px] text-steel mb-6">{quote.status}</p>

      <p className="text-sm text-[#4A5157] mb-8 max-w-lg">{quote.description}</p>

      {canPrice && (
        <PriceQuoteForm
          quoteId={quote.id}
          items={quote.items}
          currentTotal={quote.quotedTotal}
          currentNotes={quote.adminNotes}
        />
      )}

      {canConvert && <ConvertToOrderForm quoteId={quote.id} />}

      {quote.orderId && (
        <p className="text-sm text-steel">
          Converted to order{' '}
          <Link href={`/admin/orders/${quote.orderId}`} className="text-hydra">
            view order
          </Link>
          .
        </p>
      )}

      {quote.status === 'DECLINED' && <p className="text-sm text-steel">This quote was declined by the customer.</p>}
    </div>
  );
}

async function fetchQuote(id: string, accessToken: string): Promise<AdminQuoteDetail | null> {
  try {
    return await apiClient.get<AdminQuoteDetail>(`/v1/quotes/admin/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
