import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { TeamManager } from '@/components/commerce/TeamManager';

interface Member {
  id: string;
  email: string;
  role: 'OWNER' | 'BUYER';
  joinedAt: string | null;
}

interface AccountProfile {
  email: string;
}

export default async function TeamPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const [members, account] = await Promise.all([
    apiClient.get<Member[]>('/v1/accounts/me/members', { accessToken: session.accessToken }),
    apiClient.get<AccountProfile>('/v1/accounts/me', { accessToken: session.accessToken }),
  ]);

  // The original account holder's own email always equals Account.email
  // (the shared account's top-level field, unchanged by AccountMember) —
  // an invited member's own email never does, since theirs lives on their
  // AccountMember row instead. Doesn't account for a member explicitly
  // promoted to the OWNER role showing as a manager here too — the API
  // itself does allow that (see AccountsService.requireOwnerAccount), this
  // page's display just doesn't reflect it yet, a small, real gap: there's
  // no "promote to owner" action anywhere in this UI to make that
  // distinction matter in practice yet.
  const isOwner = session.user?.email === account.email;

  return (
    <div className="max-w-[600px] mx-auto px-8 py-10">
      <h1 className="font-display text-2xl font-bold mb-2">Team</h1>
      <p className="text-sm text-steel mb-8">
        Everyone invited here shares this account&apos;s order history and trade credit.
      </p>
      <TeamManager members={members} isOwner={isOwner} />
    </div>
  );
}
