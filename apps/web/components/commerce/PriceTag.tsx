import { isOnSale } from '@/lib/is-on-sale';

interface PriceTagProps {
  retailPrice: string; // Decimal serializes as string — see lib/types.ts
  tradePrice: string;
  salePrice?: string | null;
  saleEndsAt?: string | null;
  isTradeAccount: boolean;
}

const zarFormatter = new Intl.NumberFormat('en-ZA', {
  style: 'currency',
  currency: 'ZAR',
});

// The retail/trade price pair shows up on every product card, the PDP, and
// cart lines — one component owns the formatting and the "which price
// applies" logic so it can't drift between those three places.
//
// A sale price, when active (see isOnSale — the same shared check
// ProductCard's badge uses), overrides whichever of retail/trade would
// otherwise be shown as the primary price — a clearance item is a
// temporary override of normal pricing, not a third, separate price
// tier. The overridden price is still shown, struck through, so the
// discount is visible rather than just a lower number with no context.
export function PriceTag({ retailPrice, tradePrice, salePrice, saleEndsAt, isTradeAccount }: PriceTagProps) {
  const primary = isTradeAccount ? tradePrice : retailPrice;
  const onSale = isOnSale({ salePrice: salePrice ?? null, saleEndsAt: saleEndsAt ?? null });

  if (onSale && salePrice) {
    return (
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-mono text-base font-semibold text-[#B23A3A]">
          {zarFormatter.format(Number(salePrice))}
        </span>
        <span className="font-mono text-[12px] text-steel line-through">{zarFormatter.format(Number(primary))}</span>
        {!isTradeAccount && (
          <span className="font-mono text-[10.5px] text-hydra">
            Trade: {zarFormatter.format(Number(tradePrice))}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-baseline gap-2">
      <span className="font-mono text-base font-semibold text-ink">
        {zarFormatter.format(Number(primary))}
      </span>
      {!isTradeAccount && (
        <span className="font-mono text-[10.5px] text-hydra">
          Trade: {zarFormatter.format(Number(tradePrice))}
        </span>
      )}
    </div>
  );
}
