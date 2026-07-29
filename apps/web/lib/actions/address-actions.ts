'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

export interface AddressActionResult {
  ok: boolean;
  error?: string;
}

async function requireAccessToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.accessToken;
}

export async function createAddressAction(formData: FormData): Promise<AddressActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.post(
      '/v1/addresses',
      {
        line1: formData.get('line1'),
        line2: formData.get('line2') || undefined,
        city: formData.get('city'),
        province: formData.get('province'),
        postalCode: formData.get('postalCode'),
        isDefault: formData.get('isDefault') === 'on',
      },
      { accessToken },
    );
    revalidatePath('/account/addresses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not save address' };
  }
}

export async function setDefaultAddressAction(addressId: string): Promise<AddressActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(`/v1/addresses/${addressId}`, { isDefault: true }, { accessToken });
    revalidatePath('/account/addresses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not update address' };
  }
}

export async function deleteAddressAction(addressId: string): Promise<AddressActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.delete(`/v1/addresses/${addressId}`, { accessToken });
    revalidatePath('/account/addresses');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not delete address' };
  }
}
