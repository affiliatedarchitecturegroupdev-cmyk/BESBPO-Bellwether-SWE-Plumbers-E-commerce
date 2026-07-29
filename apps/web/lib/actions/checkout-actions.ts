'use server';

import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface CheckoutResult {
  ok: boolean;
  error?: string;
  payfast?: { actionUrl: string; fields: Record<string, string> };
  // Set when paymentMethod was trade_credit — the order confirms
  // immediately server-side (see OrdersService.checkout), so there's
  // nowhere to redirect to except straight to the confirmation page.
  confirmedOrderId?: string;
}

// Deliberately not a <form action={...}> server action the way the admin
// panel's forms are — those redirect() on success, which only works for
// same-app GET navigation. This needs to hand back PayFast's actionUrl and
// signed fields so the client can build a real cross-origin POST to
// PayFast's hosted payment page (see PayfastRedirectForm.tsx) — something
// redirect() can't do. Called directly from a client component instead.
export async function submitCheckoutAction(formData: FormData): Promise<CheckoutResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in to check out.' };
  }

  const shippingAddress = {
    line1: formData.get('line1'),
    line2: formData.get('line2') || undefined,
    city: formData.get('city'),
    province: formData.get('province'),
    postalCode: formData.get('postalCode'),
  };
  const paymentMethod = (formData.get('paymentMethod') as string) || 'payfast';
  const poNumber = (formData.get('poNumber') as string) || undefined;

  try {
    // Real quote via ShippingService — which itself falls back to the
    // same flat R150 placeholder if ShipLogic isn't configured or the
    // call fails, so this never blocks checkout on a third-party
    // dependency. See docs/AGENTS.md's logistics section.
    const quote = await apiClient.post<{ fee: number }>(
      '/v1/shipping/quote',
      shippingAddress,
      { accessToken: session.accessToken },
    );

    const order = await apiClient.post<{ id: string; status: string }>(
      '/v1/orders/checkout',
      { shippingAddress, deliveryFee: quote.fee, paymentMethod, poNumber },
      { accessToken: session.accessToken },
    );

    // Trade credit orders come back already CONFIRMED — there's no
    // PayFast step to initiate. Sending the customer straight to
    // /checkout/success mirrors what PayFast's own return_url does, just
    // without the round trip through an external payment page.
    if (paymentMethod === 'trade_credit') {
      return { ok: true, confirmedOrderId: order.id };
    }

    const payfast = await apiClient.post<{ actionUrl: string; fields: Record<string, string> }>(
      '/v1/payments/payfast/checkout',
      { orderId: order.id },
      { accessToken: session.accessToken },
    );

    return { ok: true, payfast };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Checkout failed. Please try again.';
    return { ok: false, error: message };
  }
}
