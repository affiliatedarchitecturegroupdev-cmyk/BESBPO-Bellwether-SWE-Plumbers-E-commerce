import { Metadata } from 'next';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { StandingOrdersClient } from './StandingOrdersClient';

export const metadata: Metadata = {
  title: 'Standing Orders | Bellwether SWE Plumbers Trade',
  description: 'Manage your recurring orders. Set up automatic restocking for products you buy regularly.',
};

interface RecurringOrderItem {
  id: string;
  productId: string;
  quantity: number;
  product?: {
    id: string;
    name: string;
    sku: string;
    stockQty: number;
    images: { id: string; url: string; sortOrder: number }[];
  };
}

interface RecurringOrder {
  id: string;
  name: string;
  frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY';
  poNumber: string | null;
  nextRunAt: string;
  isActive: boolean;
  createdAt: string;
  items: RecurringOrderItem[];
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    province: string;
    postalCode: string;
  };
}

interface TradeCreditAccount {
  creditLimit: string;
  creditUsed: string;
  paymentTermDays: number;
  status: string;
}

export default async function StandingOrdersPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return (
      <div className="text-center py-12">
        <p className="text-steel text-sm">Please sign in to manage standing orders.</p>
      </div>
    );
  }

  // Fetch recurring orders and trade credit status in parallel
  const [orders, tradeCredit] = await Promise.all([
    apiClient.get<RecurringOrder[]>('/v1/recurring-orders', { accessToken: session.accessToken }),
    fetchTradeCredit(session.accessToken),
  ]);

  const hasTradeCredit = tradeCredit?.status === 'APPROVED';

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold mb-2">Standing Orders</h1>
        <p className="text-sm text-steel">
          Set up recurring orders for products you buy regularly. Orders are automatically placed on your schedule.
        </p>
      </div>

      <StandingOrdersClient 
        orders={orders} 
        accessToken={session.accessToken} 
        hasTradeCredit={hasTradeCredit}
      />
    </div>
  );
}

async function fetchTradeCredit(accessToken: string): Promise<TradeCreditAccount | null> {
  try {
    return await apiClient.get<TradeCreditAccount>('/v1/trade-credit/me', { accessToken });
  } catch {
    return null;
  }
}
