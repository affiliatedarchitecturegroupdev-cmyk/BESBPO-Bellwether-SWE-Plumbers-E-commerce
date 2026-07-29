import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/analytics', label: 'Analytics' },
  { href: '/admin/customers', label: 'Customers' },
  { href: '/admin/products', label: 'Products' },
  { href: '/admin/clearance', label: 'Clearance' },
  { href: '/admin/low-stock', label: 'Low Stock' },
  { href: '/admin/variant-groups', label: 'Variant Groups' },
  { href: '/admin/warehouses', label: 'Warehouses' },
  { href: '/admin/coupons', label: 'Coupons' },
  { href: '/admin/pricing', label: 'Pricing' },
  { href: '/admin/returns', label: 'Returns' },
  { href: '/admin/notifications', label: 'Notifications' },
  { href: '/admin/categories', label: 'Categories' },
  { href: '/admin/bundles', label: 'Bundles' },
  { href: '/admin/orders', label: 'Orders' },
  { href: '/admin/bookings', label: 'Bookings' },
  { href: '/admin/warranty', label: 'Warranty' },
  { href: '/admin/compliance', label: 'Compliance' },
  { href: '/admin/trade-credit', label: 'Trade Credit' },
  { href: '/admin/trade-applications', label: 'Trade Applications' },
  { href: '/admin/quotes', label: 'Quotes' },
  { href: '/admin/audit-log', label: 'Audit Log' },
];

export function AdminNav() {
  return (
    <nav className="w-52 flex-shrink-0 border-r border-black/10 pr-6">
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
