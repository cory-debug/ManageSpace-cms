/**
 * Right panel: selected case details, customer context, communications timeline, actions.
 * Spec: CaseDetailPanel - customer header, chronological communications, Send Email/SMS, Resolve/Close.
 */

import { useState } from 'react';
import type { Case, Communication, Customer } from '../types';

export interface CaseDetailPanelProps {
  caseData: Case;
  customer: Customer;
  communications: Communication[];
  onSendEmail: () => void;
  onSendSMS: () => void;
  onResolve: () => void;
  onClose: () => void;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function formatDateShort(d: Date): string {
  const today = new Date();
  const isToday =
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear();
  if (isToday) return `Today ${formatTime(d)}`;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function CommIcon({ type }: { type: 'phone' | 'email' | 'sms' }) {
  if (type === 'phone') return <span className="text-slate-600">☎</span>;
  if (type === 'email') return <span className="text-slate-600">✉</span>;
  return <span className="text-slate-600">💬</span>;
}

function CommunicationItemRow({ comm }: { comm: Communication }) {
  const [expanded, setExpanded] = useState(false);
  const preview = comm.content ?? comm.transcription ?? '';
  const previewShort = preview.length > 50 ? `${preview.slice(0, 50)}…` : preview;
  const duration =
    comm.type === 'phone' && comm.durationSeconds
      ? `${Math.floor(comm.durationSeconds / 60)}m ${comm.durationSeconds % 60}s`
      : null;

  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-2 text-left"
      >
        <CommIcon type={comm.type} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span className="font-medium capitalize">{comm.type}</span>
            <span className="text-slate-500">({comm.direction})</span>
            <span className="text-slate-400">{formatDateShort(comm.timestamp)}</span>
            {duration && <span className="text-slate-400">| {duration}</span>}
          </div>
          <p className="mt-1 text-sm text-slate-600">
            {expanded ? (preview || '—') : previewShort || '—'}
          </p>
        </div>
        <span className="text-slate-400">{expanded ? '▼' : '▶'}</span>
      </button>
      {comm.type === 'phone' && comm.recordingUrl && (
        <a
          href={comm.recordingUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-sm text-blue-600 hover:underline"
        >
          Play Recording
        </a>
      )}
    </div>
  );
}

export function CaseDetailPanel({
  caseData,
  customer,
  communications,
  onSendEmail,
  onSendSMS,
  onResolve,
  onClose,
}: CaseDetailPanelProps) {
  const sortedComms = [...communications].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  return (
    <div className="flex h-full flex-col rounded-lg border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-slate-800">Case Details</h2>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {/* Customer context */}
        <div className="mb-4 rounded-lg bg-slate-50 p-3">
          <p className="font-medium text-slate-800">
            {customer.name}
            {customer.unitNumber ? ` — Unit ${customer.unitNumber}` : ''}
          </p>
          <p className="text-sm text-slate-500">
            Status: <span className="capitalize">{caseData.status.replace('-', ' ')}</span>
            {' · '}
            Priority: <span className="capitalize">{caseData.priority}</span>
            {caseData.assignedTo ? ' · Assigned to: You' : ''}
          </p>
          {customer.balance != null && (
            <p className="text-sm text-slate-500">Balance: ${customer.balance.toFixed(2)}</p>
          )}
        </div>

        {/* Communications timeline */}
        <h3 className="mb-2 text-sm font-medium text-slate-700">
          Communications ({sortedComms.length})
        </h3>
        <div className="space-y-2">
          {sortedComms.length === 0 ? (
            <p className="text-sm text-slate-500">No communications yet.</p>
          ) : (
            sortedComms.map((comm) => (
              <CommunicationItemRow key={comm.id} comm={comm} />
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2 border-t border-slate-200 p-4">
        <button
          type="button"
          onClick={onSendEmail}
          className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Send Email
        </button>
        <button
          type="button"
          onClick={onSendSMS}
          className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
        >
          Send SMS
        </button>
        <button
          type="button"
          onClick={onResolve}
          className="rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
        >
          Mark Resolved
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md bg-slate-600 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          Close Case
        </button>
      </div>
    </div>
  );
}
