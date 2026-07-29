'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { inviteMemberAction, removeMemberAction, updateMemberRoleAction } from '@/lib/actions/team-actions';

interface Member {
  id: string;
  email: string;
  role: 'OWNER' | 'BUYER';
  joinedAt: string | null;
}

interface Props {
  members: Member[];
  isOwner: boolean;
}

export function TeamManager({ members, isOwner }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;
    setError(null);
    startTransition(async () => {
      const result = await inviteMemberAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not send the invite');
        return;
      }
      form.reset();
      router.refresh();
    });
  }

  function handleRemove(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeMemberAction(memberId);
      if (!result.ok) {
        setError(result.error ?? 'Could not remove that member');
        return;
      }
      router.refresh();
    });
  }

  function handleRoleChange(memberId: string, role: 'OWNER' | 'BUYER') {
    setError(null);
    startTransition(async () => {
      const result = await updateMemberRoleAction(memberId, role);
      if (!result.ok) {
        setError(result.error ?? 'Could not update that member\u2019s role');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      {members.length === 0 ? (
        <p className="text-sm text-steel mb-6">No one else has been invited to this account yet.</p>
      ) : (
        <ul className="mb-8">
          {members.map((member) => (
            <li key={member.id} className="flex items-center justify-between py-2.5 border-b border-black/5">
              <div>
                <span className="text-sm">{member.email}</span>
                <span className="font-mono text-[10px] uppercase tracking-wide text-steel ml-2">
                  {member.role}
                </span>
                {!member.joinedAt && (
                  <span className="font-mono text-[10px] uppercase tracking-wide text-hydra ml-2">
                    Invite pending
                  </span>
                )}
              </div>
              {isOwner && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleRoleChange(member.id, member.role === 'OWNER' ? 'BUYER' : 'OWNER')}
                    disabled={isPending}
                    className="font-mono text-[11px] text-steel hover:text-hydra disabled:opacity-40"
                  >
                    {member.role === 'OWNER' ? 'Demote to Buyer' : 'Promote to Owner'}
                  </button>
                  <button
                    onClick={() => handleRemove(member.id)}
                    disabled={isPending}
                    className="font-mono text-[11px] text-steel hover:text-red-600 disabled:opacity-40"
                  >
                    Remove
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {isOwner && (
        <form onSubmit={handleInvite} className="flex gap-3 items-end max-w-md">
          <div className="flex-1">
            <label className="block font-mono text-[10.5px] uppercase tracking-wide text-steel mb-1.5">
              Invite by email
            </label>
            <input
              name="email"
              type="email"
              required
              placeholder="colleague@company.co.za"
              className="w-full border border-black/15 rounded-sm px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isPending}
            className="bg-ink text-white font-mono text-[12px] uppercase tracking-wide px-5 py-2.5 rounded-sm disabled:opacity-60 whitespace-nowrap"
          >
            {isPending ? 'Sending…' : 'Invite'}
          </button>
        </form>
      )}
      {error && <p className="text-[13px] text-red-600 mt-3">{error}</p>}
    </div>
  );
}
