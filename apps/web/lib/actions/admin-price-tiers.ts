'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPriceTierAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/price-tiers',
      {
        productId: formData.get('productId'),
        minQuantity: Number(formData.get('minQuantity')),
        discountPercent: Number(formData.get('discountPercent')),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/admin/products/${formData.get('productSlug')}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create the price tier' };
  }
}

export async function removePriceTierAction(id: string, productSlug: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/price-tiers/${id}`, { accessToken: session.accessToken });
    revalidatePath(`/admin/products/${productSlug}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove the price tier' };
  }
}
