'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user has already consented
    const consent = localStorage.getItem('cookie-consent');
    if (!consent) {
      // Delay showing to avoid layout shift
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  function acceptAll() {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: true,
      marketing: true,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  }

  function acceptNecessary() {
    localStorage.setItem('cookie-consent', JSON.stringify({
      necessary: true,
      analytics: false,
      marketing: false,
      timestamp: new Date().toISOString(),
    }));
    setIsVisible(false);
  }

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-ink-2 border-t border-white/10 p-4 shadow-2xl">
      <div className="max-w-[1240px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-8">
          {/* Text */}
          <div className="flex-1">
            <p className="text-sm text-porcelain">
              We use cookies to enhance your browsing experience, serve personalized content, and analyze our traffic.{' '}
              <Link href="/privacy-policy" className="text-cyan hover:underline">
                Learn more
              </Link>
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button
              onClick={acceptNecessary}
              className="px-4 py-2 text-sm border border-white/20 text-porcelain hover:border-cyan hover:text-cyan rounded-sm transition-colors"
            >
              Necessary Only
            </button>
            <button
              onClick={acceptAll}
              className="px-4 py-2 text-sm bg-hydra hover:bg-hydra/90 text-white rounded-sm transition-colors"
            >
              Accept All
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
