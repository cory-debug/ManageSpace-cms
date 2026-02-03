# ECRI Page Spec
# Rate Recommendations UI Pattern
## Design System & Implementation Guide for Managed Space Revenue Intelligence Modules

*Handoff Document for Cross-Session Continuity*

---

## Purpose of This Document

This document captures the design decisions, component patterns, and implementation details from the Rate Recommendations UI concept. Use this as the foundation when building other Revenue Intelligence modules (like Vacant Unit Pricing) to maintain visual and interaction consistency across the platform.

**Key Principle:** Every AI recommendation should answer "why" — not just "what." This transparency-first approach differentiates Managed Space from black-box competitors.

---

## Design Philosophy

### The Three Pillars

1. **Transparency** — Every recommendation shows its reasoning with weighted factors
2. **Efficiency** — Revenue managers can process 50+ decisions quickly via bulk actions and scannable cards
3. **Control** — Users can Accept, Modify, or Decline — they're never forced to follow the algorithm

### The Confidence Framework

All recommendations display a confidence tier that maps to automation levels:

| Tier | Score Range | Visual Treatment | Suggested Behavior |
|------|-------------|------------------|-------------------|
| **High** | 85%+ | Emerald/green badge | Safe for bulk acceptance |
| **Medium** | 60-84% | Amber/yellow badge | Review individually |
| **Low** | <60% | Red badge | Requires careful consideration |

---

## Visual Design System

### Color Palette

```
// Primary Actions
indigo-500: #6366f1  — Primary buttons, links, focus states
indigo-600: #4f46e5  — Primary button hover
purple-600: #9333ea  — Gradient accent (paired with indigo)

// Confidence States
emerald-500: #10b981  — High confidence, positive changes, accept
emerald-600: #059669  — High confidence hover/emphasis
amber-500: #f59e0b   — Medium confidence, caution
amber-600: #d97706   — Medium confidence emphasis
red-500: #ef4444     — Low confidence, negative changes, decline

// Neutrals
slate-50: #f8fafc    — Page background
slate-100: #f1f5f9   — Card backgrounds, subtle sections
slate-200: #e2e8f0   — Borders, dividers
slate-400: #94a3b8   — Muted text, icons
slate-500: #64748b   — Secondary text
slate-600: #475569   — Body text
slate-800: #1e293b   — Headings, primary text
white: #ffffff       — Card backgrounds
```

### Typography Scale

```
// Headings
text-xl (20px)   — Page title
text-lg (18px)   — Card titles (unit type)
text-sm (14px)   — Section labels, facility names

// Data Display
text-2xl (24px) font-bold  — Rate values ($189, $201)
text-xl (20px) font-bold   — Stat card numbers
text-sm (14px) font-semibold — Percentage changes, factor impacts

// Body
text-sm (14px)   — Most UI text, descriptions, factor names
text-xs (12px)   — Labels, timestamps, tertiary info
```

### Spacing System

```
// Component Spacing
p-4 (16px)  — Standard card padding
p-3 (12px)  — Compact card padding (stat cards)
gap-3 (12px) — Grid gaps, button groups
gap-2 (8px)  — Tight element spacing
mb-5 (20px) — Section margins
mb-6 (24px) — Major section breaks

// Border Radius
rounded-xl (12px) — Cards, major containers
rounded-lg (8px)  — Buttons, inputs, badges
rounded-full      — Pills, confidence badges, progress bars
```

---

## Component Architecture

### Page Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER                                                      │
│ Icon + Title + Subtitle                                     │
├─────────────────────────────────────────────────────────────┤
│ STATS ROW (3-column grid)                                   │
│ [Stat Card] [Stat Card] [Stat Card]                        │
├─────────────────────────────────────────────────────────────┤
│ BULK ACTION BANNER (gradient, prominent)                    │
│ Message + CTA Button                                        │
├─────────────────────────────────────────────────────────────┤
│ FILTER TABS                                                 │
│ [All] [High] [Medium] [Low]                                │
├─────────────────────────────────────────────────────────────┤
│ RECOMMENDATION CARDS (vertical stack)                       │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Card 1                                                  ││
│ └─────────────────────────────────────────────────────────┘│
│ ┌─────────────────────────────────────────────────────────┐│
│ │ Card 2                                                  ││
│ └─────────────────────────────────────────────────────────┘│
│ ...                                                         │
├─────────────────────────────────────────────────────────────┤
│ FOOTER                                                      │
│ Branding + context                                          │
└─────────────────────────────────────────────────────────────┘
```

### Recommendation Card Structure

```
┌─────────────────────────────────────────────────────────────┐
│ HEADER SECTION                              border-b        │
│ ┌─────────────────────────────────┐ ┌─────────────────────┐│
│ │ Facility Name (small, muted)    │ │ Confidence Badge    ││
│ │ Unit Type (bold, primary)       │ │ [92%]               ││
│ └─────────────────────────────────┘ └─────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ RATE DISPLAY SECTION                 bg-gradient           │
│                                                             │
│ Current          →        Recommended                       │
│ $189                      $201                              │
│ (muted)                   (colored based on direction)      │
│                           +$12 (+6.3%)                      │
├─────────────────────────────────────────────────────────────┤
│ EXPLAINER SECTION (collapsible)      border-t              │
│                                                             │
│ [▶] 📊 Why this rate?                                      │
│                                                             │
│ (when expanded:)                                            │
│ ┌─────────────────────────────────────────────────────────┐│
│ │ 📊 Occupancy at 96%        [████████░░░░]  +$8         ││
│ │ 🏢 Competitors raised 5%   [████░░░░░░░░]  +$3         ││
│ │ 📈 Q2 seasonal boost       [██░░░░░░░░░░]  +$1         ││
│ │                                                         ││
│ │ ┌─────────────────────────────────────────────────────┐││
│ │ │ 💡 Primary Driver: Strong demand with 96% occupancy│││
│ │ └─────────────────────────────────────────────────────┘││
│ └─────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────┤
│ ACTION SECTION                        bg-slate-50 border-t │
│                                                             │
│ [✓ Accept]  [✎ Modify]  [✗]                                │
│                                                             │
│ (when modifying:)                                           │
│ [$____] [Apply] [Cancel]                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Interaction Patterns

### Card States

1. **Default** — Ready for action
2. **Expanded** — "Why this rate?" section visible
3. **Modifying** — Custom rate input visible
4. **Actioned** — Collapsed to confirmation message

### State Transitions

```
Default → Expanded (click "Why this rate?")
Default → Modifying (click "Modify")
Default → Actioned (click "Accept" or "Decline")
Modifying → Actioned (click "Apply")
Modifying → Default (click "Cancel")
Expanded + Modifying can coexist
```

### Actioned Card Display

Once a user takes action, the card collapses to a minimal confirmation:

```jsx
<div className="bg-white rounded-xl border border-slate-200 p-4">
  <div className="flex items-center justify-between">
    <div>
      <div className="text-sm text-slate-500">{facility}</div>
      <div className="font-semibold text-slate-800">{unitType}</div>
    </div>
    <div className="px-3 py-1.5 rounded-lg text-sm font-medium bg-emerald-100 text-emerald-700">
      ✓ Accepted at $201
    </div>
  </div>
</div>
```

---

## The Explainer Framework

### Factor Display Pattern

Each contributing factor shows:
1. **Icon** — Visual category indicator
2. **Name** — Human-readable factor description
3. **Impact Bar** — Visual representation of magnitude
4. **Impact Value** — Dollar amount with +/- sign

```jsx
const getFactorBar = (impact, maxImpact = 15) => {
  const percentage = Math.min((Math.abs(impact) / maxImpact) * 100, 100);
  const isPositive = impact >= 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
        <div
          className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-400'}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
        {isPositive ? '+' : ''}${impact}
      </span>
    </div>
  );
};
```

### Primary Driver Callout

Always include a summary callout that synthesizes the factors:

```jsx
<div className="mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
  <div className="flex items-start gap-2">
    <span>💡</span>
    <div className="text-sm text-indigo-700">
      <strong>Primary Driver:</strong> {recommendation.primaryDriver}
    </div>
  </div>
</div>
```

---

## Data Model

### Recommendation Object Shape

```typescript
interface Recommendation {
  id: number;
  facility: string;           // "Austin - Lakeline"
  unitType: string;           // "10x10 Climate Controlled"
  currentRate: number;        // 189
  recommendedRate: number;    // 201
  confidence: 'high' | 'medium' | 'low';
  confidenceScore: number;    // 92 (percentage)
  primaryDriver: string;      // Human-readable summary
  factors: Factor[];
}

interface Factor {
  name: string;               // "Occupancy at 96%"
  impact: number;             // 8 (positive) or -2 (negative)
  icon: string;               // Emoji or icon identifier
}
```

### Actioned State Shape

```typescript
interface ActionedState {
  [recommendationId: number]: {
    action: 'accept' | 'modify' | 'decline';
    value?: number;  // Only for 'modify'
  }
}
```

---

## Adapting for Vacant Unit Pricing Module

When building the Vacant Unit Pricing module, maintain these patterns:

### What Stays the Same

1. **Page structure** — Header, stats, bulk actions, filters, cards, footer
2. **Card anatomy** — Header, data display, explainer, actions
3. **Confidence badges** — Same tiers, same colors
4. **Explainer framework** — Factors with impact bars + primary driver callout
5. **Action buttons** — Accept/Modify/Decline pattern
6. **Color system** — All colors, spacing, typography

### What Changes

1. **Data fields** — Instead of `currentRate` → `recommendedRate`, you might have:
   - `currentStreetRate`
   - `recommendedStreetRate`
   - `competitorAverage`
   - `lastRentedRate`

2. **Factor types** — Vacant pricing factors might include:
   - Days on market
   - Competitor web rates
   - Seasonal demand forecast
   - Unit location/floor premium
   - Historical elasticity for this unit type

3. **Stats cards** — Adjust to show relevant metrics:
   - Total vacant units
   - Units below market
   - Potential monthly uplift

4. **Bulk action logic** — May need different groupings:
   - "Accept all for units 30+ days vacant"
   - "Accept all that match competitor rates"

### Naming Convention for Module Variants

```
// Rate Recommendations (ECRI focus)
RateRecommendationsQueue
RateRecommendationCard

// Vacant Unit Pricing
VacantPricingQueue
VacantPricingCard

// Anomalies
AnomaliesQueue
AnomalyCard
```

---

## Code Template

Here's the skeleton to start a new module:

```jsx
import React, { useState } from 'react';

const [ModuleName]Queue = () => {
  const [filter, setFilter] = useState('all');
  const [expandedCard, setExpandedCard] = useState(null);
  const [modifyingCard, setModifyingCard] = useState(null);
  const [customValues, setCustomValues] = useState({});
  const [actionedCards, setActionedCards] = useState({});

  // TODO: Define your recommendations data structure
  const recommendations = [];

  // Confidence styling (KEEP AS-IS)
  const confidenceStyles = {
    high: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    medium: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    low: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600', dot: 'bg-red-500' }
  };

  // Factor bar helper (KEEP AS-IS)
  const getFactorBar = (impact, maxImpact = 15) => {
    const percentage = Math.min((Math.abs(impact) / maxImpact) * 100, 100);
    const isPositive = impact >= 0;
    return (
      <div className="flex items-center gap-3">
        <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-red-400'}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
          {isPositive ? '+' : ''}${impact}
        </span>
      </div>
    );
  };

  // Action handler
  const handleAction = (id, action, value) => {
    setActionedCards(prev => ({ ...prev, [id]: { action, value } }));
    setModifyingCard(null);
  };

  // TODO: Calculate stats from your data
  const stats = {
    total: recommendations.length,
    highConfidence: recommendations.filter(r => r.confidence === 'high').length,
    projectedImpact: 0 // Calculate based on your data
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-6">
      <div className="max-w-3xl mx-auto">
        
        {/* HEADER - Adjust title and icon */}
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-lg">
              📈 {/* Change icon */}
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800">[Module Title]</h1>
              <p className="text-sm text-slate-500">[Module description]</p>
            </div>
          </div>
        </div>

        {/* STATS - Adjust labels */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {/* ... stat cards ... */}
        </div>

        {/* BULK ACTION BANNER */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 mb-5 text-white shadow-lg">
          {/* ... */}
        </div>

        {/* FILTER TABS */}
        <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
          {/* ... */}
        </div>

        {/* CARDS */}
        <div className="space-y-4">
          {/* Map over recommendations */}
        </div>

        {/* FOOTER */}
        <div className="mt-6 text-center text-sm text-slate-400">
          Managed Space Revenue Intelligence • Transparent AI Pricing
        </div>
      </div>
    </div>
  );
};

export default [ModuleName]Queue;
```

---

## Key Tailwind Classes Reference

### Card Container
```
bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all overflow-hidden
```

### Section Dividers
```
border-b border-slate-100  // Light internal divider
border-t border-slate-100  // Top border for action section
```

### Gradient Backgrounds
```
bg-gradient-to-r from-slate-50 to-white        // Rate display section
bg-gradient-to-r from-indigo-500 to-purple-600 // Bulk action banner
bg-gradient-to-br from-slate-50 to-slate-100   // Page background
```

### Buttons
```
// Primary (Accept)
px-4 py-2.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm

// Secondary (Modify)
px-4 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium text-sm

// Tertiary/Danger (Decline)
px-4 py-2.5 bg-white border border-slate-300 text-slate-400 rounded-lg hover:bg-red-50 hover:border-red-200 hover:text-red-500 transition-colors text-sm

// Primary Action (in banner)
px-4 py-2 bg-white text-indigo-600 rounded-lg font-semibold text-sm hover:bg-indigo-50 transition-colors shadow
```

### Filter Tabs
```
// Active
px-4 py-2 rounded-lg text-sm font-medium bg-slate-800 text-white shadow

// Inactive
px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-600 hover:bg-slate-50 border border-slate-200
```

### Confidence Badges
```
px-2.5 py-1 rounded-full text-xs font-medium border flex items-center gap-1.5
// + confidence color classes from confidenceStyles object
```

---

## Checklist for New Module

- [ ] Copy the code template above
- [ ] Update module name in component and export
- [ ] Define your recommendation data structure
- [ ] Adjust header (title, subtitle, icon)
- [ ] Update stat card labels and calculations
- [ ] Customize bulk action message and logic
- [ ] Define relevant factors for your domain
- [ ] Update the "data display" section for your values
- [ ] Test all interaction states
- [ ] Verify color consistency with this document

---

## Questions This Pattern Answers for Users

1. **"What should I do?"** → Clear recommendation with Accept/Modify/Decline
2. **"Why this recommendation?"** → Expandable factor breakdown
3. **"How confident is the AI?"** → Prominent confidence badge
4. **"Which ones need my attention?"** → Filters + confidence tiers
5. **"Can I process these quickly?"** → Bulk actions for high-confidence items
6. **"What if I disagree?"** → Modify with custom value, or Decline

---

*Document Version: 1.0*
*Created: February 2026*
*For: Managed Space Revenue Intelligence Platform*
