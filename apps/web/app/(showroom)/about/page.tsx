import { Metadata } from 'next';

export const metadata: Metadata = { title: 'About Us | Bellwether SWE Plumbers' };

export default function AboutPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">About Bellwether SWE Plumbers</h1>

      <div className="space-y-6 text-sm text-[#333] mt-8">
        <section>
          <p>
            Bellwether SWE Plumbers (Bellwether Systems &amp; Water Engineering (Pty) Ltd) supplies plumbing,
            fixtures, and building materials to both trade and retail customers — from individual fittings to
            full project bundles for residential, commercial, and industrial work.
          </p>
        </section>
        <section>
          <p>
            We&apos;re part of the Besbpo Group, a South African group of companies spanning the built
            environment, real estate, and related sectors.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">For trade customers</h2>
          <p>
            Registered trade accounts get trade pricing, and — subject to approval — trade credit with
            payment terms, bulk ordering tools, and the ability to request custom quotes.{' '}
            <a href="/trade/apply" className="text-hydra">
              Apply for a trade account
            </a>{' '}
            once signed in.
          </p>
        </section>
        <section>
          <p>
            Have a question we haven&apos;t answered here?{' '}
            <a href="/contact" className="text-hydra">
              Get in touch
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
