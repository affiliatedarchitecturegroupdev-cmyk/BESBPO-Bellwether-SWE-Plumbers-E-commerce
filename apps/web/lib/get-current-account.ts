import { auth } from '@/auth';
import { apiClient } from './api-client';

interface Account {
  id: string;
  type: 'RETAIL' | 'TRADE';
  email: string;
}

// Used by any server component that needs to know "is this visitor a trade
// account" (product cards, cart, checkout) — one place resolving session ->
// account, so that logic doesn't get re-implemented per page.
export async function getCurrentAccount(): Promise<Account | null> {
  const session = await auth();
  if (!session?.accessToken) return null;

  try {
    return await apiClient.get<Account>('/v1/accounts/me', { accessToken: session.accessToken });
  } catch {
    // Expired/invalid token, or the API is briefly unreachable — treat as
    // logged-out rather than crashing the page render.
    return null;
  }
}
