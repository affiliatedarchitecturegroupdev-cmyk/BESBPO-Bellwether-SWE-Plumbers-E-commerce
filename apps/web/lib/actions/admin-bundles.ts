'use server';

import { redirect } from 'next/navigation';
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

// BundleItemsPicker (client component) serializes its rows into this
// hidden field as JSON — FormData can't natively represent a dynamic array
// of {productId, quantity} pairs the way a controlled React array can, and
// this avoids the naming-convention gymnastics (items[0][productId], etc.)
// a raw multi-field approach would need.
function parseItemsField(formData: FormData): { productId: string; quantity: number }[] {
  const raw = formData.get('itemsJson');
  if (typeof raw !== 'string' || raw.trim() === '') return [];
  return JSON.parse(raw);
}

export async function createBundleAction(formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.post(
    '/v1/bundles',
    {
      slug: formData.get('slug'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      sector: formData.get('sector'),
      bundlePrice: Number(formData.get('bundlePrice')),
      items: parseItemsField(formData),
    },
    { accessToken },
  );

  revalidatePath('/admin/bundles');
  redirect('/admin/bundles');
}

// Top-level fields only — matches UpdateBundleDto exactly (see
// dto/update-bundle.dto.ts on apps/api: item composition changes are
// deliberately not part of this endpoint, and there's no bundle-items
// management endpoint yet either — see docs/GAP-ANALYSIS-ROADMAP.md).
// This form doesn't render an item picker for that reason.
export async function updateBundleAction(bundleId: string, formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.patch(
    `/v1/bundles/${bundleId}`,
    {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      sector: formData.get('sector'),
      bundlePrice: Number(formData.get('bundlePrice')),
    },
    { accessToken },
  );

  revalidatePath('/admin/bundles');
  redirect('/admin/bundles');
}

export async function deleteBundleAction(bundleId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.delete(`/v1/bundles/${bundleId}`, { accessToken });
    revalidatePath('/admin/bundles');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
