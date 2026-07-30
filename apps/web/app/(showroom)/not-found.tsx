import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-16">
      <div className="text-center max-w-md">
        {/* 404 Graphic */}
        <div className="mb-8">
          <svg className="w-32 h-32 mx-auto text-hydra/30" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="2" strokeDasharray="4 4"/>
            <text x="50" y="58" textAnchor="middle" fontSize="28" fontFamily="monospace" fontWeight="bold" fill="currentColor">
              404
            </text>
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-display font-bold text-porcelain mb-3">
          Page Not Found
        </h1>
        <p className="text-steel mb-8">
          Sorry, the page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>

        {/* Suggested Actions */}
        <div className="space-y-4">
          <Link
            href="/"
            className="block w-full bg-hydra hover:bg-hydra/90 text-white font-semibold py-3 px-4 rounded-sm transition-colors"
          >
            Return to Homepage
          </Link>
          
          <Link
            href="/search"
            className="block w-full border border-white/20 text-porcelain hover:border-cyan hover:text-cyan font-medium py-3 px-4 rounded-sm transition-colors"
          >
            Search Products
          </Link>
        </div>

        {/* Popular Categories */}
        <div className="mt-12 pt-8 border-t border-white/10">
          <h2 className="text-sm font-medium text-steel mb-4">Popular Categories</h2>
          <div className="grid grid-cols-2 gap-2">
            <Link href="/category/pipes-fittings" className="text-sm text-cyan hover:underline">
              Pipes & Fittings
            </Link>
            <Link href="/category/valves" className="text-sm text-cyan hover:underline">
              Valves
            </Link>
            <Link href="/category/pumps" className="text-sm text-cyan hover:underline">
              Pumps
            </Link>
            <Link href="/category/bathroom" className="text-sm text-cyan hover:underline">
              Bathroom
            </Link>
          </div>
        </div>

        {/* Help */}
        <p className="mt-8 text-xs text-steel">
          Need help?{' '}
          <Link href="/contact" className="text-cyan hover:underline">
            Contact us
          </Link>
        </p>
      </div>
    </div>
  );
}
