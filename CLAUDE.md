# ManageSpace - Master Context Document

**Last Updated:** February 8, 2026 (afternoon session — AI architecture update)
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

### Current State (as of Feb 8, afternoon)

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

## NEXT BUILD PHASE: AI ASSIST LAYER

### Overview
Add AI-powered intelligence to the helpdesk that makes human agents faster and better — NOT replacing them with bots. This is the competitive differentiator vs. basic helpdesk tools while being lower risk than autonomous AI agents.

### Features to Build (in order)

#### 1. 🔲 Call Recording Playback
**What:** Audio player embedded in phone communication timeline items
**Where:** Inside each phone `CommunicationItem` in the timeline
**UI spec:**
- Small audio player bar below the call preview text
- Play/pause button, progress bar, timestamp (e.g., "3:22")
- "Download Recording" link
- Muted/minimal styling — don't dominate the timeline
**Mock data:** Use a placeholder `recordingUrl` field on phone communications. For demo, show the player UI with a fake duration. Actual audio playback will work when Paul's API returns real Twilio recording URLs.
**Implementation:** HTML5 `<audio>` element with custom styled controls, or a simple play/pause + progress bar component.

#### 2. 🔲 Call Transcription (Expandable)
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

#### 3. 🔲 AI Call Summary
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

#### 4. 🔲 AI Suggested Replies
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

#### 5. 🔲 Smart Template Recommendation
**What:** AI recommends the best template based on case context
**Where:** Inside Send Email and Send SMS modals, at top of template dropdown
**UI spec:**
- "✨ Recommended" label next to the top template option
- Brief explanation: "Based on this case, we suggest the Access Code Reset template"
- Rest of templates still available below
**Mock data:** Based on case subject/type, hardcode which template gets the "recommended" badge.

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
  duration?: string;
  recordingUrl?: string;             // Twilio recording URL
  transcription?: TranscriptLine[];  // Speaker-diarized transcript
  aiSummary?: string;                // AI-generated 2-3 sentence summary
  subject?: string;                  // Email subject
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
  communications: Communication[];
  history?: HistoryEntry[];
  suggestedReplies?: SuggestedReply[];
}
```

### Color System
- **Status:** Open=#3B82F6, In Progress=#F59E0B, Waiting=#FB923C, Resolved=#10B981, Closed=#6B7280
- **Priority:** Urgent=#EF4444, High=#F59E0B, Medium=#3B82F6, Low=#6B7280
- **Comm Types:** Phone=#3B82F6, Email=#10B981, SMS=#8B5CF6
- **AI Accent:** ✨ elements use #6366F1 (indigo) to signal "AI-powered"
- **Background:** #F1F5F9, Cards: #fff, Borders: #E2E8F0

---

## WHAT TO TELL PAUL (BACKEND REQUIREMENTS)

### Immediate (this sprint)
1. **Call recordings:** Ensure Twilio `RecordingUrl` is stored on each phone communication and returned via API
2. **Transcription:** After call ends, pipe recording to Deepgram (or AssemblyAI) for speaker-diarized transcription. Store as array of `{ timestamp, speaker, text }`. Return in API response.
3. **AI summaries:** After transcription completes, send transcript to Claude API (claude-sonnet-4-20250514) with prompt: *"Summarize this storage facility support call in 2-3 sentences. Include: what the customer needed, what the agent did, and the outcome."* Store as `aiSummary` on communication record.

### Next sprint
4. **Suggested replies:** On new inbound communication, generate 2-3 reply suggestions via Claude API. Return as `suggestedReplies` on case object.

### Future
5. **Retell AI integration** for AI voice agents (see AI Voice Agents section)

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
1. Add `recordingUrl`, `transcription`, `aiSummary` fields to mock phone communications
2. Build recording player component inside CommunicationItem (phone type only)
3. Build expandable transcript section below recording player
4. Build AI summary display above transcript
5. Add `suggestedReplies` to mock cases
6. Build SuggestedReplies component above action buttons in CaseDetailPanel
7. Wire suggested reply click → opens Send Email/SMS modal pre-filled

### Build Philosophy
- Ship working features fast
- Use mock data (Paul's API not ready yet)
- Single file is fine for now
- Inline styles are fine for now
- Pretty good and shipped > perfect and planned
- AI features use mock data now, real API calls later

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
