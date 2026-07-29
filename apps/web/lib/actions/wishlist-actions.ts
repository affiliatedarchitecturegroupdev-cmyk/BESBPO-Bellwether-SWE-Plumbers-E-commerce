'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function toggleWishlistAction(productId: string, isCurrentlyWishlisted: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to save items to your wishlist.' };
  }

  try {
    if (isCurrentlyWishlisted) {
      await apiClient.delete(`/v1/wishlist/${productId}`, { accessToken: session.accessToken });
    } else {
      await apiClient.post(`/v1/wishlist/${productId}`, {}, { accessToken: session.accessToken });
    }
    revalidatePath('/account/wishlist');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update your wishlist' };
  }
}
