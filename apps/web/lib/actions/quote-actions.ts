'use server';

import { revalidatePath } from 'next/cache';
import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface QuoteItemInput {
  productId?: string;
  description: string;
  quantity: number;
}

export async function createQuoteAction(
  description: string,
  items: QuoteItemInput[],
): Promise<ActionResult & { quoteId?: string }> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    const quote = await apiClient.post<{ id: string }>(
      '/v1/quotes',
      { description, items },
      { accessToken: session.accessToken },
    );
    revalidatePath('/trade/quotes');
    return { ok: true, quoteId: quote.id };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit quote request' };
  }
}

export async function respondToQuoteAction(
  quoteId: string,
  response: 'ACCEPTED' | 'DECLINED',
): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  try {
    await apiClient.patch(`/v1/quotes/${quoteId}/respond`, { response }, { accessToken: session.accessToken });
    revalidatePath(`/trade/quotes/${quoteId}`);
    revalidatePath('/trade/quotes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not submit your response' };
  }
}

export async function priceQuoteAction(formData: FormData): Promise<ActionResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  const quoteId = formData.get('quoteId') as string;
  const itemIds = formData.getAll('itemId') as string[];
  const unitPrices = formData.getAll('unitPrice') as string[];

  try {
    await apiClient.patch(
      `/v1/quotes/${quoteId}/price`,
      {
        itemPrices: itemIds.map((itemId, i) => ({ itemId, unitPrice: Number(unitPrices[i]) })),
        quotedTotal: Number(formData.get('quotedTotal')),
        validUntil: new Date(formData.get('validUntil') as string).toISOString(),
        adminNotes: formData.get('adminNotes') || undefined,
      },
      { accessToken: session.accessToken },
    );
    revalidatePath('/admin/quotes');
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not price this quote' };
  }
}

export async function convertQuoteToOrderAction(formData: FormData): Promise<ActionResult & { orderId?: string }> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Not authenticated' };
  }

  const quoteId = formData.get('quoteId') as string;

  try {
    const order = await apiClient.post<{ id: string }>(
      `/v1/quotes/${quoteId}/convert-to-order`,
      {
        shippingAddress: {
          line1: formData.get('line1'),
          line2: formData.get('line2') || undefined,
          city: formData.get('city'),
          province: formData.get('province'),
          postalCode: formData.get('postalCode'),
        },
      },
      { accessToken: session.accessToken },
    );
    revalidatePath(`/admin/quotes/${quoteId}`);
    return { ok: true, orderId: order.id };
  } catch (err) {
    return { ok: false, error: err instanceof ApiError ? err.message : 'Could not convert this quote to an order' };
  }
}
