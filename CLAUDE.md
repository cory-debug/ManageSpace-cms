# ManageSpace - Master Context Document

**Last Updated:** February 8, 2026 (afternoon — UX principles + gap analysis + architecture)
**Purpose:** Single source of truth for ALL Claude instances (Claude Code, Cursor AI, Claude.ai)
**Audience:** Any AI assistant working with Cory Sylvester on ManageSpace

---

## CRITICAL CONTEXT: SURVIVAL MODE

**Timeline:** 10 months until runway exhausted
**Imperative:** Ship working products FAST to generate revenue and secure next customers/investors
**Strategy:** Build base module demos to sell platform vision while delivering customer commitments

---

## UI/UX DESIGN PRINCIPLES (APPLIES TO ALL MODULES)

These are non-negotiable. Every screen, component, and interaction across all ManageSpace modules must follow these principles. Claude Code should evaluate every UI decision against this list before writing code.

### Two-Tier UX Model

ManageSpace has two categories of UI, each with different complexity tolerances. **Both tiers share the same design system** (fonts, colors, card styles, badges, light theme, overall visual feel). What differs is information density and the assumption about user training.

**Tier 1: Line Worker UI** (Comms Hub, future front-desk tools)
- Users: Hourly employees, high turnover, minimal training
- Zero learning curve — productive in 60 seconds
- Absolute minimum clicks and scrolling
- No jargon, no abbreviations without labels
- Everything self-evident — no guessing what a button does
- Optimized for speed during live interactions (calls, walk-ins)

**Tier 2: Management UI** (ECRI, Revenue Management, Reporting, Pricing Model)
- Users: Corporate staff, regional managers, revenue analysts — fewer people, more domain knowledge
- Higher information density is acceptable and expected — these users WANT to see data
- Still follows the same visual language (light theme, same fonts, same colors, same badge styles)
- Still minimizes unnecessary friction — but "unnecessary" is calibrated for trained users
- Tables with many columns are OK if the columns are meaningful
- Abbreviations (CC, NCC, FF, DU) are acceptable — these users know what they mean
- Progressive disclosure for deep analysis (expand rows for competitor data, AI rationale)
- Batch actions are critical — reviewing 50+ items one by one is a workflow, not a one-off task

**The universal rule across both tiers:** Same fonts. Same colors. Same card styles. Same badges. Same light theme. Same overall feel. An operator should feel like they're in the same product whether they're in Comms Hub or ECRI — even though the complexity level differs.

### Principle 1: Minimize Clicks and Scrolling (Critical for Tier 1, Important for Tier 2)
- **One-click actions.** If an action takes 3 clicks, find a way to make it 1. If it takes 2 clicks, question whether it could be 1. Every extra click is friction that slows the agent down during a live call.
- **No page navigation for core workflows.** The main workflows (take call, view case, send reply, resolve) should all happen on the same screen without navigating away. Modals and slide-out panels over the current view — never full page transitions for routine actions.
- **Visible without scrolling.** The most important information and actions must be visible in the initial viewport. If the agent has to scroll to find the "Send Email" button or see the customer's phone number, the layout is wrong. Use fixed/sticky positioning for action bars and customer context.
- **Progressive disclosure only for secondary info.** Primary information (customer name, unit, phone, status, most recent communication) is always visible. Secondary info (full history, audit log, older comms) is collapsed/expandable. Never hide critical info behind a click.

### Principle 2: Self-Evident UI (Critical for Tier 1, Relaxed for Tier 2)
- **Labels on everything.** No icon-only buttons. Every button has a text label. Icons supplement labels, they don't replace them. A new user shouldn't have to hover over an icon to discover what it does.
- **Status communicates through color + text.** Never rely on color alone (accessibility). Every colored badge also has a text label: "Open", "In Progress", "SLA Breach". Users shouldn't have to remember what yellow means.
- **Contextual actions only.** Don't show actions that can't be taken. If a case is already resolved, don't show a "Mark Resolved" button — show "Reopen Case" instead. The UI should only present what's currently possible.
- **Sensible defaults.** Forms should be pre-filled with the most likely values. The "To" field should already have the customer's email. The template should be pre-selected based on case context. The agent should only need to review and click send, not fill out fields from scratch.

### Principle 3: Information Hierarchy
- **Most urgent → top left.** The human eye scans top-left to bottom-right. The most time-sensitive information (queue with live wait times, SLA breaches, unread messages) goes top-left. Resolved/archived content goes bottom or behind a tab.
- **Customer context always visible.** When viewing any case, the customer's name, unit number, phone, email, and account status should be visible at all times without scrolling or clicking into a sub-panel.
- **Dense but not cluttered.** Storage facility agents handle high volume. Show as much useful information per screen as possible, but use whitespace, borders, and visual grouping to prevent overwhelm. Think Bloomberg terminal — dense but organized — not Notion — spacious but requires clicking into everything.
- **Inline actions.** Agents should be able to act on items directly from list views (quick-assign, quick-resolve) without opening the full detail panel first.

### Principle 4: Speed Over Polish
- **Keyboard shortcuts for power users.** Common actions should have keyboard shortcuts (E = email, S = SMS, R = resolve). Not required for MVP but the architecture should support it.
- **Instant feedback.** Every click should produce an immediate visual response — button state change, toast notification, loading indicator. Never leave the user wondering "did that work?"
- **No loading gates.** The UI should render immediately with whatever data is available. If AI suggestions are still loading, show the case without them and add them when ready. Never block the entire view waiting for one data source.

### Principle 5: Consistency Across Modules
- **Same layout patterns.** Every ManageSpace module uses the same structure: list panel (left) + detail panel (right). Same header bar. Same color system. Same badge styles. An agent trained on Comms Hub should feel at home in ECRI or any other module instantly.
- **Shared component library.** Badge, TabButton, StatusBadge, PriorityBadge, SearchBar, Modal, Toast — all should look and behave identically across modules. When building a new module, reuse these patterns.
- **Same interaction patterns.** Click-to-edit, inline dropdowns, slide-out modals, expandable sections — all behave the same way everywhere.

### How to Apply These Principles
When building any component, Claude Code should ask:
1. Can the user accomplish this with fewer clicks?
2. Would a brand new employee understand what they're looking at?
3. Is the most important information visible without scrolling?
4. Are there actions shown that can't actually be taken right now?
5. Does this look and behave like the same product as other modules?

If the answer to any of these is wrong, fix it before moving on.

---

## CURRENT BUILD: COMMUNICATIONS HUB

### What It Is
A helpdesk inbox UI for Storage Vault (investor + customer) — their staff use it to manage inbound calls, emails, and SMS from storage tenants. Paul is building the backend (Twilio integration), Cory is building the frontend.

### Current State (as of Feb 8, evening)

**Working — Core UI:**
- ✅ React + TypeScript + Vite project running
- ✅ Two-panel inbox layout (queue left, case details right)
- ✅ Tab navigation (Queue, Open Cases, My Cases, All Cases)
- ✅ Queue cards with priority color bars, live wait timers
- ✅ Case cards with status/priority badges
- ✅ Case detail panel with customer info grid
- ✅ Communication timeline with connected dots (phone/email/SMS)
- ✅ Color-coded communication types (phone=blue, email=green, SMS=purple)
- ✅ Status badges (Open, In Progress, Waiting, Resolved, Closed)
- ✅ Priority badges (Urgent, High, Medium, Low)
- ✅ "3 in queue" pulsing indicator in header
- ✅ Long wait warning (red text when >3 min)
- ✅ 4 realistic mock cases with Storage Vault scenarios
- ✅ All visual polish from STORAGE_VAULT_COMMS_UI_SPEC.md applied

**Working — Interactions:**
- ✅ Take Call logic — removes from queue, creates case, switches to My Cases
- ✅ Mark Resolved / Close Case — status change buttons with context-aware visibility
- ✅ Reopen Case — appears on resolved cases to reopen
- ✅ Send Email modal — To, Subject, Body fields, pre-filled with case data
- ✅ Send SMS modal — To, Message fields, character counter (160 char limit, segment indicator)
- ✅ Template system — 5 email templates, 6 SMS templates with auto-placeholder replacement
- ✅ Active Call View — live timer, customer context, notes field, call summary, quick actions, end call button
- ✅ Search/filter cases — search by name, case ID, unit number, subject, phone
- ✅ Assign case to agent — dropdown with You, Sarah M., Paul B., Unassigned
- ✅ Edit case subject — click to edit inline, Enter to save, Escape to cancel
- ✅ Edit case priority — click priority badge to open dropdown
- ✅ Case history/audit log — collapsible timeline showing all changes with timestamps and user

---

## STORAGE VAULT USE CASES (from customer discussions)

These are the actual workflows Storage Vault needs. Each is mapped to our build status.

### Use Cases — Status Map

| Use Case | Status | Gap |
|----------|--------|-----|
| Inbound phone call (queue → take → case → transcript → summary) | ✅ Mostly built | Need recording player, transcript, AI summary |
| Inbound SMS (webhook → match case → timeline → notify agent) | ⚠️ Partial | No real-time notification, no auto-case-matching UI |
| Inbound email (webhook → match case → timeline → notify agent) | ⚠️ Partial | No real-time notification, no auto-case-matching UI |
| Outbound SMS (agent sends from case) | ✅ Built | — |
| Outbound call (agent initiates call from case) | ❌ Missing | No "Call Customer" button, no outbound call flow |
| Automated outbound email (workflow/system sends) | ❌ Missing | No system/automated comm type in timeline |
| Inbound live chat (route to agent, chat transcript) | ❌ Missing | Whole new channel — V2 |
| Missed call (auto-create case, add to inbox) | ❌ Missing | No missed call concept at all |
| SLA monitoring (overdue/at-risk cases, time criticality) | ❌ Missing | No SLA tracking or visual indicators |
| Reporting (time to answer, calls abandoned, agent perf) | ❌ Missing | Separate module — V2 |
| Skills-based routing (move-in team, billing team, etc.) | ❌ Missing | No team/skill labels on queue items |

---

## BUILD PHASES (Updated Priority)

### Phase A: Gap Fixes — Must Have for Demo (this week)
These close the most critical gaps between what we've built and what Storage Vault actually needs.

#### A1. 🔲 Missed Call Handling
**Gap:** If a call comes in and nobody picks up, nothing happens. Missed calls are a top pain point for storage facilities.
**What to build:**
- New queue item variant: `status: 'missed'` with red styling and "Missed Call" label
- Missed calls auto-create a case with subject "Missed call — callback needed"
- "Callback" button on missed call cases (opens outbound call flow or just highlights the phone number)
- Add 1-2 missed call examples to mock data
**Where:** QueueCard component (new variant), mock data, CaseDetailPanel (callback button)
**UI:** Red accent bar on queue card, "☎️ Missed" badge, "Callback Needed" status on case

#### A2. 🔲 Outbound Call Button
**Gap:** Agents can't initiate calls from the UI. This is a fundamental helpdesk action.
**What to build:**
- "📞 Call Customer" button in CaseDetailPanel action bar (next to Send Email, Send SMS)
- Clicking it shows a confirmation: "Call (403) 555-0147?" with Call / Cancel buttons
- After confirming, show Active Call View (reuse existing component) but for outbound context
- Outbound calls get logged as communications with `direction: 'outbound'` and `type: 'phone'`
**Where:** CaseDetailPanel action buttons, new confirmation dialog, reuse ActiveCallView
**Mock behavior:** Clicking Call shows the Active Call View with "Outbound call to [Customer]" header

#### A3. 🔲 Real-Time Notification Indicators
**Gap:** Agents don't know when new communications arrive unless they're staring at the screen.
**What to build:**
- Mock "toast" notification that slides in from top-right: "New SMS from John Smith on case CS-1001"
- Unread dot indicator (blue dot) on cases with new unread communications
- Badge count on tabs that updates: "Open Cases (3 • 1 new)"
- Subtle pulse/flash animation on a queue card or case card when something new arrives
**Where:** New Toast component, badge dots on CaseCard, tab count updates
**Mock behavior:** Use a `setTimeout` to simulate a new communication arriving 30 seconds after page load. Toast appears, case gets blue dot, tab count increments. Shows the concept for demo.

#### A4. 🔲 Automated/System Communications in Timeline
**Gap:** No concept of system-triggered emails (payment reminders, overdue notices, appointment confirmations). Agents need to see these in the timeline but know they weren't manually sent.
**What to build:**
- New `sentBy` field on communications: `'agent'` | `'system'` | `'ai'`
- System communications show a "🤖 Automated" or "⚙️ System" badge instead of agent name
- AI-generated communications show "✨ AI" badge
- Add 1-2 mock automated emails to existing cases (e.g., "Payment reminder sent automatically")
**Where:** CommunicationItem component (new badge variant), mock data
**UI:** Gray "System" badge, distinct from agent-sent green "Outbound" badge

#### A5. 🔲 SLA Indicators on Cases
**Gap:** No way to see which cases are aging and need urgent attention.
**What to build:**
- Calculate time since last response on each case
- Visual indicator on case cards:
  - Green: responded within 1 hour
  - Yellow: "⏱ 2h since last response" — approaching SLA
  - Red: "🚨 SLA Breach — 4h+ without response" — overdue
- Cases sorted by SLA urgency within each tab (most overdue first)
- Small SLA timer in CaseDetailPanel header
**Where:** CaseCard component (SLA badge), case list sorting logic, CaseDetailPanel header
**Mock data:** Set `lastResponseAt` timestamps on cases so some are green, some yellow, some red

#### A6. 🔲 Skills/Team Labels on Queue Items
**Gap:** No concept of routing — all calls go to everyone. Storage Vault wants move-in calls going to the move-in team, billing to billing, etc.
**What to build:**
- New `team` or `skillGroup` field on queue items: "Move-In", "Billing", "Maintenance", "General"
- Small team label shown on queue cards below customer info
- Optional: filter queue by team
**Where:** QueueCard component, mock data
**UI:** Subtle tag/chip below the unit info: "Billing" in blue, "Move-In" in green, "Maintenance" in orange

### Phase B: AI Assist Layer (next week)
See "AI ASSIST LAYER (COMPLETE)" section below for detailed specs.

### Phase C: V2 Features (post-demo, post-launch)

| Feature | Notes |
|---------|-------|
| Live chat channel | Whole new channel. Chat widget + agent chat interface + chat timeline entries. |
| Reporting dashboard | Separate screen. Time to answer, calls abandoned, agent performance, SLA compliance. Needs production data collection from day one. |
| Agent performance metrics | Depends on reporting infrastructure. |
| WebSocket real-time updates | Replace mock notifications with actual real-time via Paul's backend. |
| Mobile responsiveness | Current UI is desktop-only. |
| Loading states / error handling | Production hardening. |

---

## AI ASSIST LAYER (COMPLETE)

### Overview
Add AI-powered intelligence to the helpdesk that makes human agents faster and better — NOT replacing them with bots. This is the competitive differentiator vs. basic helpdesk tools while being lower risk than autonomous AI agents.

### Features Built

#### 1. ✅ Call Recording Playback
**What:** Audio player embedded in phone communication timeline items
**Where:** Inside each phone `CommunicationItem` in the timeline
**UI spec:**
- Small audio player bar below the call preview text
- Play/pause button, progress bar, timestamp (e.g., "3:22")
- "Download Recording" link
- Muted/minimal styling — don't dominate the timeline
**Mock data:** Use a placeholder `recordingUrl` field on phone communications. For demo, show the player UI with a fake duration. Actual audio playback will work when Paul's API returns real Twilio recording URLs.
**Implementation:** HTML5 `<audio>` element with custom styled controls, or a simple play/pause + progress bar component.

#### 2. ✅ Call Transcription (Expandable)
**What:** Full text transcript of each phone call, shown as expandable section
**Where:** Below the audio player on phone communication items
**UI spec:**
- Collapsed by default — "Show Transcript ▼" toggle link
- When expanded: scrollable text area with speaker labels and timestamps
- Format:
  ```
  [0:00] Customer: Hi, I need help with my access code — it stopped working...
  [0:12] Agent: I can help with that. Can you confirm your unit number?
  [0:18] Customer: Unit 105, John Smith.
  [0:22] Agent: Let me pull that up... I see your account. I'll generate a new code.
  ```
- Light gray background, monospace-ish font for readability
- "Copy Transcript" button in top-right corner
**Mock data:** Add a `transcription` field to phone communications in mock data. Write realistic 10-15 line transcripts for existing mock calls.
**Backend note for Paul:** Twilio records calls. Pipe audio to Deepgram (or AssemblyAI) for high-quality speaker-diarized transcription. Return transcript as array of `{ speaker: string, timestamp: string, text: string }` objects.

#### 3. ✅ AI Call Summary
**What:** 2-3 sentence AI-generated summary of what happened on the call
**Where:** At the top of each phone communication item, above the transcript
**UI spec:**
- Subtle "✨ AI Summary" label with a light purple/indigo accent (#6366F1)
- 2-3 sentences summarizing: what the customer needed, what the agent did, outcome/next steps
- Example:
  ```
  ✨ AI Summary
  Customer called about a non-working access code for Unit 105. Agent generated
  a new code (4821) and confirmed it works at the gate keypad. Issue resolved,
  no follow-up needed.
  ```
- Small "Regenerate" button (mock only — shows loading spinner then same text)
**Mock data:** Add `aiSummary` field to phone communications. Write summaries for all existing mock phone calls.
**Backend note for Paul:** After transcription completes, send transcript to Claude API with prompt: "Summarize this storage facility support call in 2-3 sentences. Include: what the customer needed, what the agent did, and the outcome." Store result on the communication record.

#### 4. ✅ AI Suggested Replies
**What:** When viewing a case with a recent inbound communication, AI suggests 2-3 reply options
**Where:** Above the action buttons (Send Email, Send SMS) in the CaseDetailPanel
**UI spec:**
- Section header: "✨ Suggested Replies"
- 2-3 clickable suggestion cards, each with:
  - A short label (e.g., "Confirm resolution", "Request more info", "Escalate to maintenance")
  - A preview of the suggested message (1-2 lines)
  - Channel badge: "Email" or "SMS"
- Clicking a suggestion opens the Send Email or Send SMS modal pre-filled with that message
- Subtle styling — light border, small text, doesn't overpower the main UI
- "Dismiss" link to hide suggestions
**Mock data:** Add static suggestions to cases based on their most recent inbound communication. Examples:
  - Access code case: "Confirm the new code worked", "Schedule a follow-up check"
  - Billing case: "Acknowledge the issue and provide refund timeline", "Request transaction details"
  - Water leak case: "Confirm repair completed", "Schedule inspection"
**Backend note for Paul:** After a new inbound communication arrives, send the case context + communication history to Claude API with prompt: "Given this support case history for a self-storage facility, suggest 2-3 brief replies the helpdesk agent could send. For each provide: a short label, the message text, and whether to send via email or SMS."

#### 5. ✅ Smart Template Recommendation
**What:** AI recommends the best template based on case context
**Where:** Inside Send Email and Send SMS modals, at top of template dropdown
**UI spec:**
- "✨ Recommended" label next to the top template option
- Brief explanation: "Based on this case, we suggest the Access Code Reset template"
- Rest of templates still available below
**Mock data:** Based on case subject/type, hardcode which template gets the "recommended" badge.

---

## STORAGE VAULT GAP ANALYSIS (Feb 8, 2026)

Based on review of Storage Vault's detailed requirements spec, here's what we've built vs. what's missing:

### ✅ FULLY COVERED
- Inbound phone call handling (queue → take call → active call view → end call)
- SMS in timeline (inbound + outbound)
- Email in timeline (inbound + outbound)
- Outbound SMS modal with templates
- Outbound email modal with templates
- Case management (create, assign, status changes, history)
- AI Assist Layer (recordings, transcripts, summaries, suggested replies)

### ⚠️ PARTIALLY COVERED
| Feature | What We Have | What's Missing |
|---------|--------------|----------------|
| Skills-based routing | Cases have priority, assignee | No visible "Skills" labels on queue items or agents |
| Real-time notifications | Pulsing "3 in queue" badge | No toast notifications for new calls/emails arriving |
| Case matching | Take Call creates new case | No logic to match inbound to existing open case for same customer |

### ❌ NOT COVERED
| Feature | Impact | Priority |
|---------|--------|----------|
| **Missed Call handling** | Calls that ring out need to appear as missed with callback option | 🔴 Must have |
| **Outbound Call button** | Agents can't initiate calls, only receive them | 🔴 Must have |
| **Automated/System comms** | No way to show auto-sent emails (receipts, reminders) in timeline | 🟡 Should have |
| **SLA indicators** | No visible response time targets or overdue warnings on cases | 🟡 Should have |
| **Live Chat channel** | Spec mentions live chat but we only have phone/email/SMS | 🟢 Can wait |
| **Reporting dashboard** | No analytics or performance metrics view | 🟢 Can wait |
| **Agent performance** | No call duration averages, resolution rates, etc. | 🟢 Can wait |

### PRIORITY FOR NEXT BUILD SESSION

**1. Missed Call Handling (🔴 Must Have)**
- Add new queue item type: `status: 'missed'`
- Red badge/indicator for missed calls
- "Call Back" button instead of "Take Call"
- Missed calls show in timeline as "Missed call from..."

**2. Outbound Call Button (🔴 Must Have)**
- Add "📞 Call" button next to Send Email / Send SMS
- Opens Active Call View with outbound indicator
- Mock: shows dialing state → connected → same call UI

**3. Real-time Notification Toast (🟡 Should Have)**
- Toast notification when new call/email/SMS arrives
- "New call from John Smith" with Accept/Dismiss
- Subtle animation, auto-dismiss after 5 seconds

**4. Automated/System Communications (🟡 Should Have)**
- Add `source: 'automated' | 'agent'` to Communication type
- System messages show with robot/gear icon
- Examples: "Payment receipt sent", "Access code auto-generated"

**5. SLA Indicators (🟡 Nice to Have)**
- Add `responseDeadline` to Case type
- Yellow warning when approaching deadline
- Red "OVERDUE" badge when past deadline

---

## FUTURE: AI VOICE AGENTS (DO NOT BUILD YET)

### Why It Matters
AI voice agents that autonomously handle inbound calls are the long-term play. Cubby is building this ($63M funding). ManageSpace needs to be positioned for it but should NOT ship it until criteria below are met.

### Architecture Positioning
The current Comms Hub architecture is already built so AI voice agents can be layered on later without ripping anything out:
- **Call queue already supports "assigned to"** — an AI agent would just be another assignee
- **Communication timeline already supports phone type** — AI-handled calls show up the same way
- **Transcription pipeline** — same infrastructure used for human calls feeds AI agent calls
- **Case creation** — AI agent creates a case the same way a human "Take Call" does
- **Escalation path** — AI agent transfers to human queue when it can't resolve (appears as queue item)

### Vendor Notes (Research Feb 8, 2026)
When ready to evaluate, top contenders:
- **Retell AI** — Best overall for call center use. $0.07+/min base ($0.13-0.30 all-in), model-agnostic (Claude/GPT/Gemini), sub-800ms latency, native Twilio integration (fits Paul's stack), HIPAA/SOC2, low-code builder. 4.8/5 G2 rating. **Top pick when ready.**
- **ElevenLabs Conversational AI** — Best voice quality. Sub-100ms TTS latency. $0.10/min.
- **Cartesia Sonic Turbo** — Absolute lowest TTS latency at 40ms.
- **Synthflow** — Good for non-technical teams. 300-500ms latency. No-code. SOC2/HIPAA/GDPR.

### How It Would Work (Future)
1. Inbound call hits Twilio → routes to Retell AI voice agent
2. AI agent converses using knowledge base (FAQs, account lookup via ManageSpace API)
3. AI resolves simple requests (access codes, hours, payment status)
4. Complex issues: AI creates case + transfers to human queue with transcript + summary
5. All calls appear in same Comms Hub timeline regardless of who handled them
6. Operators configure: which call types go to AI vs. human, brand voice, escalation rules

### DO NOT BUILD UNTIL:
- [ ] 3+ customers asking for it
- [ ] Human agent workflow stable in production
- [ ] Paul's backend supports real-time streaming
- [ ] Brand safety testing completed
- [ ] Legal review for Canadian jurisdiction (Storage Vault)

---

## PROJECT LOCATION

```
/Users/cs/Documents/ManageSpace-cms/
├── CLAUDE.md                              ← THIS FILE (root)
├── communications-hub/
│   ├── communications-hub/                ← ACTUAL PROJECT (nested — this is where code lives)
│   │   ├── src/
│   │   │   ├── App.tsx                    ← Imports CommunicationsHub
│   │   │   ├── CommunicationsHub.tsx      ← MAIN COMPONENT (all UI code)
│   │   │   ├── main.tsx
│   │   │   └── index.css
│   │   ├── index.html
│   │   ├── package.json                   ✅ Fixed (type: module, dev: vite)
│   │   ├── vite.config.ts
│   │   ├── tailwind.config.js
│   │   ├── postcss.config.js
│   │   ├── tsconfig.json
│   │   └── STORAGE_VAULT_COMMS_UI_SPEC.md
│   ├── package.json                       ← OUTER (ignore, wrong level)
│   ├── index.html                         ← OUTER (ignore, wrong level)
│   └── node_modules/
├── revman/
├── shared/
└── docs/
```

**IMPORTANT:** The actual project is NESTED at `communications-hub/communications-hub/`. Always `cd` into the inner folder before running commands.

### Tech Stack
- React 19.2.4
- TypeScript 5.9.3
- Vite 7.3.1 (Rolldown-Vite)
- Tailwind CSS 4.1.18 (installed but UI uses inline styles currently)
- No routing library yet (single-page app for now)

### Running the Dev Server
```bash
cd /Users/cs/Documents/ManageSpace-cms/communications-hub/communications-hub
npx vite
```

---

## ARCHITECTURE: SINGLE-FILE COMPONENT

All UI code is in `src/CommunicationsHub.tsx`. Intentional for speed — break into separate files later.

### Updated Data Model
```typescript
interface TranscriptLine {
  timestamp: string;   // "0:00", "0:12", "1:45"
  speaker: string;     // "Customer" or "Agent"
  text: string;
}

interface SuggestedReply {
  id: string;
  label: string;       // "Confirm resolution"
  message: string;     // Pre-written reply text
  channel: 'email' | 'sms';
}

interface Communication {
  id: string;
  type: 'phone' | 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  timestamp: string;
  preview: string;
  from: string;
  sentBy?: 'agent' | 'system' | 'ai';     // Who sent it
  // Phone-specific:
  duration?: string;
  recordingUrl?: string;             // Twilio recording URL
  transcription?: TranscriptLine[];  // Speaker-diarized transcript
  aiSummary?: string;                // AI-generated 2-3 sentence summary
  callStatus?: 'completed' | 'missed' | 'voicemail';
  // Email-specific:
  subject?: string;
}

interface QueueItem {
  id: string;
  customerName?: string;
  unitNumber?: string;
  phoneNumber: string;
  waitTime: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'assigned' | 'active' | 'missed';
  facilityName?: string;
  customerStatus?: string;
  balance?: number;
  email?: string;
  unitType?: string;
  skillGroup?: string;  // "Move-In", "Billing", "Maintenance", "General"
}

interface Case {
  id: string;
  customerName: string;
  unitNumber: string;
  phone: string;
  email: string;
  facilityName: string;
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTo: string;
  subject: string;
  customerStatus: string;
  balance: number;
  unitType: string;
  createdAt: string;
  lastResponseAt?: string;          // For SLA calculation
  communications: Communication[];
  history?: HistoryEntry[];
  suggestedReplies?: SuggestedReply[];
  hasUnread?: boolean;              // Blue dot indicator
}
```

### Color System
- **Status:** Open=#3B82F6, In Progress=#F59E0B, Waiting=#FB923C, Resolved=#10B981, Closed=#6B7280
- **Priority:** Urgent=#EF4444, High=#F59E0B, Medium=#3B82F6, Low=#6B7280
- **Comm Types:** Phone=#3B82F6, Email=#10B981, SMS=#8B5CF6
- **AI Accent:** ✨ elements = #6366F1 (indigo)
- **SLA:** Green=on track, Yellow=#F59E0B (approaching), Red=#EF4444 (breached)
- **Missed Call:** Red=#EF4444 accent
- **System/Auto:** Gray=#9CA3AF badge
- **Background:** #F1F5F9, Cards: #fff, Borders: #E2E8F0

---

## WHAT TO TELL PAUL (BACKEND REQUIREMENTS)

### Immediate (this sprint)
1. **Call recordings:** Store Twilio `RecordingUrl` on each phone communication, return via API
2. **Transcription:** Pipe recordings to Deepgram for speaker-diarized transcription. Return as `{ timestamp, speaker, text }[]`
3. **AI summaries:** After transcription, send to Claude API: "Summarize this call in 2-3 sentences." Store as `aiSummary`
4. **Missed calls:** Twilio webhook for unanswered calls → create case with "Missed call — callback needed"
5. **Outbound calls:** API endpoint to initiate call via Twilio, connect agent phone to customer phone
6. **Case matching:** Inbound SMS/email → match to existing open case by phone/email, or create new case
7. **SLA tracking:** Store `lastResponseAt` timestamp on cases, return via API

### Next sprint
8. **Suggested replies:** On new inbound comm, generate 2-3 suggestions via Claude API
9. **Real-time notifications:** WebSocket events for new comms, new queue items, case updates
10. **Skills-based routing:** Tag incoming calls with skill group based on IVR selection or customer data

### Future
11. **Retell AI integration** for AI voice agents
12. **Live chat** channel (widget + backend)
13. **Reporting** data collection pipeline

---

## COMPETITIVE INTELLIGENCE: CUBBY CALLS

Cubby's comms product shows:
- Call summaries (AI-generated from transcripts) ← WE'RE BUILDING THIS
- Call scoring (agent performance grading) ← SKIPPING — only matters at scale (50+ agents)
- Call recordings with transcripts ← WE'RE BUILDING THIS
- AI voice agents ← FUTURE — see AI Voice Agents section

**Our differentiation:** Platform model. Operators can extend, customize, plug in their own AI vendors. Cubby's monolith means you get what they build and nothing else.

---

## WORKFLOW FOR CLAUDE CODE

When Cory opens Claude Code in Cursor terminal:

1. **Read this CLAUDE.md first**
2. **Work in the inner folder:** `cd communications-hub/communications-hub`
3. **Edit files directly** — no copy-pasting
4. **Run dev server:** `npx vite`
5. **Build incrementally** — one feature at a time
6. **Test in browser** — Vite hot-reloads

### Current Priority (Build Order)
**Phase A — Gap fixes (this week):**
1. A1: Missed call handling (queue variant + auto-case creation)
2. A2: Outbound call button (Call Customer + confirmation + Active Call View reuse)
3. A3: Real-time notification mock (toast + unread dots + tab badge updates)
4. A4: System/automated communications in timeline (sentBy badges)
5. A5: SLA indicators on cases (green/yellow/red based on response time)
6. A6: Skills/team labels on queue items

**Phase B — AI assist (next week):**
Already built (see AI ASSIST LAYER section above)

**After gaps closed:** Connect to Paul's backend for real Twilio integration.

### Build Philosophy
- Ship working features fast
- Use mock data (Paul's API not ready yet)
- Single file is fine for now
- Inline styles are fine for now
- Pretty good and shipped > perfect and planned
- AI features use mock data now, real API calls later
- **Every component must pass the 5 UX principle checks (see UI/UX DESIGN PRINCIPLES section)**

---

## COMPANY OVERVIEW

### ManageSpace
- **Vision:** Shopify for self-storage (API-first platform, not monolithic PMS)
- **Funding:** ~$2.2M raised, ~10 months runway, $80K-$150K monthly burn
- **Competitive threat:** Cubby ($63M Goldman Sachs) — monolith vs our platform play

### Team
- **Cory Sylvester** — Co-founder, product, building UI with AI tools
- **Adam Barker** — CTO, platform architecture
- **Paul Banfield** — Engineering Lead, comms backend (Twilio)
- **Theo Brown** — Engineer, documents/AI
- **Stephen Bluck** — Engineer, AI workflows

### Key Customers
1. **Morningstar Storage** (US) — ~83 facilities, April 1 go-live
2. **Storage Vault Canada** — ~400 facilities, INVESTOR

### Critical Dates
- **April 1, 2026:** Morningstar go-live
- **Feb 14, 2026:** Comms Hub demo target
- **~December 2026:** Runway exhausted

---

## CORY'S WORK STYLE

- Non-technical founder using AI tools (Claude Code, Cursor)
- Moves fast, gets frustrated with setup issues
- ONE next step at a time
- Keep him building, not planning
- "Pretty good and shipped > perfect and planned"

---

**END OF MASTER CONTEXT DOCUMENT**
*Update this file whenever significant progress is made or priorities change.*
