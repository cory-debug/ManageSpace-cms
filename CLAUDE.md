# ManageSpace - Master Context Document

**Last Updated:** February 8, 2026 (late morning session)
**Purpose:** Single source of truth for ALL Claude instances (Claude Code, Cursor AI, Claude.ai)
**Audience:** Any AI assistant working with Cory Sylvester on ManageSpace

---

## CRITICAL CONTEXT: SURVIVAL MODE

**Timeline:** 10 months until runway exhausted
**Imperative:** Ship working products FAST to generate revenue and secure next customers/investors
**Strategy:** Build base module demos to sell platform vision while delivering customer commitments

---

## CURRENT BUILD: COMMUNICATIONS HUB

### What It Is
A helpdesk inbox UI for Storage Vault (investor + customer) — their staff use it to manage inbound calls, emails, and SMS from storage tenants. Paul is building the backend (Twilio integration), Cory is building the frontend.

### Current State (as of Feb 8, 11:45 AM)

**Working:**
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
- ✅ **Take Call logic** — removes from queue, creates case, switches to My Cases
- ✅ **Mark Resolved / Close Case** — status change buttons with context-aware visibility
- ✅ **Reopen Case** — appears on resolved cases to reopen
- ✅ **Send Email modal** — To, Subject, Body fields, pre-filled with case data
- ✅ **Send SMS modal** — To, Message fields, character counter (160 char limit, segment indicator)
- ✅ **Template system** — 5 email templates, 6 SMS templates with auto-placeholder replacement
- ✅ **Active Call View** — live timer, customer context, notes field, call summary, quick actions, end call button
- ✅ **Search/filter cases** — search by name, case ID, unit number, subject, phone
- ✅ **Assign case to agent** — dropdown with You, Sarah M., Paul B., Unassigned
- ✅ **Edit case subject** — click to edit inline, Enter to save, Escape to cancel
- ✅ **Edit case priority** — click priority badge to open dropdown
- ✅ **Case history/audit log** — collapsible timeline showing all changes with timestamps and user

**ALL DEMO FEATURES COMPLETE!**

**Not started (future/post-demo):**
- WebSocket/real-time integration with Paul's backend
- Notification badges
- Loading states
- Error handling
- Mobile responsiveness

### Project Location

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

**IMPORTANT:** The actual project is NESTED at `communications-hub/communications-hub/`. Always `cd` into the inner folder before running commands. The outer `communications-hub/` has a broken package.json and no src/ — ignore it.

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
# Opens at http://localhost:5173 (or 5174/5175 if ports in use)
```

---

## ARCHITECTURE: SINGLE-FILE COMPONENT

All UI code is in `src/CommunicationsHub.tsx`. This is intentional for speed — we can break it into separate files later. The file contains:

1. **Templates** (EMAIL_TEMPLATES, SMS_TEMPLATES) — pre-written messages with {{placeholders}}
2. **Mock data** (MOCK_QUEUE, MOCK_CASES) — realistic Storage Vault scenarios
3. **Utility functions** (formatWaitTime, getPriorityConfig, getStatusConfig, getCommTypeConfig, applyTemplate)
4. **Sub-components:**
   - Badge, TabButton — shared UI elements
   - QueueCard, CaseCard — list item cards
   - CommunicationItem — timeline entries
   - SendEmailModal, SendSMSModal — compose modals with template dropdowns
   - ActiveCallView — live call screen with timer, notes, quick actions
   - HistoryItem — audit log timeline entries
   - CaseDetailPanel — main detail view (switches to ActiveCallView during calls)
5. **Main component** (CommunicationsHub) — state management, handlers, layout

### Data Model (from spec)
```typescript
interface Case {
  id: string;
  customerId: string;
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  communications: Communication[];
  assignedTo?: string;
  history?: HistoryEntry[];
}

interface HistoryEntry {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  user: string;
}

interface Communication {
  id: string;
  type: 'phone' | 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  timestamp: Date;
  content?: string;
  transcription?: string;
  recordingUrl?: string;
}

interface QueueItem {
  id: string;
  customerName?: string;
  phoneNumber: string;
  waitTime: number;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'assigned' | 'active';
}
```

### Color System
- **Status:** Open=#3B82F6, In Progress=#F59E0B, Waiting=#FB923C, Resolved=#10B981, Closed=#6B7280
- **Priority:** Urgent=#EF4444, High=#F59E0B, Medium=#3B82F6, Low=#6B7280
- **Comm Types:** Phone=#3B82F6, Email=#10B981, SMS=#8B5CF6
- **Background:** #F1F5F9, Cards: #fff, Borders: #E2E8F0

---

## SPEC REFERENCE

Full UI spec is at: `communications-hub/communications-hub/STORAGE_VAULT_COMMS_UI_SPEC.md`

Key screens built:
1. ✅ Helpdesk Inbox (two-panel layout) — DONE
2. ✅ Active Call View (live timer, customer context, notes, quick actions) — DONE
3. ✅ Send Email Modal (templates, subject, body) — DONE
4. ✅ Send SMS Modal (templates, character count) — DONE

**All core screens complete!**

---

## COMPANY OVERVIEW

### ManageSpace
- **Vision:** Shopify for self-storage (API-first platform, not monolithic PMS)
- **Funding:** ~$2.2M raised, ~10 months runway, $80K-$150K monthly burn
- **Competitive threat:** Cubby ($63M Goldman Sachs funding) — monolith vs our platform play

### Team
- **Cory Sylvester** — Co-founder, product, building UI with AI tools
- **Adam Barker** — CTO, platform architecture
- **Paul Banfield** — Engineering Lead, building comms backend (Twilio)
- **Theo Brown** — Engineer, documents/AI
- **Stephen Bluck** — Engineer, AI workflows

### Key Customers
1. **Morningstar Storage** (US) — ~83 facilities, April 1 go-live (core PMS)
2. **Storage Vault Canada** — ~400 facilities, INVESTOR in ManageSpace

### Critical Dates
- **April 1, 2026:** Morningstar IT Crossing go-live
- **Feb 14, 2026:** Target for working Comms Hub demo
- **~December 2026:** Runway exhausted if no new revenue/investment

---

## WORKFLOW FOR CLAUDE CODE

When Cory opens Claude Code in Cursor terminal:

1. **Read this CLAUDE.md first** — it has all context
2. **Work in the inner folder:** `cd communications-hub/communications-hub`
3. **Edit files directly** — no copy-pasting needed
4. **Run dev server:** `npx vite`
5. **Build incrementally** — one feature at a time
6. **Test in browser** — Vite hot-reloads automatically

### Build Philosophy
- Ship working features fast
- Use mock data (Paul's API not ready yet)
- Single file is fine for now (CommunicationsHub.tsx)
- Inline styles are fine for now (can refactor to Tailwind later)
- Pretty good and shipped > perfect and planned

### Current Priority
**ALL DEMO FEATURES COMPLETE!** Ready to show Storage Vault. Next step is connecting to Paul's backend when ready.

Potential enhancements (post-demo): real-time WebSocket integration, notification badges, loading states, error handling, mobile responsiveness.

---

## CORY'S WORK STYLE

- Non-technical founder using AI tools (Claude Code, Cursor)
- Moves fast, gets frustrated with setup issues
- Needs clear, step-by-step guidance
- ONE next step at a time
- Keep him building, not planning
- "Pretty good and shipped > perfect and planned"

---

**END OF MASTER CONTEXT DOCUMENT**
*Update this file whenever significant progress is made or priorities change.*
