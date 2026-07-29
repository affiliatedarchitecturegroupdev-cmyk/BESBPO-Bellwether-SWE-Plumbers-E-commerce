'use server';

import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function issueWarrantyAction(formData: FormData): Promise<AdminActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  try {
    await apiClient.post(
      '/v1/warranty',
      {
        bookingId: formData.get('bookingId'),
        termMonths: Number(formData.get('termMonths') || 12),
      },
      { accessToken: session.accessToken },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not issue warranty' };
  }
}

export async function issueCoCAction(formData: FormData): Promise<AdminActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  try {
    await apiClient.post(
      '/v1/compliance/coc',
      {
        bookingId: formData.get('bookingId'),
        pirbRegNumber: formData.get('pirbRegNumber'),
        certificateNumber: formData.get('certificateNumber'),
        documentUrl: formData.get('documentUrl'),
      },
      { accessToken: session.accessToken },
    );
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not issue certificate' };
  }
}
