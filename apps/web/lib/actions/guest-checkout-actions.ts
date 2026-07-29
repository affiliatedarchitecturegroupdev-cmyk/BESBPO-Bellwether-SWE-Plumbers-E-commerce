'use server';

import { apiClient, ApiError } from '@/lib/api-client';

export interface GuestCheckoutResult {
  ok: boolean;
  error?: string;
  payfast?: { actionUrl: string; fields: Record<string, string> };
}

// Deliberately not a <form action={...}> server action, same reason
// submitCheckoutAction (the authenticated flow) isn't — needs to hand back
// PayFast's actionUrl and signed fields for PayfastRedirectForm to submit
// client-side, which redirect() can't do. No auth() call anywhere in
// here, unlike every other action in this app — that's the entire point.
export async function guestCheckoutAction(formData: FormData): Promise<GuestCheckoutResult> {
  const itemCount = Number(formData.get('itemCount') || 0);
  const items = Array.from({ length: itemCount }, (_, i) => ({
    productId: formData.get(`items[${i}].productId`),
    quantity: Number(formData.get(`items[${i}].quantity`) || 1),
  })).filter((item) => item.productId);

  const shippingAddress = {
    line1: formData.get('line1'),
    line2: formData.get('line2') || undefined,
    city: formData.get('city'),
    province: formData.get('province'),
    postalCode: formData.get('postalCode'),
  };

  try {
    const result = await apiClient.post<{
      order: { id: string };
      payfast: { actionUrl: string; fields: Record<string, string> };
    }>('/v1/payments/payfast/guest-checkout', {
      email: formData.get('email'),
      shippingAddress,
      items,
      companyName: formData.get('companyName') || undefined,
      phone: formData.get('phone') || undefined,
      poNumber: formData.get('poNumber') || undefined,
    });

    return { ok: true, payfast: result.payfast };
  } catch (err) {
    const message = err instanceof ApiError ? err.message : 'Checkout failed. Please try again.';
    return { ok: false, error: message };
  }
}
