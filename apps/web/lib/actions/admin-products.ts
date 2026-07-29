'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';

// No try/catch wrapping these — if apiClient throws (a validation error, a
// duplicate SKU, etc.), it propagates to Next.js's nearest error.tsx
// boundary (app/admin/error.tsx) rather than being caught here. That's a
// deliberate simplification for this "minimal" panel: coarse whole-page
// error display instead of inline per-field validation errors, which
// would need useFormState and more client-side wiring than this pass
// scopes for for. See docs/GAP-ANALYSIS-ROADMAP.md.
async function requireAccessToken(): Promise<string> {
  const session = await auth();
  if (!session?.accessToken) {
    throw new Error('Not authenticated');
  }
  return session.accessToken;
}

export async function createProductAction(formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.post(
    '/v1/products',
    {
      sku: formData.get('sku'),
      slug: formData.get('slug'),
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      categoryId: formData.get('categoryId'),
      retailPrice: Number(formData.get('retailPrice')),
      tradePrice: Number(formData.get('tradePrice')),
      stockQty: Number(formData.get('stockQty') || 0),
      sansCompliant: formData.get('sansCompliant') === 'on',
      brand: formData.get('brand') || undefined,
      weightKg: Number(formData.get('weightKg') || 1),
      lengthCm: Number(formData.get('lengthCm') || 20),
      widthCm: Number(formData.get('widthCm') || 15),
      heightCm: Number(formData.get('heightCm') || 10),
      variantGroupId: formData.get('variantGroupId') || null,
      variantValue: formData.get('variantValue') || null,
    },
    { accessToken },
  );

  revalidatePath('/admin/products');
  redirect('/admin/products');
}

export async function updateProductAction(productId: string, formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.patch(
    `/v1/products/${productId}`,
    {
      name: formData.get('name'),
      description: formData.get('description') || undefined,
      categoryId: formData.get('categoryId'),
      retailPrice: Number(formData.get('retailPrice')),
      tradePrice: Number(formData.get('tradePrice')),
      stockQty: Number(formData.get('stockQty') || 0),
      sansCompliant: formData.get('sansCompliant') === 'on',
      // || null, not || undefined — same reasoning as variantGroupId
      // below, and the same class of bug already caught once for
      // profile editing (formData.get returns '' for an intentionally-
      // cleared field; || undefined would silently drop that update and
      // leave the old brand in place instead of actually clearing it).
      brand: formData.get('brand') || null,
      weightKg: Number(formData.get('weightKg') || 1),
      lengthCm: Number(formData.get('lengthCm') || 20),
      widthCm: Number(formData.get('widthCm') || 15),
      heightCm: Number(formData.get('heightCm') || 10),
      variantGroupId: formData.get('variantGroupId') || null,
      variantValue: formData.get('variantValue') || null,
    },
    { accessToken },
  );

  revalidatePath('/admin/products');
  revalidatePath(`/admin/products/${productId}`);
  redirect('/admin/products');
}

export async function deleteProductAction(productId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.delete(`/v1/products/${productId}`, { accessToken });
    revalidatePath('/admin/products');
    return { ok: true };
  } catch (err) {
    // Delete specifically DOES catch — it's called from a client component
    // (DeleteButton) that expects a structured result to render inline,
    // not a thrown error that would blow past the confirm-button UI into
    // the page-level error boundary.
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

// Two-step upload flow, mirroring apps/api's media module design exactly
// (see docs/AGENTS.md) — this action gets the presigned URL; the browser
// itself does the actual PUT to S3 (see ProductImageUploader.tsx), since a
// server action can't stream a File object's bytes the way client-side
// fetch can.
export async function requestProductImageUploadAction(
  productId: string,
  contentType: string,
): Promise<{ uploadUrl: string; key: string }> {
  const accessToken = await requireAccessToken();
  return apiClient.post('/v1/media/product-images/upload-url', { productId, contentType }, { accessToken });
}

export async function confirmProductImageAction(productId: string, key: string): Promise<void> {
  const accessToken = await requireAccessToken();
  await apiClient.post('/v1/media/product-images', { productId, key }, { accessToken });
  revalidatePath(`/admin/products/${productId}`);
}

export async function deleteProductImageAction(
  imageId: string,
  productId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.delete(`/v1/media/product-images/${imageId}`, { accessToken });
    revalidatePath(`/admin/products/${productId}`);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}

export async function restockProductAction(
  productId: string,
  quantity: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.post(`/v1/products/${productId}/restock`, { quantity }, { accessToken });
    revalidatePath('/admin/products');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Restock failed' };
  }
}

// A dedicated, focused action for the Clearance review screen — a
// partial PATCH (just salePrice/saleEndsAt) rather than reusing
// updateProductAction above, which expects a full product form and
// redirects to the products list. saleEndsAt of '' (the form field left
// blank) means "no scheduled end," not "clear the sale" — only an
// explicit "Remove from clearance" action does that, via salePrice: null
// below.
export async function setClearancePriceAction(
  productId: string,
  salePrice: number,
  saleEndsAt: string | null,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(`/v1/products/${productId}`, { salePrice, saleEndsAt }, { accessToken });
    revalidatePath('/admin/clearance');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not set the clearance price' };
  }
}

export async function removeFromClearanceAction(productId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.patch(`/v1/products/${productId}`, { salePrice: null, saleEndsAt: null }, { accessToken });
    revalidatePath('/admin/clearance');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not remove from clearance' };
  }
}

