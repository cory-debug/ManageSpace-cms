# Vacant Unit Pricing Module — Full Build Plan

**Last Updated:** February 12, 2026
**Sources:** Feb 4 call (Brian + Bob), Feb 12 call (Brian), VACANT_PRICING_LOGIC.md, BRIEF.md, existing vacant-pricing-dummy.ts
**Status:** Build-ready for MVP. Open questions in `open-questions-remaining.md`.

---

## 1. Operational Logic Map

### 1.1 How Brian Actually Sets Street Rates (Weekly Process)

Brian's weekly pricing process is **activity-driven, not formula-driven**. There is no single formula like ECRI — it's a structured analysis workflow with judgment at the end. Our module needs to replicate this workflow and surface the right data, not just spit out a number.

#### Step 1: Overall Store Health Check
- Look at a **3-year occupancy trend** chart by month
- Street rates and achieved rates layered as lines on the same chart
- Assess general optimism/pessimism about the store's trajectory

> Brian [23:42]: *"First we start with overall trends of the store. So we have a chart that looks at a three year look of occupancy, unit occupancy by month, we have our street rates layered in that with a line and then our achieve rate."*

#### Step 2: Recent Trend (90-Day Look)
- Compare current month to the prior 3 months (e.g., for February: look at Nov, Dec, Jan)
- Compare to the same season last year (e.g., what was last winter's trend?)
- At what point did rate dips happen historically?

> Brian [24:43]: *"Right now for February I'll look at how did November, December, January — that gives me just a feeling of where it should be."*

#### Step 3: Activity Analysis (7/14/30 Day Windows)
- Look at move-ins and move-outs in 7-day, 14-day, and 30-day windows
- Calculate net activity (ins minus outs) at each window
- Identify which unit groups are trending up (more ins) vs down (more outs)

> Brian [25:49]: *"I do a 7 day, 14 day and a 30 day look of ins, outs, nets just to see trend."*

#### Step 4: Unit Group Level Trending
- Drill into individual unit groups
- Which have more outs than ins in the last 7 days?
- These are the ones that need price changes

> Brian [25:49]: *"Then I look at each individual unit group to see which ones are trending."*

#### Step 5: Pricing Decision Logic

**Two modes depending on occupancy:**

**High occupancy (pricing to activity):**
- When a unit group has tight vacancy (e.g., 28/30 occupied, 2 vacants)
- Recent activity shows consistent demand (move-ins outpacing move-outs)
- Less concerned about competitors — price to capture the demand
- Incremental increases based on recent movement

> Brian [27:02]: *"If I have 30 units and 28 are occupied, I have two vacants and recently it's been three, four, two — it's been performing well. I'm really not as concerned what the competitors are doing."*

**Low occupancy (pricing to market/competitors):**
- When at ~75% occupied or lower
- Pay much more attention to competitor rates
- Use price to stimulate demand

> Brian [27:02]: *"On the flip side, let's say I'm at 75% occupied. I'm going to pay way more attention to those competitors because that's how I can play off the demand of stimulating demand by lowering price."*

#### Step 6: Achieved Rate Gap Closure
- Street rates in the industry are typically lower than achieved rates
- Goal: grow achieved rate by gradually pushing street rates higher
- Close the gap between street and achieved

> Brian [28:06]: *"Our achieve rate is $99 and our street's $69. I want to find my opportunities to get higher toward that achieved to shorten that gap."*

#### Step 7: Increment Sizing

The size of price changes depends on:

1. **Unit size** — larger units warrant larger $ increments
   - 5×5 at $79: increase might be $5–10
   - 10×30 ground, high price: increase could be $30–50

2. **Unit volume** — more units = smaller increments; fewer units = larger increments
   - 20 five-by-fives: small increments ($5)
   - 3 ten-by-thirties: larger increments ($30–50)

3. **Margin of last change** — what was the last increase? Stack on top of it
   - If you raised $10 last week and had another move-in this week → raise again

4. **Unit group stacking** — maintain pricing hierarchy
   - Ground > Interior (higher floors) in price
   - Interior > Drive-up (outside units, cheaper due to no climate + security concerns)
   - Never let a less-desirable unit group price above a more-desirable one

> Brian [29:07]: *"Your grounds are going to be higher than your interior... drive-up outside units are obviously priced lower."*
> Brian [30:06]: *"I'm not going to put [a 5×5] up 20 bucks... but if I have a lower volume of a 10×30 ground, big unit, high price, one or two left... potentially 30, 40, $50 increase."*

#### Step 8: Competitor Analysis
- Look at competitor high/low/average rates
- Competitors classified into A/B/C tiers
- Weight based on relevance (see 1.3 below)

### 1.2 Competitor Tier System (A/B/C)

Competitors are classified into three tiers based on a **combined assessment** of quality, style, and distance:

**Tier A — Primary competitor:**
- Top comp across all factors combined
- Similar quality, modern facility, similar unit mix
- Close proximity
- "What is our top comp?"
- Mix of REITs (Extra Space, CubeSmart, Public Storage) and quality independents

**Tier B — Secondary competitor:**
- Still a real competitor — "people could walk in and say I'm going here or there"
- Could be high quality but farther away, or closer but mid-tier quality

**Tier C — Tertiary:**
- On the radar but not a major factor
- Low-quality mom-and-pop, or decent but too far away

> Brian [33:46]: *"A is all of those factors combined. What is our top comp? B is still a competitor... C is just kind of on the list but not as much of a factor."*

**Comp mix:** Roughly half REITs, half local/mom-and-pop across their portfolio.

> Brian [33:46]: *"The volume of REITs that fall into there, it's about half and half between the big REITs being general comps and the other half being mom and pops or local ones."*

**Distance:** Comp within a "small circle" — won't comp against something 20 miles across town. In saturated markets, may have another Morningstar location comping to the same competitors.

### 1.3 Competitor Weighting

**Current placeholder in our code:** Distance-only (1mi=100%, 2mi=75%, 3mi=50%, 4mi=25%).

**Brian's actual approach:** Quality + style + distance combined, then tiered into A/B/C. The tier IS the weight — not a separate distance calculation.

**Proposed implementation:**
- Each competitor gets an A/B/C tier (manual assignment by Brian's team)
- Tier maps to a weight: A = 1.0, B = 0.6, C = 0.25 (configurable)
- Distance is implicit in the tier assignment (a far-away high-quality comp might be B instead of A)
- For market rate calc: `weightedAvg = sum(compRate × tierWeight) / sum(tierWeight)`

### 1.4 Unit-Level Pricing Factors

#### Floor / Access Premiums
Brian doesn't currently do granular unit-level pricing (floor, proximity to entrance) but **wants to**.

> Brian [35:01]: *"I would like to do that... they had a name like a Blue Star unit. Right by the elevator, right by the door — you could charge a premium."*

**Current reality:**
- Climate control is the main differentiator (CC units higher than non-CC)
- Drive-ups generally cheaper (no CC, security concerns)
- Some exceptions: drive-ups popular in suburban/rural areas for landscapers

> Brian [39:08]: *"In general drive-ups are cheaper because they're not climate controlled and there's a security factor."*

**Additional pricing segmentation Brian wants:**
- Units with power (currently broken out in SiteLink as duplicate unit groups)
- Units with alarms
- Conversion units (different from standard)
- "Blue Star" premium units (near entrance/elevator)

> Brian [36:47]: *"Additional pricing segmentation... units with power, sometimes units with alarms... conversion units."*

**Phase 2 opportunity:** Build the infrastructure for unit-level premiums/discounts. Even if not used day one, having fields for `proximityToEntrance`, `hasPower`, `hasAlarm`, `isConversion` sets us up.

#### Odd Unit Sizes
Group to closest standard size. E.g., 7.5×10 → comp against 10×10 group.

> Brian [40:13]: *"Just closest main group. Usually there's not as many of them."*

People are most familiar with standard sizes (5×5, 5×10, 10×10, 10×15, 10×20, 10×30). Odd sizes slot into the nearest standard for pricing comparison.

### 1.5 Brian's Desired State — Alert-Driven Pricing

Brian currently spends time manually loading each store in Qlik, reviewing dashboards, calibrating himself to the situation. He wants the system to **tell him what needs attention**.

> Brian [01:01:33]: *"Instead of spending a couple minutes each store calibrating myself to what's going on... I would like to be directed and focused into logging in... these are your first four stores and these are the five unit groups that need attention."*

**Alert triggers Brian described:**
- Fully occupied unit group that suddenly had 3 move-outs over the weekend → artificially high street rate with no availability behind it
- Unit group with outsized activity (way more ins or outs than normal)
- Competitor rate changes
- Street rate set too high relative to zero demand for that unit group

---

## 2. Screen-by-Screen Breakdown

### Screen 1: Weekly Pricing Dashboard (Main Workflow)

**Layout:** Left panel (facility list with health indicators) + Right panel (unit group pricing for selected facility)

#### Left Panel — Facility List

**Each facility card:**
- Facility name
- Overall occupancy (% + trend arrow up/down/flat)
- Unit groups needing attention (count + most urgent)
- Last price change date
- Alert badges: "3 unit groups trending down" / "New competitor data"

**Sorting:** By attention needed (most alerts first), or by occupancy (lowest first)

**Filters:** By fund, by DM, by market/region

#### Right Panel — Facility Pricing View

**Section A: Store Health Overview**
- 3-year occupancy trend chart (line chart, monthly)
- Street rate line overlaid
- Achieved rate line overlaid
- Current month highlighted
- 90-day trend indicator (up/down/flat)

**Section B: Activity Dashboard**
- Table or cards showing 7-day / 14-day / 30-day activity:

| Window | Move-Ins | Move-Outs | Net | Trend |
|--------|----------|-----------|-----|-------|
| 7 day  | 5        | 2         | +3  | up    |
| 14 day | 8        | 6         | +2  | up    |
| 30 day | 15       | 14        | +1  | flat  |

**Section C: Unit Group Pricing Table**

The core of the weekly workflow. One row per unit group.

| Column | Description |
|--------|-------------|
| Unit group | Size + CC + floor + access (e.g., "10×10 CC Ground Interior") |
| Total units | Count |
| Occupied | Count |
| Vacant | Count |
| Occupancy % | Color coded (>90% green, 75-90% amber, <75% red) |
| 7-day net | +/- indicator |
| 14-day net | +/- indicator |
| 30-day net | +/- indicator |
| Current street rate | $XXX |
| Achieved rate (median) | $XXX |
| Street vs Achieved gap | % — how far street is below achieved |
| Comp A rate | $XXX (if configured) |
| Comp B avg | $XXX |
| Last change | Date + amount + direction (e.g., "Feb 5 +$10") |
| **Recommended** | System suggestion (see 2.1 below) |
| **Override** | Editable field — what Brian actually sets |
| **Final** | Override if set, else Recommended |
| Alert | Flag icon if unit group needs attention |

**Expanded unit group detail (click row):**
- Full activity log: recent move-ins and move-outs with dates
- Historical price changes for this unit group (last 6 months)
- Competitor breakdown: all A/B/C comps with their rates for this size
- Pricing hierarchy check: is this unit group priced correctly relative to similar groups? (ground > interior > drive-up)
- Individual vacant units: list with any special attributes (power, alarm, proximity)

**Section D: Pricing Hierarchy View**
- Visual showing the unit group "stack" for this facility
- Ground CC > Ground NCC > Interior CC > Interior NCC > Drive-up
- Flag if any group violates the expected hierarchy
- Helps Brian ensure pricing makes sense across all groups

### 2.1 Recommendation Engine Logic (MVP)

For MVP, the system produces a **directional recommendation** (increase / decrease / hold) with a suggested amount, based on:

```
function recommendStreetRate(unitGroup, facilityTrend, activity, competitors):

    // 1. Determine pricing mode
    if unitGroup.occupancy > 0.90:
        mode = "PRICE_TO_ACTIVITY"  // less weight on comps
    elif unitGroup.occupancy < 0.75:
        mode = "PRICE_TO_MARKET"    // heavy weight on comps
    else:
        mode = "BALANCED"

    // 2. Activity signal
    if activity.net7day > 0 AND activity.net14day > 0:
        activitySignal = "INCREASE"
    elif activity.net7day < 0 AND activity.net14day < 0:
        activitySignal = "DECREASE"
    else:
        activitySignal = "HOLD"

    // 3. Market signal (when in PRICE_TO_MARKET or BALANCED)
    compAvg = weightedCompAverage(competitors, unitGroup.size)
    if unitGroup.streetRate > compAvg * 1.10:
        marketSignal = "DECREASE"  // we're >10% above comps
    elif unitGroup.streetRate < compAvg * 0.95:
        marketSignal = "INCREASE"  // we're >5% below comps
    else:
        marketSignal = "HOLD"

    // 4. Achieved rate gap signal
    if unitGroup.streetRate < unitGroup.achievedMedian * 0.85:
        achievedSignal = "INCREASE"  // street way below achieved
    else:
        achievedSignal = "HOLD"

    // 5. Combine signals based on mode
    if mode == "PRICE_TO_ACTIVITY":
        primary = activitySignal
        secondary = achievedSignal
    elif mode == "PRICE_TO_MARKET":
        primary = marketSignal
        secondary = activitySignal
    else:
        primary = activitySignal
        secondary = marketSignal

    // 6. Size increment based on unit size and volume
    baseIncrement = getBaseIncrement(unitGroup.size, unitGroup.totalUnits)
    // Small units, high volume: $5
    // Medium units: $10
    // Large units, low volume: $20-50

    // 7. Final recommendation
    if primary == "INCREASE":
        return { direction: "INCREASE", amount: baseIncrement, confidence: "HIGH" if secondary agrees else "MEDIUM" }
    elif primary == "DECREASE":
        return { direction: "DECREASE", amount: baseIncrement, confidence: "HIGH" if secondary agrees else "MEDIUM" }
    else:
        return { direction: "HOLD", amount: 0, confidence: "HIGH" }
```

**This is a starting point.** The recommendation is a suggestion that Brian reviews and overrides. Over time, as we capture his decisions, we can learn and refine.

### Screen 2: Competitor Management

**Purpose:** Configure and maintain competitor data per facility.

**Layout:** Facility selector → Competitor table

| Column | Data |
|--------|------|
| Competitor name | Editable |
| Address | |
| Distance | Miles (auto from geocode or manual) |
| Tier | A / B / C dropdown |
| Rates by unit size | Editable grid: 5×5, 5×10, 10×10, 10×15, 10×20, 10×30, etc. |
| Last updated | Date |
| Source | Manual / Scraper / SiteLink |

**Actions:**
- Add competitor
- Edit tier/rates
- Mark as inactive
- Bulk rate update (import from scraper)

### Screen 3: Pricing History

**Purpose:** Track what prices were set when, and what the outcomes were.

**Layout:** Facility + unit group selector → History table

| Column | Data |
|--------|------|
| Date | When price was changed |
| Unit group | Which unit group |
| Previous rate | $XXX |
| New rate | $XXX |
| Change | +$XX (+X%) |
| Reason | System recommendation / Manual override |
| Outcome (30 day) | Move-ins after change, occupancy change |
| Changed by | User |

**Chart:** Street rate over time for selected unit group, with move-in volume overlaid.

### Screen 4: Pricing Settings

**Section 1: Competitor Configuration**
- Default tier weights (A=1.0, B=0.6, C=0.25)
- Max comp distance (default: 4 miles)

**Section 2: Pricing Thresholds**
- High occupancy threshold (default: 90%)
- Low occupancy threshold (default: 75%)
- Activity windows (7/14/30 day — configurable)

**Section 3: Increment Rules**
- Base increment by unit size range
- Volume adjustment factor
- Max single-week change (guard rail)

**Section 4: Unit Group Hierarchy**
- Define the expected pricing order (ground CC > ground NCC > interior CC > etc.)
- System flags violations

**Section 5: Pricing Segmentation (Phase 2)**
- Premium unit attributes (power, alarm, Blue Star, conversion)
- Premium/discount percentages per attribute

---

## 3. Data Requirements

### 3.1 From PMS (SiteLink → ManageSpace Platform → Pricing Module)

Data flows through ManageSpace's platform: SiteLink → ManageSpace sync → available to all modules. Paul's team must ensure these fields are captured in the sync.

| Field | Source | Notes | Paul's Requirement |
|-------|--------|-------|--------------------|
| Unit group definition | SiteLink | Size, CC, floor, access | Standard |
| Total units per group | SiteLink | | Standard |
| Occupied units per group | SiteLink | | Standard |
| Street rate per group | SiteLink / manual | Brian sets weekly | Standard |
| Move-in dates (recent) | SiteLink | For 7/14/30 day activity | **CRITICAL — must include per-tenant dates** |
| Move-out dates (recent) | SiteLink | For 7/14/30 day activity | **CRITICAL — must include per-tenant dates** |
| Historical occupancy | SiteLink | Monthly, 3-year lookback | **Must extract or derive from tenant history** |
| Historical street rates | SiteLink / manual | Monthly, 3-year lookback | **For store health chart** |
| Historical achieved rates | Calculated | Monthly, 3-year lookback | **Derive from tenant rent snapshots** |
| Current tenant rents | SiteLink | For achieved rate calc | Standard |
| Unit attributes | SiteLink | Power, alarm (where broken out) | Phase 2 |

### 3.2 From Competitor Sources

| Field | Source | Notes |
|-------|--------|-------|
| Competitor name + address | StorTrack feed or ManageSpace scraper | Auto-populated |
| Competitor tier (A/B/C) | Manual | Combined quality + style + distance — one-time setup per competitor |
| Rates by unit size | StorTrack feed or ManageSpace scraper | Auto-refreshed |
| Sold-out status | StorTrack feed or ManageSpace scraper | If size is unavailable |

**Decision:** Competitor rate data will come from either an external data feed (StorTrack) or a custom ManageSpace web scraper — we provide the data, not manual entry. A/B/C tier classification remains manual (Brian's team assigns based on quality + style + distance).

### 3.3 Calculated Fields

| Field | Calculation |
|-------|-------------|
| Occupancy % | `occupied / total` per unit group |
| 7/14/30 day activity | Count of move-ins and move-outs in each window |
| Net activity | `moveIns - moveOuts` per window |
| Achieved rate (median) | `MEDIAN(currentRent)` for occupied units in group |
| Street vs achieved gap | `(streetRate - achievedMedian) / achievedMedian` |
| Weighted comp average | `sum(compRate × tierWeight) / sum(tierWeight)` |
| Pricing mode | Activity vs Market vs Balanced (based on occupancy) |
| Recommendation | Direction + amount + confidence |
| Hierarchy violation | Boolean: is this group priced above a higher-priority group? |

### 3.4 Stored Per Price Change

| Field | Notes |
|-------|-------|
| Date | When change was made |
| Unit group | Which group |
| Previous rate | Old street rate |
| New rate | New street rate |
| Source | Recommendation / Manual |
| Recommendation was | What system suggested |
| Override reason | If manual, why |
| Changed by | User |
| Snapshot | Occupancy, activity, comp data at time of change |

---

## 4. MVP vs Phase 2 Scope

### MVP (Target: April 2026)

- [ ] Facility list with occupancy indicators and attention flags
- [ ] Store health chart: 3-year occupancy + street + achieved (line chart)
- [ ] Activity dashboard: 7/14/30 day move-in/move-out/net per facility
- [ ] Unit group pricing table with all columns from Section 2
- [ ] Occupancy-based pricing mode indicator (activity vs market vs balanced)
- [ ] Basic recommendation engine (directional: increase/decrease/hold + amount)
- [ ] Override field per unit group (Final = Override ?? Recommended)
- [ ] Competitor table with A/B/C tiers and rates (data from StorTrack feed or ManageSpace scraper; tier assignment manual)
- [ ] Weighted comp average per unit size
- [ ] Pricing hierarchy display (ground > interior > drive-up)
- [ ] Hierarchy violation flags
- [ ] Price change history log
- [ ] CSV export of current pricing decisions

**Cut for speed:**
- Unit-level pricing (premiums for power, alarm, proximity)
- Predictive demand modeling
- Revenue optimization (expected move-ins × price)
- Seasonal demand curves

### Phase 2 (Post Go-Live)

- [ ] Unit-level pricing segmentation (power, alarm, Blue Star, conversion)
- [ ] Floor/access premium configuration
- [ ] Automated competitor rate scraping (if not done in MVP via StorTrack)
- [ ] Seasonal demand overlay (portfolio baseline + facility adjustment)
- [ ] Price elasticity model (move-ins vs price at portfolio level)
- [ ] Optimal price calculation (revenue-maximizing recommendation)
- [ ] Expected move-ins at recommended price
- [ ] Alert system: unit groups needing immediate attention
- [ ] Multi-facility comparison: "How are all 10×10s priced across the portfolio?"
- [ ] Move-out factor analysis per price change

### Phase 3 (Future)

- [ ] AI-powered demand forecasting (replace seasonal curves with ML model)
- [ ] Dynamic pricing (auto-adjust based on real-time activity)
- [ ] Competitor monitoring dashboard (track comp price changes over time)
- [ ] A/B testing: set different prices at similar stores, measure outcomes
- [ ] Budget integration: feed pricing projections into financial planning
- [ ] Replace Qlik pricing dashboards entirely
- [ ] Marina pricing support (same workflow, different comp approach)

---

## 5. Divergence from Current Codebase

**Current placeholder (`vacant-pricing-dummy.ts`):**
- Hardcoded seasonal demand curve (peaks Jun at 1.22, low Dec at 0.85)
- Default elasticity model (baseDemand: 8, pivotPrice: $120, elasticity: 2.2)
- Price search range: $80–$220
- Revenue optimization: `price × expectedMoveIns`

**What Brian actually does:**
- No seasonal demand formula — uses 3-year trend charts and seasonal intuition
- No elasticity model — uses activity signals (7/14/30 day ins/outs)
- No price optimization — uses judgment based on activity mode vs market mode
- Competitor analysis is tiered (A/B/C), not distance-weighted

**Approach for MVP:** Replace the demand-curve/elasticity model with Brian's actual workflow:
1. Activity-based signals (7/14/30 day)
2. Occupancy-driven pricing mode (activity vs market)
3. Competitor tier weighting (A/B/C, not distance bands)
4. Increment sizing by unit size and volume
5. System generates a recommendation, Brian overrides as needed

Keep the elasticity/demand infrastructure in the codebase for Phase 2 — it's not wrong, it's just not how Morningstar works today. Other customers may want it.

---

## 6. Key Quotes Reference

| Topic | Quote | Source |
|-------|-------|--------|
| 3-year occupancy trend | "A chart that looks at a three year look of occupancy... street rates layered... achieve rate" | Brian, Feb 12 |
| 90-day recent trend | "For February I'll look at Nov, Dec, Jan — gives me a feeling of where it should be" | Brian, Feb 12 |
| 7/14/30 activity | "A 7 day, 14 day and a 30 day look of ins, outs, nets just to see trend" | Brian, Feb 12 |
| Unit group trending | "Look at each individual unit group to see which ones are trending" | Brian, Feb 12 |
| Price to activity | "If I have 28 occupied out of 30... I'm not as concerned what the competitors are doing" | Brian, Feb 12 |
| Price to market | "At 75% occupied, going to pay way more attention to competitors" | Brian, Feb 12 |
| Achieved rate gap | "I want to find opportunities to get higher toward that achieved to shorten that gap" | Brian, Feb 12 |
| Increment sizing | "5×5 at $79, not going to put up $20... but 10×30 ground, one or two left, potentially $30-50" | Brian, Feb 12 |
| Unit stacking | "Grounds higher than interior... drive-up outside units obviously priced lower" | Brian, Feb 12 |
| Comp tiers A/B/C | "A is all those factors combined — our top comp. B is still a competitor. C is on the list but not major" | Brian, Feb 12 |
| Comp mix | "About half and half between big REITs and mom and pops" | Brian, Feb 12 |
| Drive-ups cheaper | "In general drive-ups are cheaper... not climate controlled, security factor" | Brian, Feb 12 |
| Blue Star premium | "Right by the elevator, right by the door — you could charge a premium" | Brian, Feb 12 |
| Additional segmentation | "Units with power, sometimes units with alarms... conversion units" | Brian, Feb 12 |
| Odd sizes | "Just closest main group. Usually not as many of them" | Brian, Feb 12 |
| Alert-driven | "Have the system tell me what needs to be worked on" | Brian, Feb 12 |
| SiteLink limitations | "Rented last six weeks, moved out last six weeks, date of last change, totals — you can't price on that" | Brian, Feb 12 |
| Marinas | Brian doesn't cover marinas; surprised Bob said no comps — needs follow-up | Brian, Feb 12 |
