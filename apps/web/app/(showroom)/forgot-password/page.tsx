'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setError('');

    try {
      // In a real implementation, this would call an API endpoint
      // that triggers Keycloak's "forgot password" email flow
      // For now, we'll simulate the flow
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Failed to send reset email');
      }

      setStatus('success');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Something went wrong');
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-ink-2 border border-white/10 rounded-lg p-8 text-center">
            <div className="w-16 h-16 bg-cyan/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg className="w-8 h-8 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-display font-bold text-porcelain mb-2">
              Check your email
            </h1>
            <p className="text-steel mb-6">
              We&apos;ve sent a password reset link to <span className="text-porcelain">{email}</span>
            </p>
            <p className="text-sm text-steel mb-8">
              Click the link in the email to reset your password. The link will expire in 24 hours.
            </p>
            <div className="space-y-4">
              <Link
                href="/signin"
                className="block w-full bg-hydra hover:bg-hydra/90 text-white font-semibold py-3 px-4 rounded-sm transition-colors"
              >
                Back to Sign In
              </Link>
              <button
                onClick={() => setStatus('idle')}
                className="block w-full text-steel hover:text-cyan font-medium py-2 transition-colors"
              >
                Try a different email
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <div className="flex items-center justify-center gap-3">
              <svg className="w-12 h-16 text-cyan" viewBox="0 0 38 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="38" height="50" rx="2" fill="currentColor" fillOpacity="0.15"/>
                <path d="M8 12h22v4H8zM8 22h22v4H8zM8 32h22v4H8zM8 42h22v4H8z" fill="currentColor"/>
              </svg>
              <div className="text-left">
                <span className="block font-display font-bold text-xl text-porcelain">BELLWETHER</span>
                <span className="font-mono text-[10px] tracking-wide text-cyan">SHOP · TRADE & RETAIL</span>
              </div>
            </div>
          </Link>
        </div>

        {/* Forgot Password Card */}
        <div className="bg-ink-2 border border-white/10 rounded-lg p-8">
          <h1 className="text-2xl font-display font-bold text-porcelain text-center mb-2">
            Reset your password
          </h1>
          <p className="text-steel text-sm text-center mb-8">
            Enter your email address and we&apos;ll send you a link to reset your password
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-porcelain mb-2">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/[0.08] border border-white/15 rounded-sm px-4 py-3 text-porcelain placeholder:text-steel outline-none focus:border-cyan transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-sm px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={status === 'loading'}
              className="w-full bg-hydra hover:bg-hydra/90 disabled:bg-hydra/50 text-white font-semibold py-3.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-2"
            >
              {status === 'loading' ? (
                <>
                  <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link
              href="/signin"
              className="text-sm text-steel hover:text-cyan transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>

        {/* Help Text */}
        <p className="text-xs text-steel text-center mt-6">
          Remember your password?{' '}
          <Link href="/signin" className="text-cyan hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
