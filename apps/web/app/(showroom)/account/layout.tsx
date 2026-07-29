import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/account/profile', label: 'Profile' },
  { href: '/account/team', label: 'Team' },
  { href: '/account/wishlist', label: 'Wishlist' },
  { href: '/account/returns', label: 'Returns' },
  { href: '/account/recurring-orders', label: 'Recurring Orders' },
  { href: '/account/orders', label: 'Orders' },
  { href: '/account/addresses', label: 'Addresses' },
  { href: '/account/bookings', label: 'Bookings' },
  { href: '/account/warranty', label: 'Warranties' },
  { href: '/account/compliance', label: 'Certificates' },
  { href: '/account/privacy', label: 'Privacy' },
];

// A plain horizontal sub-nav, not a sidebar like admin/trade — account
// pages are simpler, single-column content, so a top strip fits without
// eating into the narrow content width these pages already use.
export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b border-black/10">
        <div className="max-w-[900px] mx-auto px-8 flex gap-6">
          {NAV_ITEMS.map((item) => (
            <Link key={item.href} href={item.href} className="font-mono text-[11px] uppercase tracking-wide py-4">
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
