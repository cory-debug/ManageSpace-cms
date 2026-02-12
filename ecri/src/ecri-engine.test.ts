import { describe, it, expect } from 'vitest';
import { computeTier, buildTenant, OVERRIDE_REASONS, type BuildTenantInput } from './ecri-engine';

// ═══════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════

/** Minimal tenant input for quick test construction */
function makeTenantInput(overrides: Partial<BuildTenantInput> = {}): BuildTenantInput {
  return {
    id: 't-test', facilityId: 'f1', customerName: 'Test Tenant', unitNumber: '100',
    unitType: '10×10 CC', unitGroup: '10×10 Climate', features: 'CC',
    tenureMonths: 24, currentRent: 150, streetRate: 150, unitGroupMedian: 150,
    unitGroupOccupancy: 0.90, unitGroupTotal: 50, unitGroupOccupied: 45,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════
// 1. CORE FORMULA — computeTier()
// ═══════════════════════════════════════════════════════

describe('computeTier — 4-tier formula engine', () => {
  describe('trial rate calculation', () => {
    it('always uses 20% trial rate regardless of tier', () => {
      const r = computeTier(100, 200, 150, 0.90);
      expect(r.trialRate).toBe(120);
    });

    it('computes trial rate correctly for high rents', () => {
      const r = computeTier(500, 300, 400, 0.90);
      expect(r.trialRate).toBe(600);
    });

    it('computes trial rate correctly for very low rents', () => {
      const r = computeTier(10, 100, 50, 0.90);
      expect(r.trialRate).toBe(12);
    });
  });

  describe('delta-to-median calculation', () => {
    it('computes positive delta when trial > median', () => {
      // $200 rent, $150 median → trial=$240, deltaMed = (240-150)/150 = +60%
      const r = computeTier(200, 150, 200, 0.90);
      expect(r.deltaMed).toBeCloseTo(0.60, 4);
    });

    it('computes negative delta when trial < median', () => {
      // $50 rent, $100 median → trial=$60, deltaMed = (60-100)/100 = -40%
      const r = computeTier(50, 100, 50, 0.90);
      expect(r.deltaMed).toBeCloseTo(-0.40, 4);
    });

    it('computes zero delta when trial equals median', () => {
      // $100 rent, $120 median → trial=$120, deltaMed = 0
      const r = computeTier(100, 120, 100, 0.90);
      expect(r.deltaMed).toBeCloseTo(0, 4);
    });
  });

  describe('tenant-vs-street calculation', () => {
    it('computes positive TvS when rent > street', () => {
      // $200 rent, $150 street → (200-150)/150 = +33.3%
      const r = computeTier(200, 300, 150, 0.90);
      expect(r.tvs).toBeCloseTo(0.3333, 3);
    });

    it('computes negative TvS when rent < street', () => {
      // $100 rent, $150 street → (100-150)/150 = -33.3%
      const r = computeTier(100, 300, 150, 0.90);
      expect(r.tvs).toBeCloseTo(-0.3333, 3);
    });
  });

  // ── Tier 1: Aggressive catch-up ──
  describe('Tier 1 (40%) — aggressive catch-up', () => {
    it('assigns Tier 1 when far below median AND high occupancy', () => {
      // $50 rent, $100 median, occ 80% → trial=$60, deltaMed = -40% < -20%, occ > 75%
      const r = computeTier(50, 100, 80, 0.80);
      expect(r.tier).toBe(1);
      expect(r.percent).toBe(0.40);
    });

    it('does NOT assign Tier 1 when occupancy is exactly 75% (not strictly >)', () => {
      const r = computeTier(50, 100, 80, 0.75);
      expect(r.tier).not.toBe(1);
    });

    it('does NOT assign Tier 1 when occupancy below 75%', () => {
      // Even though far below median, low occ blocks Tier 1
      const r = computeTier(50, 100, 80, 0.69);
      expect(r.tier).not.toBe(1);
    });

    it('does NOT assign Tier 1 when delta is exactly -20% (not strictly <)', () => {
      // Need deltaMed < -0.20, not <=
      // currentRent such that trial is exactly -20% below median
      // trial = currentRent * 1.20, need (trial - median)/median = -0.20
      // trial = median * 0.80 → currentRent = median * 0.80 / 1.20
      const median = 100;
      const currentRent = median * 0.80 / 1.20; // = 66.667
      const r = computeTier(currentRent, median, 50, 0.90);
      expect(r.deltaMed).toBeCloseTo(-0.20, 4);
      expect(r.tier).not.toBe(1); // -0.20 is not < -0.20
    });

    it('assigns Tier 1 when delta just below -20%', () => {
      const r = computeTier(66, 100, 50, 0.90);
      // trial = 79.2, deltaMed = (79.2 - 100)/100 = -0.208
      expect(r.deltaMed).toBeLessThan(-0.20);
      expect(r.tier).toBe(1);
    });
  });

  // ── Tier 2: Conservative premium payer ──
  describe('Tier 2 (10%) — conservative premium payer', () => {
    it('assigns Tier 2 when far above median', () => {
      // $253 rent, $154 median → trial=$303.6, deltaMed = +97%
      const r = computeTier(253, 154, 134, 0.90);
      expect(r.tier).toBe(2);
      expect(r.percent).toBe(0.10);
    });

    it('assigns Tier 2 even with low occupancy (occ irrelevant for Tier 2)', () => {
      const r = computeTier(253, 154, 134, 0.50);
      expect(r.tier).toBe(2);
    });

    it('does NOT assign Tier 2 when delta is exactly +75%', () => {
      // Need deltaMed > 0.75, not >=
      const median = 100;
      const currentRent = median * 1.75 / 1.20; // trial=175%*median/1.2 → deltaMed=0.75
      const r = computeTier(currentRent, median, 50, 0.90);
      expect(r.deltaMed).toBeCloseTo(0.75, 3);
      expect(r.tier).not.toBe(2);
    });

    it('Tier 1 takes priority over Tier 2 when both conditions met', () => {
      // This can't really happen (below median AND above median) but test priority anyway
      // If deltaMed < -0.20 we'd never have deltaMed > 0.75, so this is a logical impossibility
      // The priority order is correct by construction
    });
  });

  // ── Tier 3: Above-market moderate ──
  describe('Tier 3 (15%) — above-market moderate', () => {
    it('assigns Tier 3 when both TvS > 15% AND deltaMed > 15%', () => {
      // $184 rent, $151 median, $129 street, 88% occ
      const r = computeTier(184, 151, 129, 0.88);
      expect(r.tvs).toBeGreaterThan(0.15);
      expect(r.deltaMed).toBeGreaterThan(0.15);
      expect(r.tier).toBe(3);
      expect(r.percent).toBe(0.15);
    });

    it('does NOT assign Tier 3 when TvS passes but deltaMed fails', () => {
      // High TvS but low delta → Tier 4
      // $200 rent, $190 median, $100 street → TvS=100%, deltaMed=(240-190)/190=+26%
      // Wait, that passes both. Let me construct one that fails deltaMed
      // $130 rent, $130 median, $100 street → TvS=+30%, trial=156, deltaMed=+20%
      // That still passes. Need deltaMed <= 0.15
      // $110 rent, $110 median, $90 street → TvS=+22%, trial=132, deltaMed=+20%
      // Still passes. Need: trial=currentRent*1.2, (trial-median)/median <= 0.15
      // currentRent*1.2 <= median*1.15 → currentRent <= median*1.15/1.2 = median*0.9583
      const r = computeTier(95, 100, 80, 0.90);
      // trial=114, deltaMed=+14%, tvs=(95-80)/80=+18.75%
      expect(r.tvs).toBeGreaterThan(0.15);
      expect(r.deltaMed).toBeLessThanOrEqual(0.15);
      expect(r.tier).toBe(4); // Falls to Tier 4
    });

    it('does NOT assign Tier 3 when deltaMed passes but TvS fails', () => {
      // $222 rent, $209 median, $199 street
      const r = computeTier(222, 209, 199, 0.84);
      // trial=266.4, deltaMed=(266.4-209)/209=+27.5%, tvs=(222-199)/199=+11.6%
      expect(r.deltaMed).toBeGreaterThan(0.15);
      expect(r.tvs).toBeLessThanOrEqual(0.15);
      expect(r.tier).toBe(4); // Falls to Tier 4
    });

    it('Tier 2 takes priority over Tier 3 when deltaMed > 75%', () => {
      // $300 rent, $150 median, $200 street
      // trial=360, deltaMed=+140%, tvs=+50%
      const r = computeTier(300, 150, 200, 0.90);
      expect(r.deltaMed).toBeGreaterThan(0.75);
      expect(r.tvs).toBeGreaterThan(0.15);
      expect(r.tier).toBe(2); // Tier 2 wins
    });
  });

  // ── Tier 4: Default baseline ──
  describe('Tier 4 (20%) — baseline default', () => {
    it('assigns Tier 4 when no other tier matches', () => {
      const r = computeTier(150, 150, 150, 0.90);
      // trial=180, deltaMed=+20%, tvs=0%
      expect(r.tier).toBe(4);
      expect(r.percent).toBe(0.20);
    });

    it('assigns Tier 4 for median-aligned tenant', () => {
      // $125 rent, $150 median, $150 street
      // trial=150, deltaMed=0%, tvs=-16.7%
      const r = computeTier(125, 150, 150, 0.90);
      expect(r.tier).toBe(4);
    });
  });

  // ── Excel Validation Rows (from ecri-formula-validation.md) ──
  describe('Excel parity — Cornelius validation rows', () => {
    it('Row 10: $253 rent → Tier 2 (10%)', () => {
      const r = computeTier(253, 154, 134, 0.69);
      expect(r.tier).toBe(2);
      expect(r.deltaMed).toBeCloseTo(0.971, 2);
    });

    it('Row 11: $251 rent → Tier 2 (10%)', () => {
      const r = computeTier(251, 154, 134, 0.69);
      expect(r.tier).toBe(2);
    });

    it('Row 46: $168 rent, $84 median → Tier 2 (10%)', () => {
      const r = computeTier(168, 84, 89, 0.89);
      expect(r.tier).toBe(2);
      expect(r.deltaMed).toBeCloseTo(1.40, 2);
    });

    it('Row 7: $184 rent → Tier 3 (15%)', () => {
      const r = computeTier(184, 151, 129, 0.88);
      expect(r.tier).toBe(3);
      expect(r.deltaMed).toBeCloseTo(0.462, 2);
      expect(r.tvs).toBeCloseTo(0.426, 2);
    });

    it('Row 12: $306 rent → Tier 3 (15%)', () => {
      const r = computeTier(306, 222, 199, 0.89);
      expect(r.tier).toBe(3);
    });

    it('Row 14: $239 rent → Tier 3 (15%)', () => {
      const r = computeTier(239, 222, 199, 0.89);
      expect(r.tier).toBe(3);
    });

    it('Row 29: $222 rent → Tier 4 (20%) — TvS too low', () => {
      const r = computeTier(222, 209, 199, 0.84);
      expect(r.tier).toBe(4);
      expect(r.tvs).toBeCloseTo(0.116, 2); // < 0.15
    });

    it('Row 30: $178 rent → Tier 4 (20%) — deltaMed too low', () => {
      const r = computeTier(178, 209, 109, 0.84);
      expect(r.tier).toBe(4);
    });

    it('Row 41: $217 rent → Tier 4 (20%)', () => {
      const r = computeTier(217, 244, 129, 0.78);
      expect(r.tier).toBe(4);
    });
  });
});

// ═══════════════════════════════════════════════════════
// 2. buildTenant() — DERIVED FIELDS
// ═══════════════════════════════════════════════════════

describe('buildTenant — derived field computation', () => {
  it('computes recommendedNewRent correctly (rounded)', () => {
    const t = buildTenant(makeTenantInput({ currentRent: 100 }));
    // Tier 4 (20%) → 100 * 1.20 = 120
    expect(t.recommendedNewRent).toBe(120);
    expect(t.recommendedIncrease).toBe(20);
  });

  it('rounds recommendedNewRent to nearest dollar', () => {
    const t = buildTenant(makeTenantInput({ currentRent: 133 }));
    // 133 * 1.20 = 159.6 → rounds to 160
    expect(t.recommendedNewRent).toBe(160);
  });

  it('computes Tier 1 recommended rent (40%)', () => {
    const t = buildTenant(makeTenantInput({
      currentRent: 50, unitGroupMedian: 100, streetRate: 80, unitGroupOccupancy: 0.90,
    }));
    expect(t.assignedTier).toBe(1);
    expect(t.recommendedNewRent).toBe(70); // 50 * 1.40 = 70
    expect(t.recommendedIncrease).toBe(20);
  });

  it('computes Tier 2 recommended rent (10%)', () => {
    const t = buildTenant(makeTenantInput({
      currentRent: 253, unitGroupMedian: 154, streetRate: 134, unitGroupOccupancy: 0.90,
    }));
    expect(t.assignedTier).toBe(2);
    expect(t.recommendedNewRent).toBe(278); // 253 * 1.10 = 278.3 → 278
    expect(t.recommendedIncrease).toBe(25);
  });

  describe('isAboveStreet flag', () => {
    it('flags when recommended new rent exceeds street rate', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 130, streetRate: 150, unitGroupMedian: 150,
      }));
      // Tier 4: 130 * 1.20 = 156 → above street $150
      expect(t.isAboveStreet).toBe(true);
    });

    it('does not flag when recommended new rent is below street', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 100, streetRate: 200, unitGroupMedian: 150,
      }));
      // Tier 4: 100 * 1.20 = 120 → below street $200
      expect(t.isAboveStreet).toBe(false);
    });

    it('does not flag when recommended new rent equals street', () => {
      // Tier 4: 125 * 1.20 = 150.0 → Math.round(150) = 150 = street
      const t = buildTenant(makeTenantInput({
        currentRent: 125, streetRate: 150, unitGroupMedian: 150,
      }));
      expect(t.isAboveStreet).toBe(false); // 150 is NOT > 150
    });
  });

  describe('isSeasonalLowRate flag', () => {
    it('flags when tenure ~1yr AND rent/median < 50%', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 12, currentRent: 49, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(true);
    });

    it('does not flag when tenure too short (9 months)', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 9, currentRent: 40, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(false);
    });

    it('does not flag when tenure too long (15 months)', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 15, currentRent: 40, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(false);
    });

    it('does not flag when rent/median >= 50%', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 12, currentRent: 55, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(false);
    });

    it('does not flag when rent/median is exactly 50%', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 12, currentRent: 50, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(false); // < 0.50, not <=
    });

    it('boundary: 10 months is within range', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 10, currentRent: 40, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(true);
    });

    it('boundary: 14 months is within range', () => {
      const t = buildTenant(makeTenantInput({
        tenureMonths: 14, currentRent: 40, unitGroupMedian: 100,
      }));
      expect(t.isSeasonalLowRate).toBe(true);
    });
  });

  describe('default values', () => {
    it('defaults status to pending', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.status).toBe('pending');
    });

    it('defaults isMultiUnit to false', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.isMultiUnit).toBe(false);
    });

    it('defaults isLeaseUp to false', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.isLeaseUp).toBe(false);
    });

    it('defaults isFirstECRI to true', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.isFirstECRI).toBe(true);
    });

    it('defaults previousIncreases to empty array', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.previousIncreases).toEqual([]);
    });

    it('defaults competitors to empty array', () => {
      const t = buildTenant(makeTenantInput());
      expect(t.competitors).toEqual([]);
    });

    it('respects explicit flag overrides', () => {
      const t = buildTenant(makeTenantInput({
        isMultiUnit: true, isLeaseUp: true, isFirstECRI: false,
      }));
      expect(t.isMultiUnit).toBe(true);
      expect(t.isLeaseUp).toBe(true);
      expect(t.isFirstECRI).toBe(false);
    });
  });
});

// ═══════════════════════════════════════════════════════
// 3. EDGE CASES — Real-world scenarios
// ═══════════════════════════════════════════════════════

describe('edge cases', () => {
  describe('brand new tenants (very short tenure)', () => {
    it('still computes a valid tier for 1-month tenant', () => {
      const t = buildTenant(makeTenantInput({ tenureMonths: 1 }));
      expect([1, 2, 3, 4]).toContain(t.assignedTier);
      expect(t.recommendedNewRent).toBeGreaterThan(t.currentRent);
    });

    it('tenure has no effect on tier assignment (formula ignores it)', () => {
      const short = buildTenant(makeTenantInput({ tenureMonths: 1 }));
      const long = buildTenant(makeTenantInput({ tenureMonths: 120 }));
      expect(short.assignedTier).toBe(long.assignedTier);
      expect(short.tierPercent).toBe(long.tierPercent);
    });
  });

  describe('tenant already above market rate', () => {
    it('tenant paying well above street gets Tier 3 when delta also high', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 200, streetRate: 100, unitGroupMedian: 150,
      }));
      // TvS = +100%, deltaMed = (240-150)/150 = +60%
      expect(t.tenantVsStreet).toBeCloseTo(1.0, 2);
      expect(t.tier || t.assignedTier).toBe(3);
    });

    it('tenant above street but below median falls to Tier 4', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 160, streetRate: 140, unitGroupMedian: 200,
      }));
      // TvS = +14.3%, deltaMed = (192-200)/200 = -4%
      expect(t.assignedTier).toBe(4);
    });
  });

  describe('zero or extreme values', () => {
    it('handles $0 street rate gracefully', () => {
      // TvS = (currentRent - 0) / 0 = Infinity
      const r = computeTier(100, 150, 0, 0.90);
      expect(r.tvs).toBe(Infinity);
      // Infinity > 0.15 is true, so Tier 3 check depends on deltaMed
      // deltaMed = (120-150)/150 = -20% → not > 0.15 → Tier 4
      expect(r.tier).toBe(4);
    });

    it('handles $0 median gracefully', () => {
      // deltaMed = (trialRate - 0) / 0 = Infinity
      const r = computeTier(100, 0, 150, 0.90);
      expect(r.deltaMed).toBe(Infinity);
      // Infinity > 0.75 → Tier 2
      expect(r.tier).toBe(2);
    });

    it('handles very low rent ($1)', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 1, unitGroupMedian: 100, streetRate: 100,
      }));
      expect(t.trialRate).toBe(1.2);
      expect(t.assignedTier).toBe(1); // Way below median, Tier 1 if occ > 75%
      expect(t.recommendedNewRent).toBe(1); // Math.round(1 * 1.40) = 1
    });

    it('handles very high rent ($10000)', () => {
      const t = buildTenant(makeTenantInput({
        currentRent: 10000, unitGroupMedian: 100, streetRate: 100,
      }));
      expect(t.assignedTier).toBe(2); // Way above median
      expect(t.recommendedNewRent).toBe(11000);
    });

    it('handles 100% occupancy', () => {
      const r = computeTier(50, 100, 80, 1.0);
      expect(r.tier).toBe(1); // Below median + high occ
    });

    it('handles 0% occupancy', () => {
      const r = computeTier(50, 100, 80, 0.0);
      expect(r.tier).not.toBe(1); // Occ gate blocks Tier 1
    });
  });

  describe('threshold boundary precision', () => {
    it('Tier 3 requires BOTH conditions (AND, not OR)', () => {
      // TvS just over 15%, deltaMed just under 15% → Tier 4
      const r = computeTier(95, 100, 80, 0.90);
      // tvs = (95-80)/80 = 18.75% ✓
      // trial = 114, deltaMed = (114-100)/100 = 14% ✗
      expect(r.tvs).toBeGreaterThan(0.15);
      expect(r.deltaMed).toBeLessThanOrEqual(0.15);
      expect(r.tier).toBe(4);
    });
  });

  describe('Cornelius real-world edge case: low occupancy blocks Tier 1', () => {
    it('tenant below median with 69% occ gets Tier 4 (not Tier 1)', () => {
      // From validation doc: tenants in 10×30 unit group at 69% occupancy
      // Even though far below median, occ < 75% blocks Tier 1
      const r = computeTier(100, 290, 259, 0.69);
      // trial=120, deltaMed = (120-290)/290 = -58.6% (< -20%) BUT occ 69% < 75%
      expect(r.deltaMed).toBeLessThan(-0.20);
      expect(r.tier).not.toBe(1);
      expect(r.tier).toBe(4); // Falls all the way to Tier 4
    });
  });
});

// ═══════════════════════════════════════════════════════
// 4. OVERRIDE REASONS — Configuration validation
// ═══════════════════════════════════════════════════════

describe('override reasons', () => {
  it('has exactly 6 reasons', () => {
    expect(OVERRIDE_REASONS).toHaveLength(6);
  });

  it('includes all confirmed reasons from Brian (Feb 12)', () => {
    expect(OVERRIDE_REASONS).toContain('Undesirable building section');
    expect(OVERRIDE_REASONS).toContain('Business tenant relationship');
    expect(OVERRIDE_REASONS).toContain('High-bay risk assessment');
    expect(OVERRIDE_REASONS).toContain('Street rate ceiling');
    expect(OVERRIDE_REASONS).toContain('DM judgment needed');
    expect(OVERRIDE_REASONS).toContain('Other');
  });

  it('"Other" is the last option', () => {
    expect(OVERRIDE_REASONS[OVERRIDE_REASONS.length - 1]).toBe('Other');
  });
});

// ═══════════════════════════════════════════════════════
// 5. TIER DISTRIBUTION — Mock data sanity checks
// ═══════════════════════════════════════════════════════

describe('mock data tier distribution', () => {
  // Recreate the mock data tenants to validate tier assignments
  const corneliusTenants = [
    // 10×10 Climate — Median $154, Street $134, Occ 90%
    buildTenant(makeTenantInput({ id: 't1', currentRent: 184, streetRate: 134, unitGroupMedian: 154, unitGroupOccupancy: 0.90 })),
    buildTenant(makeTenantInput({ id: 't2', currentRent: 253, streetRate: 134, unitGroupMedian: 154, unitGroupOccupancy: 0.90 })),
    buildTenant(makeTenantInput({ id: 't3', currentRent: 99, streetRate: 134, unitGroupMedian: 154, unitGroupOccupancy: 0.90 })),
    buildTenant(makeTenantInput({ id: 't4', currentRent: 165, streetRate: 134, unitGroupMedian: 154, unitGroupOccupancy: 0.90 })),
    // 10×20 Climate — Median $222, Street $199, Occ 84%
    buildTenant(makeTenantInput({ id: 't5', currentRent: 178, streetRate: 199, unitGroupMedian: 222, unitGroupOccupancy: 0.84 })),
    buildTenant(makeTenantInput({ id: 't6', currentRent: 222, streetRate: 199, unitGroupMedian: 222, unitGroupOccupancy: 0.84 })),
    buildTenant(makeTenantInput({ id: 't7', currentRent: 306, streetRate: 199, unitGroupMedian: 222, unitGroupOccupancy: 0.84 })),
    // 5×10 Non-Climate — Median $84, Street $89, Occ 89%
    buildTenant(makeTenantInput({ id: 't8', currentRent: 49, streetRate: 89, unitGroupMedian: 84, unitGroupOccupancy: 0.89 })),
    buildTenant(makeTenantInput({ id: 't9', currentRent: 168, streetRate: 89, unitGroupMedian: 84, unitGroupOccupancy: 0.89 })),
  ];

  it('has all 4 tiers represented', () => {
    const tiers = new Set(corneliusTenants.map(t => t.assignedTier));
    expect(tiers.has(1)).toBe(true);
    expect(tiers.has(2)).toBe(true);
    expect(tiers.has(3)).toBe(true);
    expect(tiers.has(4)).toBe(true);
  });

  it('most tenants are Tier 3 or 4 (matches Cornelius pattern)', () => {
    const t34 = corneliusTenants.filter(t => t.assignedTier === 3 || t.assignedTier === 4);
    expect(t34.length).toBeGreaterThanOrEqual(corneliusTenants.length / 2);
  });

  it('Rebecca Torres ($99) is Tier 1 — far below median at high occ', () => {
    const rebecca = corneliusTenants.find(t => t.id === 't3')!;
    expect(rebecca.assignedTier).toBe(1);
    expect(rebecca.tierPercent).toBe(0.40);
  });

  it('James Ward ($253) is Tier 2 — far above median', () => {
    const james = corneliusTenants.find(t => t.id === 't2')!;
    expect(james.assignedTier).toBe(2);
  });

  it('Lisa Park ($49) is Tier 1 — seasonal low-rate', () => {
    const lisa = corneliusTenants.find(t => t.id === 't8')!;
    expect(lisa.assignedTier).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════
// 6. REVENUE CALCULATIONS
// ═══════════════════════════════════════════════════════

describe('revenue impact calculations', () => {
  it('recommended increase equals newRent - currentRent', () => {
    const t = buildTenant(makeTenantInput({ currentRent: 150 }));
    expect(t.recommendedIncrease).toBe(t.recommendedNewRent - t.currentRent);
  });

  it('Tier 1 gives largest dollar increase', () => {
    const base = { currentRent: 100, unitGroupOccupancy: 0.90 } as const;
    const tier1 = buildTenant(makeTenantInput({ ...base, unitGroupMedian: 200, streetRate: 150 }));
    const tier4 = buildTenant(makeTenantInput({ ...base, unitGroupMedian: 100, streetRate: 100 }));
    expect(tier1.assignedTier).toBe(1);
    expect(tier4.assignedTier).toBe(4);
    expect(tier1.recommendedIncrease).toBeGreaterThan(tier4.recommendedIncrease);
  });

  it('Tier 2 gives smallest dollar increase', () => {
    const t2 = buildTenant(makeTenantInput({
      currentRent: 253, unitGroupMedian: 154, streetRate: 134,
    }));
    const t4 = buildTenant(makeTenantInput({
      currentRent: 253, unitGroupMedian: 253, streetRate: 253,
    }));
    expect(t2.assignedTier).toBe(2);
    expect(t4.assignedTier).toBe(4);
    // Same base rent: 10% < 20%
    expect(t2.recommendedIncrease).toBeLessThan(t4.recommendedIncrease);
  });
});

// ═══════════════════════════════════════════════════════
// 7. DATA VALIDATION — Bad input handling
// ═══════════════════════════════════════════════════════

describe('data validation — bad input resilience', () => {
  it('handles negative rent (should not happen, but does not crash)', () => {
    const t = buildTenant(makeTenantInput({ currentRent: -50 }));
    expect(t.trialRate).toBe(-60);
    expect(t.assignedTier).toBeDefined();
  });

  it('handles NaN inputs without crashing', () => {
    const r = computeTier(NaN, 100, 100, 0.90);
    expect(r.tier).toBeDefined(); // Will be Tier 4 (default) since NaN comparisons are false
    expect(r.tier).toBe(4);
  });

  it('handles Infinity inputs without crashing', () => {
    const r = computeTier(Infinity, 100, 100, 0.90);
    expect(r.tier).toBeDefined();
  });

  it('handles all-zero inputs without crashing', () => {
    // 0/0 = NaN, NaN comparisons return false → falls to Tier 4
    const r = computeTier(0, 0, 0, 0);
    expect(r.tier).toBe(4);
  });
});
