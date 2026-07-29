'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function applyCouponAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post('/v1/cart/coupon', { code: formData.get('code') }, { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not apply that coupon' };
  }
}

export async function removeCouponAction(): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete('/v1/cart/coupon', { accessToken: session.accessToken });
    revalidatePath('/cart');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove the coupon' };
  }
}
