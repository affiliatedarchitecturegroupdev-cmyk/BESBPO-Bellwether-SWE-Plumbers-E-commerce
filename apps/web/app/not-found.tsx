import Link from 'next/link';

// Rendered for any URL that doesn't match a real route anywhere in the
// app — without this, Next.js falls back to its own generic default
// page, which doesn't match this site's design or point the visitor
// anywhere useful. Mirrors product/[slug]'s own not-found.tsx, which
// only covers the one specific "valid route, invalid slug" case; this
// is the catch-all for everything else.
export default function NotFound() {
  return (
    <div className="max-w-[1240px] mx-auto px-8 py-24 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Page not found</h1>
      <p className="text-steel text-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist, or the link may be out of date.
      </p>
      <div className="flex justify-center gap-6">
        <Link href="/" className="font-mono text-[13px] text-hydra">
          ← Back to the shop
        </Link>
        <Link href="/search" className="font-mono text-[13px] text-hydra">
          Search products
        </Link>
      </div>
    </div>
  );
}
