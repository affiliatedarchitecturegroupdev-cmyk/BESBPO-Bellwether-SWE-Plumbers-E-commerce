const ITEMS = [
  { title: 'Trade Pricing', sub: 'For registered accounts' },
  { title: '10,500+ SKUs', sub: 'Real-time stock' },
  { title: 'Secure Checkout', sub: 'PayFast + trade credit' },
  { title: 'Real-Time Delivery Quotes', sub: 'KZN & Gauteng' },
];

export function TrustBar() {
  return (
    <div className="bg-porcelain">
      <div className="max-w-[1240px] mx-auto px-8 py-6 grid grid-cols-4 gap-5">
        {ITEMS.map((item) => (
          <div key={item.title} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-md bg-hydra shrink-0" aria-hidden="true" />
            <div>
              <div className="text-[13px] font-semibold">{item.title}</div>
              <div className="text-[11.5px] text-steel">{item.sub}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
