import { auth, signIn } from '@/auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function RegisterPage() {
  const session = await auth();
  
  // Already logged in - redirect to account
  if (session) {
    redirect('/account/orders');
  }

  async function handleRegister() {
    'use server';
    // Keycloak doesn't have a direct registration endpoint that we can call
    // Instead, we redirect to Keycloak's registration page
    await signIn('keycloak', { redirectTo: '/account/orders', authorizationParams: { prompt: 'login' } });
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

        {/* Register Card */}
        <div className="bg-ink-2 border border-white/10 rounded-lg p-8">
          <h1 className="text-2xl font-display font-bold text-porcelain text-center mb-2">
            Create an Account
          </h1>
          <p className="text-steel text-sm text-center mb-8">
            Join Bellwether for exclusive trade pricing and easier ordering
          </p>

          {/* Benefits */}
          <div className="bg-ink rounded-sm p-4 mb-6 space-y-3">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-porcelain-dim">Access trade pricing with registered account</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-porcelain-dim">Track orders and manage deliveries</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-porcelain-dim">Save addresses for faster checkout</span>
            </div>
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-cyan flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-sm text-porcelain-dim">Request quotes and apply for credit</span>
            </div>
          </div>

          {/* Register Button */}
          <form action={handleRegister} className="space-y-4">
            <button
              type="submit"
              className="w-full bg-hydra hover:bg-hydra/90 text-white font-semibold py-3.5 px-4 rounded-sm transition-colors flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Create Bellwether Account
            </button>
          </form>

          {/* Divider */}
          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-ink-2 text-steel">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            href="/signin"
            className="block w-full text-center border border-white/20 text-porcelain hover:border-cyan hover:text-cyan font-medium py-3 px-4 rounded-sm transition-colors"
          >
            Sign in to your account
          </Link>
        </div>

        {/* Terms */}
        <p className="text-xs text-steel text-center mt-6">
          By creating an account, you agree to our{' '}
          <Link href="/terms" className="text-cyan hover:underline">Terms of Service</Link>
          {' '}and{' '}
          <Link href="/privacy-policy" className="text-cyan hover:underline">Privacy Policy</Link>
        </p>

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
