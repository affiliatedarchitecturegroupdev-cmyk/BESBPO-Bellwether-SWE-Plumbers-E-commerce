import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { PriceBookEntriesPanel } from '@/components/admin/PriceBookEntriesPanel';
import { ComplexityMultipliersPanel } from '@/components/admin/ComplexityMultipliersPanel';

interface PriceBookEntry {
  id: string;
  sector: string;
  serviceCode: string;
  baseLaborRate: string;
  unit: string;
  effectiveFrom: string;
}

interface ComplexityMultiplier {
  id: string;
  code: string;
  label: string;
  multiplier: string;
  description: string | null;
}

export default async function AdminPricingPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const [priceBookEntries, complexityMultipliers] = await Promise.all([
    apiClient.get<PriceBookEntry[]>('/v1/pricing/price-book-entries', { accessToken: session.accessToken }),
    apiClient.get<ComplexityMultiplier[]>('/v1/pricing/complexity-multipliers', { accessToken: session.accessToken }),
  ]);

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Pricing</h1>
      <p className="text-sm text-steel mb-8">
        Powers the booking/quote estimator (<code>POST /v1/pricing/quote</code>) — was previously only settable
        via <code>prisma/seed.ts</code> or direct database access.
      </p>

      <PriceBookEntriesPanel entries={priceBookEntries} />
      <ComplexityMultipliersPanel multipliers={complexityMultipliers} />
    </div>
  );
}
