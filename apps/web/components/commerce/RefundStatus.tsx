'use client';

import { useState } from 'react';

interface RefundStatusProps {
  id: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'COMPLETED';
  amount: string;
  reason: string;
  reasonDetail?: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
}

const STATUS_CONFIG = {
  PENDING: {
    label: 'Pending Review',
    description: 'Your refund request is being reviewed by our team.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  APPROVED: {
    label: 'Approved',
    description: 'Your refund has been approved and will be processed shortly.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  REJECTED: {
    label: 'Rejected',
    description: 'Unfortunately, your refund request was not approved.',
    color: 'text-red-600',
    bgColor: 'bg-red-50 border-red-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  PROCESSING: {
    label: 'Processing',
    description: 'Your refund is being processed and should appear in your account soon.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 border-indigo-200',
    icon: (
      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    ),
  },
  COMPLETED: {
    label: 'Completed',
    description: 'Your refund has been processed successfully.',
    color: 'text-green-600',
    bgColor: 'bg-green-50 border-green-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
  },
};

export function RefundStatusCard({ refund }: { refund: RefundStatusProps }) {
  const config = STATUS_CONFIG[refund.status];

  return (
    <div className={`border rounded-sm p-4 ${config.bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 ${config.color}`}>{config.icon}</div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-sm text-ink">{config.label}</h4>
            <span className="font-mono text-sm font-semibold">{refund.amount}</span>
          </div>
          <p className="text-xs text-steel mb-2">{config.description}</p>
          <div className="text-xs text-steel">
            <p>
              <span className="font-medium">Reason:</span> {refund.reason}
            </p>
            <p>
              <span className="font-medium">Submitted:</span> {new Date(refund.createdAt).toLocaleDateString('en-ZA')}
            </p>
            {refund.processedAt && (
              <p>
                <span className="font-medium">Processed:</span> {new Date(refund.processedAt).toLocaleDateString('en-ZA')}
              </p>
            )}
            {refund.rejectionReason && (
              <p className="text-red-600 mt-1">
                <span className="font-medium">Note:</span> {refund.rejectionReason}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface RefundTimelineStep {
  status: string;
  completed?: boolean;
  current?: boolean;
  date?: string;
}

interface RefundTimelineProps {
  steps: RefundTimelineStep[];
}

export function RefundTimeline({ steps }: RefundTimelineProps) {
  return (
    <div className="py-4">
      <h4 className="font-mono text-[10px] uppercase tracking-wide text-steel mb-4">Refund Progress</h4>
      <div className="space-y-0">
        {steps.map((step, index) => (
          <div key={step.status} className="flex items-start gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  step.completed
                    ? 'bg-green-500 text-white'
                    : step.current
                    ? 'bg-hydra text-white'
                    : 'bg-gray-200 text-gray-400'
                }`}
              >
                {step.completed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : step.current ? (
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                ) : (
                  <span className="text-[10px] font-mono">{index + 1}</span>
                )}
              </div>
              {index < steps.length - 1 && (
                <div className={`w-0.5 h-8 ${step.completed ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </div>
            <div className="pb-6">
              <p className={`text-sm font-medium ${step.completed || step.current ? 'text-ink' : 'text-steel'}`}>
                {step.status}
              </p>
              {step.date && <p className="text-xs text-steel">{step.date}</p>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Helper to determine refund timeline steps based on status
export function getRefundSteps(status: RefundStatusProps['status'], createdAt: string, processedAt?: string) {
  const baseSteps = [
    { status: 'Request Submitted', date: new Date(createdAt).toLocaleDateString('en-ZA') },
  ];

  switch (status) {
    case 'PENDING':
      return [...baseSteps, { status: 'Under Review', current: true }];
    case 'APPROVED':
      return [...baseSteps, { status: 'Under Review', completed: true, date: new Date(createdAt).toLocaleDateString('en-ZA') }, { status: 'Approved', current: true }];
    case 'PROCESSING':
      return [...baseSteps, { status: 'Under Review', completed: true }, { status: 'Processing Refund', current: true }];
    case 'COMPLETED':
      return [
        ...baseSteps,
        { status: 'Under Review', completed: true },
        { status: 'Approved', completed: true },
        { status: 'Refund Processed', completed: true, date: processedAt ? new Date(processedAt).toLocaleDateString('en-ZA') : undefined },
      ];
    case 'REJECTED':
      return [...baseSteps, { status: 'Under Review', completed: true }, { status: 'Rejected', current: true }];
    default:
      return baseSteps;
  }
}
