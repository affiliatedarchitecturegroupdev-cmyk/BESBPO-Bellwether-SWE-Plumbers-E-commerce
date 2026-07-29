import { BulkOrderTable } from '@/components/trade/BulkOrderTable';

// No longer pre-fetches a static product list here — see
// BulkOrderTable/ProductCombobox's own comments for why (the old
// pageSize=200 fetch was silently failing against the API's own cap,
// and a table of every product was never workable at this catalog's
// real size regardless).
export default async function BulkOrderPage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Bulk Order</h1>
      <p className="text-sm text-steel mb-6">
        Search for the products you need, add them, and enter quantities — then add them all to your cart at
        once.
      </p>
      <BulkOrderTable />
    </div>
  );
}
