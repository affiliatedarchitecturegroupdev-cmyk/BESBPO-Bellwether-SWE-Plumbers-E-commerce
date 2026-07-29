import { QuoteRequestForm } from '@/components/trade/QuoteRequestForm';

// No longer pre-fetches a static product list here — see
// QuoteRequestForm/ProductCombobox's own comments for why (the old
// pageSize=200 fetch was silently failing against the API's own cap).
export default async function NewQuotePage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Request a Quote</h1>
      <p className="text-sm text-steel mb-6">
        For bulk orders, custom work, or anything that doesn&apos;t fit a standard cart checkout. We&apos;ll
        review and send back pricing.
      </p>
      <QuoteRequestForm />
    </div>
  );
}
