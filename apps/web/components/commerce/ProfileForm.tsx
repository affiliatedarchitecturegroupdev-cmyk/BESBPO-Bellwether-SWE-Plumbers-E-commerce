'use client';

import { useState, useTransition } from 'react';
import { updateProfileAction } from '@/lib/actions/profile-actions';

interface Props {
  email: string;
  companyName: string | null;
  phone: string | null;
}

export function ProfileForm({ email, companyName, phone }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await updateProfileAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not update your profile');
        return;
      }
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-md">
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">Email</label>
        <input
          name="email"
          type="email"
          defaultValue={email}
          required
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
        <p className="text-[11px] text-steel mt-1">Used for order confirmations and delivery updates.</p>
      </div>
      <div className="mb-4">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
          Company Name
        </label>
        <input
          name="companyName"
          defaultValue={companyName ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>
      <div className="mb-6">
        <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">Phone</label>
        <input
          name="phone"
          type="tel"
          defaultValue={phone ?? ''}
          className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-[13px] text-red-600 mb-4">{error}</p>}
      {success && <p className="text-[13px] text-[#1E8E5A] mb-4">Saved.</p>}

      <button
        type="submit"
        disabled={isPending}
        className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-6 py-3 rounded-sm disabled:opacity-60"
      >
        {isPending ? 'Saving…' : 'Save Changes'}
      </button>
    </form>
  );
}
