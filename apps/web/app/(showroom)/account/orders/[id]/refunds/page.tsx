import { notFound } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { RefundStatusCard, getRefundSteps, RefundTimeline } from '@/components/commerce/RefundStatus';

interface OrderDetail {
  id: string;
  orderNumber: string;
  status: string;
}

interface RefundRequest {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';
  amount: string;
  reason: string;
  reasonDetail?: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  lineItems: Array<{
    id: string;
    productName: string;
    quantity: number;
    refundAmount: string;
  }>;
}

interface Props {
  params: { id: string };
}

export const metadata = {
  title: 'Refund Requests | Bellwether Shop',
  description: 'View and manage your refund requests.',
};

export default async function OrderRefundsPage({ params }: Props) {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[700px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const [order, refunds] = await Promise.all([
    fetchOrder(params.id, session.accessToken),
    fetchRefunds(params.id, session.accessToken),
  ]);

  if (!order) notFound();

  return (
    <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="mb-6">
        <Link href={`/account/orders/${params.id}`} className="text-sm text-hydra hover:underline mb-2 inline-block">
          ← Back to order
        </Link>
        <h1 className="font-display text-xl sm:text-2xl font-bold">Refund Requests</h1>
        <p className="text-sm text-steel mt-1">Order {order.orderNumber}</p>
      </div>

      {refunds.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-black/15 rounded-sm">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-steel/10 mb-4">
            <svg className="w-6 h-6 text-steel" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
          </div>
          <h2 className="text-base font-semibold text-ink mb-2">No refund requests yet</h2>
          <p className="text-sm text-steel mb-4">
            If you need to return items from this order, you can request a refund.
          </p>
          <Link
            href={`/account/orders/${params.id}`}
            className="inline-block px-4 py-2 bg-hydra text-white text-sm rounded-sm hover:bg-hydra/90"
          >
            Go to Order
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {refunds.map((refund) => (
            <div key={refund.id} className="bg-white border border-black/10 rounded-sm overflow-hidden">
              <RefundStatusCard refund={refund} />
              <div className="px-4 py-3 bg-black/[0.02] border-t border-black/5">
                <RefundTimeline steps={getRefundSteps(refund.status, refund.createdAt, refund.processedAt)} />
              </div>
              {refund.lineItems.length > 0 && (
                <div className="px-4 py-3 border-t border-black/5">
                  <h4 className="font-mono text-[10px] uppercase tracking-wide text-steel mb-2">Items</h4>
                  <ul className="space-y-1">
                    {refund.lineItems.map((item) => (
                      <li key={item.id} className="flex justify-between text-sm">
                        <span>{item.quantity}× {item.productName}</span>
                        <span className="font-mono text-steel">{refund.amount}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function fetchOrder(id: string, accessToken: string): Promise<OrderDetail | null> {
  try {
    return await apiClient.get<OrderDetail>(`/v1/orders/${id}`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return null;
    throw err;
  }
}

async function fetchRefunds(orderId: string, accessToken: string): Promise<RefundRequest[]> {
  try {
    return await apiClient.get<RefundRequest[]>(`/v1/orders/${orderId}/refunds`, { accessToken });
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return [];
    throw err;
  }
}
