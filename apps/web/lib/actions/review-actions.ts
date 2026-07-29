'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ReviewActionResult {
  ok: boolean;
  error?: string;
}

export async function createReviewAction(productSlug: string, formData: FormData): Promise<ReviewActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to leave a review.' };
  }

  try {
    await apiClient.post(
      '/v1/reviews',
      {
        productId: formData.get('productId'),
        rating: Number(formData.get('rating')),
        title: formData.get('title') || undefined,
        body: formData.get('body'),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/product/${productSlug}`);
    return { ok: true };
  } catch (err) {
    // Surfaces the API's real message — "You can only review products
    // from a completed order" or "You have already reviewed this
    // product" are exactly what the customer needs to see, not a generic
    // failure string.
    const message = err instanceof ApiError ? err.message : 'Could not submit review';
    return { ok: false, error: message };
  }
}
