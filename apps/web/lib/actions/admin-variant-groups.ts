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

export async function createVariantGroupAction(formData: FormData): Promise<ActionResult> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.post(
      '/v1/products/variant-groups',
      { name: formData.get('name'), optionLabel: formData.get('optionLabel') },
      { accessToken },
    );
    revalidatePath('/admin/variant-groups');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create variant group' };
  }
}
