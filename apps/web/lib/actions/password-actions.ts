'use server';

import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ChangePasswordResult {
  ok: boolean;
  error?: string;
}

export async function changePasswordAction(formData: FormData): Promise<ChangePasswordResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'You must be signed in to change your password' };
  }

  const currentPassword = formData.get('currentPassword') as string;
  const newPassword = formData.get('newPassword') as string;

  if (!currentPassword || !newPassword) {
    return { ok: false, error: 'Current and new passwords are required' };
  }

  if (newPassword.length < 8) {
    return { ok: false, error: 'Password must be at least 8 characters' };
  }

  try {
    await apiClient.post(
      '/v1/accounts/change-password',
      { currentPassword, newPassword },
      { accessToken: session.accessToken }
    );
    return { ok: true };
  } catch (err) {
    if (err instanceof ApiError) {
      if (err.status === 401) {
        return { ok: false, error: 'Current password is incorrect' };
      }
      return { ok: false, error: err.message };
    }
    return { ok: false, error: 'Could not change password. Please try again.' };
  }
}
