import Link from 'next/link';
import { apiClient } from '@/lib/api-client';

interface Recommendation {
  productId: string;
  name: string;
  slug: string;
  reason: string;
}

interface Props {
  productId: string;
}

export async function FrequentlyBoughtWith({ productId }: Props) {
  const recommendations = await apiClient.get<Recommendation[]>(`/v1/products/${productId}/recommendations`);

  if (recommendations.length === 0) return null;

  return (
    <div className="mt-10 pt-8 border-t border-black/10">
      <h2 className="text-base font-semibold mb-4">Frequently Bought With</h2>
      <div className="flex flex-wrap gap-3">
        {recommendations.map((rec) => (
          <Link
            key={rec.productId}
            href={`/product/${rec.slug}`}
            className="border border-black/10 rounded-sm px-4 py-2.5 text-sm hover:border-hydra"
          >
            {rec.name}
          </Link>
        ))}
      </div>
    </div>
  );
}
