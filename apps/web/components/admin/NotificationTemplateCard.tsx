'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  resetNotificationTemplateAction,
  upsertNotificationTemplateAction,
} from '@/lib/actions/admin-notification-templates';

interface TemplateEntry {
  type: string;
  placeholders: string[];
  customTemplate: { subjectTemplate: string; bodyTemplate: string } | null;
}

export function NotificationTemplateCard({ entry }: { entry: TemplateEntry }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const result = await upsertNotificationTemplateAction(formData);
      if (!result.ok) {
        setError(result.error ?? 'Could not save the template');
        return;
      }
      router.refresh();
    });
  }

  function handleReset() {
    setError(null);
    startTransition(async () => {
      const result = await resetNotificationTemplateAction(entry.type);
      if (!result.ok) {
        setError(result.error ?? 'Could not reset the template');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[12px]">{entry.type}</span>
        <span
          className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm ${
            entry.customTemplate ? 'bg-[#EAF3F8] text-hydra' : 'bg-black/5 text-steel'
          }`}
        >
          {entry.customTemplate ? 'Customized' : 'Using default'}
        </span>
      </div>
      <p className="text-[12px] text-steel mb-3">
        Available placeholders: {entry.placeholders.map((p) => `{{${p}}}`).join(', ')}. Both fields below are
        required together to save a customization — there&apos;s no partial override of just one.
      </p>

      <form onSubmit={handleSubmit}>
        <input type="hidden" name="type" value={entry.type} />
        <input
          name="subjectTemplate"
          defaultValue={entry.customTemplate?.subjectTemplate ?? ''}
          placeholder="Subject template"
          required
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
        />
        <textarea
          name="bodyTemplate"
          defaultValue={entry.customTemplate?.bodyTemplate ?? ''}
          placeholder="Body template"
          required
          className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm min-h-[80px] mb-2"
        />
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-4 py-1.5 rounded-sm disabled:opacity-60"
          >
            Save
          </button>
          {entry.customTemplate && (
            <button
              type="button"
              onClick={handleReset}
              disabled={isPending}
              className="font-mono text-[11px] uppercase tracking-wide text-steel border border-black/15 rounded-sm px-4 py-1.5 disabled:opacity-60"
            >
              Reset to Default
            </button>
          )}
        </div>
      </form>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
