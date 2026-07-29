'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createCouponAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/coupons',
      {
        code: formData.get('code'),
        discountType: formData.get('discountType'),
        discountValue: Number(formData.get('discountValue')),
        minSubtotal: formData.get('minSubtotal') ? Number(formData.get('minSubtotal')) : undefined,
        maxUses: formData.get('maxUses') ? Number(formData.get('maxUses')) : undefined,
        maxUsesPerAccount: formData.get('maxUsesPerAccount') ? Number(formData.get('maxUsesPerAccount')) : undefined,
        validFrom: formData.get('validFrom') || undefined,
        validUntil: formData.get('validUntil') || undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/coupons');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create the coupon' };
  }
}

export async function setCouponActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(`/v1/coupons/${id}/active`, { active }, { accessToken: session.accessToken });
    revalidatePath('/admin/coupons');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update the coupon' };
  }
}
