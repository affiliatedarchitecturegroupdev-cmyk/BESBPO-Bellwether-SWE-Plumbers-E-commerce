'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface AdminActionResult {
  ok: boolean;
  error?: string;
}

export async function createTradeCreditAccountAction(formData: FormData): Promise<AdminActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  const creditPath = formData.get('creditPath');

  try {
    await apiClient.post(
      '/v1/trade-credit',
      {
        accountId: formData.get('accountId'),
        creditPath,
        creditLimit: Number(formData.get('creditLimit')),
        paymentTermDays: Number(formData.get('paymentTermDays') || 30),
        ...(creditPath === 'THIRD_PARTY_INTERMEDIARY'
          ? {
              intermediaryProvider: formData.get('intermediaryProvider'),
              intermediaryAccountRef: formData.get('intermediaryAccountRef'),
            }
          : {}),
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/trade-credit');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not create trade credit account' };
  }
}

export async function recordTransactionAction(
  accountId: string,
  kind: 'drawdown' | 'repayment',
  amount: number,
  reference?: string,
): Promise<AdminActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  try {
    await apiClient.post(`/v1/trade-credit/${accountId}/${kind}`, { amount, reference }, { accessToken: session.accessToken });
    revalidatePath('/admin/trade-credit');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : `Could not record ${kind}` };
  }
}
