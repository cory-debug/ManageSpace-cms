# ECRI Module — Full Build Plan

**Last Updated:** February 12, 2026
**Sources:** Feb 4 call (Brian + Bob), Feb 12 call (Brian), Brian's ECRI calc tool Excel, morningstar-ecri-spec.md, BRIEF.md, existing ECRI prototype
**Status:** Build-ready for MVP. Open questions documented separately in `open-questions-remaining.md`.

---

## 1. Operational Logic Map

### 1.1 The Four-Tier Formula (Confirmed Feb 12)

Morningstar's ECRI engine produces **one of four fixed percentages** per tenant. Evaluation is strict priority order — first match wins.

```
Step 1: Compute trial rate = currentRent × 1.20  (20% baseline used for ALL tier evaluations)
Step 2: Compute newRateDeltaToMedian = (trialRate - unitGroupMedian) / unitGroupMedian
Step 3: Compute tenantVsStreet = (currentRent - streetRate) / streetRate

TIER 1 — 40% (Aggressive catch-up)
  IF newRateDeltaToMedian < -0.20 AND unitGroupOccupancy > 0.75
  → Assign 40%

TIER 2 — 10% (Conservative — premium payer)
  ELSE IF newRateDeltaToMedian > 0.75
  → Assign 10%

TIER 3 — 15% (Above-market moderate)
  ELSE IF tenantVsStreet > 0.15 AND newRateDeltaToMedian > 0.15
  → Assign 15%

TIER 4 — 20% (Baseline default)
  ELSE → Assign 20%
```

**Key confirmation from Feb 12 call:** Brian confirmed that all tier evaluations use the **20% trial increase as the starting point**, not each tier's own percentage.

> Brian [06:06]: *"The 20% starting point, everything really gets up to that and then it's evaluated for all of the different variables after that point."*

### 1.2 Unit Group Median — Includes Current Tenant

The median is computed over **all occupied tenants in the unit group**, including the tenant being evaluated.

> Brian [08:17]: *"Right now I include it, yeah."*

**Implementation:** `MEDIAN(all current rents in unit group where unit is occupied)`. Do NOT exclude the target tenant's rent. Brian builds this in Excel with a `MEDIAN.IFS` formula across a full rent roll pivot of ~50,000–60,000 tenants.

### 1.3 Eligibility — Time Since Last Increase Only

**Rule:** Tenant is eligible if their **last rent increase** was 12+ months ago. Batch by "last increase month."

- NOT based on move-in date or lease date
- Out-of-cycle increases reset the 12-month clock
- No minimum tenure requirement
- No minimum gap-to-market requirement

> Brian [08:35]: *"It's not based on the lease date, it's based on last increase."*

**Current codebase gap:** Our RevMan code has `minTenureMonths: 3` and `minGapToMarketPct: 10` as hard gates. These must be removed for the Morningstar engine.

### 1.4 Forward-Looking Logic

The formula evaluates **where the tenant would land after the increase**, not current position.

- `newRate = currentRent × 1.20` (the 20% trial)
- `newRateDeltaToMedian = (newRate - medianAchieved) / medianAchieved`
- `tenantVsStreet = (currentRent - streetRate) / streetRate` (uses CURRENT rent, not new rate)

Negative delta = below median. Positive = above.

### 1.5 Fund-Level Tier Adjustments (Phase 2)

Brian wants the ability to adjust tier percentages by fund, with store-level overrides within a fund.

> Brian [46:45]: *"This fund instead of the baseline being 20, it should be 25... or let's say a fund is struggling, let's do 17 as the baseline instead of 20."*

**Desired behavior:**
1. Set tier percentages at fund level (e.g., Fund A: 40/10/15/25 instead of 40/10/15/20)
2. Override individual stores within the fund (e.g., two stores at 20% even when fund is at 17%)
3. When baseline changes, other tiers can optionally shift proportionally (Brian: "probably, yeah")
4. Alternatively, allow manual adjustment of each tier independently

> Brian [48:03]: *"These two stores don't put them to 17, either keep them at 20 or actually even move them up. That would be a really good function."*

### 1.6 Special Handling Flags

#### Post-Lease-Up Stores
- First increase can be 85–100% (Brian: *"budgeting about 85 to 90, maybe even 100% increase"*)
- Handled manually — "white glove" — formula will never account for this
- Need a facility-level flag: `isLeaseUp: true` + `leaseUpDuration` (months)
- Two upcoming: one in April (Crossing), one in May (Ortiz) — different durations expected
- Ortiz needs longer lease-up period because rate ramp was more gradual

> Brian [13:42]: *"The flagging should just be like a field of when is the first increase and maybe how long should we have it."*

#### Seasonal Low-Rate Move-Ins
- Tenants with ~1 year tenure + large spread to unit group median achieved rate
- Typically moved in during summer rate dips at deeply discounted prices
- Minimum 50% increase as starting point; Brian used 60% for Cornelius example
- **Flag criteria:** tenure ≈ 0.9–1.1 years AND `(currentRent / unitGroupMedian) < 0.50`

> Brian [15:25]: *"Tenure close to one and then a certain spread to achieved is pretty big... 50% would probably be a good starting point."*

**Cornelius example:** Tenants at $99, street $200, median achieved $220. Given 60% increase at 90% unit group occupancy.

#### New Acquisitions
- Use **lease date** to batch all tenants into a single cohort for first ECRI
- Go back through the full rent roll (some tenants from 2013+)
- Sensitive timing — requires coordination with investment team (Craig/Bob)

> Brian [17:23]: *"We use the lease date... just one way to put everybody in a bucket... go all the way back in the whole rent roll."*

#### Multi-Unit Tenants
- Flag only, no formula adjustment
- Generally moderate the increase ("dial down") but not always — if far under market, still get large increase
- **Improvement desired:** Currently only catches multi-unit within the same renewal month. Brian wants cross-month multi-unit detection

> Brian [19:50]: *"Right now it's only multi tenants based on our universe of data being slimmed down to the focus month... We might want to open it up to flag anybody on site that has multiple units."*

### 1.7 Manual Override Scenarios

**Override frequency:** ~20% of tenants (1 in 5). Range: 10% minimum to 50% maximum.

> Brian [21:18]: *"Rough guess on estimate is probably 1 in 5... minimum maybe 1 in 10, but maximum... you could change up to 50%."*

**Common override reasons (confirmed Feb 12):**
1. **Undesirable building section** — near road, noisy, poor AC on that side
2. **Business tenant relationship** — DM has relationship, wants to preserve
3. **High-bay risk assessment** — large base rent means large $ increase; high projected rent at risk
4. **Street rate ceiling** — 40% pushes above street; dial down (most common override)
5. **On the fence / need DM input** — metrics are mixed, need local judgment
6. **Other** — free-text for anything else

**Street rate ceiling is NOT a formula rule** — it's pure manual judgment. No hard cap. Flag when 40% pushes above street, but don't auto-cap.

> Brian [07:42]: *"It is just kind of like a manual judgment to rein it in a little bit."*

### 1.8 Evaluation Timing

- Pull data **5–6 weeks before effective date**
- Street rate snapshot taken at pull time
- Brian finishes recommendations ~2 weeks before effective date
- DMs get **~1 full week** to review and make changes
- 30-day notice goes out on the 1st of the month before effective date

> Brian [22:15]: *"About five to six weeks in advance... give the DMs about a full week to review at the end of the month."*

**April 2026 timeline:**
- ~Feb 14–20: Brian pulls data, runs formula
- ~Feb 20: Recommendations finalized
- Feb 20–28: DMs review and override
- Mar 1: 30-day notice letters sent
- Apr 1: New rates effective

### 1.9 Non-Storage Units

Retail, offices, cell towers, warehouses are **excluded from ECRI formula**. Need separate visibility tab — awareness only, not recommendations.

> Bob [49:18]: *"If we just had a flag for retail versus self storage... we don't subject them to the typical ECRI."*

Commercial leases (2–3 year terms with contractual increases) are tracked manually. The pain point is awareness — not forgetting year 3 increases after year 2 is handled.

### 1.10 Brian's Desired Workflow — Alert-Driven

Beyond formula execution, Brian wants the system to **direct his attention** rather than forcing him to review every store manually.

> Brian [01:01:33]: *"Instead of spending a couple minutes each store calibrating myself... I would like to be directed and focused into logging in... these are your first four stores and these are the five unit groups that need attention because they've had outsized ins, outs, competitor changes."*

This maps to a **priority queue / flagging system** in the dashboard — not just a flat list of facilities.

---

## 2. Screen-by-Screen Breakdown

Following ManageSpace UI/UX principles: two-panel layout, management UI (Tier 2 — higher information density), same design system as Comms Hub.

### Screen 1: ECRI Dashboard (Main Workflow)

**Layout:** Left panel (facility list) + Right panel (tenant recommendations for selected facility)

#### Left Panel — Facility List
- **Grouped by:** Fund (collapsible) → Individual facilities
- **Each facility card shows:**
  - Facility name
  - Total eligible tenants this batch
  - Pending / Approved / Skipped counts
  - Monthly revenue impact (sum of recommended increases)
  - Risk flags (count of: multi-unit, lease-up, seasonal low-rate, above-street)
  - Progress bar (% of tenants actioned)
- **Sorting:** By pending count (most work first), or revenue opportunity (highest impact first)
- **Attention flags:** Facilities with many overrides needed or special flags surface to top
- **Filters:** By fund, by DM/district, by status (needs review / in progress / complete)
- **Search:** Facility name, facility ID

#### Right Panel — Tenant Recommendations

**Header bar:**
- Facility name + address
- Batch: "April 2026 • Effective Apr 1 • Pulled Feb 17"
- Summary: X unit groups, Y eligible tenants, Z pending review
- Bulk actions: "Approve All Tier 4 (20%)" / "Approve All" / "Export"
- Filter: by tier, by flag, by status

**Grouping:** By unit group (e.g., "10×10 Climate, First Floor, Interior")

**Unit group header (collapsible):**

| Field | Value |
|-------|-------|
| Unit group name | Size + climate + floor + access |
| Occupancy | X/Y occupied (Z%) — color coded |
| Median achieved rate | $XXX |
| Street rate | $XXX |
| Eligible tenants | N this batch |
| Tier distribution | "12 at 20%, 2 at 40%, 1 at 10%" |

**Tenant row (within unit group):**

| Column | Description |
|--------|-------------|
| Tenant name | Clickable to expand detail |
| Unit # | Unit identifier |
| Tenure | Years.months — flag icon if ~1yr seasonal |
| Current rent | $XXX |
| Median achieved | $XXX (unit group level) |
| Street rate | $XXX |
| Tenant vs Street | +X% / -X% — green if below street, red if above |
| Trial rate vs Median | +X% / -X% — the key tier-determining metric |
| **Tier** | Badge: Tier 1 (red), Tier 2 (green), Tier 3 (amber), Tier 4 (blue) |
| **Recommended** | $XX increase (+XX%) |
| **New rent** | $XXX |
| Flags | Multi-unit, lease-up, seasonal, above-street — icon tooltips |
| Actions | Approve / Modify / Skip (inline) |

**Expanded tenant detail (click row):**
- Tier rationale: "Tier 4 (20%): After 20% trial ($XXX), tenant is +8% above median. Does not meet Tier 1 (<-20% + >75% occ), Tier 2 (>+75%), or Tier 3 (>+15% vs street AND >+15% vs median)."
- ECRI history: table of past increases (date, old rent, new rent, %, approved by)
- Unit group context: total units, occupied, vacants, recent activity (if available)
- Multi-unit detail: "Tenant has 3 units: #105 (this), #207 (May renewal), #312 (Aug renewal)"
- Competitor data: comp table with A/B/C tier, distance, rate (Phase 2)
- Notes field for DM comments

**Modify flow:**
1. Click "Modify" → inline edit of increase % or $ amount
2. Required: select reason from dropdown (6 confirmed reasons + Other with free text)
3. Save → row updates, original preserved for audit

**Skip flow:**
1. Click "Skip" → dropdown: "Skip this month" / "Skip indefinitely" / "Custom date"
2. Required: select reason
3. Skipped tenants appear in "Skipped" sub-tab

**Approve flow:**
1. Click "Approve" → row turns green/muted
2. Undo available for 24 hours
3. Bulk approve: checkbox selection → "Approve Selected"

### Screen 2: Batch Summary / Review

**Purpose:** Final picture before notices go out. Brian's review after DMs complete.

- Batch overview: month, effective date, totals (approved/modified/skipped/pending)
- Revenue impact: total monthly increase, annualized, comparison to prior batches
- Override analysis: % overrides, top reasons, average modification direction
- Distribution: histogram of increase percentages
- Tier breakdown: count at each tier (40/20/15/10) + special cases
- Flagged items: above-street, lease-up, unresolved
- Export: CSV for SiteLink upload
- Action: "Finalize Batch" → lock, generate notice-ready file

### Screen 3: ECRI Settings

**Section 1: Formula Configuration**
- Tier percentages (40/10/15/20) — editable per fund, per store
- Tier thresholds: Tier 1 median (-20%), Tier 1 occupancy (75%), Tier 2 median (+75%), Tier 3 street (+15%), Tier 3 median (+15%)
- Trial percentage (20%)

**Section 2: Fund-Level Overrides**
- Fund list with tier configurations
- Store-level override toggles within each fund
- Visual diff when store deviates from fund

**Section 3: Eligibility**
- Months since last increase (12)
- Batch method: "Last increase month"

**Section 4: Special Handling**
- Lease-up facilities: toggle, start date, duration
- Seasonal low-rate: tenure range, spread threshold
- New acquisition: facility flag, lease-date batching

**Section 5: Override Reasons**
- Manage dropdown list (add/remove/reorder)
- Defaults: Undesirable section, Business relationship, High-bay risk, Street rate ceiling, DM judgment, Other

**Section 6: Timing**
- Lead time: 6 weeks
- DM review window: 7 days
- Notice period: 30 days

**Section 7: Exclusions**
- Non-storage unit types: list (retail, office, cell tower, warehouse)

### Screen 4: Non-Storage Units Tab

Simple table grouped by facility — visibility only, no recommendations.

| Column | Data |
|--------|------|
| Facility | Name |
| Tenant / Business | Name |
| Unit type | Retail / Office / Cell Tower |
| Current rent | $XXX |
| Lease end date | Date |
| Next increase | Date + amount (if known) |
| Notes | Free text |
| Status | Active / Expiring Soon / Needs Attention |

### Screen 5: ECRI History

Two views:

**Batch history:** Past batches by month — totals, approval rate, override rate, avg increase, revenue impact. Click into any batch for full detail (read-only Screen 2).

**Tenant history search:** Search by name/unit/phone. Shows all historical increases: date, old rent, new rent, %, tier, approved by, override reason.

---

## 3. Data Requirements

### 3.1 From PMS (SiteLink → ManageSpace Sync)

| Field | Source | Notes |
|-------|--------|-------|
| Tenant name | SiteLink | |
| Unit number | SiteLink | |
| Unit type (size, climate, floor, access) | SiteLink | Maps to "unit group" |
| Current rent | SiteLink | |
| Move-in date | SiteLink | Tenure calc |
| Lease date | SiteLink | New acquisition batching |
| Last rate change date | SiteLink | **Primary eligibility field** |
| Last rate change amount | SiteLink | History |
| Total units per unit group | SiteLink | Occupancy calc |
| Occupied units per unit group | SiteLink | Occupancy calc |
| Street rate per unit group | Manual / SiteLink | Brian sets weekly |
| Multi-unit flag | SiteLink | Tenant has >1 unit |
| Tenant contact info | SiteLink | Notice generation |
| Facility fund assignment | Config | May need manual mapping |
| District manager | Config | For review workflow |

### 3.2 Calculated Fields (ManageSpace Engine)

| Field | Calculation |
|-------|-------------|
| Unit group median achieved | `MEDIAN(currentRent)` for all occupied tenants in unit group (includes self) |
| Unit group occupancy % | `occupiedUnits / totalUnits` |
| Tenure (years) | `(today - moveInDate) / 365.25` |
| Months since last increase | `(today - lastRateChangeDate) / 30.44` |
| Trial rate | `currentRent × 1.20` |
| New rate delta to median | `(trialRate - medianAchieved) / medianAchieved` |
| Tenant vs street | `(currentRent - streetRate) / streetRate` |
| Assigned tier | 4-tier formula result |
| Recommended increase % | Tier percentage |
| Recommended new rent | `currentRent × (1 + tierPct)` |
| Above-street flag | `recommendedNewRent > streetRate` |
| Seasonal low-rate flag | `tenure ≈ 1yr AND (currentRent / medianAchieved) < 0.50` |

### 3.3 Stored Per Recommendation

| Field | Notes |
|-------|-------|
| Batch ID | Groups all recs from same run |
| All input snapshot | Current rent, street, median, occupancy, tier at calc time |
| Final action | Approved / Modified / Skipped |
| Modified amount | If changed |
| Override reason | Category + free text |
| Actioned by | User ID |
| Actioned at | Timestamp |
| Effective date | When new rate takes effect |

---

## 4. MVP vs Phase 2 Scope

### MVP (Target: April 1 Go-Live)

- [ ] 4-tier formula engine (20% trial, priority order, exact thresholds)
- [ ] Median achieved calculation (includes self, per unit group)
- [ ] Eligibility: time since last increase only, 12-month minimum, batch by month
- [ ] Facility list grouped by fund
- [ ] Tenant table grouped by unit group within facility
- [ ] Tier assignment with full rationale display
- [ ] Override with reason capture (6 reasons + Other)
- [ ] Approve / Modify / Skip workflow with audit trail
- [ ] Bulk approve for Tier 4 (20%) tenants
- [ ] Multi-unit tenant flag (same renewal month)
- [ ] Lease-up facility flag (manual toggle)
- [ ] Seasonal low-rate flag (tenure ~1yr + spread > 50%)
- [ ] Above-street warning on Tier 1 recommendations
- [ ] DM review workflow (Brian → DMs → finalize)
- [ ] CSV export for SiteLink upload
- [ ] Basic ECRI history per tenant (from SiteLink import)
- [ ] Non-storage unit visibility tab
- [ ] Batch summary (counts, revenue impact, override rate)

**Cut for speed:**
- Automated SiteLink upload (CSV is fine for V1)
- Real-time notifications
- AI-generated override suggestions
- Competitor data in ECRI view

### Phase 2 (Post Go-Live)

- [ ] Fund-level tier percentage configuration
- [ ] Store-level overrides within fund
- [ ] Cross-month multi-unit detection
- [ ] New acquisition batching by lease date
- [ ] Street rate ceiling warning with configurable threshold
- [ ] Override analytics (reasons, frequency, DM patterns)
- [ ] Batch comparison (this month vs last month vs last year)
- [ ] DM-specific views ("my stores only")
- [ ] Competitor rate display alongside recommendations
- [ ] Attention-driven dashboard (flag stores/unit groups needing review)

### Phase 3 (Future)

- [ ] Move-out factor tracking: churn analysis per batch (30/60/90 day post-notice)
- [ ] Market-level churn benchmarks
- [ ] Scenario modeling ("What if baseline was 25%?")
- [ ] Budget forecasting: model future ECRI revenue impact
- [ ] Notice generation (letters/emails)
- [ ] Direct SiteLink API integration
- [ ] AI-assisted override recommendations
- [ ] Occupancy threshold gradient (by store performance, unit group volume, unit size)
- [ ] Replace Qlik dashboards: proactive alerts for stores/unit groups needing attention

---

## 5. Divergence from Current Codebase

The existing RevMan engine (`app/lib/recommendation-engine.ts`) uses a **fundamentally different model**:

| Aspect | Current RevMan | Morningstar (Build This) |
|--------|---------------|--------------------------|
| Output | Variable gap-capture % | Fixed tier % (10/15/20/40) |
| Logic | Position → stance → gap capture | 4-tier priority cascade |
| Reference rate | Weighted comp market rate | Unit group median achieved |
| Eligibility | Tenure ≥ 3mo, gap ≥ 10%, interval ≥ 6mo | Last increase ≥ 12mo only |
| Guardrails | Max 25% or $50 | None (40% common; 60–100% for specials) |
| Median vs Average | Average | Median (confirmed) |
| Median includes self | N/A | Yes (confirmed) |
| Forward-looking | No | Yes (20% trial rate) |
| Multi-unit | Downgrades stance | Flag only |
| Tenure | Adjusts stance | Not in formula |
| Occupancy | 92%/80% thresholds adjust stance | Tier 1 only (>75%) |

**Approach:** Build Morningstar engine as a **new calculation path**. Use `calculationEngine: 'morningstar' | 'revman'` company setting to select. Preserves existing engine for other customers.

---

## 6. Validation Plan

### Excel Parity Check

Brian confirmed formula in **Column Z**, starting row 10+. Columns A–Y are hard-coded lookups; Z onward are live formulas.

> Brian [42:58]: *"Column Z, everything before Z is hard coded... Z onward to like AI, those are actual formulas. So if you change the percent input, the output will show up on the right side."*

**Steps:**
1. Extract 5–10 rows from Cornelius Excel where Column Z formula is intact
2. Input same data (current rent, median, street, occupancy) into our engine
3. Confirm tier assignment matches
4. Confirm % and new rent match
5. Document any discrepancies → resolve with Brian on Feb 19 call

### DM Acceptance Test

After MVP, have Brian run one facility's April batch through both Excel and our system. Compare side by side. Target: 95%+ match on tier assignments.

---

## 7. Key Quotes Reference

| Topic | Quote | Source |
|-------|-------|--------|
| Trial % for all tiers | "The 20% starting point, everything really gets up to that and then it's evaluated" | Brian, Feb 12 |
| Street rate ceiling | "It is just kind of like a manual judgment to rein it in" | Brian, Feb 12 |
| Median includes self | "Right now I include it, yeah" | Brian, Feb 12 |
| Eligibility | "It's not based on the lease date, it's based on last increase" | Brian, Feb 12 |
| 75% hard cutoff (for now) | "Right now it's just that's the threshold. I think it could be gradient" | Brian, Feb 12 |
| Lease-up increases | "Budgeting about 85 to 90, maybe even 100% increase" | Brian, Feb 12 |
| Seasonal low-rate | "Tenure close to one and then a certain spread to achieved is pretty big" | Brian, Feb 12 |
| New acquisitions | "We use the lease date... go all the way back in the whole rent roll" | Brian, Feb 12 |
| Multi-unit = flag only | "Probably best to have a flag and then we just manually review" | Brian, Feb 12 |
| Override frequency | "Rough guess... probably 1 in 5, probably 15 to 25%" | Brian, Feb 12 |
| Timing | "About five to six weeks in advance... give DMs about a full week to review" | Brian, Feb 12 |
| Fund-level tiers | "This fund instead of the baseline being 20, it should be 25" | Brian, Feb 12 |
| Store overrides | "These two stores don't put them to 17, either keep them at 20 or move them up" | Brian, Feb 12 |
| Formula in Excel | "Column Z... Z onward to like AI, those are actual formulas" | Brian, Feb 12 |
| Alert-driven | "Have the system tell me what needs to be worked on" | Brian, Feb 12 |
| Annual only | "That has been based for a couple of decades... just part of the company culture" | Bob, Feb 4 |
| Multi-unit + tenure | "Multiple unit tenants and tenure does not factor into the formula" | Brian, Feb 4 |
| DMs final say | "They definitely have full authority. They're the final say." | Brian, Feb 4 |
| Move-out factor | "Isolate that group... how many moved out within a certain period of time" | Brian, Feb 4 |
