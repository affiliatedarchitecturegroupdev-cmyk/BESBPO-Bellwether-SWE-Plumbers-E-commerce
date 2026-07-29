'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { removeRecurringOrderAction, setRecurringOrderActiveAction } from '@/lib/actions/recurring-order-actions';

interface TemplateItem {
  quantity: number;
  product: { name: string };
}

interface Template {
  id: string;
  name: string;
  frequency: string;
  active: boolean;
  nextRunAt: string;
  lastRunAt: string | null;
  lastRunError: string | null;
  items: TemplateItem[];
}

export function RecurringOrderCard({ template }: { template: Template }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function toggleActive() {
    startTransition(async () => {
      await setRecurringOrderActiveAction(template.id, !template.active);
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      await removeRecurringOrderAction(template.id);
      router.refresh();
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">{template.name}</h3>
        <span
          className={`font-mono text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-sm ${
            template.active ? 'bg-[#EAF3F8] text-hydra' : 'bg-black/5 text-steel'
          }`}
        >
          {template.active ? 'Active' : 'Paused'}
        </span>
      </div>
      <p className="text-[13px] text-steel mb-2">
        {template.frequency === 'WEEKLY' ? 'Every week' : 'Every month'} — next order{' '}
        {new Date(template.nextRunAt).toLocaleDateString('en-ZA')}
      </p>
      <ul className="text-sm mb-2">
        {template.items.map((item, i) => (
          <li key={i}>
            {item.quantity} × {item.product.name}
          </li>
        ))}
      </ul>
      {template.lastRunAt && (
        <p className="text-[12px] text-steel mb-2">
          Last placed {new Date(template.lastRunAt).toLocaleDateString('en-ZA')}
        </p>
      )}
      {template.lastRunError && (
        <p className="text-[12px] text-red-600 mb-2">Last attempt failed: {template.lastRunError}</p>
      )}
      <div className="flex gap-3 mt-3">
        <button
          onClick={toggleActive}
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
        >
          {template.active ? 'Pause' : 'Resume'}
        </button>
        <button
          onClick={remove}
          disabled={isPending}
          className="font-mono text-[11px] uppercase tracking-wide text-steel hover:text-red-600 disabled:opacity-40"
        >
          Remove
        </button>
      </div>
    </div>
  );
}
