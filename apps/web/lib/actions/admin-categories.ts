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

export async function createCategoryAction(formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.post(
    '/v1/categories',
    {
      slug: formData.get('slug'),
      name: formData.get('name'),
      parentId: formData.get('parentId') || undefined,
    },
    { accessToken },
  );

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function updateCategoryAction(categoryId: string, formData: FormData): Promise<void> {
  const accessToken = await requireAccessToken();

  await apiClient.patch(
    `/v1/categories/${categoryId}`,
    {
      name: formData.get('name'),
      parentId: formData.get('parentId') || undefined,
    },
    { accessToken },
  );

  revalidatePath('/admin/categories');
  redirect('/admin/categories');
}

export async function deleteCategoryAction(categoryId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const accessToken = await requireAccessToken();
    await apiClient.delete(`/v1/categories/${categoryId}`, { accessToken });
    revalidatePath('/admin/categories');
    return { ok: true };
  } catch (err) {
    // The API blocks deletion of a category with children/products
    // (CategoriesService.remove) — that ConflictException message is
    // exactly what should surface here, not a generic failure string.
    return { ok: false, error: err instanceof Error ? err.message : 'Delete failed' };
  }
}
