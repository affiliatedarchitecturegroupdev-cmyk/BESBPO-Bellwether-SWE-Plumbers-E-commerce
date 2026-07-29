import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Privacy Policy | Bellwether SWE Plumbers' };

// A reasonable, generic starting-point template — NOT a legally-reviewed
// document. Describes what this platform actually collects and does
// with it (matching the real POPIA export/erasure tooling at
// /account/privacy) rather than generic boilerplate disconnected from
// what the system actually implements.
export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-[12px] text-steel mb-10">Last updated: 2026</p>

      <div className="space-y-6 text-sm text-[#333]">
        <section>
          <h2 className="font-semibold mb-2">What we collect</h2>
          <p>
            Account details you provide (name, email, delivery addresses), order history, and — for trade
            accounts — trade credit and company information. We don&apos;t sell your personal information to
            third parties.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Your rights under POPIA</h2>
          <p>
            South Africa&apos;s Protection of Personal Information Act gives you the right to access and, where
            applicable, request erasure of your personal information. Signed-in customers can export their own
            data or request account erasure directly from{' '}
            <a href="/account/privacy" className="text-hydra">
              Account → Privacy
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Payment information</h2>
          <p>Card payments are processed by PayFast; we don&apos;t store your card details ourselves.</p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Cookies</h2>
          <p>
            We use cookies necessary to keep you signed in and to remember your cart. We don&apos;t use
            third-party advertising cookies.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Contact</h2>
          <p>
            Questions about your data? See our{' '}
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
