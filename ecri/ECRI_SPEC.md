# ECRI Module - Rebuild Spec

**Last Updated:** February 8, 2026
**Purpose:** Full spec for rebuilding the ECRI (Existing Customer Rent Increase) module
**Parent doc:** `/Users/cs/Documents/ManageSpace-cms/CLAUDE.md` (master context, UX principles, company info)
**UX Tier:** Tier 2 — Management UI (higher data density OK, trained corporate users)

---

## WHAT IS ECRI

ECRI = Existing Customer Rent Increase. A revenue management tool for self-storage operators. It analyzes each current tenant's rent against market data, competitor pricing, occupancy, and tenure — then recommends a rent increase amount. The facility manager or revenue analyst reviews each recommendation and approves, modifies, or declines.

**Users:** Revenue managers, regional managers, corporate analysts (5-20 people per company, trained)
**Primary customer:** Morningstar Storage (~83 facilities, April 1 go-live)
**Value prop:** AI-powered rent optimization that increases revenue without increasing vacancy

### The Product Has Three Screens
1. **ECRI** — Review and approve rent increase recommendations for existing tenants
2. **Vacant Pricing** — Set recommended rates for empty units awaiting move-ins
3. **Pricing Model** — Configure the AI pricing model parameters

---

## DESIGN SYSTEM: SAME AS COMMS HUB

This rebuild uses the **exact same visual language** as the Communications Hub. Same product family feel.

### Light Theme (replacing the old dark theme)
- **Background:** #F1F5F9
- **Cards/panels:** #FFFFFF with border #E2E8F0
- **Text primary:** #0F172A
- **Text secondary:** #64748B
- **Text muted:** #94A3B8

### Color Palette
- **Positive/Approve/Green:** #10B981
- **Warning/Caution/Amber:** #F59E0B
- **Negative/Decline/Red:** #EF4444
- **Info/Neutral/Blue:** #3B82F6
- **AI Accent/Indigo:** #6366F1 — for AI-generated recommendations and rationale
- **Borders:** #E2E8F0
- **Hover/Selected:** #F8FAFC
- **Active nav/Selected facility:** #0F172A (near-black)

### Typography
- Font: `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- Page title: 18px, weight 700, #0F172A
- Section headers: 14-16px, weight 600-700
- Body/table text: 13px, weight 400-500
- Small labels: 11px, weight 500-600, uppercase, letter-spacing 0.05em, #94A3B8
- Money values: 14px, weight 600 (for emphasis)
- Percentages: color-coded (green for increases, red for decreases)

### Shared Component Patterns (match Comms Hub)
- **Badge:** Colored pill with text label (same as status/priority badges)
- **TabButton:** Active (dark fill) / inactive (outline) with optional count
- **Header bar:** Logo left, nav tabs center, notifications + user avatar right
- **Card:** White background, #E2E8F0 border, 10-12px border-radius, 14-16px padding
- **Selected state:** #F8FAFC background + 2px #0F172A left border or border
- **Buttons:** Green for approve/confirm, outline gray for secondary, red for destructive
- **Expand/collapse:** Chevron arrow, smooth transition

---

## TECH STACK (Same as Comms Hub)

- React 19 + TypeScript
- Vite (dev server + build)
- Inline styles (same approach — can refactor to Tailwind later)
- Single-file component: `src/ECRIDashboard.tsx` (all UI code in one file for speed)
- No routing library (tab switching via state, not URL navigation)

### Project Setup
```bash
cd /Users/cs/Documents/ManageSpace-cms
mkdir -p ecri/src
cd ecri

# Initialize
npm init -y
npm install react react-dom typescript @types/react @types/react-dom
npm install -D vite @vitejs/plugin-react

# Create config files (same as comms hub)
```

**Project location:**
```
/Users/cs/Documents/ManageSpace-cms/
├── CLAUDE.md                    ← Master context
├── communications-hub/          ← Comms Hub module
├── ecri/                        ← THIS MODULE
│   ├── src/
│   │   ├── App.tsx
│   │   ├── ECRIDashboard.tsx    ← MAIN COMPONENT
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   └── ECRI_SPEC.md            ← THIS FILE
├── revman/
├── shared/
└── docs/
```

---

## SCREEN 1: ECRI REVIEW (Main Screen)

### Layout: Two-Panel (Same Pattern as Comms Hub)
- **Left panel (320px, fixed):** Facility selector
- **Right panel (flex):** Tenant rent increase review for selected facility

### Header Bar
```
┌──────────────────────────────────────────────────────────────────────────┐
│  [M] ManageSpace Revenue    ECRI | Vacant Pricing | Pricing Model | ⚙   CS │
└──────────────────────────────────────────────────────────────────────────┘
```
- "M" logo block (same 32px square, #0F172A background, white text)
- "ManageSpace Revenue" title (replaces "Communications Hub")
- Tab navigation: ECRI (active) | Vacant Pricing | Pricing Model | Settings
- Notification bell + user avatar (right)

### Left Panel — Facility Selector

Each facility is a card:
```
┌──────────────────────────────────┐
│ ▎ Fort Lauderdale Central        │ ← selected (left border accent)
│ ▎ Fort Lauderdale, FL            │
│ ▎ 52 ECRIs · +$1,665/mo         │
│ ▎ ████████████░░░ 39/52 reviewed │
└──────────────────────────────────┘
┌──────────────────────────────────┐
│   Athens West                    │
│   Athens, GA                     │
│   38 ECRIs · +$920/mo           │
│   ░░░░░░░░░░░░░░░ 0/38 reviewed │
└──────────────────────────────────┘
```

**Fields per card:**
- Facility name (14px, weight 600)
- City, State (12px, #64748B)
- ECRI count + potential monthly revenue gain (12px)
- Progress bar: reviewed / total (thin green bar on gray track)
- Selected state: white background, 3px left border #0F172A, subtle shadow

**Sorting:** By potential revenue gain (highest opportunity first)

**Header above list:**
- "Facilities" label
- Total pending count: "218 pending" (large number, 24px weight 700)
- Search/filter input for facility name

### Right Panel — ECRI Review Table

#### Summary Bar (sticky top, always visible)
```
┌──────────────────────────────────────────────────────────────────────┐
│  Fort Lauderdale Central                                             │
│  Fort Lauderdale, FL · 52 ECRIs · +$1,665/mo potential              │
│                                                                       │
│  ✅ 39 high confidence  ⚠️ 8 medium  🔴 5 low    [Approve All High ✓] │
└──────────────────────────────────────────────────────────────────────┘
```
- Facility name + location (18px weight 700)
- Summary stats with color-coded confidence counts
- "Approve All High Confidence" button — green, prominent, right-aligned
- This bar is sticky — stays visible as user scrolls through tenants

#### Filter Tabs (below summary bar)
```
[All 52] [High ✓ 39] [Medium ⚠️ 8] [Low 🔴 5] [Reviewed ✓ 13] [Skipped ○ 0]
```
Same TabButton component as Comms Hub. Active = dark fill with white text + count.

#### Confidence Group Headers
Tenants are grouped by confidence level. Each group has a collapsible header:
```
┌──────────────────────────────────────────────────────────────────────┐
│  ▼ High Confidence · Long-tenure (24+ mo)    22 tenants · +$720/mo  │
│                                                        [Approve All] │
└──────────────────────────────────────────────────────────────────────┘
```
- Confidence badge (green/yellow/red dot + text)
- Group description ("Long-tenure 24+ mo")
- Count + potential revenue for this group
- "Approve All" button for the group (outline green)
- Collapsible: click header to expand/collapse

#### Tenant Row — Collapsed (Default)

This is the critical design. Each tenant is a card row optimized for rapid review:

```
┌──────────────────────────────────────────────────────────────────────┐
│ 🟢 Charles Lee                                                       │
│    5×10 CC · Unit 105 · 27 mo                                       │
│                                                                       │
│    $81/mo → $101/mo  (+$20, +25.0%)                                 │
│                                                                       │
│    ✨ "Long tenure supports increase. Market rate $141."             │
│                                                      [Approve] [Skip]│
│                                                          [Expand ▼] │
└──────────────────────────────────────────────────────────────────────┘
```

**What's visible without expanding (5 key things):**
1. **Confidence dot** — 🟢 green, 🟡 yellow, 🔴 red
2. **Who:** Tenant name, unit type, unit number, tenure
3. **The money:** Current rent → recommended rent, with $ and % change (green text for increase)
4. **The why (one line):** AI rationale in plain English — ALWAYS visible, not hidden. This is the key insight that tells the manager "yes this is safe" at a glance.
5. **Actions:** Approve (green button), Skip (gray outline)

**This means:** For high-confidence recommendations, the operator can scan and approve without ever expanding a row. Read name, see the numbers, read the one-liner, click Approve. Done. Next.

**After approval:** Row transitions to muted state:
```
┌──────────────────────────────────────────────────────────────────────┐
│ ✓ Charles Lee · $81 → $101 (+$20/mo) · Approved                    │
│                                                          [Undo 10s] │
└──────────────────────────────────────────────────────────────────────┘
```
- Collapsed to single line, muted colors
- "Undo" button visible for 10 seconds, then fades
- Stays in list (filtered out by "Reviewed" tab later)

#### Tenant Row — Expanded (Click Expand or row)

When expanded, shows full detail below the collapsed card:

**Section 1: Pricing Options**
Three cards side by side:
```
┌─────────────────┐  ┌────────────────────┐  ┌─────────────────┐
│  Conservative    │  │  Baseline ✨ Rec    │  │  Aggressive     │
│  $94 (+16.4%)   │  │  $101 (+25.0%)     │  │  $101 (+25.0%)  │
│  [Select]        │  │  [Selected ✓]      │  │  [Select]        │
└─────────────────┘  └────────────────────┘  └─────────────────┘
                     Custom: [___] /mo
```
- Recommended option: indigo border (#6366F1) + "✨ Rec" badge
- Selected option: green border + check
- Click to switch selection, then Approve applies that amount
- "Custom" input below: type any dollar amount for override

**Section 2: AI Rationale**
```
┌──────────────────────────────────────────────────────────────────────┐
│  ✨ Why Baseline?                                                     │
│                                                                       │
│  Base strategy: Aggressive (rate vs. market). Adjusted for:          │
│                                                                       │
│  ████████████████ +Long tenure (27 mo) — reduces churn risk          │
│  ██████████       ⚠ Frequent visitor — higher awareness of changes   │
│                                                                       │
│  💡 Primary driver: Long tenure (27 mo)                              │
│     Caution: Frequent visitor — may notice increase immediately      │
└──────────────────────────────────────────────────────────────────────┘
```
- Factor bars: green for positive, amber for caution, red for risk
- Plain English explanation
- Indigo accent for the "✨ Why" header

**Section 3: Market Comparison**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Market Rate: $141 (4 comps)              Street Rate: $119         │
│                                                                       │
│  Competitor       Quality  Type     Dist   Rate    Weight  Seen     │
│  Life Storage     [B]      5×10 CC  2.3mi  $147    50%    Jan 24   │
│  StorageMart      [B]      5×10 CC  3.7mi  $107    25%    Jan 6    │
│  SecureSpace      [C]      5×10 CC  3.4mi  $123    25%    Jan 26   │
│  Prime Storage    [A]      5×10 CC  3.6mi  $146    25%    Jan 24   │
└──────────────────────────────────────────────────────────────────────┘
```
- Quality grade in colored badge: A=#10B981, B=#3B82F6, C=#F59E0B, D=#EF4444
- Distance, rate, weight, last seen date
- "Street Rate" = the facility's own advertised rate for this unit type

**Section 4: Tenant History (mini)**
- One line: "Previous increases: None" or "1 increase: +$10 on Jun 2025"
- "1st ECRI" badge if applicable
- Small bar chart or sparkline of rent over time (optional, nice to have)

---

## SCREEN 2: VACANT PRICING

### Layout: Same Two-Panel
Left panel: facility selector (shows vacant unit counts instead of ECRI counts)
Right panel: unit type pricing for selected facility

### Left Panel — Facility Cards
```
┌──────────────────────────────────┐
│ ▎ Dallas North                   │
│ ▎ Dallas, TX                     │
│ ▎ 387 units · 53 vacant (14%)   │
│ ▎ Rec avg: $78/mo               │
└──────────────────────────────────┘
```

### Right Panel — Unit Type Pricing Table

**Summary bar (sticky):**
```
┌──────────────────────────────────────────────────────────────────────┐
│  Dallas North · Dallas, TX                                           │
│  387 total units · 53 vacant · Avg recommended: $78/mo              │
│                                                    [Apply All Prices]│
└──────────────────────────────────────────────────────────────────────┘
```

**Unit type rows (card style):**
```
┌──────────────────────────────────────────────────────────────────────┐
│  5×10 Climate Control (CC)          8 vacant of 45                  │
│                                                                       │
│  Current: $95/mo → Recommended: $89/mo (-6.3%)                     │
│  ✨ "3 nearby competitors dropped rates. Suggest matching to fill." │
│                                                                       │
│  Market avg: $87   Occ: 82%        [Accept $89] [Override: $___]   │
└──────────────────────────────────────────────────────────────────────┘
```

Each row shows:
- Unit type name + dimensions + feature codes
- Vacant count / total count
- Current price → recommended price (green if increase, red if decrease)
- AI rationale one-liner
- Market average + current occupancy for context
- Accept button + override input

Expand for competitor detail table (same as ECRI comp table).

---

## SCREEN 3: PRICING MODEL (Settings)

Simple settings page — not a data review screen. Shows the model configuration:

- **Comp weights:** Sliders or inputs for distance weight, quality weight, recency weight
- **Increase caps:** Max % increase per cycle, max $ increase per cycle
- **Tenure adjustments:** How tenure length affects recommendations
- **Occupancy targets:** Target occupancy % that influences pricing
- **Feature mappings:** What CC, NCC, FF, DU, etc. mean (Climate Control, Non-Climate, First Floor, Drive-Up)

This screen is lowest priority — hardcode settings in mock data for now.

---

## MOCK DATA

### Facilities (6 Morningstar facilities)
```typescript
const FACILITIES = [
  { id: 'f1', name: 'Fort Lauderdale Central', city: 'Fort Lauderdale', state: 'FL', totalUnits: 400, vacantUnits: 48, ecriCount: 52, potentialRevenue: 1665, reviewedCount: 0 },
  { id: 'f2', name: 'Athens West', city: 'Athens', state: 'GA', totalUnits: 402, vacantUnits: 42, ecriCount: 38, potentialRevenue: 920, reviewedCount: 0 },
  { id: 'f3', name: 'Dallas North', city: 'Dallas', state: 'TX', totalUnits: 387, vacantUnits: 53, ecriCount: 45, potentialRevenue: 1120, reviewedCount: 0 },
  { id: 'f4', name: 'San Jose North', city: 'San Jose', state: 'CA', totalUnits: 463, vacantUnits: 38, ecriCount: 41, potentialRevenue: 1340, reviewedCount: 0 },
  { id: 'f5', name: 'Chandler West', city: 'Chandler', state: 'AZ', totalUnits: 305, vacantUnits: 46, ecriCount: 32, potentialRevenue: 780, reviewedCount: 0 },
  { id: 'f6', name: 'IT Crossing', city: 'Calgary', state: 'AB', totalUnits: 250, vacantUnits: 22, ecriCount: 0, potentialRevenue: 0, reviewedCount: 0 },
];
```

### ECRI Tenants (8-10 per facility, mix of confidence levels)
```typescript
interface ECRITenant {
  id: string;
  facilityId: string;
  customerName: string;
  unitType: string;       // "5×10 CC", "10×20 NCC", etc.
  unitNumber: string;
  features: string;       // "CC · FF · DU" (Climate Control, First Floor, Drive-Up)
  tenureMonths: number;
  currentRent: number;
  occupancyRate: number;  // Unit type occupancy %
  avgAchieved: number;    // Avg achieved rate for this unit type
  tenantRate: number;     // What this tenant is paying
  streetRate: number;     // Advertised rate
  compAvg: number;        // Competitor average
  confidence: 'high' | 'medium' | 'low';
  confidenceGroup: string; // "Long-tenure (24+ mo)", "New tenant (<6 mo)", etc.
  // Recommendations
  conservative: { amount: number; percentIncrease: number };
  baseline: { amount: number; percentIncrease: number };
  aggressive: { amount: number; percentIncrease: number };
  recommended: 'conservative' | 'baseline' | 'aggressive';
  // AI
  aiRationale: string;     // One-line plain English explanation
  aiFactors: { label: string; impact: 'positive' | 'caution' | 'risk'; strength: number }[];
  primaryDriver: string;
  cautionNote?: string;
  // Comps
  competitors: Competitor[];
  marketRate: number;
  // History
  previousIncreases: { date: string; amount: number }[];
  isFirstECRI: boolean;
  // State
  status: 'pending' | 'approved' | 'modified' | 'skipped';
  approvedAmount?: number;
}

interface Competitor {
  name: string;
  quality: 'A' | 'B' | 'C' | 'D';
  unitType: string;
  features: string;
  distance: number;    // miles
  rate: number;
  weight: number;      // percentage
  lastSeen: string;    // date
}
```

### Sample Tenant Mock Data
Build at least 8 tenants for Fort Lauderdale Central with realistic variety:
- 4-5 high confidence (long tenure, clear market support)
- 2-3 medium confidence (some risk factors)
- 1-2 low confidence (new tenant, high churn risk, below-market)
- Mix of unit types: 5×10 CC, 10×10 NCC, 10×20 CC, 10×15 NCC, 10×30 CC
- Tenure range: 8 months to 55 months
- Current rents: $55 to $350
- Recommended increases: +12% to +25%
- Include realistic competitor names: Life Storage, StorageMart, SecureSpace, Prime Storage, CubeSmart, Public Storage

---

## DATA MODEL

```typescript
interface Facility {
  id: string;
  name: string;
  city: string;
  state: string;
  totalUnits: number;
  vacantUnits: number;
  ecriCount: number;
  potentialRevenue: number;
  reviewedCount: number;
}

interface ECRITenant {
  id: string;
  facilityId: string;
  customerName: string;
  unitType: string;
  unitNumber: string;
  features: string;
  tenureMonths: number;
  currentRent: number;
  occupancyRate: number;
  avgAchieved: number;
  tenantRate: number;
  streetRate: number;
  compAvg: number;
  confidence: 'high' | 'medium' | 'low';
  confidenceGroup: string;
  conservative: { amount: number; percentIncrease: number };
  baseline: { amount: number; percentIncrease: number };
  aggressive: { amount: number; percentIncrease: number };
  recommended: 'conservative' | 'baseline' | 'aggressive';
  aiRationale: string;
  aiFactors: AIFactor[];
  primaryDriver: string;
  cautionNote?: string;
  competitors: Competitor[];
  marketRate: number;
  previousIncreases: { date: string; amount: number }[];
  isFirstECRI: boolean;
  status: 'pending' | 'approved' | 'modified' | 'skipped';
  approvedAmount?: number;
}

interface AIFactor {
  label: string;
  impact: 'positive' | 'caution' | 'risk';
  strength: number; // 0-100
}

interface Competitor {
  name: string;
  quality: 'A' | 'B' | 'C' | 'D';
  unitType: string;
  features: string;
  distance: number;
  rate: number;
  weight: number;
  lastSeen: string;
}

interface VacantUnitType {
  id: string;
  facilityId: string;
  unitType: string;
  features: string;
  totalUnits: number;
  vacantUnits: number;
  currentRate: number;
  recommendedRate: number;
  marketAvg: number;
  occupancyRate: number;
  aiRationale: string;
  status: 'pending' | 'accepted' | 'overridden';
  overrideAmount?: number;
}
```

---

## BUILD ORDER FOR CLAUDE CODE

1. **Scaffold project** — Vite + React + TypeScript (same setup as Comms Hub)
2. **Build ECRI main screen** — two-panel layout with facility selector + tenant cards
3. **Mock data** — 6 facilities, 8-10 tenants per first facility, realistic numbers
4. **Collapsed tenant cards** — confidence dot, name, unit, tenure, current→recommended, AI one-liner, approve/skip
5. **Approve flow** — click Approve → card transitions to muted "approved" state, undo button
6. **Bulk approve** — "Approve All High Confidence" button
7. **Expanded tenant detail** — pricing options, AI rationale with factor bars, comp table
8. **Filter tabs** — All, High, Medium, Low, Reviewed, Skipped
9. **Progress tracking** — reviewed counter, progress bar on facility cards
10. **Vacant Pricing screen** — tab switch, facility selector, unit type cards
11. **Pricing Model screen** — placeholder settings page

### Claude Code Command
```
Read /Users/cs/Documents/ManageSpace-cms/CLAUDE.md for master context and UX principles.
Read /Users/cs/Documents/ManageSpace-cms/ecri/ECRI_SPEC.md for this module's spec.
Scaffold the ECRI project at /Users/cs/Documents/ManageSpace-cms/ecri/ using the same
React + TypeScript + Vite setup as the communications-hub module. Then build the ECRI
main screen starting with the two-panel layout, facility selector, and collapsed tenant
cards with mock data.
```

---

## KEY UX DECISIONS (Tier 2 Management UI)

1. **Abbreviations OK:** CC, NCC, FF, DU are industry standard. Trained users know them. Don't spell them out in the table — but DO include a legend/tooltip on first use.
2. **Data density OK:** The tenant card shows 5 key data points in collapsed view. Expanded shows comp tables, factor bars, history. This is appropriate for management users who want depth.
3. **Batch actions critical:** The whole point is reviewing 50+ tenants efficiently. Bulk approve, group approve, and the one-click collapsed-view approve make this possible.
4. **AI rationale always visible:** The one-line AI explanation is NOT hidden behind an expand. This is the single most important innovation — it tells the manager "why" without requiring a click.
5. **Same visual DNA as Comms Hub:** Light theme, same fonts, same card radius, same badge style, same header layout. Different content, same product feel.

---

**END OF ECRI SPEC**
