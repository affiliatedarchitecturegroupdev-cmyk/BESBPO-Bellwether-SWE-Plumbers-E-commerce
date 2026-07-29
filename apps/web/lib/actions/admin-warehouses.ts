'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

async function requireAccessToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.accessToken;
}

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createWarehouseAction(formData: FormData): Promise<ActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.post(
      '/v1/warehouses',
      {
        name: formData.get('name'),
        streetAddress: formData.get('streetAddress'),
        city: formData.get('city'),
        province: formData.get('province'),
        postalCode: formData.get('postalCode'),
      },
      { accessToken },
    );
    revalidatePath('/admin/warehouses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create warehouse' };
  }
}

export async function setWarehouseStockAction(formData: FormData): Promise<ActionResult> {
  const warehouseId = formData.get('warehouseId') as string;
  const productId = formData.get('productId') as string;

  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(
      `/v1/warehouses/${warehouseId}/stock/${productId}`,
      { quantity: Number(formData.get('quantity')) },
      { accessToken },
    );
    revalidatePath(`/admin/products/${formData.get('productSlug')}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update stock' };
  }
}
