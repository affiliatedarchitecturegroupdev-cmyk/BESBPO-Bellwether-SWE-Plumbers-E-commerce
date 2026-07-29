import Link from 'next/link';
import Image from 'next/image';
import { Product } from '@/lib/types';
import { PriceTag } from './PriceTag';
import { AddToCartButton } from './AddToCartButton';
import { CompareButton } from './CompareButton';
import { ProductImageOrPlaceholder } from './ProductImageOrPlaceholder';
import { StarRating } from './StarRating';
import { isOnSale } from '@/lib/is-on-sale';

interface ProductCardProps {
  product: Product;
  isTradeAccount: boolean;
}

// Link wraps the browsable part (image, name, price); AddToCartButton sits
// outside it as a sibling. A <button> nested inside an <a> is invalid HTML
// (interactive content can't nest) — this avoids that rather than papering
// over it with stopPropagation() on a click handler.
export function ProductCard({ product, isTradeAccount }: ProductCardProps) {
  const onSale = isOnSale(product);

  return (
    <div className="border border-black/10 rounded-sm overflow-hidden transition-shadow hover:shadow-lg">
      <Link href={`/product/${product.slug}`} className="block">
        <div className="aspect-square bg-[#F3F4F5] relative">
          <ProductImageOrPlaceholder image={product.images[0]} alt={product.name} />
          {onSale && (
            <span className="absolute top-2 left-2 font-mono text-[9.5px] uppercase tracking-wide font-bold bg-[#B23A3A] text-white px-2 py-0.5 rounded-sm">
              Clearance
            </span>
          )}
        </div>
        <div className="px-4 pt-4">
          <span className="font-mono text-[9.5px] uppercase tracking-wide text-steel">
            {product.category.name}
          </span>
          <h3 className="text-sm font-semibold mt-1.5 mb-2 line-clamp-2">{product.name}</h3>
          {product.averageRating !== null && product.averageRating !== undefined && (
            <div className="mb-2">
              <StarRating averageRating={product.averageRating} count={product.reviewCount ?? 0} size="xs" />
            </div>
          )}
          <PriceTag
            retailPrice={product.retailPrice}
            tradePrice={product.tradePrice}
            salePrice={product.salePrice}
            saleEndsAt={product.saleEndsAt}
            isTradeAccount={isTradeAccount}
          />
        </div>
      </Link>
      <div className="px-4 pb-4 pt-3">
        <AddToCartButton productId={product.id} />
        <CompareButton slug={product.slug} />
      </div>
    </div>
  );
}
