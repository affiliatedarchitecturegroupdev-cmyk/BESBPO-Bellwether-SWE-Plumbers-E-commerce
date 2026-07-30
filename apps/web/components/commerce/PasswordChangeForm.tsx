'use client';

import { useState, useTransition } from 'react';
import { changePasswordAction } from '@/lib/actions/password-actions';

export function PasswordChangeForm() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);

    // Validate password match
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    // Validate password strength
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    startTransition(async () => {
      const result = await changePasswordAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not change password');
        return;
      }
      setSuccess(true);
      // Reset form
      e.currentTarget.reset();
    });
  }

  return (
    <div className="bg-white border border-black/10 rounded-sm p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-hydra" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
          />
        </svg>
        <h3 className="text-base font-semibold">Change Password</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Current Password
          </label>
          <div className="relative">
            <input
              name="currentPassword"
              type={showPassword.current ? 'text' : 'password'}
              required
              className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm pr-10"
              placeholder="Enter current password"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink"
            >
              {showPassword.current ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            New Password
          </label>
          <div className="relative">
            <input
              name="newPassword"
              type={showPassword.new ? 'text' : 'password'}
              required
              minLength={8}
              className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm pr-10"
              placeholder="Enter new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink"
            >
              {showPassword.new ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-[11px] text-steel mt-1">Minimum 8 characters</p>
        </div>

        <div>
          <label className="block font-mono text-[10px] uppercase tracking-wide text-steel mb-1">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              name="confirmPassword"
              type={showPassword.confirm ? 'text' : 'password'}
              required
              minLength={8}
              className="w-full border border-black/15 rounded-sm px-3 py-2.5 text-sm pr-10"
              placeholder="Confirm new password"
            />
            <button
              type="button"
              onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-steel hover:text-ink"
            >
              {showPassword.confirm ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-600 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 text-green-600 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Password changed successfully!
          </div>
        )}

        <button
          type="submit"
          disabled={isPending}
          className="w-full sm:w-auto bg-ink text-white font-mono text-[11px] uppercase tracking-wide px-6 py-2.5 rounded-sm disabled:opacity-60 hover:bg-ink/90 transition-colors"
        >
          {isPending ? 'Updating…' : 'Update Password'}
        </button>
      </form>
    </div>
  );
}
