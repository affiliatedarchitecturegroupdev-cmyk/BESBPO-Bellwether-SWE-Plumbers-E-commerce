'use client';

import { useState, useTransition } from 'react';

interface NotificationPreferences {
  orderUpdates: boolean;
  promotionalEmails: boolean;
  stockAlerts: boolean;
  newsletter: boolean;
  smsNotifications: boolean;
}

interface Props {
  initialPreferences: NotificationPreferences;
}

export function NotificationPreferences({ initialPreferences }: Props) {
  const [preferences, setPreferences] = useState<NotificationPreferences>(initialPreferences);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof NotificationPreferences) {
    setPreferences((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(false);
    setError(null);

    startTransition(async () => {
      // Simulate API call - in production this would call the API
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSuccess(true);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center justify-between py-3 border-b border-black/5">
        <div>
          <p className="text-sm font-medium text-ink">Order Updates</p>
          <p className="text-xs text-steel">Get notified about order status changes and delivery updates</p>
        </div>
        <ToggleSwitch
          checked={preferences.orderUpdates}
          onChange={() => toggle('orderUpdates')}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-black/5">
        <div>
          <p className="text-sm font-medium text-ink">Promotional Emails</p>
          <p className="text-xs text-steel">Receive special offers, discounts, and exclusive deals</p>
        </div>
        <ToggleSwitch
          checked={preferences.promotionalEmails}
          onChange={() => toggle('promotionalEmails')}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-black/5">
        <div>
          <p className="text-sm font-medium text-ink">Stock Alerts</p>
          <p className="text-xs text-steel">Get notified when items on your wishlist are back in stock</p>
        </div>
        <ToggleSwitch
          checked={preferences.stockAlerts}
          onChange={() => toggle('stockAlerts')}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between py-3 border-b border-black/5">
        <div>
          <p className="text-sm font-medium text-ink">Newsletter</p>
          <p className="text-xs text-steel">Stay updated with the latest plumbing industry news and tips</p>
        </div>
        <ToggleSwitch
          checked={preferences.newsletter}
          onChange={() => toggle('newsletter')}
          disabled={isPending}
        />
      </div>

      <div className="flex items-center justify-between py-3">
        <div>
          <p className="text-sm font-medium text-ink">SMS Notifications</p>
          <p className="text-xs text-steel">Receive text messages for delivery updates</p>
        </div>
        <ToggleSwitch
          checked={preferences.smsNotifications}
          onChange={() => toggle('smsNotifications')}
          disabled={isPending}
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 text-green-600 text-sm bg-green-50 p-3 rounded-sm">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Preferences saved successfully!
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full sm:w-auto bg-ink text-white font-mono text-[11px] uppercase tracking-wide px-6 py-2.5 rounded-sm disabled:opacity-60 hover:bg-ink/90 transition-colors"
      >
        {isPending ? 'Saving…' : 'Save Preferences'}
      </button>
    </form>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-colors ${
        checked ? 'bg-hydra' : 'bg-gray-300'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}
