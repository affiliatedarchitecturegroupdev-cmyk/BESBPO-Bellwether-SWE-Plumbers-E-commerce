import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/trade/dashboard', label: 'Dashboard' },
  { href: '/trade/bulk-order', label: 'Bulk Order' },
  { href: '/trade/quotes', label: 'Quotes' },
  { href: '/trade/credit-terms', label: 'Credit Terms' },
];

export function TradeNav() {
  return (
    <nav className="w-48 flex-shrink-0 border-r border-black/10 pr-6">
      <Link href="/" className="block font-mono text-[11px] text-steel mb-8">
        ← Back to shop
      </Link>
      <ul className="space-y-1">
        {NAV_ITEMS.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="block px-3 py-2 text-sm rounded-sm hover:bg-black/[0.03] text-ink"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
