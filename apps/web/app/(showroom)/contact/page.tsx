import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Contact Us | Bellwether SWE Plumbers' };

export default function ContactPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Contact Us</h1>

      <div className="space-y-6 text-sm text-[#333] mt-8">
        <section>
          <h2 className="font-semibold mb-2">Email</h2>
          <p>
            <a href="mailto:info@bswe.besbpo.co.za" className="text-hydra">
              info@bswe.besbpo.co.za
            </a>
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Order questions</h2>
          <p>
            For a question about an existing order, signing in and viewing that order directly under{' '}
            <a href="/account/orders" className="text-hydra">
              Account → Orders
            </a>{' '}
            is usually the fastest way to see its current status.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Trade accounts</h2>
          <p>
            Want trade pricing? Apply directly at{' '}
            <a href="/trade/apply" className="text-hydra">
              Apply for a Trade Account
            </a>{' '}
            once signed in — we review every application. Already have a trade account and want to ask about
            trade credit specifically? See your{' '}
            <a href="/trade/dashboard" className="text-hydra">
              trade dashboard
            </a>
            , or reach out via the email above.
          </p>
        </section>
      </div>
    </div>
  );
}
