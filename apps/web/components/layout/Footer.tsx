import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { NewsletterSignup } from './NewsletterSignup';

export function Footer() {
  return (
    <footer className="bg-ink-2 text-porcelain border-t border-white/10 mt-20">
      <div className="max-w-[1240px] mx-auto px-8 py-14 grid grid-cols-5 gap-10">
        <div>
          <div className="flex items-center gap-3 mb-4">
            <BrandMark className="w-8 h-[42px]" />
            <span className="font-display font-bold text-[15px]">BELLWETHER SHOP</span>
          </div>
          <p className="text-[13px] text-steel max-w-[260px]">
            Trade and retail plumbing supplies from Bellwether SWE Plumbers, a division of Besbpo Group.
          </p>
        </div>
        <FooterColumn
          title="Shop"
          links={[
            { href: '/', label: 'All Products' },
            { href: '/bundles', label: 'Bundles & Kits' },
            { href: '/cart', label: 'Cart' },
          ]}
        />
        <FooterColumn
          title="Trade"
          links={[
            { href: '/trade/dashboard', label: 'Trade Portal' },
            { href: '/trade/bulk-order', label: 'Bulk Order' },
            { href: '/trade/credit-terms', label: 'Credit Terms' },
          ]}
        />
        <FooterColumn
          title="Company"
          links={[
            { href: '/about', label: 'About Us' },
            { href: '/contact', label: 'Contact' },
            { href: '/faq', label: 'FAQ' },
            { href: '/shipping', label: 'Shipping & Delivery' },
            { href: '/returns-policy', label: 'Returns Policy' },
            { href: '/track-order', label: 'Track Your Order' },
            { href: '/account/orders', label: 'My Orders' },
          ]}
        />
        <NewsletterSignup />
      </div>
      <div className="border-t border-white/10 py-5">
        <div className="max-w-[1240px] mx-auto px-8 flex justify-between items-center flex-wrap gap-3">
          <p className="font-mono text-[11px] text-steel">
            © {new Date().getFullYear()} Bellwether Systems &amp; Water Engineering (Pty) Ltd — A Division of
            Besbpo Group
          </p>
          <div className="flex gap-4">
            <Link href="/terms" className="font-mono text-[11px] text-steel hover:text-cyan">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="font-mono text-[11px] text-steel hover:text-cyan">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <h5 className="font-mono text-[11px] tracking-wide uppercase text-steel mb-4">{title}</h5>
      <ul className="space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[13.5px] text-porcelain-dim hover:text-cyan">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
