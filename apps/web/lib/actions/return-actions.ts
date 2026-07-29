'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createReturnRequestAction(orderId: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  const itemCount = Number(formData.get('itemCount') || 0);
  const lineItems = Array.from({ length: itemCount }, (_, i) => ({
    orderLineItemId: formData.get(`items[${i}].orderLineItemId`),
    quantity: Number(formData.get(`items[${i}].quantity`) || 0),
  })).filter((item) => item.orderLineItemId && item.quantity > 0);

  try {
    await apiClient.post(
      '/v1/returns',
      {
        orderId,
        reason: formData.get('reason'),
        reasonDetail: formData.get('reasonDetail') || undefined,
        lineItems,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/account/returns');
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit the return request' };
  }
}
