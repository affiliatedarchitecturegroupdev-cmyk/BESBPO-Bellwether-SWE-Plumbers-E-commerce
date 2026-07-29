'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface EstimateResult {
  matchedSector: string | null;
  matchedServiceCode: string | null;
  confidence: 'high' | 'low' | 'unavailable';
  quote: Record<string, unknown> | null;
  note: string;
}

// Public endpoint on the API — no sign-in needed for a preliminary
// estimate, so this doesn't check for a session the way the other actions
// in this file do.
export async function requestEstimateAction(description: string): Promise<EstimateResult> {
  return apiClient.post<EstimateResult>('/v1/estimate', { description });
}

export interface CreateBookingResult {
  ok: boolean;
  error?: string;
  bookingId?: string;
}

export async function createBookingAction(
  estimate: EstimateResult | null,
  formData: FormData,
): Promise<CreateBookingResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to request a booking.' };
  }

  // Falls back to a general callout when the estimate couldn't classify
  // the job (or was never fetched) — the field team confirms the real
  // sector/service when they follow up; this just needs to be a valid
  // starting point, not a perfect one. See EstimateService on the API for
  // why there's no better fallback than "unavailable" in that case.
  const sector = estimate?.matchedSector ?? 'General';
  const serviceCode = estimate?.matchedServiceCode ?? 'GENERAL_CALLOUT';

  try {
    const booking = await apiClient.post<{ id: string }>(
      '/v1/bookings',
      {
        sector,
        serviceCode,
        siteAddress: formData.get('siteAddress'),
        notes: formData.get('notes') || undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/account/bookings');
    return { ok: true, bookingId: booking.id };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Could not submit booking request';
    return { ok: false, error: message };
  }
}
