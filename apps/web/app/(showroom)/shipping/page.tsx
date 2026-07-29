import { Metadata } from 'next';

export const metadata: Metadata = { title: 'Shipping & Delivery | Bellwether SWE Plumbers' };

export default function ShippingPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-2">Shipping &amp; Delivery</h1>

      <div className="space-y-6 text-sm text-[#333] mt-8">
        <section>
          <h2 className="font-semibold mb-2">Delivery rates</h2>
          <p>
            Delivery is quoted in real time at checkout based on your delivery address and the weight of your
            order, through our courier partners — you&apos;ll see the exact fee before you pay.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Tracking</h2>
          <p>
            Once your order has been dispatched, you&apos;ll be able to see its tracking number and courier
            from your order&apos;s page under{' '}
            <a href="/account/orders" className="text-hydra">
              Account → Orders
            </a>
            .
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Trade accounts</h2>
          <p>
            Approved trade accounts can split one order across up to two delivery addresses — useful when
            ordering materials for more than one job site at once.
          </p>
        </section>
        <section>
          <h2 className="font-semibold mb-2">Questions about a delivery</h2>
          <p>
            Get in touch via our{' '}
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
