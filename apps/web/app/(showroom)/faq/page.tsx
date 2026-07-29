import { Metadata } from 'next';

export const metadata: Metadata = { title: 'FAQ | Bellwether SWE Plumbers' };

const FAQS = [
  {
    q: 'Do I need an account to order?',
    a: 'No — you can check out as a guest with just your email and delivery address. Creating an account lets you track orders, save addresses, and access trade pricing if you qualify.',
  },
  {
    q: 'How do I get trade pricing?',
    a: 'Trade pricing is available to approved trade accounts. Apply from your account at /trade/apply once signed in — we review every application.',
  },
  {
    q: 'What is trade credit, and how is it different from trade pricing?',
    a: "Trade pricing is a discount off retail prices. Trade credit is a separate approval that lets you pay on account (with payment terms) instead of by card at checkout — it also unlocks recurring orders and split checkout across multiple delivery addresses, since both place orders automatically or across several destinations without an interactive card payment step.",
  },
  {
    q: 'Can I split one order across more than one delivery address?',
    a: 'Yes, if you have approved trade credit — split checkout lets you divide your cart between two destination addresses in one go.',
  },
  {
    q: 'How do returns work?',
    a: "Once an order is delivered, request a return from that order's page, choosing which items and the reason. We review every request individually. See our Returns Policy for the full process.",
  },
  {
    q: 'Can I set up automatic reordering?',
    a: 'Yes, for approved trade credit accounts — recurring orders let you schedule the same items to reorder weekly or monthly automatically.',
  },
  {
    q: 'How is shipping calculated?',
    a: "Delivery is quoted in real time at checkout based on your address and order weight, through our courier partners — you'll see the exact fee before paying.",
  },
  {
    q: 'I checked out as a guest — how do I check my order status?',
    a: 'Use Track Your Order (linked in the footer) with your order number and the email you used at checkout — no account needed.',
  },
  {
    q: 'Do you have sales or discounts?',
    a: "Check our Clearance section for genuine overstock we've reviewed and confirmed — not a rotating markdown gimmick, just real slow-moving stock at a real discount.",
  },
  {
    q: 'Can I compare products before buying?',
    a: 'Yes — use the "+ Compare" link on any product card to add it to a side-by-side comparison, up to 4 products at a time.',
  },
  {
    q: 'Do you have pre-packaged bundles for a specific project?',
    a: 'Yes — see our Bundles section for common combinations (e.g. a full bathroom retrofit or a pump station starter kit) at a stated combined price.',
  },
];

export default function FaqPage() {
  return (
    <div className="max-w-[720px] mx-auto px-8 py-16">
      <h1 className="font-display text-2xl font-bold mb-8">Frequently Asked Questions</h1>

      <div className="space-y-6">
        {FAQS.map((item) => (
          <div key={item.q} className="border-b border-black/10 pb-6">
            <h2 className="text-sm font-semibold mb-1.5">{item.q}</h2>
            <p className="text-sm text-[#333]">{item.a}</p>
          </div>
        ))}
      </div>

      <p className="text-sm text-steel mt-8">
        Didn&apos;t find your answer?{' '}
        <a href="/contact" className="text-hydra">
          Contact us
        </a>
        .
      </p>
    </div>
  );
}
