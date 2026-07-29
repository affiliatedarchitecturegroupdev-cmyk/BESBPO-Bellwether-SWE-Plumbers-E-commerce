'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

async function patchReturn(path: string, body: unknown): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(path, body, { accessToken: session.accessToken });
    revalidatePath('/admin/returns');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update the return request' };
  }
}

export async function approveReturnAction(id: string, adminNote: string): Promise<ActionResult> {
  return patchReturn(`/v1/returns/${id}/approve`, { adminNote: adminNote || undefined });
}

export async function rejectReturnAction(id: string, adminNote: string): Promise<ActionResult> {
  return patchReturn(`/v1/returns/${id}/reject`, { adminNote });
}

export async function markReturnReceivedAction(id: string, adminNote: string): Promise<ActionResult> {
  return patchReturn(`/v1/returns/${id}/receive`, { adminNote: adminNote || undefined });
}

export async function resolveReturnAsRefundAction(
  id: string,
  refundAmount: number,
  adminNote: string,
): Promise<ActionResult> {
  return patchReturn(`/v1/returns/${id}/refund`, { refundAmount, adminNote: adminNote || undefined });
}

export async function resolveReturnAsReplacementAction(id: string, adminNote: string): Promise<ActionResult> {
  return patchReturn(`/v1/returns/${id}/replace`, { adminNote: adminNote || undefined });
}
