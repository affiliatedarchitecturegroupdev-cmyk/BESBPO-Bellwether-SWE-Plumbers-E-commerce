import { Metadata } from 'next';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { QuickReorderTable } from '@/components/trade/QuickReorderTable';

export const metadata: Metadata = {
  title: 'Quick Reorder | Bellwether SWE Plumbers Trade',
  description: 'Quickly reorder products from your previous orders. Select items and add them all to cart at once.',
};

interface OrderLineItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: string;
  product?: {
    id: string;
    slug: string;
    name: string;
    sku: string;
    retailPrice: string;
    tradePrice: string;
    stockQty: number;
    images: { id: string; url: string; sortOrder: number }[];
  };
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  total: string;
  createdAt: string;
  lineItems: OrderLineItem[];
}

interface PaginatedOrders {
  items: Order[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export default async function QuickReorderPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return (
      <div className="text-center py-12">
        <p className="text-steel text-sm">Please sign in to access quick reorder.</p>
      </div>
    );
  }

  // Fetch recent orders with line items
  const ordersResponse = await apiClient.get<PaginatedOrders>('/v1/orders?pageSize=10', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-xl font-bold mb-2">Quick Reorder</h1>
        <p className="text-sm text-steel">
          Select items from your recent orders and add them to cart with one click. 
          Quickly restock your favorite products without searching.
        </p>
      </div>

      <QuickReorderTable 
        orders={ordersResponse.items} 
        accessToken={session.accessToken} 
      />
    </div>
  );
}
