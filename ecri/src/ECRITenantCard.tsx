import { useState } from 'react';
import {
  colors,
  getTenureColor,
  getRatePositionColor,
  getToggleColors,
  getDeltaColor,
  getOccupancyColor,
} from './lib/colorSystem';

// ═══════════════════════════════════════════════════════
// ECRI TENANT CARD
// Three zones: Identity Strip, Rate Spectrum, Context Footer
// ═══════════════════════════════════════════════════════

interface ECRITenantCardProps {
  tenantName: string;
  unitType: string;
  tenureMonths: number;
  isMultiUnit: boolean;
  currentRate: number;
  proposedRate: number;
  medianAchieved: number;
  streetRate: number;
  unitGroupOccupied: number;
  unitGroupTotal: number;
  tier: 1 | 2 | 3 | 4;
  tierReason: string;
  increaseHistory: { date: string; amount: number }[];
  onApprove: () => void;
  onModify: (newRate: number, reason: string) => void;
  onSkip: (reason: string) => void;
}

const MODIFY_REASONS = [
  'Unit condition',
  'Business relationship',
  'Market judgment',
  'Multi-unit consideration',
  'Other (free text)',
] as const;

export default function ECRITenantCard({
  tenantName,
  unitType,
  tenureMonths,
  isMultiUnit,
  currentRate,
  proposedRate: initialProposed,
  medianAchieved,
  streetRate,
  unitGroupOccupied,
  unitGroupTotal,
  tier,
  tierReason,
  increaseHistory,
  onApprove,
  onModify,
  onSkip,
}: ECRITenantCardProps) {
  const [adjustedRate, setAdjustedRate] = useState(initialProposed);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mode, setMode] = useState<'review' | 'modify' | 'skip'>('review');
  const [modifyReason, setModifyReason] = useState('');
  const [skipReason, setSkipReason] = useState('');
  const [freeText, setFreeText] = useState('');
  const [hoveredToggle, setHoveredToggle] = useState<number | null>(null);

  const increase = adjustedRate - currentRate;
  const pctIncrease = ((increase / currentRate) * 100).toFixed(1);
  const occupancyPct = Math.round((unitGroupOccupied / unitGroupTotal) * 100);

  // Color tokens — all data-driven colors from the color system
  const tenureToken = getTenureColor(tenureMonths);
  const tierToken = colors.tier[tier];
  const deltaToken = getDeltaColor(currentRate, adjustedRate);
  const rateColor = getRatePositionColor(adjustedRate, streetRate);
  const occToken = getOccupancyColor(unitGroupOccupied, unitGroupTotal);

  // Spectrum positioning — find the range of all four values
  const allValues = [currentRate, adjustedRate, medianAchieved, streetRate];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal || 1;
  const pad = range * 0.12; // 12% padding on each side
  const trackMin = minVal - pad;
  const trackMax = maxVal + pad;
  const trackRange = trackMax - trackMin;
  const pos = (val: number) => ((val - trackMin) / trackRange) * 100;

  function applyPctAdjust(pct: number) {
    const newRate = Math.round(currentRate * (1 + (increase / currentRate) + pct));
    setAdjustedRate(Math.max(newRate, currentRate)); // never go below current
  }

  function handleModifyConfirm() {
    const reason = modifyReason === 'Other (free text)' ? freeText : modifyReason;
    if (reason) {
      onModify(adjustedRate, reason);
      setMode('review');
    }
  }

  function handleSkipConfirm() {
    const reason = skipReason === 'Other (free text)' ? freeText : skipReason;
    if (reason) {
      onSkip(reason);
      setMode('review');
    }
  }

  return (
    <div
      className="w-[480px] rounded-xl shadow-sm overflow-hidden"
      style={{ backgroundColor: colors.ui.cardBg, border: `1px solid ${colors.ui.cardBorder}` }}
    >

      {/* ═══ ZONE 1 — Identity Strip ═══ */}
      <div className="px-5 pt-4 pb-3 flex items-center gap-2 flex-wrap">
        <span className="text-[15px] font-semibold" style={{ color: colors.ui.textPrimary }}>
          {tenantName}
        </span>
        <span
          className="px-2.5 py-0.5 text-[11px] font-medium rounded-full"
          style={{
            backgroundColor: colors.ui.zoneDivider,
            color: colors.ui.labelStrong,
            border: `1px solid ${colors.ui.cardBorder}`,
          }}
        >
          {unitType}
        </span>
        <span
          className="px-2.5 py-0.5 text-[11px] font-medium rounded-full"
          style={{
            backgroundColor: tenureToken.bg,
            color: tenureToken.text,
            border: `1px solid ${tenureToken.border}`,
          }}
        >
          {tenureMonths} mo
        </span>
        {isMultiUnit && (
          <span
            className="px-2.5 py-0.5 text-[11px] font-semibold rounded-full"
            style={{
              backgroundColor: colors.decrease.subtle.bg,
              color: colors.decrease.subtle.text,
              border: `1px solid ${colors.decrease.subtle.border}`,
            }}
          >
            Multi-Unit
          </span>
        )}
      </div>

      {/* ═══ ZONE 2 — Rate Spectrum ═══ */}
      <div className="px-5 pb-4">

        {/* Spectrum track */}
        <div className="relative h-16 mb-1">
          {/* Track line */}
          <div
            className="absolute top-6 left-0 right-0 h-[3px] rounded-full"
            style={{ backgroundColor: colors.ui.trackBg }}
          />

          {/* Current Rate marker */}
          <SpectrumMarker
            left={pos(currentRate)}
            label="Current"
            value={currentRate}
            dotColor={colors.ui.labelMuted}
            textColor={colors.ui.labelBody}
            above
          />

          {/* Median marker */}
          <SpectrumMarker
            left={pos(medianAchieved)}
            label="Median"
            value={medianAchieved}
            dotColor={colors.ui.infoAccent}
            textColor={colors.ui.infoAccent}
            above={false}
          />

          {/* Street marker */}
          <SpectrumMarker
            left={pos(streetRate)}
            label="Street"
            value={streetRate}
            dotColor={colors.ui.labelStrong}
            textColor={colors.ui.labelStrong}
            above
          />

          {/* Proposed marker (larger) */}
          <div
            className="absolute top-[18px] -translate-x-1/2"
            style={{ left: `${pos(adjustedRate)}%` }}
          >
            <div
              className="w-4 h-4 rounded-full border-2 border-white shadow"
              style={{ backgroundColor: rateColor }}
            />
            <div
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-bold whitespace-nowrap"
              style={{ color: rateColor }}
            >
              ${adjustedRate}
            </div>
          </div>
        </div>

        {/* Proposed rate + delta */}
        <div className="mt-5 flex items-baseline gap-3">
          <span className="text-2xl font-bold" style={{ color: rateColor }}>
            ${adjustedRate}
          </span>
          <span className="text-sm" style={{ color: deltaToken.text }}>
            ↑ ${increase} ({pctIncrease}% increase)
          </span>
        </div>

        {/* Toggle buttons — color at rest per CLAUDE.md convention */}
        <div className="flex gap-1.5 mt-3">
          {([-10, -5, 5, 10] as const).map((pct) => {
            const tc = getToggleColors(pct);
            const isHovered = hoveredToggle === pct;
            const s = isHovered ? tc.hover : tc.rest;
            return (
              <button
                key={pct}
                onClick={() => applyPctAdjust(pct / 100)}
                onMouseEnter={() => setHoveredToggle(pct)}
                onMouseLeave={() => setHoveredToggle(null)}
                className="px-3 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer"
                style={{ color: s.text, backgroundColor: s.bg, border: `1px solid ${s.border}` }}
              >
                {pct > 0 ? '+' : ''}{pct}%
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="h-px" style={{ backgroundColor: colors.ui.zoneDivider }} />

      {/* ═══ ZONE 3 — Context Footer ═══ */}
      <div className="px-5 py-3">

        {/* Occupancy + Tier + History row */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="flex-1 min-w-0">
            {/* Occupancy — X / Y format with colored dot */}
            <div className="flex items-center gap-1.5 text-xs" style={{ color: occToken.text }}>
              <span
                className="w-2 h-2 rounded-full inline-block flex-shrink-0"
                style={{ backgroundColor: occToken.dot }}
              />
              {unitGroupOccupied} / {unitGroupTotal} occupied ({occupancyPct}%)
            </div>
            {/* Tier badge + reason */}
            <div className="flex items-center gap-2 mt-1.5">
              <span
                className="px-2 py-0.5 text-[10px] font-semibold rounded-full"
                style={{
                  color: tierToken.text,
                  backgroundColor: tierToken.bg,
                  border: `1px solid ${tierToken.border}`,
                }}
              >
                Tier {tier}
              </span>
              <span className="text-[11px] truncate" style={{ color: colors.ui.labelMuted }}>
                {tierReason}
              </span>
            </div>
          </div>

          {/* History toggle */}
          {increaseHistory.length > 0 && (
            <button
              onClick={() => setHistoryOpen(!historyOpen)}
              className="flex-shrink-0 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer"
              style={{
                color: colors.ui.labelBody,
                backgroundColor: colors.ui.footerBg,
                border: `1px solid ${colors.ui.cardBorder}`,
              }}
            >
              {increaseHistory.length} prior increase{increaseHistory.length !== 1 ? 's' : ''}
              <span className="ml-1">{historyOpen ? '▲' : '▼'}</span>
            </button>
          )}
        </div>

        {/* History expanded */}
        {historyOpen && (
          <div className="mb-3 pl-1 space-y-1">
            {increaseHistory.map((h, i) => (
              <div key={i} className="text-[11px]" style={{ color: colors.ui.labelMuted }}>
                {h.date} — <span className="font-medium" style={{ color: colors.ui.labelStrong }}>+${h.amount}</span>
              </div>
            ))}
          </div>
        )}

        {/* Actions */}
        {mode === 'review' && (
          <div className="flex gap-2">
            <button
              onClick={onApprove}
              className="flex-1 py-2 text-sm font-semibold text-white rounded-lg transition-colors cursor-pointer hover:opacity-90"
              style={{ backgroundColor: colors.ui.actionPositive }}
            >
              Approve
            </button>
            <button
              onClick={() => setMode('modify')}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer hover:opacity-90"
              style={{ color: colors.ui.labelStrong, backgroundColor: colors.ui.zoneDivider }}
            >
              Modify
            </button>
            <button
              onClick={() => setMode('skip')}
              className="flex-1 py-2 text-sm font-semibold rounded-lg transition-colors cursor-pointer hover:opacity-90"
              style={{
                color: colors.ui.labelMuted,
                backgroundColor: colors.ui.cardBg,
                border: `1px solid ${colors.ui.cardBorder}`,
              }}
            >
              Skip
            </button>
          </div>
        )}

        {/* Modify mode */}
        {mode === 'modify' && (
          <div className="space-y-2.5">
            <div className="flex items-center gap-2">
              <label className="text-xs" style={{ color: colors.ui.labelBody }}>Rate:</label>
              <input
                type="number"
                value={adjustedRate}
                onChange={(e) => setAdjustedRate(Math.max(Number(e.target.value), 0))}
                className="w-24 px-2 py-1 text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ border: `1px solid ${colors.ui.cardBorder}` }}
              />
            </div>
            <select
              value={modifyReason}
              onChange={(e) => setModifyReason(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ color: colors.ui.labelStrong, border: `1px solid ${colors.ui.cardBorder}` }}
            >
              <option value="">Select reason...</option>
              {MODIFY_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {modifyReason === 'Other (free text)' && (
              <input
                type="text"
                placeholder="Enter reason..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ border: `1px solid ${colors.ui.cardBorder}` }}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleModifyConfirm}
                disabled={!modifyReason || (modifyReason === 'Other (free text)' && !freeText)}
                className="flex-1 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: colors.ui.infoAccent }}
              >
                Confirm Modify
              </button>
              <button
                onClick={() => { setMode('review'); setModifyReason(''); setFreeText(''); }}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer hover:opacity-90"
                style={{ color: colors.ui.labelBody, border: `1px solid ${colors.ui.cardBorder}` }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Skip mode */}
        {mode === 'skip' && (
          <div className="space-y-2.5">
            <select
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
              style={{ color: colors.ui.labelStrong, border: `1px solid ${colors.ui.cardBorder}` }}
            >
              <option value="">Select skip reason...</option>
              {MODIFY_REASONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            {skipReason === 'Other (free text)' && (
              <input
                type="text"
                placeholder="Enter reason..."
                value={freeText}
                onChange={(e) => setFreeText(e.target.value)}
                className="w-full px-2.5 py-1.5 text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-blue-400"
                style={{ border: `1px solid ${colors.ui.cardBorder}` }}
              />
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSkipConfirm}
                disabled={!skipReason || (skipReason === 'Other (free text)' && !freeText)}
                className="flex-1 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer hover:opacity-90"
                style={{ backgroundColor: colors.ui.actionMuted }}
              >
                Confirm Skip
              </button>
              <button
                onClick={() => { setMode('review'); setSkipReason(''); setFreeText(''); }}
                className="px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer hover:opacity-90"
                style={{ color: colors.ui.labelBody, border: `1px solid ${colors.ui.cardBorder}` }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// SPECTRUM MARKER — positioned dot + label on the track
// ═══════════════════════════════════════════════════════

function SpectrumMarker({
  left,
  label,
  value,
  dotColor,
  textColor,
  above,
}: {
  left: number;
  label: string;
  value: number;
  dotColor: string;
  textColor: string;
  above: boolean;
}) {
  return (
    <div
      className="absolute -translate-x-1/2"
      style={{ left: `${left}%`, top: above ? '0px' : '34px' }}
    >
      {above ? (
        <>
          <div
            className="text-[9px] font-medium text-center whitespace-nowrap mb-0.5"
            style={{ color: textColor }}
          >
            {label} ${value}
          </div>
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-center">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColor }} />
          </div>
          <div
            className="text-[9px] font-medium text-center whitespace-nowrap mt-0.5"
            style={{ color: textColor }}
          >
            {label} ${value}
          </div>
        </>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// DEMO RENDER
// ═══════════════════════════════════════════════════════

export function ECRITenantCardDemo() {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-8"
      style={{ backgroundColor: colors.ui.zoneDivider }}
    >
      <ECRITenantCard
        tenantName="Sarah Mitchell"
        unitType="10×10 Climate Control"
        tenureMonths={27}
        isMultiUnit={false}
        currentRate={184}
        proposedRate={221}
        medianAchieved={154}
        streetRate={134}
        unitGroupOccupied={45}
        unitGroupTotal={50}
        tier={3}
        tierReason="Above median and above street — conservative increase"
        increaseHistory={[
          { date: 'Mar 2025', amount: 15 },
          { date: 'Mar 2024', amount: 20 },
        ]}
        onApprove={() => console.log('Approved')}
        onModify={(rate, reason) => console.log('Modified:', rate, reason)}
        onSkip={(reason) => console.log('Skipped:', reason)}
      />
    </div>
  );
}
