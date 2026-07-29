import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';
import { CreateRecurringOrderForm } from '@/components/commerce/CreateRecurringOrderForm';
import { RecurringOrderCard } from '@/components/commerce/RecurringOrderCard';

interface TemplateItem {
  quantity: number;
  product: { name: string };
}

interface Template {
  id: string;
  name: string;
  frequency: string;
  active: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunError: string | null;
  items: TemplateItem[];
}

export default async function RecurringOrdersPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const hasTradeCredit = await checkTradeCreditEligibility(session.accessToken);
  if (!hasTradeCredit) {
    return (
      <div>
        <h1 className="font-display text-xl font-bold mb-2">Recurring Orders</h1>
        <p className="text-sm text-steel">
          Recurring orders are available to approved trade credit accounts — they place automatically on your
          trade credit, with no interactive payment step to redirect through. Apply for trade credit from your
          account to unlock this.
        </p>
      </div>
    );
  }

  const templates = await apiClient.get<Template[]>('/v1/recurring-orders', { accessToken: session.accessToken });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Recurring Orders</h1>
      <p className="text-sm text-steel mb-8">
        Automatically reorder the same items on a schedule, charged to your trade credit — no need to place an
        identical order manually every month.
      </p>

      <CreateRecurringOrderForm />

      {templates.length === 0 ? (
        <p className="text-sm text-steel">No recurring orders set up yet.</p>
      ) : (
        <div className="space-y-4">
          {templates.map((template) => (
            <RecurringOrderCard key={template.id} template={template} />
          ))}
        </div>
      )}
    </div>
  );
}

// Same eligibility check pattern already used by the checkout page and
// split-checkout page — kept as its own small copy rather than
// extracting a shared helper for what's now three call sites; a real,
// small refactor worth doing if a fourth ever comes along.
async function checkTradeCreditEligibility(accessToken: string): Promise<boolean> {
  try {
    const account = await apiClient.get<{ approvedAt: string | null }>('/v1/trade-credit/me', { accessToken });
    return account.approvedAt !== null;
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return false;
    throw err;
  }
}
