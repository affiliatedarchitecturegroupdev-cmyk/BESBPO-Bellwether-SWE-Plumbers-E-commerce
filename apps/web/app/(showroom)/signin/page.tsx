import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function SignInPage() {
  const session = await auth();
  
  // Already logged in - redirect to account
  if (session) {
    redirect('/account/orders');
  }

  async function handleSignIn() {
    'use server';
    await signIn('keycloak', { redirectTo: '/account/orders' });
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

        {/* Sign In Card */}
        <div className="bg-ink-2 border border-white/10 rounded-lg p-8">
          <h1 className="text-2xl font-display font-bold text-porcelain text-center mb-2">
            Welcome Back
          </h1>
          <p className="text-steel text-sm text-center mb-8">
            Sign in to your account to continue shopping
          </p>

          {/* Sign In Button */}
          <form
            action={handleSignIn}
            className="space-y-4"
          >
            <button
              type="submit"
              className="w-full bg-hydra hover:bg-hydra/90 text-white font-semibold py-3.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" fill="currentColor"/>
              </svg>
              Sign in with Bellwether Account
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-ink-2 text-steel">New to Bellwether?</span>
            </div>
          </div>

          {/* Create Account Button */}
          <Link
            href="/register"
            className="block w-full text-center border border-cyan text-cyan hover:bg-cyan hover:text-ink font-semibold py-3 px-4 rounded-sm transition-colors"
          >
            Create an Account
          </Link>

          {/* Divider with OR */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-ink-2 text-steel">or</span>
            </div>
          </div>

          {/* Guest Checkout */}
          <Link
            href="/checkout/guest"
            className="block w-full text-center border border-white/20 text-porcelain hover:border-cyan hover:text-cyan font-medium py-3 px-4 rounded-sm transition-colors"
          >
            Continue as Guest
          </Link>

          {/* Forgot Password */}
          <div className="mt-6 text-center">
            <Link
              href="/forgot-password"
              className="text-sm text-steel hover:text-cyan transition-colors"
            >
              Forgot your password?
            </Link>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="text-steel">
            <svg className="w-6 h-6 mx-auto mb-2 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-xs">Secure Checkout</span>
          </div>
          <div className="text-steel">
            <svg className="w-6 h-6 mx-auto mb-2 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <span className="text-xs">Track Orders</span>
          </div>
          <div className="text-steel">
            <svg className="w-6 h-6 mx-auto mb-2 text-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs">Trade Pricing</span>
          </div>
        </div>

        {/* Footer Links */}
        <div className="mt-8 flex justify-center gap-6 text-xs text-steel">
          <Link href="/privacy-policy" className="hover:text-cyan transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-cyan transition-colors">
            Terms of Service
          </Link>
          <Link href="/contact" className="hover:text-cyan transition-colors">
            Contact
          </Link>
        </div>
      </div>
    </div>
  );
}
