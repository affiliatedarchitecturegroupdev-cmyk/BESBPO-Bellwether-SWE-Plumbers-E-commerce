'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface CartActionResult {
  ok: boolean;
  error?: 'sign-in-required' | 'request-failed';
}

// Server action, not a client-side fetch straight to apps/api — keeps the
// access token server-side, matching how getCurrentAccount() already works.
// A client component calling apiClient directly would need the token
// exposed to the browser, which this deliberately avoids.
export async function addToCartAction(productId: string, quantity: number = 1): Promise<CartActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'sign-in-required' };
  }

  try {
    await apiClient.post('/v1/cart/items', { productId, quantity }, { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export async function updateCartItemAction(cartItemId: string, quantity: number): Promise<CartActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'sign-in-required' };
  }

  try {
    await apiClient.patch(`/v1/cart/items/${cartItemId}`, { quantity }, { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export async function removeCartItemAction(cartItemId: string): Promise<CartActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'sign-in-required' };
  }

  try {
    await apiClient.delete(`/v1/cart/items/${cartItemId}`, { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true };
  } catch {
    return { ok: false, error: 'request-failed' };
  }
}

export interface BulkAddResult {
  ok: boolean;
  error?: string;
  itemCount?: number;
}

// Trade portal's bulk-order page — one request for the whole table instead
// of looping addToCartAction per row, both for efficiency and so a bad
// productId rejects the whole batch with one clear error (see
// CartService.bulkAddItems on the API).
export async function bulkAddToCartAction(
  items: { productId: string; quantity: number }[],
): Promise<BulkAddResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post('/v1/cart/items/bulk', { items }, { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true, itemCount: items.length };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not add items to cart';
    return { ok: false, error: message };
  }
}
