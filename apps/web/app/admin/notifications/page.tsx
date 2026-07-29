import { auth } from '@/auth';
import { apiClient } from '@/lib/api-client';
import { NotificationTemplateCard } from '@/components/admin/NotificationTemplateCard';

interface TemplateEntry {
  type: string;
  placeholders: string[];
  customTemplate: { subjectTemplate: string; bodyTemplate: string } | null;
}

export default async function AdminNotificationsPage() {
  const session = await auth();
  if (!session?.accessToken) return <p className="text-sm text-steel">Please sign in.</p>;

  const templates = await apiClient.get<TemplateEntry[]>('/v1/notification-templates', {
    accessToken: session.accessToken,
  });

  return (
    <div>
      <h1 className="font-display text-xl font-bold mb-2">Notification Templates</h1>
      <p className="text-sm text-steel mb-6">
        Customize customer-facing email copy without a code deploy. A type with no customization uses the
        original, hardcoded default — see docs/AGENTS.md&apos;s notification templates section for exactly how
        that fallback works.
      </p>

      <div className="space-y-4">
        {templates.map((entry) => (
          <NotificationTemplateCard key={entry.type} entry={entry} />
        ))}
      </div>
    </div>
  );
}
