import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Terms of Service | Bellwether SWE Plumbers' };

// A reasonable, generic starting-point template — NOT a legally-reviewed
// document. Describes what this platform actually does (accounts,
// orders, trade credit, returns) rather than inventing specific legal
// terms (liability limits, governing-law clauses, etc.) this system has
// no real basis for. Should be reviewed by a lawyer before this is
// treated as final, binding terms.
export default function TermsPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Terms of Service</h1>
      <p className="text-[12px] text-steel mb-10">Last updated: 2026</p>

      <div className="space-y-6 text-sm text-[#333]">
        <section>
          <h2 className="font-semibold mb-2">1. Who we are</h2>
          <p>
            Bellwether SWE Plumbers (Bellwether Systems &amp; Water Engineering (Pty) Ltd) sells plumbing,
            fixtures, and related building materials to both retail and trade customers through this website.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">2. Accounts and orders</h2>
          <p>
            You can shop as a guest or create an account. Trade accounts may be approved for trade pricing and,
            separately, for trade credit — each subject to our own review. Placing an order is an offer to
            purchase; we confirm orders once payment (or, for trade credit accounts, an approved credit
            drawdown) succeeds.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">3. Pricing and availability</h2>
          <p>
            Prices are shown in South African Rand and include VAT where applicable. Stock levels shown on the
            site reflect our records at the time of viewing and aren&apos;t a guarantee of availability at
            checkout.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">4. Returns</h2>
          <p>
            See our <a href="/returns-policy" className="text-hydra">Returns Policy</a> for how returns on
            delivered orders work.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">5. Your data</h2>
          <p>
            See our <a href="/privacy-policy" className="text-hydra">Privacy Policy</a> for how we handle
            personal information, including your rights under South Africa&apos;s POPIA.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">6. Contact</h2>
          <p>
            Questions about these terms? See our <a href="/contact" className="text-hydra">Contact</a> page.
          </p>
        </section>
      </div>
    </div>
  );
}
