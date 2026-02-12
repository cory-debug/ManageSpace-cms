# Open Questions Remaining — Post Feb 12 Call

**Last Updated:** February 12, 2026
**Context:** After two calls with Brian (Feb 4, Feb 12) and the initial interview (Jan 29 with Bob, Craig, Matt), most critical ECRI questions are resolved. This doc captures what's still open, why it matters, what to assume without answers, and recommended next steps.
**Next call:** Feb 19, 2026 at 1:15 PM ET with Brian

---

## Status of Previously Open Questions

### Resolved (Feb 12 Call)

| # | Question | Answer | Confidence |
|---|----------|--------|------------|
| A2 | "New rate" for Tier 2 — 20% or tier's own %? | **20% trial for all tiers** | Confirmed |
| A3 | "New rate" for Tier 3 — 20% or 15%? | **20% trial for all tiers** | Confirmed |
| A5 | Street rate ceiling — cap at street or manual? | **Manual judgment only** — no hard rule | Confirmed |
| B1 | Median — include or exclude current tenant? | **Include** current tenant | Confirmed |
| C1 | New acquisitions — how identified/handled? | **Use lease date** to batch all tenants into one cohort | Confirmed |
| D1 | Override frequency | **~20% (1 in 5)**, range 10–50% | Confirmed |
| D2 | Multi-unit rule — formal or judgment? | **Flag only**, no formula | Confirmed |
| D4 | Evaluation timing | **5–6 weeks before effective date**, DMs get ~1 week review | Confirmed |

### Partially Resolved

| # | Question | What We Know | What's Still Open |
|---|----------|-------------|-------------------|
| A1 | 75% occupancy — hard cutoff or gradient? | Hard cutoff **for now**, but Brian thinks it should be gradient based on store performance, unit group volume, unit size | Exact gradient logic TBD — safe to ship with binary 75% and iterate |
| C3 | Post-lease-up tagging and default % | Lease-up = manual/white-glove, 85–100% increases. Need facility flag + duration field. Seasonal low-rate = 50%+ starting point | Exact lease-up duration for Ortiz vs Crossing not confirmed. Seasonal flag threshold (tenure ~1yr + 50% spread) is Brian's estimate, not tested |

### Not Yet Addressed

| # | Question | Status |
|---|----------|--------|
| A4 | Percent delta formula sign convention | Assumed: (rate - reference) / reference. Negative = below. Positive = above. Validate against Column Z. |
| B2 | Unit group = our unit type exactly? | Assumed yes (size + CC + floor + access). Brian hasn't contradicted this. Need to verify no further splits (e.g., by building). |
| B3 | Excel Column Z example rows | Brian confirmed formula is in Z starting row 10+. We have the Cornelius file — need to extract and validate. |
| D3 | Tenure breakpoints for manual decisions | Brian says longer tenure = typically higher payer = lower increase. No formal breakpoints. Flag only. |

---

## ECRI Module — Remaining Gaps

### Gap 1: Exact Formula Validation Against Excel

**Status:** We have the Cornelius ECRI template file. Column Z has the formula from row 10+.

**Why it matters:** The 4-tier logic has been described verbally across two calls, but we haven't verified our pseudocode produces identical output to Brian's Excel for a real tenant row. One misplaced comparison operator or threshold value changes which tenants land in which tier.

**Assumption without answer:** Our pseudocode matches Brian's description. Build it, then validate against the Excel.

**Next step:** Extract 5–10 rows from the Cornelius file where Column Z formula is intact. Run through our engine. Compare. Bring discrepancies to Feb 19 call.

**Priority:** HIGH — do this before Feb 19 call.

---

### Gap 2: Fund-Level Tier Adjustment Mechanics

**Status:** Brian wants fund-level tier percentage adjustments (e.g., change baseline from 20% to 25% for a specific fund) with store-level overrides within a fund. He also suggested tiers might move together proportionally when the baseline changes.

**Why it matters:** This affects how the settings UI works and whether we need a "lift factor" or just independent tier overrides per fund.

**What we don't know:**
1. Should other tiers auto-adjust when baseline changes? (Brian said "probably, yeah" but hadn't thought deeply about it)
2. How many funds does Morningstar have? How often would they change fund-level settings?
3. Are there specific funds right now that need different baselines? Which ones?

**Assumption without answer:** Build independent tier percentage overrides per fund (no auto-proportional adjustment). Simpler to implement, easier to understand. If Brian later wants proportional adjustment, add it as a "lock ratio" toggle.

**Next step:** Ask Brian on Feb 19: "For fund-level tier adjustments — do you want each tier independently adjustable, or should they auto-scale when you change the baseline? And which funds need different settings right now?"

**Priority:** MEDIUM — Phase 2 feature, but good to get clarity before building settings UI.

---

### Gap 3: Occupancy Threshold Gradient

**Status:** 75% is the current hard cutoff for Tier 1 eligibility. Brian thinks it should be smarter — varying by store occupancy, unit group volume, and unit size.

**Why it matters:** A binary 75% threshold may be too crude for an 83-facility portfolio with very different store profiles. Small unit groups (3 units) behave differently from large ones (100 units) at the same occupancy percentage.

**What we don't know:**
1. What dimensions should the gradient consider? (Brian mentioned store occupancy, unit group volume, unit size)
2. What would the actual gradient look like? (e.g., for small unit groups, accept 66% because 2/3 occupied is actually tight)
3. Is this something Brian wants to configure or wants us to model?

**Assumption without answer:** Ship with binary 75% (confirmed as current practice). Add configuration capability so Brian can change the threshold per facility or unit group size range when ready. Don't build a gradient engine until Brian defines what "gradient" means to him.

**Next step:** Not urgent for MVP. Revisit in Phase 2 after Brian has used the system and can identify where 75% is too crude.

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

### Gap 8: Competitor Rate Data Source

**Status:** Brian references competitor rates in his weekly pricing, classified as A/B/C tiers. We don't know how this data gets into the system.

**Why it matters:** Without competitor data, the "price to market" mode of the recommendation engine has nothing to work with.

**What we don't know:**
1. Where does Brian currently get competitor rates? (Manual checks? Scraper? Third-party data?)
2. How often are comp rates updated?
3. Who maintains the competitor list and tier assignments?
4. Is there an existing competitor database we can import from?

**Assumption without answer:** Manual entry for MVP. Brian or his team enters comp rates periodically. We provide the table; they populate it.

**Next step:** Ask Brian on Feb 19: "How do you currently get competitor rates? Is there a spreadsheet or database we can import from?"

**Priority:** MEDIUM — MVP works without it (activity-based pricing still functions), but comp data makes the tool significantly more useful.

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

### Gap 10: Activity Data Granularity from SiteLink

**Status:** Brian uses 7/14/30 day move-in and move-out counts per unit group. We need this data from SiteLink.

**Why it matters:** The entire vacant pricing workflow is built on activity signals. Without move-in/move-out data at the unit group level with dates, we can't calculate the activity metrics.

**What we don't know:**
1. Does SiteLink export move-in and move-out dates per tenant?
2. Can we derive unit-group-level activity from tenant-level data?
3. What's the data freshness? (Real-time? Daily? Weekly?)
4. Is this available via API or only file export?

**Assumption without answer:** SiteLink has tenant-level move-in/move-out dates. We aggregate to unit group level. Data is at least daily.

**Next step:** Confirm with Paul/Adam: what tenant activity data is available from SiteLink and how fresh is it?

**Priority:** HIGH — blocks vacant pricing MVP.

---

### Gap 11: 3-Year Historical Occupancy Data

**Status:** Brian uses a 3-year monthly occupancy chart as the starting point for his pricing workflow.

**Why it matters:** The "store health overview" chart is the first thing Brian looks at. Without historical occupancy, this screen is empty.

**What we don't know:**
1. Does SiteLink store historical occupancy by month per unit group?
2. If not, can we derive it from tenant move-in/move-out dates?
3. Do we have 3 years of data, or does it start from when Morningstar joined SiteLink?

**Assumption without answer:** We can derive monthly occupancy from tenant activity data if SiteLink doesn't store it directly. May need to build during initial data import.

**Next step:** Check with Paul: is historical occupancy available per unit group, or do we need to reconstruct it?

**Priority:** MEDIUM — nice for MVP, but the activity-based workflow (7/14/30 day) can function without the 3-year chart.

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
| 0–5 | Show Excel validation | "We ran 5 rows from the Cornelius file through our engine. Here's where we match and where we differ." |
| 5–10 | Fund-level tier adjustments | "Do you want each tier independently adjustable by fund, or auto-proportional? Which funds need different settings now?" |
| 10–15 | SiteLink upload format | "What does the file look like that you upload back to SiteLink after running ECRIs?" |
| 15–20 | Competitor data source | "How do you currently get competitor rates? Can we import your existing comp data?" |
| 20–25 | Pricing increment calibration | "What's a typical weekly price change by unit size? What's the max?" |
| 25–30 | User roles | "How many DMs? Should each only see their stores? Any store managers need access?" |
| 30+ | Quick hits | Definitions doc status, historical data import format, any other gaps |

---

## Summary: What to Assume and Build

| Gap | Safe Assumption | Build Risk |
|-----|----------------|------------|
| Formula validation | Our pseudocode matches Brian's verbal description | LOW — validate against Excel before Feb 19 |
| Fund-level tiers | Independent overrides per fund, no auto-proportional | LOW — easy to add later |
| 75% occupancy | Binary threshold | LOW — configurable field, easy to change |
| Cross-month multi-unit | Flag based on full facility roster scan | LOW — simple query |
| SiteLink data fields | Standard export has rate change dates, tenant details | MEDIUM — need to verify |
| CSV export format | Match SiteLink import template | MEDIUM — need the template |
| Competitor data | Manual entry for V1 | LOW — always works as fallback |
| Pricing increments | Conservative defaults, make configurable | LOW — Brian adjusts after seeing output |
| Activity data | Tenant-level move-in/out dates available from SiteLink | MEDIUM — need to verify |
| Historical occupancy | Can derive from tenant data if not stored directly | LOW — can reconstruct |
| User roles | Admin + DM + Manager (read-only) | LOW — standard RBAC |
| Marinas | Out of scope for go-live | NONE |
| Qlik replacement | Not MVP scope | NONE |
