import { describe, it, expect } from 'vitest';
import {
  getPricingMode,
  getActivitySignal,
  getMarketSignal,
  getAchievedSignal,
  getBaseIncrement,
  computeCompAvg,
  recommendStreetRate,
  checkHierarchyViolations,
  get90DayTrend,
  generateMonthlyHistory,
  buildActivityWindow,
  type VPUnitGroup,
  type VPCompetitor,
  type ActivityWindow,
  type MonthlySnapshot,
  INCREMENT_TABLE,
  TIER_WEIGHTS,
} from './vacant-pricing-engine';

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

function makeActivity(net7: number, net14: number): { day7: ActivityWindow; day14: ActivityWindow } {
  return {
    day7: buildActivityWindow(Math.max(0, net7), Math.max(0, -net7)),
    day14: buildActivityWindow(Math.max(0, net14), Math.max(0, -net14)),
  };
}

function makeUnitGroup(overrides: Partial<VPUnitGroup> & { id: string; facilityId: string }): VPUnitGroup {
  const defaults: VPUnitGroup = {
    id: 'ug1',
    facilityId: 'f1',
    name: '10x10 CC Ground',
    unitSize: '10x10',
    features: 'CC',
    accessType: 'Ground',
    totalUnits: 30,
    occupiedUnits: 27,
    vacantUnits: 3,
    occupancyPct: 90,
    streetRate: 150,
    achievedMedian: 170,
    streetVsAchievedGap: -0.12,
    activity: {
      day7: buildActivityWindow(3, 1),
      day14: buildActivityWindow(5, 3),
      day30: buildActivityWindow(10, 8),
    },
    competitors: [],
    compWeightedAvg: 145,
    lastChange: null,
    priceHistory: [],
    hierarchyRank: 1,
    recommendation: { direction: 'HOLD', amount: 0, newRate: 150, confidence: 'HIGH', rationale: '', pricingMode: 'BALANCED', activitySignal: 'HOLD', marketSignal: 'HOLD', achievedSignal: 'HOLD' },
    overrideRate: null,
    finalRate: 150,
    hasAlert: false,
    alertReason: '',
  };
  return { ...defaults, ...overrides };
}

// ═══════════════════════════════════════════════════════
// getPricingMode
// ═══════════════════════════════════════════════════════

describe('getPricingMode', () => {
  it('returns PRICE_TO_ACTIVITY when occupancy > 90%', () => {
    expect(getPricingMode(91)).toBe('PRICE_TO_ACTIVITY');
    expect(getPricingMode(95)).toBe('PRICE_TO_ACTIVITY');
    expect(getPricingMode(100)).toBe('PRICE_TO_ACTIVITY');
  });

  it('returns PRICE_TO_MARKET when occupancy < 75%', () => {
    expect(getPricingMode(74)).toBe('PRICE_TO_MARKET');
    expect(getPricingMode(50)).toBe('PRICE_TO_MARKET');
    expect(getPricingMode(0)).toBe('PRICE_TO_MARKET');
  });

  it('returns BALANCED for 75-90%', () => {
    expect(getPricingMode(75)).toBe('BALANCED');
    expect(getPricingMode(82)).toBe('BALANCED');
    expect(getPricingMode(90)).toBe('BALANCED');
  });

  it('boundary: 90% is BALANCED, 90.01% is PRICE_TO_ACTIVITY', () => {
    expect(getPricingMode(90)).toBe('BALANCED');
    expect(getPricingMode(90.1)).toBe('PRICE_TO_ACTIVITY');
  });

  it('boundary: 75% is BALANCED, 74.99% is PRICE_TO_MARKET', () => {
    expect(getPricingMode(75)).toBe('BALANCED');
    expect(getPricingMode(74.9)).toBe('PRICE_TO_MARKET');
  });
});

// ═══════════════════════════════════════════════════════
// getActivitySignal
// ═══════════════════════════════════════════════════════

describe('getActivitySignal', () => {
  it('returns INCREASE when both 7d and 14d are positive', () => {
    const a = makeActivity(2, 3);
    expect(getActivitySignal(a.day7, a.day14)).toBe('INCREASE');
  });

  it('returns DECREASE when both 7d and 14d are negative', () => {
    const a = makeActivity(-2, -1);
    expect(getActivitySignal(a.day7, a.day14)).toBe('DECREASE');
  });

  it('returns HOLD when mixed signals', () => {
    const a = makeActivity(2, -1);
    expect(getActivitySignal(a.day7, a.day14)).toBe('HOLD');
  });

  it('returns HOLD when 7d positive but 14d zero', () => {
    const a = makeActivity(2, 0);
    expect(getActivitySignal(a.day7, a.day14)).toBe('HOLD');
  });

  it('returns HOLD when both zero', () => {
    const a = makeActivity(0, 0);
    expect(getActivitySignal(a.day7, a.day14)).toBe('HOLD');
  });
});

// ═══════════════════════════════════════════════════════
// getMarketSignal
// ═══════════════════════════════════════════════════════

describe('getMarketSignal', () => {
  it('returns DECREASE when street > 110% of comp avg', () => {
    expect(getMarketSignal(112, 100)).toBe('DECREASE');
    expect(getMarketSignal(200, 150)).toBe('DECREASE');
  });

  it('returns INCREASE when street < 95% of comp avg', () => {
    expect(getMarketSignal(94, 100)).toBe('INCREASE');
    expect(getMarketSignal(80, 100)).toBe('INCREASE');
  });

  it('returns HOLD when street is 95-110% of comp avg', () => {
    expect(getMarketSignal(100, 100)).toBe('HOLD');
    expect(getMarketSignal(105, 100)).toBe('HOLD');
    expect(getMarketSignal(95, 100)).toBe('HOLD');
  });

  it('returns HOLD when comp avg is zero', () => {
    expect(getMarketSignal(100, 0)).toBe('HOLD');
  });

  it('boundary: exactly 110% returns HOLD', () => {
    expect(getMarketSignal(110, 100)).toBe('HOLD');
  });

  it('boundary: exactly 95% returns HOLD', () => {
    expect(getMarketSignal(95, 100)).toBe('HOLD');
  });
});

// ═══════════════════════════════════════════════════════
// getAchievedSignal
// ═══════════════════════════════════════════════════════

describe('getAchievedSignal', () => {
  it('returns INCREASE when street < 85% of achieved', () => {
    expect(getAchievedSignal(84, 100)).toBe('INCREASE');
    expect(getAchievedSignal(50, 100)).toBe('INCREASE');
  });

  it('returns HOLD when street >= 85% of achieved', () => {
    expect(getAchievedSignal(85, 100)).toBe('HOLD');
    expect(getAchievedSignal(100, 100)).toBe('HOLD');
    expect(getAchievedSignal(120, 100)).toBe('HOLD');
  });

  it('returns HOLD when achieved is zero', () => {
    expect(getAchievedSignal(100, 0)).toBe('HOLD');
  });
});

// ═══════════════════════════════════════════════════════
// getBaseIncrement
// ═══════════════════════════════════════════════════════

describe('getBaseIncrement', () => {
  it('returns correct increment for each unit size at low volume', () => {
    expect(getBaseIncrement('5x5', 5)).toBe(5);
    expect(getBaseIncrement('5x10', 10)).toBe(10);
    expect(getBaseIncrement('10x10', 15)).toBe(15);
    expect(getBaseIncrement('10x15', 10)).toBe(20);
    expect(getBaseIncrement('10x20', 15)).toBe(30);
    expect(getBaseIncrement('10x30', 5)).toBe(50);
  });

  it('returns correct increment for each unit size at high volume', () => {
    expect(getBaseIncrement('5x5', 10)).toBe(3);
    expect(getBaseIncrement('5x10', 20)).toBe(5);
    expect(getBaseIncrement('10x10', 25)).toBe(10);
    expect(getBaseIncrement('10x15', 30)).toBe(10);
    expect(getBaseIncrement('10x20', 20)).toBe(15);
    expect(getBaseIncrement('10x30', 10)).toBe(20);
  });

  it('returns default 10 for unknown unit size', () => {
    expect(getBaseIncrement('7x7', 20)).toBe(10);
    expect(getBaseIncrement('unknown', 5)).toBe(10);
  });
});

// ═══════════════════════════════════════════════════════
// computeCompAvg
// ═══════════════════════════════════════════════════════

describe('computeCompAvg', () => {
  it('returns 0 for empty competitors', () => {
    expect(computeCompAvg([])).toBe(0);
  });

  it('returns exact rate for single A-tier comp', () => {
    const comps: VPCompetitor[] = [
      { name: 'Test', tier: 'A', distance: 1, rateForSize: 150, lastSeen: 'Jan 26' },
    ];
    expect(computeCompAvg(comps)).toBe(150);
  });

  it('weights by tier correctly', () => {
    const comps: VPCompetitor[] = [
      { name: 'A Comp', tier: 'A', distance: 1, rateForSize: 200, lastSeen: 'Jan 26' },
      { name: 'C Comp', tier: 'C', distance: 3, rateForSize: 100, lastSeen: 'Jan 26' },
    ];
    // (200*1.0 + 100*0.25) / (1.0 + 0.25) = 225/1.25 = 180
    expect(computeCompAvg(comps)).toBe(180);
  });

  it('all three tiers weighted correctly', () => {
    const comps: VPCompetitor[] = [
      { name: 'A', tier: 'A', distance: 1, rateForSize: 150, lastSeen: '' },
      { name: 'B', tier: 'B', distance: 2, rateForSize: 130, lastSeen: '' },
      { name: 'C', tier: 'C', distance: 3, rateForSize: 100, lastSeen: '' },
    ];
    // (150*1.0 + 130*0.6 + 100*0.25) / (1.0+0.6+0.25) = (150+78+25)/1.85 = 253/1.85 ≈ 137
    expect(computeCompAvg(comps)).toBe(137);
  });
});

// ═══════════════════════════════════════════════════════
// recommendStreetRate — Integration
// ═══════════════════════════════════════════════════════

describe('recommendStreetRate', () => {
  it('recommends INCREASE for high-occ with positive activity', () => {
    const activity = makeActivity(3, 2);
    const reco = recommendStreetRate(134, 154, 92, '10x10', 50, activity, 145);
    expect(reco.direction).toBe('INCREASE');
    expect(reco.pricingMode).toBe('PRICE_TO_ACTIVITY');
    expect(reco.amount).toBe(10); // 10x10 high-vol
    expect(reco.newRate).toBe(144);
    expect(reco.confidence).toBe('HIGH');
  });

  it('recommends DECREASE for low-occ with street above comps', () => {
    const activity = makeActivity(-1, -2);
    const reco = recommendStreetRate(259, 290, 69, '10x30', 26, activity, 220);
    expect(reco.direction).toBe('DECREASE');
    expect(reco.pricingMode).toBe('PRICE_TO_MARKET');
    expect(reco.amount).toBeLessThan(0);
  });

  it('recommends HOLD for balanced occupancy with mixed signals', () => {
    const activity = makeActivity(1, -1);
    const reco = recommendStreetRate(199, 222, 84, '10x20', 50, activity, 195);
    expect(reco.direction).toBe('HOLD');
    expect(reco.amount).toBe(0);
    expect(reco.newRate).toBe(199);
  });

  it('includes achieved gap note when street far below achieved', () => {
    const activity = makeActivity(2, 1);
    const reco = recommendStreetRate(80, 120, 92, '5x10', 30, activity, 100);
    expect(reco.direction).toBe('INCREASE');
    expect(reco.rationale).toContain('gap closure');
  });

  it('returns HIGH confidence when secondary agrees or is HOLD', () => {
    const activity = makeActivity(2, 2);
    const reco = recommendStreetRate(100, 120, 92, '10x10', 30, activity, 105);
    expect(reco.confidence).toBe('HIGH');
  });

  it('returns MEDIUM confidence when primary and secondary disagree', () => {
    // PRICE_TO_MARKET mode: primary=market, secondary=activity
    // market says INCREASE (street < 95% of comp), activity says DECREASE
    const activity = makeActivity(-2, -1);
    const reco = recommendStreetRate(90, 100, 70, '10x10', 20, activity, 100);
    // Primary = marketSignal = INCREASE (90 < 95), secondary = activitySignal = DECREASE
    expect(reco.confidence).toBe('MEDIUM');
  });

  it('handles zero comp average gracefully', () => {
    const activity = makeActivity(1, 1);
    const reco = recommendStreetRate(100, 120, 85, '10x10', 20, activity, 0);
    expect(reco.direction).toBeDefined();
    expect(reco.newRate).toBeGreaterThan(0);
  });
});

// ═══════════════════════════════════════════════════════
// checkHierarchyViolations
// ═══════════════════════════════════════════════════════

describe('checkHierarchyViolations', () => {
  it('returns no violations for correctly ordered groups', () => {
    const groups = [
      makeUnitGroup({ id: 'g1', facilityId: 'f1', unitSize: '10x10', accessType: 'Ground', finalRate: 150, overrideRate: null }),
      makeUnitGroup({ id: 'g2', facilityId: 'f1', unitSize: '10x10', accessType: 'Interior', finalRate: 130, overrideRate: null }),
      makeUnitGroup({ id: 'g3', facilityId: 'f1', unitSize: '10x10', accessType: 'Drive-Up', finalRate: 110, overrideRate: null }),
    ];
    expect(checkHierarchyViolations(groups)).toHaveLength(0);
  });

  it('detects violation when drive-up priced above ground', () => {
    const groups = [
      makeUnitGroup({ id: 'g1', facilityId: 'f1', name: '10x10 CC Ground', unitSize: '10x10', accessType: 'Ground', finalRate: 100, overrideRate: null }),
      makeUnitGroup({ id: 'g2', facilityId: 'f1', name: '10x10 CC Drive-Up', unitSize: '10x10', accessType: 'Drive-Up', finalRate: 120, overrideRate: null }),
    ];
    const violations = checkHierarchyViolations(groups);
    expect(violations).toHaveLength(1);
    expect(violations[0].reason).toContain('Drive-Up');
    expect(violations[0].reason).toContain('Ground');
  });

  it('does not compare across different unit sizes', () => {
    const groups = [
      makeUnitGroup({ id: 'g1', facilityId: 'f1', unitSize: '5x5', accessType: 'Ground', finalRate: 65, overrideRate: null }),
      makeUnitGroup({ id: 'g2', facilityId: 'f1', unitSize: '10x20', accessType: 'Drive-Up', finalRate: 200, overrideRate: null }),
    ];
    expect(checkHierarchyViolations(groups)).toHaveLength(0);
  });

  it('returns empty for single unit group', () => {
    const groups = [
      makeUnitGroup({ id: 'g1', facilityId: 'f1' }),
    ];
    expect(checkHierarchyViolations(groups)).toHaveLength(0);
  });

  it('detects interior priced above ground', () => {
    const groups = [
      makeUnitGroup({ id: 'g1', facilityId: 'f1', unitSize: '10x10', accessType: 'Ground', finalRate: 100, overrideRate: null }),
      makeUnitGroup({ id: 'g2', facilityId: 'f1', unitSize: '10x10', accessType: 'Interior', finalRate: 120, overrideRate: null }),
    ];
    expect(checkHierarchyViolations(groups)).toHaveLength(1);
  });
});

// ═══════════════════════════════════════════════════════
// get90DayTrend
// ═══════════════════════════════════════════════════════

describe('get90DayTrend', () => {
  it('returns up when occupancy increased > 2%', () => {
    const history: MonthlySnapshot[] = [
      { month: 'Dec 25', occupancyPct: 80, streetRate: 100, achievedRate: 120 },
      { month: 'Jan 26', occupancyPct: 82, streetRate: 100, achievedRate: 120 },
      { month: 'Feb 26', occupancyPct: 85, streetRate: 100, achievedRate: 120 },
    ];
    expect(get90DayTrend(history)).toBe('up');
  });

  it('returns down when occupancy decreased > 2%', () => {
    const history: MonthlySnapshot[] = [
      { month: 'Dec 25', occupancyPct: 90, streetRate: 100, achievedRate: 120 },
      { month: 'Jan 26', occupancyPct: 88, streetRate: 100, achievedRate: 120 },
      { month: 'Feb 26', occupancyPct: 85, streetRate: 100, achievedRate: 120 },
    ];
    expect(get90DayTrend(history)).toBe('down');
  });

  it('returns flat when change <= 2%', () => {
    const history: MonthlySnapshot[] = [
      { month: 'Dec 25', occupancyPct: 85, streetRate: 100, achievedRate: 120 },
      { month: 'Jan 26', occupancyPct: 86, streetRate: 100, achievedRate: 120 },
      { month: 'Feb 26', occupancyPct: 86, streetRate: 100, achievedRate: 120 },
    ];
    expect(get90DayTrend(history)).toBe('flat');
  });

  it('returns flat for < 3 months of data', () => {
    expect(get90DayTrend([])).toBe('flat');
    expect(get90DayTrend([{ month: 'Jan 26', occupancyPct: 80, streetRate: 100, achievedRate: 120 }])).toBe('flat');
  });
});

// ═══════════════════════════════════════════════════════
// generateMonthlyHistory
// ═══════════════════════════════════════════════════════

describe('generateMonthlyHistory', () => {
  it('generates correct number of months', () => {
    expect(generateMonthlyHistory(85, 150, 170, 36)).toHaveLength(36);
    expect(generateMonthlyHistory(85, 150, 170, 12)).toHaveLength(12);
  });

  it('has seasonal variation (summer > winter)', () => {
    const history = generateMonthlyHistory(85, 150, 170, 36);
    const juneEntries = history.filter(h => h.month.startsWith('Jun'));
    const decEntries = history.filter(h => h.month.startsWith('Dec'));
    if (juneEntries.length > 0 && decEntries.length > 0) {
      const avgJune = juneEntries.reduce((s, h) => s + h.occupancyPct, 0) / juneEntries.length;
      const avgDec = decEntries.reduce((s, h) => s + h.occupancyPct, 0) / decEntries.length;
      expect(avgJune).toBeGreaterThan(avgDec);
    }
  });

  it('achieved rate is always >= street rate', () => {
    const history = generateMonthlyHistory(85, 150, 170, 36);
    for (const h of history) {
      expect(h.achievedRate).toBeGreaterThanOrEqual(h.streetRate);
    }
  });

  it('occupancy stays within reasonable bounds', () => {
    const history = generateMonthlyHistory(85, 150, 170, 36);
    for (const h of history) {
      expect(h.occupancyPct).toBeGreaterThanOrEqual(55);
      expect(h.occupancyPct).toBeLessThanOrEqual(98);
    }
  });
});

// ═══════════════════════════════════════════════════════
// buildActivityWindow
// ═══════════════════════════════════════════════════════

describe('buildActivityWindow', () => {
  it('computes net and trend correctly', () => {
    const w = buildActivityWindow(5, 2);
    expect(w.net).toBe(3);
    expect(w.trend).toBe('up');
  });

  it('returns down trend for negative net', () => {
    const w = buildActivityWindow(1, 4);
    expect(w.net).toBe(-3);
    expect(w.trend).toBe('down');
  });

  it('returns flat trend for zero net', () => {
    const w = buildActivityWindow(3, 3);
    expect(w.net).toBe(0);
    expect(w.trend).toBe('flat');
  });
});

// ═══════════════════════════════════════════════════════
// Constants
// ═══════════════════════════════════════════════════════

describe('Constants', () => {
  it('INCREMENT_TABLE has entries for all standard sizes', () => {
    const sizes = ['5x5', '5x10', '10x10', '10x15', '10x20', '10x30'];
    for (const s of sizes) {
      expect(INCREMENT_TABLE[s]).toBeDefined();
      expect(INCREMENT_TABLE[s].lowVol).toBeGreaterThan(0);
      expect(INCREMENT_TABLE[s].highVol).toBeGreaterThan(0);
      expect(INCREMENT_TABLE[s].lowVol).toBeGreaterThanOrEqual(INCREMENT_TABLE[s].highVol);
    }
  });

  it('TIER_WEIGHTS follow A > B > C ordering', () => {
    expect(TIER_WEIGHTS.A).toBeGreaterThan(TIER_WEIGHTS.B);
    expect(TIER_WEIGHTS.B).toBeGreaterThan(TIER_WEIGHTS.C);
  });
});
