'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function inviteMemberAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/accounts/me/members',
      { email: formData.get('email') },
      { accessToken: session.accessToken },
    );
    revalidatePath('/account/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not send the invite' };
  }
}

export async function removeMemberAction(memberId: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/accounts/me/members/${memberId}`, { accessToken: session.accessToken });
    revalidatePath('/account/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not remove that member' };
  }
}

export async function updateMemberRoleAction(memberId: string, role: 'OWNER' | 'BUYER'): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(`/v1/accounts/me/members/${memberId}/role`, { role }, { accessToken: session.accessToken });
    revalidatePath('/account/team');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update that member\u2019s role' };
  }
}
