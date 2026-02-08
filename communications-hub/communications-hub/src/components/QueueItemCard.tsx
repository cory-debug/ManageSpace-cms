/**
 * Single item in the left panel: queue item (incoming call) or case summary.
 * Spec: QueueItemCard - priority indicator, name/unit or phone, wait time, Take Call.
 */

import type { QueueItem } from '../types';
import type { Customer } from '../types';

export interface QueueItemCardProps {
  item: QueueItem;
  customer?: Customer | null;
  isSelected: boolean;
  onSelect: () => void;
  onTakeCall?: () => void;
}

const priorityBorderClass: Record<string, string> = {
  urgent: 'border-l-4 border-l-red-500',
  high: 'border-l-4 border-l-amber-500',
  medium: 'border-l-4 border-l-blue-500',
  low: 'border-l-4 border-l-slate-400',
};

function formatWaitTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export function QueueItemCard({
  item,
  customer,
  isSelected,
  onSelect,
  onTakeCall,
}: QueueItemCardProps) {
  const borderClass = priorityBorderClass[item.priority] ?? 'border-l-4 border-l-slate-400';
  const displayName = item.customerName ?? customer?.name ?? 'Unknown';
  const displayContext = customer?.unitNumber ? `Unit ${customer.unitNumber}` : item.phoneNumber;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`
        ${borderClass}
        rounded-r-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition
        hover:bg-slate-50 hover:shadow
        ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            {!item.customerName && !customer && (
              <span className="text-amber-600" title="Unknown caller">
                ⚠
              </span>
            )}
            {item.customerName || customer ? (
              <span className="text-sm font-medium text-slate-800">{displayName}</span>
            ) : null}
          </div>
          <div className="mt-0.5 text-sm text-slate-500">{displayContext}</div>
          <div className="mt-1 text-xs text-slate-400">
            Wait: {formatWaitTime(item.waitTime)}
          </div>
        </div>
      </div>
      {onTakeCall && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onTakeCall();
          }}
          className="mt-2 w-full rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
        >
          Take Call
        </button>
      )}
    </div>
  );
}
