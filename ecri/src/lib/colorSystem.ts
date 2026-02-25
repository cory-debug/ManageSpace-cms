/**
 * ManageSpace Color System
 * ========================
 * Single source of truth for all color decisions across the platform.
 *
 * RULES:
 * 1. Components never use raw hex values. Always import from this file.
 * 2. Token names describe MEANING, not appearance.
 * 3. Color conveys: DIRECTION (positive/negative) and INTENSITY (how much it matters).
 * 4. At rest, UI elements look calm. Color saturates on interaction or urgency.
 *
 * STRUCTURE:
 *   palette     → raw hex values, never used directly in components
 *   semantic    → named by meaning, built from palette
 *   components  → specific mappings for UI elements (toggles, occupancy, delta, spectrum)
 *
 * SOURCE: Canonical version lives at revman/app/lib/colorSystem.js
 *         This TypeScript copy adds border tokens for badges and action tokens for buttons.
 */

// ─────────────────────────────────────────────
// PALETTE — raw values, do not use in components
// ─────────────────────────────────────────────
const palette = {
  green: {
    50:  '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
  },
  red: {
    50:  '#fff1f2',
    100: '#ffe4e6',
    200: '#fecdd3',
    400: '#f87171',
    500: '#ef4444',
    600: '#dc2626',
    700: '#b91c1c',
    800: '#991b1b',
  },
  amber: {
    50:  '#fffbeb',
    100: '#fef3c7',
    200: '#fde68a',
    400: '#fbbf24',
    500: '#f59e0b',
    600: '#d97706',
  },
  slate: {
    50:  '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    900: '#0f172a',
  },
  indigo: {
    50:  '#eef2ff',
    100: '#e0e7ff',
    500: '#6366f1',
    600: '#4f46e5',
  },
};


// ─────────────────────────────────────────────
// SEMANTIC TOKENS
// Named by meaning. These are what components import.
// ─────────────────────────────────────────────
export const colors = {

  // --- Directional: increases, positive movement ---
  increase: {
    subtle:     { text: palette.green[600], bg: palette.green[50],  border: palette.green[200] },   // 0–10%: routine
    moderate:   { text: palette.green[600], bg: palette.green[100], border: palette.green[200] },   // 10–20%: meaningful
    aggressive: { text: palette.green[700], bg: palette.green[100], border: palette.green[400] },   // 20–35%: high conviction
    extreme:    { text: palette.amber[600], bg: palette.amber[50],  border: palette.amber[200] },   // 35%+: flag for review
  },

  // --- Directional: decreases, negative movement ---
  decrease: {
    subtle:  { text: palette.red[500], bg: palette.red[50],  border: palette.red[200] },   // -5%: minor pullback
    strong:  { text: palette.red[700], bg: palette.red[100], border: palette.red[400] },   // -10%: meaningful reduction
  },

  // --- Occupancy bands ---
  occupancy: {
    full:      { text: palette.green[700], bg: palette.green[50],  dot: palette.green[500] },  // 95%+: maximum pricing power
    high:      { text: palette.green[600], bg: palette.green[50],  dot: palette.green[400] },  // 90–94%: healthy
    softening: { text: palette.amber[600], bg: palette.amber[50],  dot: palette.amber[500] },  // 85–89%: worth noting
    low:       { text: palette.red[600],   bg: palette.red[50],    dot: palette.red[400] },    // <85%: vacancy is a factor
  },

  // --- Proposed rate position relative to street ---
  ratePosition: {
    belowStreet:  palette.green[600],   // proposed < street: healthy headroom
    nearStreet:   palette.amber[500],   // proposed within 5% above street: borderline
    aboveStreet:  palette.red[500],     // proposed >5% above street: flag
  },

  // --- Tier badges ---
  tier: {
    1: { text: palette.indigo[600], bg: palette.indigo[50], border: palette.indigo[100] },
    2: { text: palette.indigo[500], bg: palette.indigo[50], border: palette.indigo[100] },
    3: { text: palette.indigo[500], bg: palette.indigo[50], border: palette.indigo[100] },
    4: { text: palette.slate[500],  bg: palette.slate[100], border: palette.slate[300] },
  } as Record<number, { text: string; bg: string; border: string }>,

  // --- Tenure badges ---
  tenure: {
    approaching: { text: palette.amber[600], bg: palette.amber[100], border: palette.amber[200] },  // <13 months: first anniversary zone
    standard:    { text: palette.indigo[500], bg: palette.indigo[50], border: palette.indigo[100] },  // 13–24 months: normal
    longTerm:    { text: palette.slate[400],  bg: palette.slate[100], border: palette.slate[300] },   // 24+ months: dial back increases
  },

  // --- UI chrome ---
  ui: {
    cardBorder:      palette.slate[200],
    cardBg:          '#ffffff',
    zoneDivider:     palette.slate[100],
    footerBg:        palette.slate[50],
    trackBg:         palette.slate[200],
    labelMuted:      palette.slate[400],
    labelBody:       palette.slate[500],
    labelStrong:     palette.slate[600],
    textPrimary:     palette.slate[900],
    infoAccent:      palette.indigo[500],
    actionPositive:  palette.green[500],
    actionMuted:     palette.slate[500],
  },
};


// ─────────────────────────────────────────────
// COMPONENT MAPPINGS
// How semantic tokens map to specific UI elements.
// ─────────────────────────────────────────────

/**
 * getOccupancyColor(occupied, total)
 * Returns the color token for an occupancy ratio.
 */
export function getOccupancyColor(occupied: number, total: number) {
  const pct = occupied / total;
  if (pct >= 0.95) return colors.occupancy.full;
  if (pct >= 0.90) return colors.occupancy.high;
  if (pct >= 0.85) return colors.occupancy.softening;
  return colors.occupancy.low;
}

/**
 * getDeltaColor(currentRate, proposedRate)
 * Returns the color token for an increase delta display.
 */
export function getDeltaColor(currentRate: number, proposedRate: number) {
  const pct = ((proposedRate - currentRate) / currentRate) * 100;
  if (pct <= 0)   return colors.decrease.subtle;
  if (pct <= 10)  return colors.increase.subtle;
  if (pct <= 20)  return colors.increase.moderate;
  if (pct <= 35)  return colors.increase.aggressive;
  return colors.increase.extreme;
}

/**
 * getRatePositionColor(proposedRate, streetRate)
 * Returns the color for the proposed rate marker on the spectrum.
 */
export function getRatePositionColor(proposedRate: number, streetRate: number) {
  if (proposedRate <= streetRate) return colors.ratePosition.belowStreet;
  const pctAbove = (proposedRate - streetRate) / streetRate;
  if (pctAbove <= 0.05) return colors.ratePosition.nearStreet;
  return colors.ratePosition.aboveStreet;
}

/**
 * getToggleColors(pct)
 * Returns rest and hover colors for a rate adjustment toggle button.
 * pct: -10 | -5 | 5 | 10
 */
export function getToggleColors(pct: number) {
  const map: Record<string, { rest: { text: string; bg: string; border: string }; hover: { text: string; bg: string; border: string } }> = {
    '-10': {
      rest:  { text: palette.red[600],   bg: palette.red[50],   border: palette.red[200] },
      hover: { text: palette.red[700],   bg: palette.red[100],  border: palette.red[400] },
    },
    '-5': {
      rest:  { text: palette.red[400],   bg: palette.red[50],   border: palette.red[100] },
      hover: { text: palette.red[600],   bg: palette.red[50],   border: palette.red[200] },
    },
    '5': {
      rest:  { text: palette.green[500], bg: palette.green[50], border: palette.green[100] },
      hover: { text: palette.green[600], bg: palette.green[100], border: palette.green[200] },
    },
    '10': {
      rest:  { text: palette.green[700], bg: palette.green[100], border: palette.green[200] },
      hover: { text: palette.green[800], bg: palette.green[200], border: palette.green[400] },
    },
  };
  return map[String(pct)];
}

/**
 * getTenureColor(tenureMonths)
 * Returns the color token for a tenure badge.
 */
export function getTenureColor(tenureMonths: number) {
  if (tenureMonths < 13) return colors.tenure.approaching;
  if (tenureMonths <= 24) return colors.tenure.standard;
  return colors.tenure.longTerm;
}
