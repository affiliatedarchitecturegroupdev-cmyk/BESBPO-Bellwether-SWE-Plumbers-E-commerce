import { apiClient } from '@/lib/api-client';
import { WriteReviewForm } from './WriteReviewForm';
import { StarRating } from './StarRating';

interface ReviewItem {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  createdAt: string;
}

interface ReviewsResult {
  items: ReviewItem[];
  total: number;
  averageRating: number | null;
}

const dateFormatter = new Intl.DateTimeFormat('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

interface Props {
  productId: string;
  productSlug: string;
  isSignedIn: boolean;
}

export async function ReviewsSection({ productId, productSlug, isSignedIn }: Props) {
  const reviews = await apiClient.get<ReviewsResult>(`/v1/reviews?productId=${productId}&pageSize=20`);

  return (
    <div className="mt-10">
      <div className="flex items-baseline gap-3 mb-5">
        <h2 className="text-base font-semibold">Reviews</h2>
        {reviews.averageRating !== null && (
          <StarRating averageRating={reviews.averageRating} count={reviews.total} />
        )}
      </div>

      {reviews.items.length === 0 ? (
        <p className="text-sm text-steel">No reviews yet — be the first to review this product.</p>
      ) : (
        <ul className="space-y-5">
          {reviews.items.map((review) => (
            <li key={review.id} className="border-b border-black/5 pb-5">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-mono text-[12px] text-[#E8B923]">
                  {'★'.repeat(review.rating)}
                  {'☆'.repeat(5 - review.rating)}
                </span>
                <span className="font-mono text-[10.5px] text-steel">
                  {dateFormatter.format(new Date(review.createdAt))}
                </span>
              </div>
              {review.title && <p className="text-sm font-semibold mb-1">{review.title}</p>}
              <p className="text-sm text-[#4A5157]">{review.body}</p>
            </li>
          ))}
        </ul>
      )}

      {/* Not shown when signed out — the API would reject it anyway (no
          verified purchase to check without an account), so hiding the
          form is a courtesy, not the actual enforcement. See
          ReviewsService.assertVerifiedPurchase for where that really
          happens. */}
      {isSignedIn && <WriteReviewForm productId={productId} productSlug={productSlug} />}
    </div>
  );
}
