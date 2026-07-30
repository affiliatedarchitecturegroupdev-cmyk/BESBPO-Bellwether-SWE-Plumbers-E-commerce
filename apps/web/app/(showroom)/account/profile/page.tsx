import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { ProfileForm } from '@/components/commerce/ProfileForm';
import { PasswordChangeForm } from '@/components/commerce/PasswordChangeForm';

interface AccountProfile {
  email: string;
  companyName: string | null;
  phone: string | null;
}

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  const account = await apiClient.get<AccountProfile>('/v1/accounts/me', { accessToken: session.accessToken });

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <h1 className="font-display text-2xl font-bold mb-8">Your Profile</h1>
      <div className="space-y-6">
        <ProfileForm email={account.email} companyName={account.companyName} phone={account.phone} />
        <PasswordChangeForm />
      </div>
    </div>
  );
}
