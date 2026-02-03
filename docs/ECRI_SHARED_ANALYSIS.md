# ECRI Module – Shared Logic Analysis

Analysis of the ECRI module (`revman/app/routes/ecri` and its lib dependencies) to identify calculations and business logic that should move to `shared/` for reuse by other modules (e.g. Vacant Unit Pricing, Street Rate Recommendations, Revenue Intelligence Dashboard, reporting).

---

## 1. Market rate calculation

**Location:** `revman/app/lib/market-rate.ts`

**What it does:** Distance-weighted market rate from competitor rates; competitor coverage stats.

**Why shared:** Vacant Unit Pricing and Street Rate Recommendations (BRIEF Phase 3) both need “what is market rate for this unit type?”. Same comp set and weighting logic should be shared.

**Candidates for `shared/calculations/` (or `shared/market-rate/`):**

| Export | Purpose |
|--------|--------|
| `getDistanceWeight(distanceMiles)` | Distance → weight (0–1). Reusable for any comp-based pricing. |
| `calculateMarketRate(unitType, competitors, rates)` | Weighted market rate for one unit type. |
| `calculateAllMarketRates(unitTypes, competitors, rates)` | Batch market rates by unit type. |
| `getCompetitorCoverage(unitType, competitors, rates)` | Counts, avg/min/max, sold-out count. Useful for dashboards and reporting. |

**Types to share:** `CompetitorInput`, `CompetitorRateInput`, and a minimal `UnitTypeInput` (id, size, climateControlled) for market-rate only, or re-export from shared types.

---

## 2. ECRI recommendation engine (core business rules)

**Location:** `revman/app/lib/recommendation-engine.ts`

**What it does:** Eligibility, position category, stance, adjustments, conflict resolution, final rent, cohort classification, and summary stats. No DB—pure functions over inputs.

**Why shared:** Street Rate logic may reuse position/stance concepts. Reporting or analytics may need the same eligibility/classification rules. A future “test different ECRI strategies” feature (per BRIEF) would reuse this engine.

**Candidates for `shared/calculations/ecri/` (or `shared/recommendation-engine/`):**

| Category | Exports | Notes |
|----------|--------|--------|
| **Tenure / dates** | `calculateTenureMonths(moveInDate)`, `getLastEcriDate(history)`, `monthsSinceLastEcri(history)` | Pure date math; any module that needs tenure or ECRI spacing can use these. |
| **Exclusions** | `checkExclusions(customer, hasJurisdictionRestriction)` | Reusable wherever “can we touch this customer?” is asked. |
| **Eligibility** | `checkEligibility(customer, ecriHistory, marketRate, settings)` | Min tenure, time since last ECRI, min gap. |
| **Position / stance** | `determinePositionCategory(...)`, `getBaseStance(position)` | BELOW_STREET → AGGRESSIVE, etc. Useful for Street Rate and any “position vs market” view. |
| **Visit behavior** | `getVisitFrequencyCategory(customer, settings)`, `hasRecentActivityAfterAbsence(customer)` | Could be reused by churn/risk modules. |
| **Adjustments** | `calculateAdjustments(customer, unitType, settings)`, `resolveConflicts(baseStance, factors)` | Stance up/down from occupancy, tenure, visits, etc. |
| **Rent calculation** | `calculateFinalRent(currentRent, anchorRate, stance, settings)` | Core ECRI math: gap capture + guardrails. Critical to share so all modules use the same caps and logic. |
| **Classification** | `classifyRecommendation(tenureMonths, gapToMarketPct, adjustmentFactors, settings)` | Cohort type and confidence. |
| **Orchestration** | `generateRecommendation(...)`, `generateFacilityRecommendations(...)` | Full per-customer and per-facility ECRI flow. |
| **Aggregation** | `groupByCohort(recommendations)`, `calculateSummary(recommendations)` | Total revenue impact, counts by confidence. Dashboard and reports need this. |

**Dependencies:** These depend on shared types (enums, `CustomerInput`, `UnitTypeInput`, `CompanySettingsInput`, `EcriHistoryInput`, `RecommendationOutput`, etc.) and on stance config (e.g. `STANCE_CONFIGS`). Types and config should live in `shared/types/` (or similar) so both revman and other apps can depend on them.

---

## 3. Settings defaults and validation

**Location:** `revman/app/lib/settings.ts`

**What it does:** Default ECRI/company settings and merge/validate.

**Why shared:** Vacant Unit Pricing and other revenue modules may share the same company settings (occupancy thresholds, guardrails, etc.). One place for defaults and validation keeps behavior consistent.

**Candidates for `shared/settings/` (or `shared/config/`):**

| Export | Purpose |
|--------|--------|
| `DEFAULT_SETTINGS` | Single source of default values. |
| `mergeSettings(companySettings)` | Overlay company overrides on defaults. |
| `validateSettings(settings)` | Bounds and consistency checks. |

**Types:** `CompanySettingsInput` (and any settings-related enums) should live in shared types so all modules use the same shape.

---

## 4. ECRI history summary (used in UI)

**Location:** `revman/app/routes/ecri/index.tsx` (HistoryTooltip)

**What it does:** Sorts ECRI history by date, computes total dollar increase and total % increase from first previous rent to latest new rent.

**Code today (inline):**
```ts
const sorted = [...history].sort(
  (a, b) => new Date(b.effectiveDate).getTime() - new Date(a.effectiveDate).getTime()
);
const totalIncrease = (sorted[0]?.newRent || 0) - (sorted[sorted.length - 1]?.previousRent || 0);
const totalPct = ((sorted[0]?.newRent || 1) / (sorted[sorted.length - 1]?.previousRent || 1) - 1) * 100;
```

**Why shared:** History views and reports (e.g. “ECRI History” page, Revenue Intelligence Dashboard, exports) should use the same definition of “total increase over history.”

**Candidate for `shared/calculations/`:**  
`summarizeEcriHistory(history: EcriHistoryInput[]): { sorted: EcriHistoryInput[]; totalIncrease: number; totalPct: number }`

---

## 5. Formatting helpers (duplicated across routes)

**Locations:**  
`revman/app/routes/ecri/index.tsx`, `ecri/facility.tsx`, `ecri/history.tsx`, `prototype.tsx`, `history-prototype.tsx`

**What’s duplicated:** `formatCurrency`, `formatPercent`, `formatDate`, and in history `formatMonthYear`. Same Intl/formatting logic in multiple files.

**Why shared:** Any revenue or reporting module (ECRI, Vacant Unit Pricing, dashboards, exports) needs consistent currency/percent/date formatting.

**Candidates for `shared/formatting/` (or `shared/utils/format.ts`):**

| Function | Purpose |
|----------|--------|
| `formatCurrency(value: number, options?: { decimals?: number })` | USD, whole dollars by default. |
| `formatPercent(value: number, decimals?: number)` | e.g. `12.5%`. |
| `formatDate(dateStr: string, options?: Intl.DateTimeFormatOptions)` | Short date (e.g. “Jan ’24”) or full. |
| `formatMonthYear(month: number, year: number)` | e.g. “January 2025”. |

Keep these presentation-only (no React); other apps (CLI, other UIs) can reuse them.

---

## 6. Unit type display helper

**Location:** `revman/app/lib/types.ts`  
**Export:** `formatUnitTypeFeatures(unitType): string` → e.g. `"CC · FF · DU"`.

**Why shared:** Any module that shows unit type (ECRI, Street Rate, Vacant Unit Pricing, property/unit pickers) may want the same abbreviated labels.

**Candidate:** Move to `shared/formatting/` or `shared/utils/unit-type.ts` and take a minimal unit-type shape (climateControlled, floorLevel, accessType).

---

## 7. What should stay in revman

- **`ecri-service.ts`** – DB access, company/facility loading, wiring recommendations to DB. App-specific orchestration.
- **Route components** – Loaders, fetchers, UI, ECRI-specific state.
- **Revman-specific types** – Anything that’s only for this app’s DB or API can stay in revman; only types needed by shared calculations or other modules need to move to shared.

---

## 8. Suggested shared layout

```
shared/
  calculations/
    calculateMonthlyRevenue.ts     # existing
    market-rate.ts                 # from revman/app/lib/market-rate.ts (pure calc)
    ecri/
      tenure.ts                    # tenure + ECRI date helpers
      eligibility.ts               # checkExclusions, checkEligibility
      position-stance.ts           # determinePositionCategory, getBaseStance, visit frequency
      adjustments.ts               # calculateAdjustments, resolveConflicts
      rent.ts                      # calculateFinalRent
      classification.ts            # classifyRecommendation
      summary.ts                   # groupByCohort, calculateSummary
      index.ts                     # generateRecommendation, generateFacilityRecommendations
    ecri-history.ts                # summarizeEcriHistory
  settings/
    defaults.ts                    # DEFAULT_SETTINGS, mergeSettings, validateSettings
  formatting/
    currency.ts                    # formatCurrency, formatPercent
    date.ts                        # formatDate, formatMonthYear
    unit-type.ts                   # formatUnitTypeFeatures
  types/
    ecri.ts                        # enums, CustomerInput, UnitTypeInput, CompanySettingsInput,
                                  # EcriHistoryInput, RecommendationOutput, StanceConfig, etc.
```

Alternatively, keep a flatter structure (e.g. `shared/calculations/ecri-*.ts` and `shared/types/ecri.ts`) and use index re-exports.

---

## 9. Priority order for moving

1. **High – used by multiple future modules**  
   - Market rate: `getDistanceWeight`, `calculateMarketRate`, `calculateAllMarketRates`, `getCompetitorCoverage`  
   - Rent calculation: `calculateFinalRent`  
   - Settings: `DEFAULT_SETTINGS`, `mergeSettings`, `validateSettings`  
   - Types: ECRI enums, `CompanySettingsInput`, `CustomerInput`, `UnitTypeInput`, `EcriHistoryInput`, stance config

2. **Medium – reuse in reporting/dashboards**  
   - `calculateSummary`, `groupByCohort`  
   - `summarizeEcriHistory`  
   - `formatCurrency`, `formatPercent`, `formatDate`, `formatMonthYear`  
   - `formatUnitTypeFeatures`

3. **Lower – move when another module needs them**  
   - Full recommendation engine (eligibility, position, adjustments, classification, `generateRecommendation`, `generateFacilityRecommendations`) once Street Rate or testing features are built.

---

## 10. Summary table

| Logic | Current location | Move to shared? | Other modules that need it |
|-------|------------------|-----------------|-----------------------------|
| Market rate (distance weight, weighted rate, coverage) | `lib/market-rate.ts` | Yes | Vacant Unit Pricing, Street Rate, dashboards |
| Tenure / ECRI date helpers | `lib/recommendation-engine.ts` | Yes | Reporting, eligibility checks |
| Exclusions / eligibility | `lib/recommendation-engine.ts` | Yes | Any “can we increase?” check |
| Position category / base stance | `lib/recommendation-engine.ts` | Yes | Street Rate, analytics |
| Final rent (gap capture + guardrails) | `lib/recommendation-engine.ts` | Yes | All pricing modules |
| Cohort classification + summary | `lib/recommendation-engine.ts` | Yes | Dashboard, reports |
| Full ECRI orchestration | `lib/recommendation-engine.ts` | Yes (when needed) | Street Rate, A/B tests |
| Settings merge/validate | `lib/settings.ts` | Yes | Any module using company settings |
| ECRI history summary | `routes/ecri/index.tsx` (inline) | Yes | History page, reports, dashboard |
| formatCurrency / formatPercent / formatDate | Multiple route files | Yes | All revenue/reporting UI |
| formatUnitTypeFeatures | `lib/types.ts` | Yes | Any unit-type display |
| DB/company loading, getFacilityWithRecommendations | `lib/ecri-service.ts` | No | Revman-only |

This gives a clear map of what to move into `shared/` and in what order, so ECRI and future modules (Vacant Unit Pricing, Street Rate, Revenue Intelligence Dashboard) share one set of calculations and formatting.
