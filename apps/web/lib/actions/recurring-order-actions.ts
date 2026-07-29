'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createRecurringOrderAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  const itemCount = Number(formData.get('itemCount') || 0);
  const items = Array.from({ length: itemCount }, (_, i) => ({
    productId: formData.get(`items[${i}].productId`),
    quantity: Number(formData.get(`items[${i}].quantity`) || 1),
  })).filter((item) => item.productId);

  try {
    await apiClient.post(
      '/v1/recurring-orders',
      {
        name: formData.get('name'),
        frequency: formData.get('frequency'),
        shippingAddress: {
          line1: formData.get('line1'),
          line2: formData.get('line2') || undefined,
          city: formData.get('city'),
          province: formData.get('province'),
          postalCode: formData.get('postalCode'),
        },
        poNumber: formData.get('poNumber') || undefined,
        items,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/account/recurring-orders');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create the recurring order' };
  }
}

export async function setRecurringOrderActiveAction(id: string, active: boolean): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(`/v1/recurring-orders/${id}`, { active }, { accessToken: session.accessToken });
    revalidatePath('/account/recurring-orders');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update the recurring order' };
  }
}

export async function removeRecurringOrderAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/recurring-orders/${id}`, { accessToken: session.accessToken });
    revalidatePath('/account/recurring-orders');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove the recurring order' };
  }
}
