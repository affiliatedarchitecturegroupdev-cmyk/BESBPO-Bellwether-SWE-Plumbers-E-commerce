'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  approveReturnAction,
  markReturnReceivedAction,
  rejectReturnAction,
  resolveReturnAsRefundAction,
  resolveReturnAsReplacementAction,
} from '@/lib/actions/admin-returns';

interface ReturnRequestItem {
  id: string;
  status: string;
  reason: string;
  reasonDetail: string | null;
  orderId: string;
  createdAt: string;
  lineItems: { quantity: number; orderLineItem: { productName: string; unitPrice: string } }[];
}

export function ReturnRequestCard({ request }: { request: ReturnRequestItem }) {
  const [note, setNote] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error ?? 'Action failed');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[11px] uppercase tracking-wide text-hydra">{request.status}</span>
        <span className="font-mono text-[11px] text-steel">
          {new Date(request.createdAt).toLocaleDateString('en-ZA')}
        </span>
      </div>
      <p className="text-sm mb-1">
        Order <span className="font-mono">{request.orderId}</span> —{' '}
        {request.reason.replace(/_/g, ' ').toLowerCase()}
      </p>
      {request.reasonDetail && <p className="text-[13px] text-steel mb-2">&quot;{request.reasonDetail}&quot;</p>}
      <ul className="text-sm mb-3">
        {request.lineItems.map((li, i) => (
          <li key={i}>
            {li.quantity} × {li.orderLineItem.productName} (R{Number(li.orderLineItem.unitPrice).toFixed(2)}/unit)
          </li>
        ))}
      </ul>

      <input
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Admin note"
        className="w-full border border-black/15 rounded-sm px-2.5 py-1.5 text-sm mb-2"
      />

      <div className="flex flex-wrap gap-2 items-center">
        {request.status === 'REQUESTED' && (
          <>
            <button
              onClick={() => run(() => approveReturnAction(request.id, note))}
              disabled={isPending}
              className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
            >
              Approve
            </button>
            <button
              onClick={() => run(() => rejectReturnAction(request.id, note))}
              disabled={isPending || !note}
              className="font-mono text-[11px] uppercase tracking-wide text-red-600 border border-red-200 rounded-sm px-3 py-1.5 disabled:opacity-40"
              title={!note ? 'A note is required to reject' : undefined}
            >
              Reject
            </button>
          </>
        )}

        {request.status === 'APPROVED' && (
          <button
            onClick={() => run(() => markReturnReceivedAction(request.id, note))}
            disabled={isPending}
            className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
          >
            Mark Received
          </button>
        )}

        {request.status === 'RECEIVED' && (
          <>
            <input
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              type="number"
              step="0.01"
              min={0.01}
              placeholder="Refund amount (R)"
              className="border border-black/15 rounded-sm px-2 py-1.5 text-sm w-36"
            />
            <button
              onClick={() => run(() => resolveReturnAsRefundAction(request.id, Number(refundAmount), note))}
              disabled={isPending || !refundAmount}
              className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
            >
              Resolve: Refund
            </button>
            <button
              onClick={() => run(() => resolveReturnAsReplacementAction(request.id, note))}
              disabled={isPending}
              className="font-mono text-[11px] uppercase tracking-wide border border-black/15 rounded-sm px-3 py-1.5 disabled:opacity-60"
            >
              Resolve: Replace
            </button>
            <button
              onClick={() => run(() => rejectReturnAction(request.id, note))}
              disabled={isPending || !note}
              className="font-mono text-[11px] uppercase tracking-wide text-red-600 border border-red-200 rounded-sm px-3 py-1.5 disabled:opacity-40"
              title={!note ? 'A note is required to reject' : undefined}
            >
              Reject (post-inspection)
            </button>
          </>
        )}
      </div>
      {error && <p className="text-[12px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
