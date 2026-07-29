import Link from 'next/link';

// Rendered when product/[slug]/page.tsx calls notFound() for a slug that
// doesn't match any product — without this file, Next.js falls back to the
// generic site-wide 404, which doesn't point the visitor anywhere useful.
export default function ProductNotFound() {
  return (
    <div className="max-w-[1240px] mx-auto px-8 py-24 text-center">
      <h1 className="font-display text-2xl font-bold mb-3">Product not found</h1>
      <p className="text-steel text-sm mb-8">
        This product may have been removed or the link may be out of date.
      </p>
      <Link href="/" className="font-mono text-[13px] text-hydra">
        ← Back to the shop
      </Link>
    </div>
  );
}
