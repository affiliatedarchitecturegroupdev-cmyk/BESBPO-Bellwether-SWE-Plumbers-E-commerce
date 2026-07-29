import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Returns Policy | Bellwether SWE Plumbers' };

// Describes the ACTUAL returns/RMA workflow this platform implements
// (ReturnsService) — deliberately doesn't state a specific return
// window (e.g. "30 days") since the system itself doesn't enforce one;
// every return request is reviewed individually. Stating a specific
// number here that the code doesn't actually check would be a real,
// misleading gap between policy and behavior.
export default function ReturnsPolicyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Returns Policy</h1>
      <p className="text-[12px] text-steel mb-10">Last updated: 2026</p>

      <div className="space-y-6 text-sm text-[#333]">
        <section>
          <h2 className="font-semibold mb-2">Requesting a return</h2>
          <p>
            Once your order has been delivered, you can request a return for some or all of the items directly
            from that order&apos;s page under{' '}
            <a href="/account/orders" className="text-hydra">
              Account → Orders
            </a>
            . Select the item(s), the quantity, and the reason.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">What happens next</h2>
          <p>
            We review every return request individually. Once approved, we&apos;ll confirm how to send the item
            back. After we&apos;ve received and inspected it, we&apos;ll resolve the return as either a refund
            or a replacement.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Refunds</h2>
          <p>
            Refunds are processed back to your original payment method. You can see the status of any return —
            including whether it was approved, received, or resolved — from your account at any time.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Questions</h2>
          <p>
            If a return doesn&apos;t go the way you expected, or you&apos;re not sure whether an item
            qualifies, get in touch via our{' '}
            <a href="/contact" className="text-hydra">
              Contact
            </a>{' '}
            page.
          </p>
        </section>
      </div>
    </div>
  );
}
