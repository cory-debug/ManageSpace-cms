// ═══════════════════════════════════════════════════════
// FORECAST ENGINE — Churn prediction + Demand forecasting
// Shared by Rent Increases (churn) and Rates (demand)
//
// Day 1: Industry-calibrated defaults with mock data
// Production: Must be tied to real outcomes before go-live
// See plan: "Production Calibration — HARD PREREQUISITE"
// ═══════════════════════════════════════════════════════

import type { ECRITenant } from './ecri-engine';
import type { ActivityWindow } from './vacant-pricing-engine';

// ─── Types ───────────────────────────────────────────

export type ChurnRisk = 'low' | 'medium' | 'high' | 'very-high';
export type ForecastConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export interface TenantChurnForecast {
  churnProbability: number;      // 0.02–0.45
  churnRisk: ChurnRisk;
  netMonthlyImpact: number;      // increase revenue minus expected loss
  expectedMonthlyLoss: number;   // currentRent * churnProb (what we lose if they leave)
  monthlyGain: number;           // increase amount (what we gain if they stay)
}

export interface TierChurnBreakdown {
  tier: 1 | 2 | 3 | 4;
  tenantCount: number;
  avgChurnProb: number;
  expectedMoveOuts: number;
  revenueAtRisk: number;
}

export interface BatchChurnForecast {
  facilityId: string;
  totalTenants: number;
  expectedMoveOuts: number;       // sum of individual churn probs
  overallChurnRate: number;       // expectedMoveOuts / totalTenants
  revenueAtRisk: number;          // sum of (currentRent * churnProb) for all tenants
  grossRevenueGain: number;       // sum of all increase amounts
  netMonthlyImpact: number;       // grossGain - revenueAtRisk
  netAnnualImpact: number;        // net * 12
  backfillNeeded: number;         // ceil(expectedMoveOuts)
  tierBreakdown: TierChurnBreakdown[];
  confidence: ForecastConfidence;
  confidenceLabel: string;
}

export interface DemandForecast {
  forecastMoveIns: number;
  forecastOrganicOuts: number;
  forecastEcriChurn: number;
  forecastTotalOuts: number;
  netForecast: number;
  projectedOccupancy: number;
  projectedOccupancyDelta: number; // change from current
  seasonalIndex: number;           // multiplier applied
  elasticityImpact: number;        // move-ins lost/gained from price
  confidence: ForecastConfidence;
  confidenceLabel: string;
}

// ─── Sigmoid / Churn Model Constants ─────────────────
// These are the tunable parameters that get calibrated
// against real outcomes in production.

const SIGMOID = {
  midpoint: 0.25,    // increase % where churn hits 50% of ceiling
  steepness: 12,     // how sharply the curve transitions
  floor: 0.02,       // minimum churn probability (2%)
  ceiling: 0.45,     // maximum churn probability (45%)
};

const MODIFIERS = {
  // Tenure: short tenure = higher risk
  tenureShortThreshold: 12,   // months
  tenureLongThreshold: 36,    // months
  tenureShortMultiplier: 1.3, // +30% for <12 months
  tenureLongMultiplier: 0.7,  // -30% for >36 months

  // Occupancy: high occupancy = less churn (nowhere to go)
  occupancyHighThreshold: 0.90,
  occupancyLowThreshold: 0.75,
  occupancyHighMultiplier: 0.75, // -25% when >90%
  occupancyLowMultiplier: 1.25,  // +25% when <75%

  // Rate position: above street = higher risk
  aboveStreetMultiplier: 1.35,   // +35% if proposed rate > street
  nearStreetThreshold: 0.05,     // within 5% of street = neutral
};

// ─── Seasonal Indices ────────────────────────────────
// Relative demand by month. 1.0 = average month.
// Jun-Aug peak, Dec-Feb trough. Based on industry data.
const SEASONAL_INDEX: Record<number, number> = {
  0: 0.75,  // Jan
  1: 0.80,  // Feb
  2: 0.90,  // Mar
  3: 1.00,  // Apr
  4: 1.15,  // May
  5: 1.30,  // Jun
  6: 1.25,  // Jul
  7: 1.20,  // Aug
  8: 1.05,  // Sep
  9: 0.95,  // Oct
  10: 0.80, // Nov
  11: 0.70, // Dec
};

// Price elasticity of demand for self-storage
// -0.3 means: 10% price increase → 3% demand decrease
const PRICE_ELASTICITY = -0.3;

// Organic move-out rate (monthly) as fraction of occupied units
const ORGANIC_MOVEOUT_RATE = 0.06; // ~6% per month = ~72% annual turnover

// ═══════════════════════════════════════════════════════
// CHURN MODEL (Used by Rent Increases page)
// ═══════════════════════════════════════════════════════

/**
 * Core sigmoid function for churn probability.
 * Maps increase percentage to a base churn probability.
 *
 * Small increases (5-10%) → near floor (2-5%)
 * Medium increases (15-20%) → moderate (10-20%)
 * Large increases (30-40%) → approaching ceiling (30-45%)
 */
function sigmoid(increasePct: number): number {
  const x = increasePct - SIGMOID.midpoint;
  const raw = 1 / (1 + Math.exp(-SIGMOID.steepness * x));
  return SIGMOID.floor + (SIGMOID.ceiling - SIGMOID.floor) * raw;
}

/**
 * Compute churn probability for a single tenant.
 *
 * Takes the base sigmoid output and applies modifiers for:
 * - Tenure (sticky tenants stay)
 * - Occupancy (tight markets = less churn)
 * - Rate position (above street = flight risk)
 */
export function computeChurnProbability(tenant: ECRITenant): TenantChurnForecast {
  const effectiveRate = tenant.approvedAmount ?? tenant.recommendedNewRent;
  const increasePct = (effectiveRate - tenant.currentRent) / tenant.currentRent;

  // Base probability from sigmoid
  let prob = sigmoid(increasePct);

  // Tenure modifier
  if (tenant.tenureMonths < MODIFIERS.tenureShortThreshold) {
    prob *= MODIFIERS.tenureShortMultiplier;
  } else if (tenant.tenureMonths > MODIFIERS.tenureLongThreshold) {
    prob *= MODIFIERS.tenureLongMultiplier;
  }

  // Occupancy modifier
  if (tenant.unitGroupOccupancy > MODIFIERS.occupancyHighThreshold) {
    prob *= MODIFIERS.occupancyHighMultiplier;
  } else if (tenant.unitGroupOccupancy < MODIFIERS.occupancyLowThreshold) {
    prob *= MODIFIERS.occupancyLowMultiplier;
  }

  // Rate position modifier
  const rateVsStreet = (effectiveRate - tenant.streetRate) / tenant.streetRate;
  if (rateVsStreet > MODIFIERS.nearStreetThreshold) {
    prob *= MODIFIERS.aboveStreetMultiplier;
  }

  // Clamp to floor/ceiling
  prob = Math.max(SIGMOID.floor, Math.min(SIGMOID.ceiling, prob));

  const monthlyGain = effectiveRate - tenant.currentRent;
  const expectedMonthlyLoss = tenant.currentRent * prob;
  const netMonthlyImpact = monthlyGain - expectedMonthlyLoss;

  return {
    churnProbability: Math.round(prob * 1000) / 1000,
    churnRisk: getChurnRiskLevel(prob),
    netMonthlyImpact: Math.round(netMonthlyImpact),
    expectedMonthlyLoss: Math.round(expectedMonthlyLoss),
    monthlyGain: Math.round(monthlyGain),
  };
}

export function getChurnRiskLevel(prob: number): ChurnRisk {
  if (prob < 0.08) return 'low';
  if (prob < 0.18) return 'medium';
  if (prob < 0.30) return 'high';
  return 'very-high';
}

export function getChurnRiskColor(risk: ChurnRisk): string {
  switch (risk) {
    case 'low': return '#10B981';
    case 'medium': return '#F59E0B';
    case 'high': return '#F97316';
    case 'very-high': return '#EF4444';
  }
}

export function getChurnRiskLabel(risk: ChurnRisk): string {
  switch (risk) {
    case 'low': return 'Low';
    case 'medium': return 'Med';
    case 'high': return 'High';
    case 'very-high': return 'V.High';
  }
}

// ═══════════════════════════════════════════════════════
// BATCH FORECAST (Facility-level rollup for Rent Increases)
// ═══════════════════════════════════════════════════════

export function computeBatchForecast(
  tenants: ECRITenant[],
  facilityId: string,
): BatchChurnForecast {
  const tierMap = new Map<number, { count: number; probSum: number; riskSum: number }>();

  let totalExpectedOuts = 0;
  let totalRevenueAtRisk = 0;
  let totalGrossGain = 0;

  for (const t of tenants) {
    const forecast = computeChurnProbability(t);

    totalExpectedOuts += forecast.churnProbability;
    totalRevenueAtRisk += forecast.expectedMonthlyLoss;
    totalGrossGain += forecast.monthlyGain;

    const entry = tierMap.get(t.assignedTier) ?? { count: 0, probSum: 0, riskSum: 0 };
    entry.count += 1;
    entry.probSum += forecast.churnProbability;
    entry.riskSum += forecast.expectedMonthlyLoss;
    tierMap.set(t.assignedTier, entry);
  }

  const tierBreakdown: TierChurnBreakdown[] = [];
  for (const [tier, data] of tierMap) {
    tierBreakdown.push({
      tier: tier as 1 | 2 | 3 | 4,
      tenantCount: data.count,
      avgChurnProb: data.count > 0 ? data.probSum / data.count : 0,
      expectedMoveOuts: Math.round(data.probSum * 10) / 10,
      revenueAtRisk: Math.round(data.riskSum),
    });
  }
  tierBreakdown.sort((a, b) => a.tier - b.tier);

  const netMonthly = totalGrossGain - totalRevenueAtRisk;

  return {
    facilityId,
    totalTenants: tenants.length,
    expectedMoveOuts: Math.round(totalExpectedOuts * 10) / 10,
    overallChurnRate: tenants.length > 0 ? totalExpectedOuts / tenants.length : 0,
    revenueAtRisk: Math.round(totalRevenueAtRisk),
    grossRevenueGain: Math.round(totalGrossGain),
    netMonthlyImpact: Math.round(netMonthly),
    netAnnualImpact: Math.round(netMonthly * 12),
    backfillNeeded: Math.ceil(totalExpectedOuts),
    tierBreakdown,
    // Mock data phase: always LOW confidence
    confidence: 'LOW',
    confidenceLabel: 'Projected (industry estimate)',
  };
}

// ═══════════════════════════════════════════════════════
// DEMAND MODEL (Used by Rates page)
// ═══════════════════════════════════════════════════════

/**
 * Compute 30-day demand forecast for a unit group.
 *
 * Approach:
 * 1. Extrapolate recent 14-day move-in velocity to 30 days
 * 2. Apply seasonal index for current month
 * 3. Apply price elasticity (how much demand changes with rate change)
 * 4. Compute organic move-outs from occupied base
 * 5. Add ECRI churn from linked rent increase data
 */
export function computeDemandForecast(
  activity: { day7: ActivityWindow; day14: ActivityWindow; day30: ActivityWindow },
  occupiedUnits: number,
  totalUnits: number,
  streetRate: number,
  previousStreetRate: number,
  ecriChurnUnits: number = 0,
  currentMonth?: number,
): DemandForecast {
  const month = currentMonth ?? new Date().getMonth();
  const seasonalIndex = SEASONAL_INDEX[month] ?? 1.0;

  // 1. Extrapolate 14-day move-in rate to 30 days, with seasonal adjustment
  const dailyMoveInRate = activity.day14.moveIns / 14;
  const baseMoveIns = dailyMoveInRate * 30;
  const seasonalMoveIns = baseMoveIns * seasonalIndex;

  // 2. Price elasticity adjustment
  const priceChangePct = previousStreetRate > 0
    ? (streetRate - previousStreetRate) / previousStreetRate
    : 0;
  const elasticityImpact = priceChangePct * PRICE_ELASTICITY * seasonalMoveIns;
  const adjustedMoveIns = Math.max(0, Math.round((seasonalMoveIns + elasticityImpact) * 10) / 10);

  // 3. Organic move-outs (based on occupied units)
  const organicOuts = Math.round(occupiedUnits * ORGANIC_MOVEOUT_RATE * 10) / 10;

  // 4. Total outs = organic + ECRI churn
  const totalOuts = Math.round((organicOuts + ecriChurnUnits) * 10) / 10;

  // 5. Net and projected occupancy
  const netForecast = Math.round((adjustedMoveIns - totalOuts) * 10) / 10;
  const currentOccPct = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;
  const projectedOccupied = Math.max(0, Math.min(totalUnits, occupiedUnits + netForecast));
  const projectedOccupancy = totalUnits > 0
    ? Math.round((projectedOccupied / totalUnits) * 1000) / 10
    : 0;

  return {
    forecastMoveIns: adjustedMoveIns,
    forecastOrganicOuts: organicOuts,
    forecastEcriChurn: Math.round(ecriChurnUnits * 10) / 10,
    forecastTotalOuts: totalOuts,
    netForecast,
    projectedOccupancy,
    projectedOccupancyDelta: Math.round((projectedOccupancy - currentOccPct) * 10) / 10,
    seasonalIndex,
    elasticityImpact: Math.round(elasticityImpact * 10) / 10,
    // Mock data phase: always LOW confidence
    confidence: 'LOW',
    confidenceLabel: 'Projected (industry estimate)',
  };
}

// ═══════════════════════════════════════════════════════
// NET REVENUE IMPACT (Links churn cost to increase gain)
// ═══════════════════════════════════════════════════════

export interface NetRevenueStory {
  grossMonthlyGain: number;
  expectedChurnLoss: number;
  netMonthlyGain: number;
  netAnnualGain: number;
  roiRatio: number;          // net gain / gross gain — how much of the increase you keep
  breakEvenMonths: number;   // months to recover lost revenue from churn
}

export function computeNetRevenueImpact(batch: BatchChurnForecast): NetRevenueStory {
  const gross = batch.grossRevenueGain;
  const loss = batch.revenueAtRisk;
  const net = gross - loss;
  const roi = gross > 0 ? net / gross : 0;

  // Break-even: if a tenant leaves, you lose their rent until backfilled.
  // Assume average 45-day vacancy for backfill.
  const avgMonthlyRent = batch.totalTenants > 0
    ? (batch.revenueAtRisk / batch.overallChurnRate) / batch.totalTenants
    : 0;
  const vacancyLoss = batch.expectedMoveOuts * avgMonthlyRent * 1.5; // 1.5 months vacancy
  const breakEvenMonths = net > 0 ? Math.ceil(vacancyLoss / net) : 99;

  return {
    grossMonthlyGain: gross,
    expectedChurnLoss: loss,
    netMonthlyGain: net,
    netAnnualGain: net * 12,
    roiRatio: Math.round(roi * 100) / 100,
    breakEvenMonths: Math.min(breakEvenMonths, 99),
  };
}

// ═══════════════════════════════════════════════════════
// UNIT GROUP CHURN ROLLUP (For projected occupancy on ECRI page)
// ═══════════════════════════════════════════════════════

export interface UnitGroupChurnSummary {
  unitGroup: string;
  tenantCount: number;
  expectedMoveOuts: number;
  currentOccupied: number;
  currentTotal: number;
  projectedOccupied: number;
  projectedOccupancyPct: number;
}

export function computeUnitGroupChurn(
  tenants: ECRITenant[],
): UnitGroupChurnSummary[] {
  const groups = new Map<string, {
    tenants: ECRITenant[];
    expectedOuts: number;
    occupied: number;
    total: number;
  }>();

  for (const t of tenants) {
    const entry = groups.get(t.unitGroup) ?? {
      tenants: [],
      expectedOuts: 0,
      occupied: t.unitGroupOccupied,
      total: t.unitGroupTotal,
    };
    const forecast = computeChurnProbability(t);
    entry.tenants.push(t);
    entry.expectedOuts += forecast.churnProbability;
    groups.set(t.unitGroup, entry);
  }

  const result: UnitGroupChurnSummary[] = [];
  for (const [unitGroup, data] of groups) {
    const projectedOccupied = Math.max(0, data.occupied - data.expectedOuts);
    result.push({
      unitGroup,
      tenantCount: data.tenants.length,
      expectedMoveOuts: Math.round(data.expectedOuts * 10) / 10,
      currentOccupied: data.occupied,
      currentTotal: data.total,
      projectedOccupied: Math.round(projectedOccupied * 10) / 10,
      projectedOccupancyPct: data.total > 0
        ? Math.round((projectedOccupied / data.total) * 1000) / 10
        : 0,
    });
  }

  return result;
}
