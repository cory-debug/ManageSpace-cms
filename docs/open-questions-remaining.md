# Open Questions Remaining — Post Feb 12 Call

**Last Updated:** February 12, 2026 (evening — post Excel validation)
**Context:** After two calls with Brian (Feb 4, Feb 12), the initial interview (Jan 29 with Bob, Craig, Matt), and validation against Brian's Cornelius Excel, most critical ECRI questions are resolved. This doc captures what's still open, why it matters, what to assume without answers, and recommended next steps.
**Next call:** Feb 19, 2026 at 1:15 PM ET with Brian
**Validation report:** `docs/ecri-formula-validation.md` — 29/29 formula rows match (100%)

---

## Status of Previously Open Questions

### Resolved (Feb 12 Call + Excel Validation)

| # | Question | Answer | Confidence |
|---|----------|--------|------------|
| A2 | "New rate" for Tier 2 — 20% or tier's own %? | **20% trial for all tiers** | Confirmed |
| A3 | "New rate" for Tier 3 — 20% or 15%? | **20% trial for all tiers** | Confirmed |
| A4 | Percent delta formula sign convention | **(rate - reference) / reference**. Negative = below, positive = above. Validated against Column Z Excel formulas. | Confirmed (Excel) |
| A5 | Street rate ceiling — cap at street or manual? | **Manual judgment only** — no hard rule | Confirmed |
| B1 | Median — include or exclude current tenant? | **Include** current tenant | Confirmed |
| B3 | Excel Column Z example rows | **Extracted and validated all 50 Cornelius tenants.** 29 formula rows = 100% match. 21 manual overrides analyzed. See `docs/ecri-formula-validation.md` | Confirmed (Excel) |
| C1 | New acquisitions — how identified/handled? | **Use lease date** to batch all tenants into one cohort | Confirmed |
| D1 | Override frequency | **~20% (1 in 5)**, range 10–50%. Cornelius actual: 42% (21/50) — high end, likely due to many seasonal low-rate tenants | Confirmed + validated |
| D2 | Multi-unit rule — formal or judgment? | **Flag only**, no formula | Confirmed |
| D4 | Evaluation timing | **5–6 weeks before effective date**, DMs get ~1 week review | Confirmed |

### Partially Resolved

| # | Question | What We Know | What's Still Open |
|---|----------|-------------|-------------------|
| A1 | 75% occupancy — hard cutoff or gradient? | Hard cutoff **for now**, but Brian thinks it should be gradient based on store performance, unit group volume, unit size. Excel validation confirms: Tier 1 occupancy gate uses `> 0.75` (cell AR3). | Exact gradient logic TBD — safe to ship with binary 75% and iterate |
| C3 | Post-lease-up tagging and default % | Lease-up = manual/white-glove, 85–100% increases. Need facility flag + duration field. Seasonal low-rate = 50%+ starting point. **Excel validates:** 7 seasonal low-rate tenants at Cornelius overridden to 45–60% (tenure ~0.8yr, rates $49–$99 vs street $89–$199). | Exact lease-up duration for Ortiz vs Crossing not confirmed. Seasonal flag threshold confirmed by data: tenure < 1.2yr + rate < 80% of street |

### Not Yet Addressed

| # | Question | Status |
|---|----------|--------|
| B2 | Unit group = our unit type exactly? | Assumed yes (size + CC + floor + access). Cornelius Excel unit names confirm pattern: "Drive To Your Door 10.0x10.0", "Heated & Cooled 10.0x10.0", "Standard 5.0x5.0". Need to verify no further splits (e.g., by building). |
| D3 | Tenure breakpoints for manual decisions | Brian says longer tenure = typically higher payer = lower increase. No formal breakpoints. Cornelius data confirms: long-tenure tenants (6–10yr) in low-occ groups get dialed to 10–12%. Flag only. |

---

## ECRI Module — Remaining Gaps

### ~~Gap 1: Exact Formula Validation Against Excel~~ — RESOLVED

**Status:** COMPLETE. Extracted all 50 Cornelius tenants from `Mstar ECRI Template - Calc Tool.xlsx`. Full results in `docs/ecri-formula-validation.md`.

**Result: 29/29 formula rows = 100% match. Zero mismatches.**

**Key findings from validation:**
- Column Z formula decoded: `IF(AND(%Delta < -0.20, Occ > 0.75), 0.40, IF(%Delta > 0.75, 0.10, IF(AND(TvS > 0.15, %Delta > 0.15), 0.15, 0.20)))`
- Tier thresholds stored in configurable cells: AQ2=-0.20, AR3=0.75, AP2=0.75, AP3=0.10, AQ3=0.40, AP4=0.15
- 21 of 50 tenants (42%) were manually overridden by Brian — higher than his "1 in 5" estimate
- Override patterns: seasonal low-rate → 45–60%, low-occ → 10–12%, above-street → 12–18%
- Tier 1 (40%) was overridden in every single case — it's effectively an "attention flag" not a final recommendation

**Next step:** Present results to Brian on Feb 19. Ask: "Is Cornelius typical, or does it have more overrides than usual?"

**Priority:** ~~HIGH~~ DONE.

---

### Gap 2: Fund-Level Tier Adjustment Mechanics — DECISION MADE

**Status:** Decision: **Independent tier percentage overrides per fund (no auto-proportional adjustment).** Morningstar has ~5 funds. Fund-level settings would change infrequently — annually at most. Store-level overrides within a fund remain Phase 2.

**Decision rationale:** Auto-proportional adds complexity without clear value. Brian hasn't thought deeply about it. Independent overrides are simpler to build, easier to explain, and cover the use case. If Brian later wants proportional scaling, add a "lock ratio" toggle.

**Next step:** Still confirm with Brian on Feb 19 which funds (if any) need different baselines right now.

**Priority:** Phase 2 feature. Decision locked for build.

---

### Gap 3: Occupancy Threshold Gradient — DECISION MADE

**Status:** Decision: **Ship with binary 75% (confirmed as current practice) but build configurability into the settings UI.** Allow Brian to change the threshold per facility or per unit group size range from the ECRI Settings screen. Don't build a gradient engine until Brian defines what "gradient" means after using the system.

**Next step:** Not urgent for MVP. Revisit in Phase 2.

**Priority:** LOW for MVP, MEDIUM for Phase 2.

---

### Gap 4: Cross-Month Multi-Unit Detection

**Status:** Brian wants to flag tenants who have multiple units at a facility even if their renewal months are different. Current Excel only catches multi-unit within the same renewal month.

**Why it matters:** A tenant with 5 units split across March, April, and May renewals won't be flagged as multi-unit in any individual month's batch.

**What we don't know:**
1. How to implement this technically — do we pre-scan the full tenant roster before running any monthly batch?
2. Should the flag show "this tenant has X units total, Y coming due this month, Z in other months"?
3. Should the multi-unit flag affect other months' recommendations too? (e.g., if we give a moderate increase in March, should April's batch know about it?)

**Assumption without answer:** Pre-scan full facility tenant roster for any tenant with >1 unit. Flag all their recommendations across all batches. Display: "Multi-unit: 3 total (1 this month, 2 other months)". Don't auto-adjust — let DMs decide.

**Next step:** Build the flag in MVP (simple query: tenant name or ID with count > 1 at facility). Cross-month coordination is Phase 2.

**Priority:** HIGH for flag, MEDIUM for cross-month coordination.

---

### Gap 5: SiteLink Data Availability for "Last Rate Change Date"

**Status:** Eligibility is based on "last rate change date" — the date of the most recent rent increase for each tenant. Brian uses this from SiteLink.

**Why it matters:** If SiteLink doesn't export this field cleanly, or if it records rate decreases and transfers alongside increases, our eligibility logic could pull the wrong tenants.

**What we don't know:**
1. Is "last rate change date" a standard SiteLink export field?
2. Does it distinguish between increases, decreases, and transfers?
3. How does it handle the first batch for a new acquisition (where there may be no prior increase date)?

**Assumption without answer:** SiteLink has a "last rate change date" field. For new acquisitions, use lease date as proxy (confirmed by Brian).

**Next step:** Ask Paul/Adam: what SiteLink fields are available for rate change history? Get a sample export.

**Priority:** HIGH — blocks MVP data pipeline.

---

### Gap 6: Historical ECRI Data Import

**Status:** Craig mentioned dumping historical ECRIs from SiteLink into our system during onboarding. Brian's Excel has historical data but in his own format.

**Why it matters:** Tenant history is critical for DM review ("what did we do to this customer last year?") and for the ECRI history screen.

**What we don't know:**
1. What format does SiteLink export historical rate changes in?
2. How far back does data go?
3. What fields are included? (date, previous rent, new rent, who approved, reason?)
4. Does Brian's Excel have additional history not in SiteLink?

**Assumption without answer:** We can import basic history (date, old rent, new rent, tenant ID) from SiteLink. Override reasons and approver data won't exist for historical records — only going forward in our system.

**Next step:** Ask Craig/Matt for a sample historical ECRI export from SiteLink. Understand the fields. Design import mapping.

**Priority:** MEDIUM — important for user confidence but not a launch blocker if we start fresh.

---

### Gap 7: CSV Export Format for SiteLink Upload

**Status:** Brian currently exports from SiteLink, runs his Excel, then uploads changes back. Our system needs to produce a file that SiteLink can ingest.

**Why it matters:** If the export format is wrong, Brian can't use our recommendations — they'd have to be manually re-entered into SiteLink, negating the efficiency gain.

**What we don't know:**
1. What format does SiteLink require for rate change uploads?
2. What columns? (tenant ID, new rent, effective date, etc.)
3. Are there validation rules?
4. Does SiteLink have an API, or is it strictly file-based?

**Assumption without answer:** CSV export with columns matching SiteLink's import template. Brian or Paul can provide the template.

**Next step:** Get the SiteLink upload template from Brian or from the SiteLink documentation. Match our export format.

**Priority:** HIGH — required for MVP. Without this, the module produces recommendations but can't execute them.

---

## Vacant Unit Pricing — Remaining Gaps

### Gap 8: Competitor Rate Data Source — DECISION MADE

**Status:** Decision: **Competitor data will come from either an external data feed (StorTrack) or a custom ManageSpace web scraper built internally.** No manual entry as primary source — we will provide the data to the customer.

**Why it matters:** Without competitor data, the "price to market" mode of the recommendation engine has nothing to work with.

**Approach:**
1. MVP: Build the competitor table UI and recommendation engine assuming data is populated
2. Data source: Integrate StorTrack feed (if available/affordable) OR build a custom scraper that pulls competitor rates from public listing sites
3. A/B/C tier assignment remains manual (Brian's team classifies competitors by quality + style + distance)
4. Rate data refreshed automatically; tier classification is a one-time setup per competitor

**Next step:** Still ask Brian on Feb 19: "How do you currently get competitor rates?" — useful context even though we'll provide the data pipeline.

**Priority:** MEDIUM for MVP (activity-based pricing works without it), HIGH for full vacant pricing value.

---

### Gap 9: Pricing Increment Calibration

**Status:** Brian described general principles (small units get small increments, large units get large increments, volume matters) but didn't provide specific numbers for a calibration table.

**Why it matters:** The recommendation engine needs to suggest a dollar amount, not just a direction. Without calibrated increments, suggestions may be too aggressive or too conservative.

**What we don't know:**
1. What's the typical weekly price change for a 5×5? ($3? $5? $10?)
2. For a 10×10? ($5? $10? $15?)
3. For a 10×30? ($20? $30? $50?)
4. What's the maximum single-week change Brian would ever make?
5. Does increment size vary by market (e.g., Charlotte vs Oklahoma)?

**Assumption without answer:** Use conservative defaults based on Brian's examples:

| Unit Size | Low Volume (<10 units) | High Volume (>20 units) |
|-----------|----------------------|------------------------|
| 5×5 | $5 | $3 |
| 5×10 | $10 | $5 |
| 10×10 | $15 | $10 |
| 10×15 | $20 | $10 |
| 10×20 | $30 | $15 |
| 10×30 | $50 | $20 |

Make these configurable. Let Brian adjust after he sees recommendations.

**Next step:** Ask Brian on Feb 19: "What's a typical weekly price change for different unit sizes? And what's the max you'd ever change in a single week?"

**Priority:** MEDIUM — needed for recommendation engine, but configurable defaults are safe starting point.

---

### Gap 10: Activity Data Granularity from SiteLink — ROUTING DECIDED

**Status:** Decision: **This data will flow through ManageSpace's platform (SiteLink → ManageSpace → ECRI/Pricing modules).** Paul needs to ensure the SiteLink sync captures tenant-level move-in and move-out dates so we can aggregate to unit group level for 7/14/30 day activity windows.

**Why it matters:** The entire vacant pricing workflow is built on activity signals. Without move-in/move-out data at the unit group level with dates, we can't calculate the activity metrics.

**Data requirements for Paul:**
1. Tenant-level move-in date (per tenant record)
2. Tenant-level move-out date (per tenant record)
3. Unit group assignment per unit (size + CC + floor + access)
4. Data freshness: daily minimum (real-time preferred)
5. Historical move-in/move-out records for at least 30 days back (90 preferred)

**Next step:** Include in consolidated data requirements doc for Paul. Must be in place before vacant pricing module can go live.

**Priority:** HIGH — blocks vacant pricing MVP. Include in Paul's requirements doc.

---

### Gap 11: 3-Year Historical Occupancy Data — ROUTING DECIDED

**Status:** Decision: **Paul must ensure SiteLink sync captures historical occupancy data.** This needs to be in the consolidated data requirements doc we deliver to Paul. Either SiteLink stores it directly (monthly snapshots per unit group) or Paul derives it from historical tenant move-in/move-out records during the initial data import.

**Why it matters:** The "store health overview" chart is the first thing Brian looks at. Without historical occupancy, this screen is empty.

**Data requirements for Paul:**
1. Monthly occupancy per unit group — 36 months back (3 years)
2. If SiteLink doesn't store monthly snapshots, derive from tenant move-in/move-out history
3. Also need: historical street rates and achieved rates per unit group per month (for the 3-line chart Brian uses)

**Next step:** Include in consolidated data requirements doc for Paul.

**Priority:** MEDIUM for MVP (activity-based workflow works without it), but the 3-year chart is high-value for Brian's workflow. Include in Paul's doc.

---

### Gap 12: Marina Pricing

**Status:** Bob said marinas are managed "very similarly" to storage but with no comps. Brian doesn't cover marinas and was surprised by the "no comps" claim.

**Why it matters:** Morningstar has marina properties that will eventually need pricing support.

**What we don't know:**
1. Who handles marina pricing? (Not Brian — someone else)
2. Do they actually use comps or not?
3. Is the ECRI workflow the same for marinas?
4. What are the "unit types" for marinas? (Slip sizes?)

**Assumption without answer:** Marinas are out of scope for April go-live. Same basic ECRI flow should work when we add them later.

**Next step:** Defer. When ready, schedule call with whoever manages marina pricing (possibly a marina-specific DM).

**Priority:** LOW — not in scope for go-live.

---

## Shared Platform Gaps

### Gap 13: Qlik Replacement Scope

**Status:** Brian uses Qlik (BI tool) for nearly everything — pricing dashboards, occupancy reporting, activity analysis, move-out factor tracking. He expressed strong interest in replacing it with ManageSpace.

**Why it matters:** If we can replace Qlik for Brian's workflows, that's a massive efficiency win and a strong proof point for the platform.

**What we don't know:**
1. What are all the dashboards/reports Brian uses in Qlik?
2. Which are most time-consuming or painful?
3. What data feeds into Qlik? (SiteLink exports? Other sources?)
4. Who else at Morningstar uses Qlik? (Just Brian, or DMs too?)

**Assumption without answer:** Build the ECRI and Vacant Pricing modules first. They naturally replace the core Qlik workflows Brian described. Full Qlik replacement is Phase 3+.

**Next step:** After go-live, audit Brian's Qlik usage: "Show me your top 5 most-used Qlik dashboards. Let's prioritize which ones to bring into ManageSpace."

**Priority:** LOW for MVP, HIGH for long-term platform value.

---

### Gap 14: User Roles and Permissions

**Status:** Three user types mentioned: Brian (corporate revenue management), DMs (district managers), store managers. DMs have "full authority" but Brian wants reason capture for their overrides.

**Why it matters:** The approval workflow needs role-based access: Brian creates batch → DMs review and modify → Brian finalizes.

**What we don't know:**
1. How many DMs are there? How many stores per DM?
2. Should DMs only see their own stores?
3. Can store managers access the ECRI module at all? (Brian suggested some experienced managers might)
4. Who can change settings? (Brian only? Or DMs too?)

**Assumption without answer:** Three roles: Admin (Brian — full access), DM (see/modify their stores only), Manager (read-only or no access). Settings changes = Admin only.

**Next step:** Ask Brian on Feb 19: "How many DMs do you have, and should each only see their own stores in the system?"

**Priority:** MEDIUM — needed before DM rollout, but Brian can be the only user for initial launch.

---

### Gap 15: Definitions Document

**Status:** Bob said he'd send a definitions document (achieved rate, projected rent, move-out factor, etc.). Bob confirmed on Feb 4 call he has it and will send.

**Why it matters:** Ensures our UI labels and calculations match Morningstar's terminology exactly. Wrong label = user confusion.

**What we don't know:**
1. Has the doc been received? (Bob said he'd send it after the Feb 4 call)
2. If received, is it comprehensive?

**Assumption without answer:** Use terminology from Brian's calls (unit group median, achieved rate, street rate, tenant vs street, etc.) which he's confirmed across two calls. Cross-reference with definitions doc when it arrives.

**Next step:** Follow up with Bob/Craig: "Did you send the definitions document? If not, could you send it before the Feb 19 call?"

**Priority:** MEDIUM — important for UI polish but not a build blocker.

---

## Recommended Agenda for Feb 19 Call

Time: 1:15 PM ET

| Min | Topic | Goal |
|-----|-------|------|
| 0–8 | Show Excel validation results | "We ran all 50 Cornelius tenants through our engine. **100% match on formula rows.** We also analyzed your 21 overrides — seasonal low-rate tenants getting 45–60%, low-occ dial-downs to 10–12%. Is Cornelius typical or an outlier for override rate?" |
| 8–12 | Tier 1 as attention flag | "Every Tier 1 tenant at Cornelius was overridden. Should we treat Tier 1 differently in the UI — more like a 'needs review' flag than a recommendation?" |
| 12–17 | Fund-level tier adjustments | "Do you want each tier independently adjustable by fund, or auto-proportional? Which funds need different settings now?" |
| 17–22 | SiteLink upload format | "What does the file look like that you upload back to SiteLink after running ECRIs?" |
| 22–27 | Competitor data source | "How do you currently get competitor rates? Can we import your existing comp data?" |
| 27–30 | Pricing increment calibration | "What's a typical weekly price change by unit size? What's the max?" |
| 30–35 | User roles | "How many DMs? Should each only see their stores? Any store managers need access?" |
| 35+ | Quick hits | Definitions doc status, historical data import format, unit group naming (we see 'Drive To Your Door', 'Heated & Cooled', 'Standard' — is this the standard pattern?) |

---

## Summary: What to Assume and Build

| Gap | Safe Assumption | Build Risk | Status |
|-----|----------------|------------|--------|
| Formula validation | ~~Our pseudocode matches Brian's verbal description~~ | ~~LOW~~ | **RESOLVED — 100% match** |
| Fund-level tiers | Independent overrides per fund, no auto-proportional. ~5 funds, changes annually. | LOW | **DECIDED** (Phase 2) |
| 75% occupancy | Binary threshold + configurable in settings UI | LOW | **DECIDED** (Phase 2) |
| Cross-month multi-unit | Flag based on full facility roster scan | LOW — simple query | Open |
| SiteLink data fields | Standard export has rate change dates, tenant details | MEDIUM — need to verify | Open |
| CSV export format | Match SiteLink import template | MEDIUM — need the template | Open |
| Competitor data | StorTrack feed or custom ManageSpace scraper — we provide the data | LOW | **DECIDED** |
| Pricing increments | Conservative defaults, make configurable | LOW — Brian adjusts after seeing output | Open |
| Activity data | Flows through ManageSpace platform (SiteLink → MS → modules) | LOW — include in Paul's requirements | **DECIDED — for Paul's doc** |
| Historical occupancy | Paul to extract from SiteLink — include in requirements doc | LOW — include in Paul's requirements | **DECIDED — for Paul's doc** |
| User roles | Admin + DM + Manager (read-only) | LOW — standard RBAC | Open |
| Marinas | Out of scope for go-live | NONE | Deferred |
| Qlik replacement | Not MVP scope | NONE | Deferred |
