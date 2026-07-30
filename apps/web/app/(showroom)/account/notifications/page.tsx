import { auth } from '@/auth';
import { NotificationPreferences } from '@/components/commerce/NotificationPreferences';

interface NotificationSettings {
  orderUpdates: boolean;
  promotionalEmails: boolean;
  stockAlerts: boolean;
  newsletter: boolean;
  smsNotifications: boolean;
}

export const metadata = {
  title: 'Notification Preferences | Bellwether Shop',
  description: 'Manage your email and SMS notification preferences.',
};

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.accessToken) {
    return <p className="max-w-[600px] mx-auto px-8 py-16 text-sm text-steel">Please sign in.</p>;
  }

  // Default preferences (in production, fetch from API)
  const initialPreferences: NotificationSettings = {
    orderUpdates: true,
    promotionalEmails: false,
    stockAlerts: true,
    newsletter: false,
    smsNotifications: false,
  };

  return (
    <div className="max-w-[600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold mb-2">Notification Preferences</h1>
        <p className="text-sm text-steel">
          Choose how you want to receive updates from Bellwether.
        </p>
      </div>

      <div className="bg-white border border-black/10 rounded-sm p-4 sm:p-6">
        <NotificationPreferences initialPreferences={initialPreferences} />
      </div>

      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-sm">
        <div className="flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Important Information</p>
            <p className="text-xs text-amber-700 mt-1">
              Order-related notifications (shipping updates, delivery confirmations) cannot be disabled as they are essential for keeping you informed about your purchases.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
