'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function updateProfileAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(
      '/v1/accounts/me',
      {
        email: formData.get('email'),
        // ?? not || — an intentionally-cleared field is an empty string,
        // which || would treat as falsy and silently drop, leaving the
        // old value in place instead of actually clearing it.
        companyName: formData.get('companyName') ?? undefined,
        phone: formData.get('phone') ?? undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/account/profile');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update your profile' };
  }
}
