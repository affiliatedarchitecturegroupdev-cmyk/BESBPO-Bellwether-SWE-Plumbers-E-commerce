'use server';

import { auth } from '@/auth';
import { apiClient, ApiError } from '@/lib/api-client';

export interface AddressGroup {
  line1: string;
  line2?: string;
  city: string;
  province: string;
  postalCode: string;
  cartItemIds: string[];
}

export interface SplitCheckoutResult {
  ok: boolean;
  error?: string;
  orderIds?: string[];
}

// Trade-credit only, deliberately — a PayFast checkout redirects the
// browser away entirely, so multiple PayFast destinations can't be
// submitted sequentially within one page session the way trade credit
// (which confirms immediately server-side, no redirect at all) can.
// PayFast-based split checkout would need a genuinely different,
// multi-step flow (creating every order upfront, then guiding the
// customer through separate sequential PayFast payments) — real,
// separate follow-up work, not attempted here. See docs/AGENTS.md's
// split checkout section.
//
// Calls happen sequentially, not in parallel — if a later group fails
// (e.g. insufficient remaining trade credit after an earlier group's
// order already drew against it), the earlier groups' orders still
// exist; this returns however many order IDs succeeded alongside the
// error, rather than leaving the customer unsure what actually happened.
export async function submitSplitCheckoutAction(groups: AddressGroup[]): Promise<SplitCheckoutResult> {
  const session = await auth();
  if (!session?.accessToken) {
    return { ok: false, error: 'Please sign in.' };
  }

  const orderIds: string[] = [];
  for (const group of groups) {
    try {
      const result = await apiClient.post<{ id: string }>(
        '/v1/orders/checkout',
        {
          shippingAddress: {
            line1: group.line1,
            line2: group.line2 || undefined,
            city: group.city,
            province: group.province,
            postalCode: group.postalCode,
          },
          cartItemIds: group.cartItemIds,
          paymentMethod: 'trade_credit',
        },
        { accessToken: session.accessToken },
      );
      orderIds.push(result.id);
    } catch (err) {
      return {
        ok: false,
        error: err instanceof ApiError ? err.message : 'Checkout failed for one of the delivery addresses',
        orderIds,
      };
    }
  }

  return { ok: true, orderIds };
}
