import { Product } from '@/lib/types';
import { ProductCard } from './ProductCard';

interface Props {
  title: string;
  subtitle?: string;
  seeAllHref?: string;
  products: Product[];
  isTradeAccount: boolean;
}

export function ProductRailSection({ title, subtitle, seeAllHref, products, isTradeAccount }: Props) {
  if (products.length === 0) return null;

  return (
    <section className="max-w-[1240px] mx-auto px-8 py-14">
      <div className="flex justify-between items-baseline mb-7">
        <div>
          <h2 className="text-2xl font-display font-bold">{title}</h2>
          {subtitle && <p className="text-[13px] text-steel mt-1">{subtitle}</p>}
        </div>
        {seeAllHref && (
          <a href={seeAllHref} className="font-mono text-[11.5px] uppercase tracking-wide text-hydra">
            See all →
          </a>
        )}
      </div>
      <div className="grid grid-cols-4 gap-5">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} isTradeAccount={isTradeAccount} />
        ))}
      </div>
    </section>
  );
}
