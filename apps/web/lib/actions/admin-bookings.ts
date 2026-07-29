'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function updateBookingStatusAction(formData: FormData): Promise<AdminActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  const bookingId = formData.get('bookingId') as string;
  const scheduledFor = formData.get('scheduledFor') as string;

  try {
    await apiClient.patch(
      `/v1/bookings/${bookingId}/status`,
      {
        status: formData.get('status'),
        ...(scheduledFor ? { scheduledFor: new Date(scheduledFor).toISOString() } : {}),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/bookings');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not update booking' };
  }
}
