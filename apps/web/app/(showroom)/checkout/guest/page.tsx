import { GuestCheckoutForm } from '@/components/commerce/GuestCheckoutForm';

// Deliberately no auth() call anywhere on this page or its form/action —
// that's the entire point of guest checkout. See docs/AGENTS.md's guest
// checkout section for the full picture, including why this is a "pick
// products directly" flow rather than a full anonymous shopping-cart
// experience. No longer pre-fetches a static product list here — see
// GuestCheckoutForm/ProductCombobox's own comments for why (the old
// pageSize=200 fetch was silently failing against the API's own cap).
export default async function GuestCheckoutPage() {
  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">Checkout as Guest</h1>
      <p className="text-sm text-steel mb-8">
        No account needed — pick what you&apos;re after, add your delivery details, and pay by card
        through PayFast. Want to track orders or use a saved address next time?{' '}
        <a href="/api/auth/signin" className="text-hydra">
          Sign in instead
        </a>
        .
      </p>
      <GuestCheckoutForm />
    </div>
  );
}
