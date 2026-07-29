import Link from 'next/link';

export default function AdminHomePage() {
  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Admin</h1>
      <p className="text-sm text-steel mb-6">
        Products, categories, and bundles. Orders, bookings, warranty, compliance, and trade-credit
        management aren&apos;t built into this panel yet — see docs/GAP-ANALYSIS-ROADMAP.md.
      </p>
      <div className="flex gap-4 font-mono text-[12px]">
        <Link href="/admin/products" className="text-hydra">
          Products →
        </Link>
        <Link href="/admin/categories" className="text-hydra">
          Categories →
        </Link>
        <Link href="/admin/bundles" className="text-hydra">
          Bundles →
        </Link>
      </div>
    </div>
  );
}
