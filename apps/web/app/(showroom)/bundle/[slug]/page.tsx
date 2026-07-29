import { notFound } from 'next/navigation';
import { Metadata } from 'next';
import { apiClient, ApiError } from '@/lib/api-client';
import { AddBundleToCartButton } from '@/components/commerce/AddBundleToCartButton';

interface BundleItem {
  id: string;
  quantity: number;
  product: { id: string; slug: string; name: string; retailPrice: string };
}

interface BundleDetail {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  sector: string;
  bundlePrice: string;
  items: BundleItem[];
}

const zar = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR' });

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = await fetchBundle(params.slug);
  if (!bundle) return {};
  return {
    title: `${bundle.name} | Bellwether SWE Plumbers`,
    description: bundle.description ?? `${bundle.name} — a project bundle from Bellwether SWE Plumbers.`,
  };
}

// A real gap, stated directly rather than papered over: there is no
// bundle-aware checkout mechanism anywhere in this codebase yet — a
// Bundle is an admin-curated list of products at a stated combined
// price, with no way to actually charge that discounted price at
// checkout. "Add all items to cart" below adds each item at its own
// individual retail price via the same bulk-add endpoint the bulk-order
// page already uses — genuinely NOT the bundle's own discounted price,
// and labeled that way rather than implying otherwise. A real
// bundle-price checkout mechanism (e.g. detecting a complete matching
// set of bundle items in the cart and applying the bundle's own
// discount) is real, separate, unbuilt work.
export default async function BundlePage({ params }: Props) {
  const bundle = await fetchBundle(params.slug);
  if (!bundle) notFound();

  const individualTotal = bundle.items.reduce(
    (sum, item) => sum + item.quantity * Number(item.product.retailPrice),
    0,
  );
  const savings = individualTotal - Number(bundle.bundlePrice);

  return (
    <div className="max-w-[800px] mx-auto px-8 py-14">
      <span className="font-mono text-[10.5px] uppercase tracking-wide text-hydra">{bundle.sector}</span>
      <h1 className="font-display text-2xl font-bold mt-1 mb-3">{bundle.name}</h1>
      {bundle.description && <p className="text-sm text-steel mb-8">{bundle.description}</p>}

      <div className="border border-black/10 rounded-sm p-5 mb-8">
        <h2 className="text-sm font-semibold mb-3">What&apos;s Included</h2>
        <ul>
          {bundle.items.map((item) => (
            <li key={item.id} className="flex justify-between py-2 border-b border-black/5 text-sm last:border-b-0">
              <span>
                {item.quantity} × {item.product.name}
              </span>
              <span className="font-mono text-steel">
                {zar.format(item.quantity * Number(item.product.retailPrice))}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="border border-black/10 rounded-sm p-5 mb-8">
        <div className="flex justify-between text-sm text-steel mb-1">
          <span>Individually, these items cost</span>
          <span className="font-mono">{zar.format(individualTotal)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <span className="text-sm font-semibold">Bundle price</span>
          <span className="font-display text-xl font-bold">{zar.format(Number(bundle.bundlePrice))}</span>
        </div>
        {savings > 0 && (
          <p className="text-[12.5px] text-hydra mt-1">
            A stated saving of {zar.format(savings)} vs. buying separately.
          </p>
        )}
        <p className="text-[11px] text-steel mt-3">
          The button below adds each item to your cart at its own individual price — there is no automatic
          bundle-price checkout yet, so the bundle price above is informational for now.
        </p>
      </div>

      <AddBundleToCartButton
        items={bundle.items.map((item) => ({ productId: item.product.id, quantity: item.quantity }))}
      />
    </div>
  );
}

async function fetchBundle(slug: string): Promise<BundleDetail | null> {
  try {
    return await apiClient.get<BundleDetail>(`/v1/bundles/${slug}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return null;
    throw err;
  }
}
