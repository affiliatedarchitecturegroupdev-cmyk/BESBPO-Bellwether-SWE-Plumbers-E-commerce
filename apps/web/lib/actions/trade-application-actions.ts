'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function applyForTradeAccountAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to apply for a trade account.' };
  }

  try {
    await apiClient.post(
      '/v1/trade-account-applications',
      {
        companyName: formData.get('companyName'),
        companyRegNumber: formData.get('companyRegNumber') || undefined,
        yearsInBusiness: formData.get('yearsInBusiness') ? Number(formData.get('yearsInBusiness')) : undefined,
        message: formData.get('message') || undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/trade/apply');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit your application' };
  }
}

export async function approveTradeApplicationAction(id: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) return { ok: false, error: 'Please sign in.' };

  try {
    await apiClient.post(`/v1/trade-account-applications/${id}/approve`, {}, { accessToken: session.accessToken });
    revalidatePath('/admin/trade-applications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not approve this application' };
  }
}

export async function rejectTradeApplicationAction(id: string, rejectionReason: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) return { ok: false, error: 'Please sign in.' };

  try {
    await apiClient.post(
      `/v1/trade-account-applications/${id}/reject`,
      { rejectionReason },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/trade-applications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not reject this application' };
  }
}
