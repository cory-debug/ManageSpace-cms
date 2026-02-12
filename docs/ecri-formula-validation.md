# ECRI Formula Validation — Cornelius Excel Parity Check

**Date:** February 12, 2026
**Source file:** `revman/docs/Mstar ECRI Template - Calc Tool.xlsx` (Sheet: Cornelius)
**Purpose:** Validate our 4-tier formula engine against Brian's actual Excel (Column Z)

---

## Result: 100% Match

**29 formula rows tested. 29 match. 0 mismatches.**

Our engine produces identical tier assignments to Brian's Column Z formula for every tenant where the formula was used (not manually overridden).

---

## Excel Structure

- **Sheet:** Cornelius (1 facility, 50 tenants with March renewal month)
- **Rows 7–56:** Actual tenant data (rows 57–156 are empty template rows)
- **Column Z (col 26):** The tier formula — 29 rows use it, 21 are manual overrides

### Column Z Formula (Decoded)

```
=IF(AND(Y < -0.20, R > 0.75), 0.40,       // Tier 1: 40%
  IF(Y > 0.75, 0.10,                        // Tier 2: 10%
    IF(AND(O > 0.15, Y > 0.15), 0.15,       // Tier 3: 15%
      T)))                                    // Tier 4: 20% (baseline)
```

Where:
- **Y (col 25)** = `% Delta` = `(trialRate - unitGroupMedian) / unitGroupMedian`
- **R (col 18)** = `Unit Group Occ %`
- **O (col 15)** = `Tenant $ vs Street $` = `(tenantRate - streetRate) / streetRate`
- **T (col 20)** = `0.20` (baseline increase target)

### Reference Cells (Tier Configuration)
| Cell | Value | Meaning |
|------|-------|---------|
| AQ2 | -0.20 | Tier 1: % delta below median threshold |
| AR3 | 0.75 | Tier 1: occupancy minimum |
| AQ3 | 0.40 | Tier 1: assigned increase % |
| AP2 | 0.75 | Tier 2: % delta above median threshold |
| AP3 | 0.10 | Tier 2: assigned increase % |
| AP4 | 0.15 | Tier 3: both tenant-vs-street AND % delta threshold |

**All thresholds are configurable cells** — Brian can change them per facility by editing AP/AQ/AR cells.

---

## Tier Distribution (Cornelius, March Renewals)

| Tier | % | Formula Rows | Override Rows | Total |
|------|---|-------------|---------------|-------|
| Tier 1 | 40% | 0 | 0* | 0 |
| Tier 2 | 10% | 4 | 3 | 7 |
| Tier 3 | 15% | 22 | 4 | 26 |
| Tier 4 | 20% | 3 | 0 | 3 |
| **Overridden** | various | — | 21 | 21 |
| **Total** | | 29 | 21 | **50** |

*Note: 14 of the 21 overrides would have been Tier 1 (40%) by formula, but Brian manually set them to different percentages. This explains why Tier 1 shows 0 in formula rows — Brian overrides virtually all Tier 1 candidates.*

---

## Override Analysis (21 of 50 = 42%)

Brian overrode 42% of tenants at Cornelius — within his stated range of "10–50%, typically 1 in 5."

### Override Patterns

**Seasonal low-rate move-ins (7 tenants):**
Tenure < 1.2 years, rate significantly below street. Formula gives Tier 1 (40%), Brian overrides higher.
- Row 8: $79 rate, $129 street, 0.8yr tenure, 88% occ → **45%** (formula: 40%)
- Row 17–19: $99 rate, $199 street, 0.8yr tenure, 89% occ → **60%** (formula: 40%)
- Row 47: $49 rate, $89 street, 0.8yr tenure, 89% occ → **45%** (formula: 40%)

These are the seasonal low-rate tenants Brian described: *"Tenure close to one and then a certain spread to achieved is pretty big... 50% would probably be a good starting point."* He's going ABOVE the 40% formula — up to 60%.

**Above-street premium payers dialed down (6 tenants):**
Tenant already pays above street rate. Brian moderates the increase.
- Row 16: $229 rate, $199 street, 1.9yr tenure → **18%** (formula: 15%)
- Row 31: $119 rate, $109 street, 0.9yr tenure → **25%** (formula: 40%)
- Row 32: $139 rate, $109 street, 0.8yr tenure → **20%** (formula: 40%)

**Low occupancy dial-down (5 tenants):**
Unit group at <75% occupancy. Brian reduces the increase to avoid pushing tenants out.
- Row 20: $359 rate, $259 street, 6.9yr tenure, 69% occ → **12%** (formula: 20%)
- Row 21: $476 rate, $259 street, 2.8yr tenure, 69% occ → **12%** (formula: 15%)
- Row 54: $89 rate, $39 street, 6.7yr tenure, 67% occ → **10%** (formula: 15%)

**Other (3 tenants):**
- Rows 42, 44, 45: $109 rate, $129 street, ~0.9yr tenure, 78% occ → **30%** (formula: 40%)
  Just above the 75% occupancy cutoff, near-seasonal tenure — Brian dialed from 40% down to 30%.

---

## Key Findings for Build

### 1. Formula is confirmed correct
Our pseudocode matches Brian's Excel exactly. No changes needed to the 4-tier logic.

### 2. Tier 1 (40%) is almost always overridden
At Cornelius, 14 tenants qualified for Tier 1 but zero kept the formula result. Brian either:
- Pushed them **higher** (45–60%) for seasonal low-rate tenants
- Pulled them **lower** (20–30%) when above street or near the occupancy cutoff

**Implication:** The Tier 1 flag is more of an "attention needed" signal than a final recommendation. The UI should prominently surface Tier 1 tenants for review.

### 3. Seasonal low-rate is the most common override upward
7 of 21 overrides (33%) were seasonal low-rate tenants getting 45–60% instead of 40%. Our "seasonal low-rate flag" (tenure ~1yr + currentRent/median < 0.50) correctly identifies these.

### 4. Low occupancy drives conservative overrides
When unit group occupancy is below 75%, Brian consistently dials down — even though the formula's Tier 1 occupancy gate should have blocked them. This is because they qualified via Tier 3 or 4 but Brian still wanted to be more conservative.

**Implication:** Consider adding an "occupancy warning" flag on all tiers when unit group is below 80%, not just the Tier 1 gate.

### 5. Override rate at Cornelius (42%) is at the high end
Brian said "1 in 5" typically. Cornelius at 42% suggests this facility has more edge cases (low-rate move-ins, low-occ unit groups). Build the system expecting 15–40% override rates across the portfolio.

---

## Sample Validation Rows

### Tier 2 (10%) — Premium payer, far above median
| Row | Rate | Street | Trial @20% | Median | % Delta | TvS | Occ | Result |
|-----|------|--------|-----------|--------|---------|-----|-----|--------|
| 10 | $253 | $134 | $304 | $154 | +97.1% | +88.8% | 69% | Tier 2 (10%) |
| 11 | $251 | $134 | $301 | $154 | +95.6% | +87.3% | 69% | Tier 2 (10%) |
| 46 | $168 | $89 | $202 | $84 | +140.0% | +88.8% | 89% | Tier 2 (10%) |

### Tier 3 (15%) — Above street AND above median
| Row | Rate | Street | Trial @20% | Median | % Delta | TvS | Occ | Result |
|-----|------|--------|-----------|--------|---------|-----|-----|--------|
| 7 | $184 | $129 | $221 | $151 | +46.2% | +42.6% | 88% | Tier 3 (15%) |
| 12 | $306 | $199 | $367 | $222 | +65.0% | +53.8% | 89% | Tier 3 (15%) |
| 14 | $239 | $199 | $287 | $222 | +29.0% | +20.1% | 89% | Tier 3 (15%) |

### Tier 4 (20%) — Default baseline
| Row | Rate | Street | Trial @20% | Median | % Delta | TvS | Occ | Result |
|-----|------|--------|-----------|--------|---------|-----|-----|--------|
| 29 | $222 | $199 | $266 | $209 | +27.5% | +11.6% | 84% | Tier 4 (20%) |
| 30 | $178 | $109 | $214 | $209 | +2.2% | +63.3% | 84% | Tier 4 (20%) |
| 41 | $217 | $129 | $260 | $244 | +6.9% | +68.2% | 78% | Tier 4 (20%) |

Row 29: TvS (11.6%) fails the >15% test → not Tier 3 → falls to Tier 4.
Row 30: %Delta (+2.2%) fails the >15% test → not Tier 3. TvS is high but irrelevant without %Delta.
Row 41: %Delta (+6.9%) below 15% → Tier 4.

---

## Feb 19 Call — What to Show Brian

1. "We extracted all 50 Cornelius tenants from your Excel and ran them through our engine."
2. "29 formula rows: 100% match — our tier assignments are identical to Column Z."
3. "21 overridden rows: We can see your patterns — seasonal low-rate gets 45–60%, low-occ gets dialed down, premium payers get moderated."
4. "Question: Is this override pattern typical, or is Cornelius unusual?"
5. "Question: Should we build a 'seasonal low-rate' auto-suggestion (e.g., 50% starting point) so you don't have to manually override those every time?"
