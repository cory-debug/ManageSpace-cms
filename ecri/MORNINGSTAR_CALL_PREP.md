# MORNINGSTAR CALL PREP — Feb 12, 2026

## ECRI MODULE — Questions for Brian/Team

### CRITICAL (Do not leave without these)

**1. "New rate" definition in tier formula**
Your 4-tier formula checks "new rate vs unit group median." When evaluating Tier 2 (10%) and Tier 3 (15%), is "new rate" calculated using a 20% trial increase, or each tier's own percentage (10% / 15%)?
- *Why it matters: Changes which tenants land in which tier. Wrong answer = wrong recommendations.*

**2. Street rate ceiling rule for Tier 1 (40%)**
When 40% pushes someone above street rate, what's the rule? Always cap at street? Cap at street + X%? Or purely manual judgment?
- *Why it matters: Most common override. If there's a rule, we automate it; if not, we flag it.*

**3. Unit group median — include or exclude the tenant?**
When computing the median achieved rate for a unit group, do you include the current tenant's own rent, or exclude them ("everyone else")?
- *Why it matters: In small unit groups (5-10 units), this shifts the median noticeably.*

**4. Eligibility — confirm it's ONLY "time since last increase"**
We have it as: eligible = everyone whose last increase was 12 months ago. No minimum tenure, no minimum gap to market. Correct?
- *Why it matters: Our current code has min 3-month tenure and 10% gap as hard gates — need to remove those for your workflow.*

**5. Skip/modify reason dropdown options**
We have 5 placeholder reasons. What are Morningstar's actual common reasons for skipping or modifying a recommendation?
- *Why it matters: Placeholder data in production = useless reporting.*

---

### IMPORTANT (Get if time allows)

**6. Tier 1 occupancy threshold — hard cutoff at 75% or gradient?**
Is 75% occupancy a binary yes/no, or do you sometimes apply 40% at 72%? Any gray zone?

**7. Post-lease-up / special unit groups — tagging method**
How do you identify these? Facility flag? Unit group tag? Manual list? And what's the default first-increase percentage — 50%? 80%? 90%?

**8. New acquisitions — different treatment?**
When a property is newly acquired, do those tenants get treated differently for their first ECRI? How are they identified in SiteLink?

**9. Multi-unit tenant rule — formal or judgment?**
Is there any formula (e.g., "if 3+ units, cap at 15%"), or is it purely manual "I see they have multiple units and dial back"?

**10. Override frequency**
Roughly what % of tenants get manual overrides vs. straight formula output? Helps us calibrate how much review UI to build vs. bulk-approve.

**11. Evaluation timing / notice period**
How far before the effective date do you run the calc? Is it always 30 days notice (e.g., run March 1 for April 1 effective)?

---

## VACANT UNIT PRICING — Questions for Brian/Team

### CRITICAL

**12. How do you forecast demand for the next 30-60 days?**
You mentioned forward-looking demand (not historical). What data do you use? Historical move-ins by month? Reservations? Walk-in trends? Seasonal intuition?
- *Why it matters: Our entire vacant pricing model runs on demand forecasting. We have a placeholder seasonal curve (peaks Jun at 1.22, low Dec at 0.85) — need real Morningstar data.*

**13. Weekly pricing process — what inputs does Brian look at?**
When you sit down weekly to set street rates, walk us through: What columns are you looking at? What comps? What triggers a rate change up vs down?
- *Why it matters: We have a model but no validated workflow. Need to match your actual process.*

---

### IMPORTANT

**14. Competitor tier criteria (A/B/C) — what defines each?**
You classify comps as A, B, C. Is that quality of facility? Same operator tier? Proximity? Brand? Can you give us the criteria so we can configure it?

**15. Comp weighting — distance only, or quality matters?**
We currently weight by distance (1mi=100%, 2mi=75%, 3mi=50%, 4mi=25%). Should quality (A/B/C) also adjust the weight? How?

**16. Floor/access premiums — do you price differently?**
Do first-floor or drive-up units command a premium at Morningstar? If so, roughly how much ($5? 5%?)? We have placeholder +$5/-$5.

**17. Odd unit sizes (9x10, 9x11, etc.)**
Confirm: you compare on price/sqft for non-standard sizes? What grouping ranges do you use (e.g., 90-110 sqft = "10x10 equivalent")?

**18. Marina pricing — same workflow?**
Bob said marinas are managed "very similarly" but no comps. Confirm: same ECRI flow minus comp data? Any other differences?

---

## BOTH MODULES

**19. Definitions / lexicon**
Bob mentioned sending a definitions doc (achieved rate, projected rent, move-out factor, etc.). Have they sent it? If not, ask for it — critical for matching terminology in the UI.

**20. Historical ECRI data import**
Craig mentioned dumping historical ECRIs from SiteLink into our system during onboarding. What format? How far back does data go? What fields (date, previous rent, new rent, who approved)?

**21. Excel validation rows**
Can Brian share 1-2 example rows from the calc tool where the formula in Column Z is still intact (not manually overridden)? We want to validate our code outputs match his Excel.

---

## QUICK REFERENCE: What We've Already Confirmed

- Annual ECRIs only (company culture, non-negotiable)
- 4-tier formula: 40% / 10% / 15% / 20% (priority order)
- Baseline = 20% (most common outcome)
- Uses **median** achieved, not average
- Formula is **forward-looking** (evaluates post-increase position)
- Multi-unit + tenure = NOT in formula, visual review only
- DMs have final say, want reason capture for overrides
- Facility-level settings overrides needed
- Non-storage units (retail, offices) excluded from ECRI, need visibility tab
- Fund-level grouping desired (filter by fund)
