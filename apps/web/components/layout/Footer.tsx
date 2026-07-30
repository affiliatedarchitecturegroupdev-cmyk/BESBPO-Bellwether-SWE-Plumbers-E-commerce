import Link from 'next/link';
import { BrandMark } from './BrandMark';
import { NewsletterSignup } from './NewsletterSignup';

export function Footer() {
  return (
    <footer className="bg-ink-2 text-porcelain border-t border-white/10 mt-12 lg:mt-20">
      {/* Main Footer Content - Mobile Responsive Grid */}
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 lg:py-14">
        {/* Mobile: Stack columns, Desktop: Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-10">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <BrandMark className="w-8 h-[42px]" />
              <span className="font-display font-bold text-sm sm:text-[15px]">BELLWETHER SHOP</span>
            </div>
            <p className="text-[13px] text-steel max-w-[260px]">
              Trade and retail plumbing supplies from Bellwether SWE Plumbers, a division of Besbpo Group.
            </p>
          </div>
          
          {/* Shop Column */}
          <FooterColumn
            title="Shop"
            links={[
              { href: '/', label: 'All Products' },
              { href: '/bundles', label: 'Bundles & Kits' },
              { href: '/cart', label: 'Cart' },
            ]}
          />
          
          {/* Trade Column */}
          <FooterColumn
            title="Trade"
            links={[
              { href: '/trade/dashboard', label: 'Trade Portal' },
              { href: '/trade/bulk-order', label: 'Bulk Order' },
              { href: '/trade/credit-terms', label: 'Credit Terms' },
            ]}
          />
          
          {/* Company Column */}
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
          
          {/* Newsletter Column */}
          <NewsletterSignup />
        </div>
      </div>
      
      {/* Bottom Bar */}
      <div className="border-t border-white/10 py-4 sm:py-5">
        <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="font-mono text-[10px] sm:text-[11px] text-steel text-center sm:text-left">
            © {new Date().getFullYear()} Bellwether Systems & Water Engineering (Pty) Ltd — A Division of Besbpo Group
          </p>
          <div className="flex gap-4 sm:gap-4">
            <Link href="/terms" className="font-mono text-[10px] sm:text-[11px] text-steel hover:text-cyan">
              Terms of Service
            </Link>
            <Link href="/privacy-policy" className="font-mono text-[10px] sm:text-[11px] text-steel hover:text-cyan">
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
      <h5 className="font-mono text-[10px] sm:text-[11px] tracking-wide uppercase text-steel mb-3 sm:mb-4">{title}</h5>
      <ul className="space-y-2 sm:space-y-2.5">
        {links.map((link) => (
          <li key={link.href}>
            <Link href={link.href} className="text-[12px] sm:text-[13.5px] text-porcelain-dim hover:text-cyan transition-colors">
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
