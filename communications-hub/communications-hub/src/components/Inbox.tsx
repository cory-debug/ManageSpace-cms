/**
 * Helpdesk Inbox - Screen 1.
 * Two-panel layout: left = Queue/Cases list (tabs), right = Case details.
 * Spec: STORAGE_VAULT_COMMS_UI_SPEC.md — Screen 1: Helpdesk Inbox
 */

import { useState, useMemo } from 'react';
import type { Case, QueueItem, InboxTab } from '../types';
import {
  mockQueueItems,
  mockCases,
  getCustomerById,
  getCaseById,
} from '../data/mockInbox';
import { QueueItemCard } from './QueueItemCard';
import { CaseDetailPanel } from './CaseDetailPanel';

const TABS: { id: InboxTab; label: string; count?: number }[] = [
  { id: 'queue', label: 'Queue', count: mockQueueItems.length },
  { id: 'open', label: 'Open Cases', count: mockCases.filter((c) => c.status !== 'resolved' && c.status !== 'closed').length },
  { id: 'mine', label: 'My Cases', count: mockCases.filter((c) => c.assignedTo === 'current-user').length },
  { id: 'all', label: 'All Cases', count: mockCases.length },
];

export function Inbox() {
  const [activeTab, setActiveTab] = useState<InboxTab>('queue');
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>('case-1');
  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);

  const selectedCase = selectedCaseId ? getCaseById(selectedCaseId) : null;
  const selectedCustomer = selectedCase
    ? getCustomerById(selectedCase.customerId)
    : null;

  const filteredCases = useMemo(() => {
    if (activeTab === 'queue') return [];
    if (activeTab === 'open')
      return mockCases.filter((c) => c.status !== 'resolved' && c.status !== 'closed');
    if (activeTab === 'mine')
      return mockCases.filter((c) => c.assignedTo === 'current-user');
    return mockCases;
  }, [activeTab]);

  const handleSelectQueueItem = (item: QueueItem) => {
    setSelectedQueueId(item.id);
    const caseForCustomer = item.customerId
      ? mockCases.find((c) => c.customerId === item.customerId)
      : null;
    setSelectedCaseId(caseForCustomer?.id ?? null);
  };

  const handleSelectCase = (caseData: Case) => {
    setSelectedCaseId(caseData.id);
    setSelectedQueueId(null);
  };

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <h1 className="text-xl font-semibold text-slate-800">Communications Hub</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Helpdesk</span>
          <button
            type="button"
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            User ▼
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 bg-white px-4">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`
              border-b-2 px-4 py-3 text-sm font-medium transition
              ${activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-800'}
            `}
          >
            {tab.label}
            {tab.count != null && (
              <span className="ml-1.5 rounded-full bg-slate-200 px-1.5 py-0.5 text-xs">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">
        {/* Left panel: Queue / Cases list */}
        <aside className="flex w-80 flex-col border-r border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-200 px-3 py-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              {activeTab === 'queue' ? 'Call Queue' : 'Cases'}
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {activeTab === 'queue' &&
              mockQueueItems.map((item) => {
                const customer = item.customerId
                  ? getCustomerById(item.customerId)
                  : null;
                const isSelected =
                  selectedQueueId === item.id ||
                  (selectedCaseId &&
                    item.customerId &&
                    getCaseById(selectedCaseId)?.customerId === item.customerId);
                return (
                  <QueueItemCard
                    key={item.id}
                    item={item}
                    customer={customer ?? undefined}
                    isSelected={!!isSelected}
                    onSelect={() => handleSelectQueueItem(item)}
                    onTakeCall={() => {
                      handleSelectQueueItem(item);
                      // TODO: integrate with Twilio / take call
                    }}
                  />
                );
              })}
            {activeTab !== 'queue' &&
              filteredCases.map((caseData) => {
                const customer = getCustomerById(caseData.customerId);
                const isSelected = selectedCaseId === caseData.id;
                return (
                  <div
                    key={caseData.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectCase(caseData)}
                    onKeyDown={(e) =>
                      (e.key === 'Enter' || e.key === ' ') && handleSelectCase(caseData)
                    }
                    className={`
                      rounded-lg border p-3 text-left transition
                      hover:bg-slate-50
                      ${isSelected ? 'border-blue-500 bg-blue-50/50 ring-1 ring-blue-500' : 'border-slate-200 bg-white'}
                    `}
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {customer?.name ?? 'Unknown'}
                    </p>
                    <p className="text-sm text-slate-500">
                      {customer?.unitNumber ? `Unit ${customer.unitNumber}` : caseData.subject}
                    </p>
                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {caseData.status.replace('-', ' ')} · {caseData.priority}
                    </p>
                  </div>
                );
              })}
          </div>
        </aside>

        {/* Right panel: Case details */}
        <main className="flex-1 min-w-0 p-4 overflow-hidden">
          {selectedCase && selectedCustomer ? (
            <CaseDetailPanel
              caseData={selectedCase}
              customer={selectedCustomer}
              communications={selectedCase.communications}
              onSendEmail={() => {}}
              onSendSMS={() => {}}
              onResolve={() => {}}
              onClose={() => {}}
            />
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50">
              <p className="text-slate-500">
                Select a call or case from the list to view details.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
