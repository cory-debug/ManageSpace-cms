// ═══════════════════════════════════════════════════════
// VACANT PRICING ENGINE — Business logic for weekly street rate decisions
// Based on Brian's workflow: activity signals + market signals + achieved gap
// ═══════════════════════════════════════════════════════

export type PricingMode = 'PRICE_TO_ACTIVITY' | 'PRICE_TO_MARKET' | 'BALANCED';
export type Signal = 'INCREASE' | 'DECREASE' | 'HOLD';
export type Confidence = 'HIGH' | 'MEDIUM';

export interface ActivityWindow {
  moveIns: number;
  moveOuts: number;
  net: number;
  trend: 'up' | 'down' | 'flat';
}

export interface VPCompetitor {
  name: string;
  tier: 'A' | 'B' | 'C';
  distance: number;
  rateForSize: number;
  lastSeen: string;
}

export interface PriceChange {
  date: string;
  previousRate: number;
  newRate: number;
  change: number;
  source: 'recommendation' | 'manual';
}

export interface MonthlySnapshot {
  month: string;
  occupancyPct: number;
  streetRate: number;
  achievedRate: number;
}

export interface VPRecommendation {
  direction: Signal;
  amount: number;
  newRate: number;
  confidence: Confidence;
  rationale: string;
  pricingMode: PricingMode;
  activitySignal: Signal;
  marketSignal: Signal;
  achievedSignal: Signal;
}

export interface VPUnitGroup {
  id: string;
  facilityId: string;
  name: string;
  unitSize: string;
  features: string;
  accessType: 'Ground' | 'Interior' | 'Drive-Up';
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPct: number;
  streetRate: number;
  achievedMedian: number;
  streetVsAchievedGap: number;
  activity: {
    day7: ActivityWindow;
    day14: ActivityWindow;
    day30: ActivityWindow;
  };
  competitors: VPCompetitor[];
  compWeightedAvg: number;
  lastChange: PriceChange | null;
  priceHistory: PriceChange[];
  hierarchyRank: number;
  recommendation: VPRecommendation;
  overrideRate: number | null;
  overrideReason: string;
  finalRate: number;
  hasAlert: boolean;
  alertReason: string;
}

export interface NonStorageUnit {
  id: string;
  facilityId: string;
  spaceName: string;
  tenantName: string;
  leaseType: 'Retail' | 'Office' | 'Warehouse' | 'Other';
  monthlyRent: number;
  leaseStart: string;
  leaseEnd: string;
  sqft: number;
  scheduledIncreases: { year: number; pct: number }[];
  status: 'Active' | 'Expiring Soon' | 'Expired';
  notes: string;
}

export const VP_OVERRIDE_REASONS = [
  'Competitor rate change',
  'Seasonal adjustment',
  'Lease-up / new facility',
  'DM judgment',
  'Market softening',
  'Hierarchy correction',
  'Promotion / special rate',
  'Other',
] as const;

export interface VPFacility {
  id: string;
  name: string;
  city: string;
  state: string;
  fund: string;
  totalUnits: number;
  occupiedUnits: number;
  vacantUnits: number;
  occupancyPct: number;
  occupancyTrend: 'up' | 'down' | 'flat';
  attentionCount: number;
  lastPriceChangeDate: string;
  monthlyHistory: MonthlySnapshot[];
  facilityActivity: {
    day7: ActivityWindow;
    day14: ActivityWindow;
    day30: ActivityWindow;
  };
}

// ═══════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════

export const TIER_WEIGHTS = { A: 1.0, B: 0.6, C: 0.25 } as const;

export const INCREMENT_TABLE: Record<string, { lowVol: number; highVol: number; threshold: number }> = {
  '5x5':   { lowVol: 5,  highVol: 3,  threshold: 10 },
  '5x10':  { lowVol: 10, highVol: 5,  threshold: 20 },
  '10x10': { lowVol: 15, highVol: 10, threshold: 20 },
  '10x15': { lowVol: 20, highVol: 10, threshold: 20 },
  '10x20': { lowVol: 30, highVol: 15, threshold: 20 },
  '10x30': { lowVol: 50, highVol: 20, threshold: 10 },
};

const ACCESS_RANK: Record<string, number> = {
  'Ground': 1,
  'Interior': 2,
  'Drive-Up': 3,
};

// ═══════════════════════════════════════════════════════
// ENGINE FUNCTIONS
// ═══════════════════════════════════════════════════════

export function getPricingMode(occupancyPct: number): PricingMode {
  if (occupancyPct > 90) return 'PRICE_TO_ACTIVITY';
  if (occupancyPct < 75) return 'PRICE_TO_MARKET';
  return 'BALANCED';
}

export function getActivitySignal(day7: ActivityWindow, day14: ActivityWindow): Signal {
  if (day7.net > 0 && day14.net > 0) return 'INCREASE';
  if (day7.net < 0 && day14.net < 0) return 'DECREASE';
  return 'HOLD';
}

export function getMarketSignal(streetRate: number, compWeightedAvg: number): Signal {
  if (compWeightedAvg <= 0) return 'HOLD';
  if (streetRate > compWeightedAvg * 1.10) return 'DECREASE';
  if (streetRate < compWeightedAvg * 0.95) return 'INCREASE';
  return 'HOLD';
}

export function getAchievedSignal(streetRate: number, achievedMedian: number): Signal {
  if (achievedMedian <= 0) return 'HOLD';
  if (streetRate < achievedMedian * 0.85) return 'INCREASE';
  return 'HOLD';
}

export function getBaseIncrement(unitSize: string, totalUnits: number): number {
  const entry = INCREMENT_TABLE[unitSize];
  if (!entry) return 10;
  return totalUnits >= entry.threshold ? entry.highVol : entry.lowVol;
}

export function computeCompAvg(competitors: VPCompetitor[]): number {
  if (competitors.length === 0) return 0;
  let weightedSum = 0;
  let totalWeight = 0;
  for (const comp of competitors) {
    const w = TIER_WEIGHTS[comp.tier];
    weightedSum += comp.rateForSize * w;
    totalWeight += w;
  }
  return totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;
}

export function recommendStreetRate(
  streetRate: number,
  achievedMedian: number,
  occupancyPct: number,
  unitSize: string,
  totalUnits: number,
  activity: { day7: ActivityWindow; day14: ActivityWindow },
  compWeightedAvg: number,
): VPRecommendation {
  const mode = getPricingMode(occupancyPct);
  const activitySignal = getActivitySignal(activity.day7, activity.day14);
  const marketSignal = getMarketSignal(streetRate, compWeightedAvg);
  const achievedSignal = getAchievedSignal(streetRate, achievedMedian);

  let primary: Signal;
  let secondary: Signal;

  if (mode === 'PRICE_TO_ACTIVITY') {
    primary = activitySignal;
    secondary = achievedSignal;
  } else if (mode === 'PRICE_TO_MARKET') {
    primary = marketSignal;
    secondary = activitySignal;
  } else {
    primary = activitySignal;
    secondary = marketSignal;
  }

  const baseIncrement = getBaseIncrement(unitSize, totalUnits);
  const confidence: Confidence = primary === secondary || secondary === 'HOLD' ? 'HIGH' : 'MEDIUM';

  let amount: number;
  let newRate: number;
  let rationale: string;

  if (primary === 'INCREASE') {
    amount = baseIncrement;
    newRate = streetRate + amount;
    rationale = mode === 'PRICE_TO_ACTIVITY'
      ? `Strong activity (7d: +${activity.day7.net}, 14d: +${activity.day14.net}). Pricing to demand.`
      : mode === 'PRICE_TO_MARKET'
        ? `Street rate below comp average ($${compWeightedAvg}). Increase to close gap.`
        : `Positive activity signals. Moderate increase recommended.`;
  } else if (primary === 'DECREASE') {
    amount = -baseIncrement;
    newRate = streetRate + amount;
    rationale = mode === 'PRICE_TO_ACTIVITY'
      ? `Declining activity (7d: ${activity.day7.net}, 14d: ${activity.day14.net}). Reduce to stimulate demand.`
      : mode === 'PRICE_TO_MARKET'
        ? `Street rate ${Math.round(((streetRate / compWeightedAvg) - 1) * 100)}% above comp average ($${compWeightedAvg}). Reduce to stay competitive.`
        : `Negative activity trend. Moderate decrease recommended.`;
  } else {
    amount = 0;
    newRate = streetRate;
    rationale = 'Activity stable and rate competitively positioned. Hold current rate.';
  }

  if (achievedSignal === 'INCREASE' && primary !== 'DECREASE') {
    rationale += ` Street rate ${Math.round(((1 - streetRate / achievedMedian)) * 100)}% below achieved ($${achievedMedian}) — gap closure opportunity.`;
  }

  return {
    direction: primary,
    amount,
    newRate,
    confidence,
    rationale,
    pricingMode: mode,
    activitySignal,
    marketSignal,
    achievedSignal,
  };
}

export interface HierarchyViolation {
  groupId: string;
  groupName: string;
  violatesGroupId: string;
  violatesGroupName: string;
  reason: string;
}

export function checkHierarchyViolations(unitGroups: VPUnitGroup[]): HierarchyViolation[] {
  const violations: HierarchyViolation[] = [];
  const sizeGroups = new Map<string, VPUnitGroup[]>();

  for (const g of unitGroups) {
    if (!sizeGroups.has(g.unitSize)) sizeGroups.set(g.unitSize, []);
    sizeGroups.get(g.unitSize)!.push(g);
  }

  for (const [, groups] of sizeGroups) {
    if (groups.length < 2) continue;
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const a = groups[i];
        const b = groups[j];
        const rankA = ACCESS_RANK[a.accessType] ?? 99;
        const rankB = ACCESS_RANK[b.accessType] ?? 99;
        const rateA = a.overrideRate ?? a.finalRate;
        const rateB = b.overrideRate ?? b.finalRate;

        if (rankA < rankB && rateA < rateB) {
          violations.push({
            groupId: b.id,
            groupName: b.name,
            violatesGroupId: a.id,
            violatesGroupName: a.name,
            reason: `${b.name} ($${rateB}) priced above ${a.name} ($${rateA})`,
          });
        } else if (rankB < rankA && rateB < rateA) {
          violations.push({
            groupId: a.id,
            groupName: a.name,
            violatesGroupId: b.id,
            violatesGroupName: b.name,
            reason: `${a.name} ($${rateA}) priced above ${b.name} ($${rateB})`,
          });
        }
      }
    }
  }

  return violations;
}

export function get90DayTrend(history: MonthlySnapshot[]): 'up' | 'down' | 'flat' {
  if (history.length < 3) return 'flat';
  const recent = history.slice(-3);
  const first = recent[0].occupancyPct;
  const last = recent[recent.length - 1].occupancyPct;
  const diff = last - first;
  if (diff > 2) return 'up';
  if (diff < -2) return 'down';
  return 'flat';
}

export function generateMonthlyHistory(
  baseOcc: number,
  baseStreet: number,
  baseAchieved: number,
  months: number = 36,
): MonthlySnapshot[] {
  const result: MonthlySnapshot[] = [];
  const now = new Date(2026, 1, 1); // Feb 2026

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthIdx = d.getMonth();
    const yearOffset = (months - 1 - i) / 12;

    // Seasonal curve: peaks Jun-Aug, dips Dec-Feb
    const seasonal = [
      -4, -3, -1, 2, 5, 7,  // Jan-Jun
      7, 6, 3, 0, -2, -4,    // Jul-Dec
    ][monthIdx];

    // Gradual improvement over time (~2% per year)
    const trend = yearOffset * 2;

    // Small random-ish variation using deterministic function
    const jitter = Math.sin(i * 7.3) * 1.5;

    const occ = Math.max(55, Math.min(98, baseOcc + seasonal + trend + jitter));
    const street = Math.round(baseStreet * (1 + yearOffset * 0.03) + Math.sin(i * 3.1) * 3);
    const achieved = Math.round(baseAchieved * (1 + yearOffset * 0.025) + Math.sin(i * 2.7) * 4);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    result.push({
      month: `${monthNames[monthIdx]} ${d.getFullYear() % 100}`,
      occupancyPct: Math.round(occ * 10) / 10,
      streetRate: Math.max(50, street),
      achievedRate: Math.max(street + 5, achieved),
    });
  }

  return result;
}

export function buildActivityWindow(moveIns: number, moveOuts: number): ActivityWindow {
  const net = moveIns - moveOuts;
  return {
    moveIns,
    moveOuts,
    net,
    trend: net > 0 ? 'up' : net < 0 ? 'down' : 'flat',
  };
}
