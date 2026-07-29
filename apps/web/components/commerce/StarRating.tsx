interface Props {
  averageRating: number;
  count: number;
  size?: 'sm' | 'xs';
}

// Extracted from ReviewsSection, which had this exact rendering inline —
// the listing-page rating (ProductCard) needs the identical display, and
// two independent copies of "round to nearest star, format to 1 decimal"
// is exactly the kind of thing that quietly drifts apart over time.
export function StarRating({ averageRating, count, size = 'sm' }: Props) {
  const rounded = Math.round(averageRating);
  const textSize = size === 'sm' ? 'text-[13px]' : 'text-[11px]';

  return (
    <span className={`font-mono ${textSize} text-[#E8B923]`}>
      {'★'.repeat(rounded)}
      {'☆'.repeat(5 - rounded)}
      <span className="text-steel ml-1.5">
        {averageRating.toFixed(1)} ({count})
      </span>
    </span>
  );
}
