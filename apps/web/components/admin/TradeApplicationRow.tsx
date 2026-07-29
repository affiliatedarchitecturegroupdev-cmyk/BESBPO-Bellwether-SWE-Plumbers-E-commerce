'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { approveTradeApplicationAction, rejectTradeApplicationAction } from '@/lib/actions/trade-application-actions';

interface Props {
  application: {
    id: string;
    companyName: string;
    companyRegNumber: string | null;
    yearsInBusiness: number | null;
    message: string | null;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    rejectionReason: string | null;
    createdAt: string;
    account: { email: string; companyName: string | null; phone: string | null };
  };
}

export function TradeApplicationRow({ application }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      const result = await approveTradeApplicationAction(application.id);
      if (!result.ok) {
        setError(result.error ?? 'Could not approve');
        return;
      }
      router.refresh();
    });
  }

  function handleReject() {
    if (!rejectionReason.trim()) {
      setError('Enter a reason for rejecting this application.');
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await rejectTradeApplicationAction(application.id, rejectionReason.trim());
      if (!result.ok) {
        setError(result.error ?? 'Could not reject');
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="border border-black/10 rounded-sm p-4">
      <div className="flex justify-between items-start mb-2">
        <div>
          <div className="text-sm font-semibold">{application.companyName}</div>
          <div className="font-mono text-[11px] text-steel">
            {application.account.email}
            {application.account.phone ? ` · ${application.account.phone}` : ''}
          </div>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wide text-steel">
          {new Date(application.createdAt).toLocaleDateString('en-ZA')}
        </span>
      </div>

      <div className="text-[12.5px] text-steel mb-3 space-y-0.5">
        {application.companyRegNumber && <p>Reg. number: {application.companyRegNumber}</p>}
        {application.yearsInBusiness !== null && <p>Years in business: {application.yearsInBusiness}</p>}
        {application.message && <p className="italic">&quot;{application.message}&quot;</p>}
      </div>

      {application.status === 'PENDING' && (
        <>
          {!showRejectForm ? (
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={isPending}
                className="font-mono text-[11px] uppercase tracking-wide bg-ink text-white px-3 py-1.5 rounded-sm disabled:opacity-60"
              >
                Approve
              </button>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={isPending}
                className="font-mono text-[11px] uppercase tracking-wide text-steel hover:text-red-600"
              >
                Reject
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-start">
              <input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Reason for rejecting"
                className="flex-1 border border-black/15 rounded-sm px-2.5 py-1.5 text-sm"
              />
              <button
                onClick={handleReject}
                disabled={isPending}
                className="font-mono text-[11px] uppercase tracking-wide bg-[#B23A3A] text-white px-3 py-1.5 rounded-sm disabled:opacity-60"
              >
                Confirm Reject
              </button>
              <button
                onClick={() => setShowRejectForm(false)}
                className="font-mono text-[11px] text-steel px-2 py-1.5"
              >
                Cancel
              </button>
            </div>
          )}
        </>
      )}

      {application.status === 'APPROVED' && (
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-[#2E7D4F]">Approved</span>
      )}
      {application.status === 'REJECTED' && (
        <span className="font-mono text-[10.5px] uppercase tracking-wide text-[#B23A3A]">
          Rejected{application.rejectionReason ? `: ${application.rejectionReason}` : ''}
        </span>
      )}

      {error && <p className="text-[11.5px] text-red-600 mt-2">{error}</p>}
    </div>
  );
}
