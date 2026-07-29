'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export async function upsertNotificationTemplateAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.post(
      '/v1/notification-templates',
      {
        type: formData.get('type'),
        subjectTemplate: formData.get('subjectTemplate'),
        bodyTemplate: formData.get('bodyTemplate'),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/notifications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not save the template' };
  }
}

export async function resetNotificationTemplateAction(type: string): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.delete(`/v1/notification-templates/${type}`, { accessToken: session.accessToken });
    revalidatePath('/admin/notifications');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not reset the template' };
  }
}
