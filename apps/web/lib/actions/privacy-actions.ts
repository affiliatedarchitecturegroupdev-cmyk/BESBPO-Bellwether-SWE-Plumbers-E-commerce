'use server';

import { auth, signOut } from '@/auth';
import { apiClient } from '@/lib/api-client';

export interface ExportDataResult {
  ok: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

export async function exportMyDataAction(): Promise<ExportDataResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    const data = await apiClient.get<Record<string, unknown>>('/v1/accounts/me/export', {
      accessToken: session.accessToken,
    });
    return { ok: true, data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not export your data' };
  }
}

export interface EraseDataResult {
  ok: boolean;
  error?: string;
}

// Signs the browser out after a successful erasure — the account they were
// signed in as no longer meaningfully exists (its email is anonymized),
// so there's nothing left for the current session to usefully do.
export async function eraseMyDataAction(): Promise<EraseDataResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete('/v1/accounts/me', { accessToken: session.accessToken });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Could not process your request' };
  }

  await signOut({ redirect: false });
  return { ok: true };
}
