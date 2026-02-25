// ═══════════════════════════════════════════════════════
// ECRI ENGINE — Business logic extracted for testability
// Validated 29/29 against Brian's Cornelius Excel (Feb 12, 2026)
// ═══════════════════════════════════════════════════════

export interface Competitor {
  name: string;
  quality: 'A' | 'B' | 'C' | 'D';
  unitType: string;
  features: string;
  distance: number;
  rate: number;
  weight: number;
  lastSeen: string;
}

export interface ECRITenant {
  id: string;
  facilityId: string;
  customerName: string;
  unitNumber: string;
  unitType: string;
  unitGroup: string;
  features: string;
  tenureMonths: number;
  currentRent: number;
  streetRate: number;
  unitGroupMedian: number;
  unitGroupOccupancy: number;
  unitGroupTotal: number;
  unitGroupOccupied: number;
  trialRate: number;
  newRateDeltaToMedian: number;
  tenantVsStreet: number;
  assignedTier: 1 | 2 | 3 | 4;
  tierPercent: number;
  recommendedNewRent: number;
  recommendedIncrease: number;
  isAboveStreet: boolean;
  smartCatchUp: boolean;
  isSeasonalLowRate: boolean;
  isMultiUnit: boolean;
  isLeaseUp: boolean;
  isFirstECRI: boolean;
  status: 'pending' | 'approved' | 'modified' | 'skipped';
  approvedAmount?: number;
  overrideReason?: string;
  skipReason?: string;
  dmNotes?: string;
  previousIncreases: { date: string; amount: number }[];
  competitors: Competitor[];
}

export interface TierResult {
  tier: 1 | 2 | 3 | 4;
  percent: number;
  trialRate: number;
  deltaMed: number;
  tvs: number;
  smartCatchUp?: boolean; // true when Tier 1 uses aggressive catch-up
}

export const OVERRIDE_REASONS = [
  'Undesirable building section',
  'Business tenant relationship',
  'High-bay risk assessment',
  'Street rate ceiling',
  'DM judgment needed',
  'Other',
] as const;

/**
 * 4-Tier ECRI Formula Engine
 *
 * Evaluation is strict priority order — first match wins.
 * All tiers use 20% trial rate as starting point (confirmed by Brian Feb 12).
 *
 * Tier 1 (40%): newRateDeltaToMedian < -0.20 AND unitGroupOccupancy > 0.75
 *   → Smart Catch-Up (Feb 19): If occ >= 90% AND 40% still leaves tenant >$25 below street
 *     AND median >= street → target 90% of street (capped at 2x current rent)
 *     If median < street → target 90% of median instead
 * Tier 2 (10%): newRateDeltaToMedian > 0.75
 * Tier 3 (15%): tenantVsStreet > 0.15 AND newRateDeltaToMedian > 0.15
 * Tier 4 (20%): default
 */
export function computeTier(
  currentRent: number,
  unitGroupMedian: number,
  streetRate: number,
  unitGroupOccupancy: number,
): TierResult {
  const trialRate = currentRent * 1.20;
  const deltaMed = (trialRate - unitGroupMedian) / unitGroupMedian;
  const tvs = (currentRent - streetRate) / streetRate;

  if (deltaMed < -0.20 && unitGroupOccupancy > 0.75) {
    // Smart Catch-Up: when 40% isn't enough for highly occupied groups
    const baseNewRent = currentRent * 1.40;
    const gapToStreet = streetRate - baseNewRent;

    if (unitGroupOccupancy >= 0.90 && gapToStreet > 25) {
      // High confidence: median at or above street → target 90% of street
      // Lower confidence: median below street → target 90% of median
      const anchor = unitGroupMedian >= streetRate ? streetRate : unitGroupMedian;
      const targetRent = Math.round(anchor * 0.90);
      // Cap: never more than double the current rent
      const cappedRent = Math.min(targetRent, currentRent * 2);
      const smartPercent = (cappedRent - currentRent) / currentRent;
      return { tier: 1, percent: Math.max(smartPercent, 0.40), trialRate, deltaMed, tvs, smartCatchUp: true };
    }

    return { tier: 1, percent: 0.40, trialRate, deltaMed, tvs };
  }
  if (deltaMed > 0.75) {
    return { tier: 2, percent: 0.10, trialRate, deltaMed, tvs };
  }
  if (tvs > 0.15 && deltaMed > 0.15) {
    return { tier: 3, percent: 0.15, trialRate, deltaMed, tvs };
  }
  return { tier: 4, percent: 0.20, trialRate, deltaMed, tvs };
}

export interface BuildTenantInput {
  id: string;
  facilityId: string;
  customerName: string;
  unitNumber: string;
  unitType: string;
  unitGroup: string;
  features: string;
  tenureMonths: number;
  currentRent: number;
  streetRate: number;
  unitGroupMedian: number;
  unitGroupOccupancy: number;
  unitGroupTotal: number;
  unitGroupOccupied: number;
  isMultiUnit?: boolean;
  isLeaseUp?: boolean;
  isFirstECRI?: boolean;
  previousIncreases?: { date: string; amount: number }[];
  competitors?: Competitor[];
}

export function buildTenant(raw: BuildTenantInput): ECRITenant {
  const { tier, percent, trialRate, deltaMed, tvs, smartCatchUp } = computeTier(
    raw.currentRent, raw.unitGroupMedian, raw.streetRate, raw.unitGroupOccupancy,
  );
  const recommendedNewRent = Math.round(raw.currentRent * (1 + percent));
  return {
    ...raw,
    trialRate,
    newRateDeltaToMedian: deltaMed,
    tenantVsStreet: tvs,
    assignedTier: tier,
    tierPercent: percent,
    recommendedNewRent,
    recommendedIncrease: recommendedNewRent - raw.currentRent,
    isAboveStreet: recommendedNewRent > raw.streetRate,
    smartCatchUp: smartCatchUp ?? false,
    isSeasonalLowRate: raw.tenureMonths >= 10 && raw.tenureMonths <= 14
      && (raw.currentRent / raw.unitGroupMedian) < 0.50,
    isMultiUnit: raw.isMultiUnit ?? false,
    isLeaseUp: raw.isLeaseUp ?? false,
    isFirstECRI: raw.isFirstECRI ?? true,
    status: 'pending',
    previousIncreases: raw.previousIncreases ?? [],
    competitors: raw.competitors ?? [],
  };
}
