'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function createPriceBookEntryAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/pricing/price-book-entries',
      {
        sector: formData.get('sector'),
        serviceCode: formData.get('serviceCode'),
        baseLaborRate: Number(formData.get('baseLaborRate')),
        unit: formData.get('unit'),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create the price book entry' };
  }
}

export async function removePriceBookEntryAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/pricing/price-book-entries/${id}`, { accessToken: session.accessToken });
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove the entry' };
  }
}

export async function createComplexityMultiplierAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/pricing/complexity-multipliers',
      {
        code: formData.get('code'),
        label: formData.get('label'),
        multiplier: Number(formData.get('multiplier')),
        description: formData.get('description') || undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create the multiplier' };
  }
}

export async function updateComplexityMultiplierAction(id: string, formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(
      `/v1/pricing/complexity-multipliers/${id}`,
      { multiplier: Number(formData.get('multiplier')), label: formData.get('label') },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update the multiplier' };
  }
}

export async function removeComplexityMultiplierAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/pricing/complexity-multipliers/${id}`, { accessToken: session.accessToken });
    revalidatePath('/admin/pricing');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove the multiplier' };
  }
}
