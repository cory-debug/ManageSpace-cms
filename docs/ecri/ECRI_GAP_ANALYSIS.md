# ECRI: Spec vs Current — Gap Analysis

This doc lists **where the ECRI_SPEC.md has less capability** than the current ECRI implementation, so we keep the best of both when aligning.

---

## Current capabilities to KEEP (spec doesn’t cover or is simpler)

### Portfolio & navigation
- **Facility list + slide-out panel** — Current: choose facility, open panel with that facility’s recommendations. Spec: single vertical list of cards, no facility selector. **Keep:** facility list and panel.
- **Corporate vs Store manager view** — Current: “View as store manager” / “View as corporate”, manager banner, single-location view. Spec: no roles. **Keep:** both views.
- **View History** — Current: link to ECRI history page. Spec: no history link. **Keep.**

### Recommendation model
- **Three stances (Conservative / Baseline / Aggressive)** — Current: user picks which stance to approve; each has different $ and churn. Spec: single “recommended rate” and Accept/Modify/Decline. **Keep:** stance selector and per-stance amounts.
- **Cohort grouping** — Current: Long-tenure, Large gap, Post-promo, High risk with confidence badges. Spec: filter tabs [All] [High] [Medium] [Low] by confidence only. **Keep:** cohorts; add confidence filter as an extra.
- **Rich rate context** — Current: Avg Achieved, Tenant Rate, Street Rate, Comp Avg columns; tenure; unit type features; occupancy %. Spec data model: only currentRate, recommendedRate, confidence, primaryDriver, factors. **Keep:** all current columns and context.

### Explainer & transparency
- **Market rate / comp table** — Current: full competitor table with Quality (A/B/C), distance, rate, weight, last seen. Spec: no comp-level detail. **Keep:** comp table and Quality.
- **“Why” text** — Current: “Supports increase” / “Reasons for caution” with factor reasons. Spec: factor impact bars + dollar impact + Primary Driver callout. **Combine:** keep our reasons; add spec-style factor bars and primary driver where we can.

### Actions & workflow
- **No Increase options** — Current: Delay 30 days, Delay 90 days, Never Increase (with descriptions). Spec: just “Decline”. **Keep:** full No Increase menu.
- **Modify with reason (manager)** — Current: manager must pick a reason code when modifying; adjustment cap. Spec: no roles or caps. **Keep:** manager reason + cap.
- **Undo after approve** — Current: toast with Undo. Spec: actioned card only. **Keep:** undo.
- **Settings & facility overrides** — Current: portfolio + facility-level overrides (e.g. gap capture). Spec: no settings. **Keep:** existing settings.

### Data & UX
- **ECRI history sparkline** — Current: per-customer history in table. Spec: no per-customer history. **Keep:** sparkline.
- **4 stat cards** — Current: Pending ECRIs, Monthly Opportunity, Facilities, High Risk. Spec: 3-column stats (e.g. total, high confidence, projected impact). **Keep:** all four; can restyle to match spec spacing/typography.

---

## Where we’re aligning TO the spec

- **Visual design system** — Spec: indigo/purple primary, slate-50/100/200 neutrals, emerald/amber/red confidence, typography scale, spacing. We’ll apply these while keeping dark theme optional or offering light theme.
- **Bulk action banner** — Spec: gradient banner + CTA (e.g. “Accept all high confidence”). We’ll add a prominent banner and wire to “Approve all” or similar.
- **Confidence filter tabs** — Spec: [All] [High] [Medium] [Low]. We’ll add these to filter by confidence in addition to cohorts.
- **Explainer pattern** — Spec: factor bars + dollar impact + Primary Driver callout. We’ll add impact-style bars and a primary driver line from our existing factors.
- **Card-like styling** — Where we keep the table, we can style rows/sections to feel more like spec cards (rounded, borders, padding).
- **Footer** — Spec: “Managed Space Revenue Intelligence • Transparent AI Pricing”. We’ll add a footer.

---

## Summary

| Area              | Spec has less / different     | Our approach                    |
|-------------------|-------------------------------|---------------------------------|
| Layout            | Single list, no facility pick | Keep facility list + panel      |
| Stances           | One recommended rate          | Keep 3 stances + selector       |
| Cohorts           | Confidence tabs only          | Keep cohorts + add confidence tabs |
| Comp detail       | None                          | Keep comp table + Quality       |
| No Increase       | Just “Decline”                | Keep Delay 30/90/Never         |
| Manager workflow  | None                          | Keep manager view + reason + cap |
| Undo              | None                          | Keep undo toast                 |
| History           | None                          | Keep history link + sparkline   |
| Explainer         | Bars + $ impact + driver      | Add bars + driver; keep reasons |
| Visuals / banner / footer | Full system            | Align colors, banner, footer    |

After alignment, we’ll have: **spec’s look, structure, and explainer pattern** plus **all current ECRI capabilities** listed above.
