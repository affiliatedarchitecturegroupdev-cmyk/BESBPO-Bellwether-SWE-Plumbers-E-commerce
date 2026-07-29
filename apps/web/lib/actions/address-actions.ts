'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

async function requireAccessToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.accessToken;
}

export async function createAddressAction(formData: FormData): Promise<void> {
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
}

export async function setDefaultAddressAction(addressId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiClient.patch(`/v1/addresses/${addressId}`, { isDefault: true }, { accessToken });
  revalidatePath('/account/addresses');
}

export async function deleteAddressAction(addressId: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiClient.delete(`/v1/addresses/${addressId}`, { accessToken });
  revalidatePath('/account/addresses');
}
