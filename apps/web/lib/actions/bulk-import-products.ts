'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface BulkImportError {
  row: number;
  sku: string;
  message: string;
}

export interface BulkImportActionResult {
  ok: boolean;
  created?: number;
  updated?: number;
  errors?: BulkImportError[];
  error?: string;
}

export async function bulkImportProductsAction(csvContent: string): Promise<BulkImportActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    const result = await apiClient.post<{ ok: boolean; created: number; updated: number; errors: BulkImportError[] }>(
      '/v1/products/bulk-import',
      { csvContent },
      { accessToken: session.accessToken },
    );
    if (result.ok) {
      revalidatePath('/admin/products');
    }
    return result;
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Import failed' };
  }
}
