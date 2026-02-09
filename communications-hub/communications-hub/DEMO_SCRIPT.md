# Communications Hub — Demo Script (Feb 14)

## Context
All Phase A + B features are built and committed. This is a scripted walkthrough for the Storage Vault leadership demo. Target: 10-12 minutes. Goal: show a real product, not a prototype.

---

## Pre-Demo Checklist
- Fresh browser tab, no console open
- Run `npx vite` from `communications-hub/communications-hub/`
- Load page and **immediately start talking** — the toast notification fires at **8 seconds**

---

## The Script

### 1. Opening — Queue Awareness (1 min)
Page loads showing Queue tab with 5 items. Point out:
- **"5 in queue" pulsing red badge** in header — live awareness
- **Wait timers ticking** in real-time on each card
- **Skill group labels**: General (gray), Billing (blue), Move-In (green), Maintenance (orange) — "Route calls to the right team"
- **2 missed calls** (red cards, bottom of queue) — "Missed calls don't disappear"
- CS-1001 (John Smith) already loaded in the right panel (queue card is highlighted)

### 2. AI Call Intelligence — The Star Moment (2-3 min)
CS-1001 is already selected. In the phone communication:

1. **AI Summary** — already visible in the indigo box. Read it aloud: *"Customer called about a non-working access code. Agent generated new code 4821. Customer confirmed."* Say: "A 3-minute call summarized in 2 sentences — no manual notes."
2. **Click Play** on the audio player — let it run 5 seconds, then pause. "Full recording available anytime."
3. **Click "Show Transcript"** — 12-line dialogue expands with timestamps + speaker labels. "Or read the full transcript in 30 seconds instead of listening to 3 minutes."
4. **Click "Regenerate"** on the summary — spinner for 1.5s, then resolves. Shows it's not static.

### 3. ~8 seconds in — Notification Arrives (automatic)
**Don't interrupt this.** While you're talking about transcripts, the toast slides in:
- "New SMS from Jane Doe on case CS-1002"
- Blue dot appears on CS-1002 card
- Tab badges update: "Open Cases (2) **1 new**"

Acknowledge it naturally: *"And that's a real-time notification — an SMS just came in on another case. We'll look at it in a moment."*

### 4. Suggested Replies + Templates (1.5 min)
Still on CS-1001, scroll to the bottom:

1. **Point to "Suggested Replies"** — 2 context-aware options: "Confirm resolution" (email) and "Quick follow-up" (SMS)
2. **Click "Confirm resolution"** — Send Email modal opens pre-filled with a professional reply. "One click, ready to send."
3. **Close modal, click "Send Email" button instead** — show the template dropdown with "Recommended: Access Code Reset" at top. "AI picks the right template based on case context."
4. Close modal.

### 5. Missed Call Callback (1.5 min)
Switch to Queue tab:

1. **Click "Callback"** on Mike Thompson (red card) — confirmation modal: "Call Customer? Mike Thompson (403) 555-0234"
2. **Click "Call Now"** — Active Call View appears with live timer, customer context, notes fields
3. **Type a quick note**: "Customer confirmed issue resolved"
4. **Click a Quick Action** (e.g., "Reset Access Code") — populates the summary
5. **Click "End Call"** — returns to case detail, call logged with duration

Say: *"Missed call created a case automatically. Agent calls back with full context. Everything tracked."*

### 6. System Communications + AI Email (30s)
Switch to All Cases tab, click **CS-1002 (Jane Doe)** (look for the blue dot):

- Point to the **"Automated" badges** on the two payment confirmation emails — "System-sent emails show up in the same timeline so agents have full context"
- Point out the **new SMS** that arrived from the notification — it's right there in the timeline

Then click **CS-0995 (Maria Garcia)**:
- Scroll to the outbound email — it has an **"AI Generated" badge** — "AI wrote this professional follow-up email from the call transcript. Saved the agent 15 minutes."

### 7. Case Management (1 min)
Back on any case (CS-1001 works — switch to My Cases tab and click it):

1. **Click priority badge** → dropdown → change to Urgent → badge turns red
2. **Click "Mark Resolved"** → status goes green, "Reopen Case" appears, suggested replies disappear
3. **Click "Reopen Case"** → back to In Progress, suggested replies reappear
4. **Point to SLA indicator** in header — green "Responded" badge. Say: *"Cases approaching SLA breach turn yellow, then red. Most urgent sorts to the top."*

### 8. Search (30s)
On All Cases tab:
- Type "water" in search — filters to Maria Garcia's water leak case
- Clear, type "Unit 212" — filters to Jane Doe
- Say: *"Search across names, case IDs, units, subjects, phone numbers."*

---

## Gotchas to Avoid

| Trap | Why | What to do |
|------|-----|------------|
| Audio player runs too long | No real audio file — silence is awkward | Stop after 5 seconds |
| Toast missed | Fires at 8s — if you're still doing intro, you'll miss it | Start talking immediately on page load |
| Suggested replies gone | They hide when case is resolved | Show them BEFORE changing status in Step 4 |
| SMS char counter | Shows segment warnings past 160 chars | Keep demo SMS short |
| Queue timers get huge | They tick forever — 20+ min looks odd | Don't linger on queue tab too long |
| Queue card click | Clicking a queue card changes the right panel | That's fine — it shows the matching case if one exists |

---

## Key Talking Points

1. **"Every call recorded, transcribed, and summarized automatically."** — The headline feature
2. **"AI suggests replies and picks the right template."** — Speed multiplier
3. **"Missed calls create cases. Nothing falls through the cracks."** — Pain point for storage facilities
4. **"Skills-based routing labels ready for your team structure."** — Shows it fits their org
5. **"Same platform for phone, email, and SMS."** — Unified inbox value prop
6. **"Built to connect to your Twilio stack."** — Paul's backend integration story
