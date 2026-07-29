'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function amendOrderAddressAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  const orderId = formData.get('orderId') as string;

  try {
    await apiClient.patch(
      `/v1/orders/${orderId}/address`,
      {
        line1: formData.get('line1'),
        line2: formData.get('line2') || undefined,
        city: formData.get('city'),
        province: formData.get('province'),
        postalCode: formData.get('postalCode'),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/account/orders/${orderId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update the delivery address' };
  }
}
