# Storage Vault Communications UI - Detailed Specification

**Module Name:** Communications Hub (Storage Vault MVP)  
**Target:** Accelerate Paul's backend implementation  
**Build Time Estimate:** 15-20 hours (across 3-5 days)  
**Purpose:** Your role is building UI layer for Paul's Twilio + case management backend

---

## STRATEGIC CONTEXT

**Paul is building:** Backend implementation (Twilio integration, webhooks, case management, routing logic)

**You are building:** Frontend UI layer that visualizes and controls Paul's backend

**Why this matters:** 
- Storage Vault is an investor + customer
- Fast delivery = happy investor = continued support
- Proves platform capability to build customer-specific modules quickly
- UI quality shows polish despite speed

---

## PAUL'S SPIKE REQUIREMENTS (Recap)

**Full workflow Paul is proving:**

1. ✅ Receive call from known number (existing customer)
2. ✅ Match call to customer (by phone number)
3. ✅ Create new case for call
4. ✅ Route call to helpdesk
5. **YOU BUILD:** Helpdesk views call in queue with context (customer + case)
6. **YOU BUILD:** Take call action (remove from queue)
7. ✅ End call - system receives transcription, attaches to case
8. **YOU BUILD:** Helpdesk sends follow-up email/SMS to customer for same case
9. ✅ Customer replies to email/SMS
10. ✅ System matches reply to customer/case, attaches communication
11. **YOU BUILD:** System notifies helpdesk of new communication
12. **YOU BUILD:** Helpdesk views complete case history (phone + emails + SMS)

**Your scope:** Steps 5, 6, 8, 11, 12 - the UI layer

---

## DATA MODEL (What Paul is Building)

### Case
```typescript
interface Case {
  id: string;
  customerId: string;
  facilityId: string;
  status: 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  subject: string; // Auto-generated or manual
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string; // User ID
  communications: Communication[];
  tags?: string[];
}
```

### Communication
```typescript
interface Communication {
  id: string;
  caseId: string;
  type: 'phone' | 'email' | 'sms';
  direction: 'inbound' | 'outbound';
  from: string; // Phone number or email
  to: string;
  content?: string; // SMS/email body
  transcription?: string; // Phone call transcription
  recordingUrl?: string; // Phone call recording
  timestamp: Date;
  status: 'pending' | 'sent' | 'delivered' | 'failed';
  sentBy?: string; // User ID for outbound
}
```

### Customer (from ManageSpace)
```typescript
interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  facilityId: string;
  unitNumber?: string;
  currentRate?: number;
  balance?: number;
  status: 'active' | 'delinquent' | 'overlocked' | 'moved-out';
}
```

### Queue Item (for incoming calls)
```typescript
interface QueueItem {
  id: string;
  customerId?: string; // Might be unknown caller
  customerName?: string;
  phoneNumber: string;
  facilityId?: string;
  waitTime: number; // Seconds
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'waiting' | 'assigned' | 'active';
  assignedTo?: string;
  createdAt: Date;
}
```

---

## UI SCREENS

### Screen 1: Helpdesk Inbox (Primary View)

**Purpose:** Central command center for all communications

**Layout:**
```
┌────────────────────────────────────────────────────────────────┐
│  COMMUNICATIONS HUB                                  [User ▼]  │
├────────────────────────────────────────────────────────────────┤
│  [Queue (3)] [Open Cases (12)] [My Cases (5)] [All Cases]     │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌──────────────────────────────────┐│
│  │ CALL QUEUE          │  │ CASE DETAILS                     ││
│  │                     │  │                                  ││
│  │ ⚠ John Smith       │  │ Selected: John Smith - Unit 105  ││
│  │   Unit 105          │  │ Status: In Progress              ││
│  │   Wait: 2m 34s      │  │ Priority: High                   ││
│  │   [Take Call]       │  │ Assigned to: You                 ││
│  │                     │  │                                  ││
│  │ 📞 Jane Doe        │  │ Communications (3):              ││
│  │   Unit 212          │  │                                  ││
│  │   Wait: 0m 45s      │  │ ☎ Phone Call (Inbound)          ││
│  │   [Take Call]       │  │   Today 2:15 PM | 3m 22s        ││
│  │                     │  │   Transcription: "Hi, I need..." ││
│  │ 📞 Unknown          │  │   [Play Recording]               ││
│  │   (555) 123-4567    │  │                                  ││
│  │   Wait: 5m 12s      │  │ ✉ Email (Outbound)              ││
│  │   [Take Call]       │  │   Today 2:18 PM                  ││
│  │                     │  │   "Thanks for calling. Here's..." ││
│  └─────────────────────┘  │                                  ││
│                            │ 💬 SMS (Inbound)                 ││
│                            │   Today 2:45 PM                  ││
│                            │   "Thank you, that helps!"       ││
│                            │                                  ││
│                            │ [Send Email] [Send SMS]          ││
│                            │ [Mark Resolved] [Close Case]     ││
│                            └──────────────────────────────────┘│
└────────────────────────────────────────────────────────────────┘
```

**Key Features:**

**Left Panel - Queue/Cases:**
- Tab navigation (Queue, Open Cases, My Cases, All Cases)
- Each item shows: Name, Unit, Context, Wait time (for queue), Status
- Visual priority indicators (color-coded)
- Click to select, shows details on right
- Real-time updates (new items appear, times increment)

**Right Panel - Case Details:**
- Customer context at top (name, unit, status, balance if relevant)
- Timeline of all communications (chronological)
- Each communication shows: type, direction, timestamp, preview
- Expandable for full content
- Action buttons: Send Email, Send SMS, Mark Resolved, Close Case

---

### Screen 2: Call Queue Detail View

**When helpdesk clicks "Take Call":**

```
┌────────────────────────────────────────────────────────────────┐
│  INCOMING CALL - John Smith (Unit 105)                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer Information:                                          │
│  Name: John Smith                                               │
│  Unit: 105 (10x10 Climate Control)                             │
│  Phone: (555) 123-4567                                          │
│  Status: Active | Balance: $0.00                                │
│  Last Payment: Jan 15, 2026                                     │
│                                                                 │
│  Recent History:                                                │
│  • Last call: Dec 10, 2025 (about access code)                 │
│  • Payment autopay enabled                                      │
│  • No outstanding issues                                        │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  Call in progress... ⏱ 1m 23s                                  │
│                                                                 │
│  [Add Note]  [Create Task]  [End Call & Create Case]           │
│                                                                 │
│  Quick Notes:                                                   │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ [Textarea for notes during call]                           ││
│  │                                                             ││
│  │                                                             ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**Features:**
- Customer context immediately visible
- Call timer showing duration
- Quick note-taking during call
- Options to create task or case
- End call button triggers case creation automatically

---

### Screen 3: Send Email/SMS Modal

**When clicking "Send Email" or "Send SMS":**

```
┌────────────────────────────────────────────────────────────────┐
│  Send Email - John Smith                                        │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  To: johnsmith@email.com                                        │
│  Case: #CS-1234 - Access code issue                            │
│                                                                 │
│  [Template ▼] [Custom]                                          │
│                                                                 │
│  Subject: Re: Your IT Crossing Storage Unit                     │
│                                                                 │
│  Message:                                                       │
│  ┌────────────────────────────────────────────────────────────┐│
│  │ Hi John,                                                    ││
│  │                                                             ││
│  │ Thanks for calling today. As we discussed, your new        ││
│  │ access code is: 1234                                        ││
│  │                                                             ││
│  │ Let me know if you have any other questions!               ││
│  │                                                             ││
│  │ Best,                                                       ││
│  │ [Your Name]                                                 ││
│  └────────────────────────────────────────────────────────────┘│
│                                                                 │
│  [ ] Attach call recording                                      │
│  [ ] Mark case as resolved after sending                        │
│                                                                 │
│  [Cancel]  [Send]                                               │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

**For SMS, similar but simpler:**
- Character count (160 limit)
- SMS templates
- Send immediately

---

### Screen 4: Case History View

**When viewing resolved/closed cases:**

```
┌────────────────────────────────────────────────────────────────┐
│  Case #CS-1234 - Access Code Issue                       CLOSED│
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Customer: John Smith | Unit: 105 | Created: Feb 6, 2:15 PM    │
│  Resolved by: Sarah Johnson | Closed: Feb 6, 3:02 PM           │
│  Resolution time: 47 minutes                                    │
│                                                                 │
│  ──────────────────────────────────────────────────────────────│
│                                                                 │
│  Communication Timeline:                                        │
│                                                                 │
│  ☎ Phone Call (Inbound) - Feb 6, 2:15 PM                      │
│  Duration: 3m 22s | Transcription available                    │
│  "Hi, I'm having trouble with my access code..."                │
│  [View Full Transcription] [Play Recording]                    │
│                                                                 │
│  ✉ Email (Outbound) - Feb 6, 2:18 PM                          │
│  Sent by: Sarah Johnson                                         │
│  Subject: "Re: Your IT Crossing Storage Unit"                   │
│  "Hi John, Thanks for calling today. Your new code is 1234..."  │
│  [View Full Email]                                              │
│                                                                 │
│  💬 SMS (Inbound) - Feb 6, 2:45 PM                             │
│  From: (555) 123-4567                                           │
│  "Thank you, that works perfect!"                               │
│                                                                 │
│  ✅ Case Resolved - Feb 6, 3:02 PM                             │
│  Resolution: "Provided new access code, customer confirmed      │
│  working"                                                       │
│                                                                 │
│  [Reopen Case]  [Export]  [Add Note]                           │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## COMPONENT SPECIFICATIONS

### QueueItemCard
```typescript
interface QueueItemCardProps {
  item: QueueItem;
  customer?: Customer;
  isSelected: boolean;
  onSelect: () => void;
  onTakeCall: () => void;
}

// Visual:
// - Priority indicator (colored left border)
// - Customer name + unit OR phone number if unknown
// - Wait time (updates every second)
// - "Take Call" button (primary CTA)
// - Hover effect for selection
```

### CaseDetailPanel
```typescript
interface CaseDetailPanelProps {
  case: Case;
  customer: Customer;
  communications: Communication[];
  onSendEmail: () => void;
  onSendSMS: () => void;
  onResolve: () => void;
  onClose: () => void;
}

// Visual:
// - Customer context header
// - Timeline of communications (newest first or chronological?)
// - Each communication expandable for details
// - Action buttons at bottom
```

### CommunicationItem
```typescript
interface CommunicationItemProps {
  communication: Communication;
  isExpanded: boolean;
  onToggle: () => void;
  onPlayRecording?: () => void; // For phone calls
}

// Visual:
// - Icon for type (phone, email, SMS)
// - Direction indicator (inbound/outbound)
// - Timestamp
// - Preview text (first 50 chars)
// - Expand/collapse for full content
// - Play button for recordings
```

### SendEmailModal
```typescript
interface SendEmailModalProps {
  case: Case;
  customer: Customer;
  onSend: (email: EmailMessage) => Promise<void>;
  onCancel: () => void;
  templates?: EmailTemplate[];
}

// Features:
// - Template selector (pre-filled common responses)
// - Rich text editor (basic formatting)
// - Attach recording option
// - Auto-resolve case option
```

### SendSMSModal
```typescript
interface SendSMSModalProps {
  case: Case;
  customer: Customer;
  onSend: (sms: SMSMessage) => Promise<void>;
  onCancel: () => void;
  templates?: SMSTemplate[];
}

// Features:
// - Character count (160 limit warning)
// - SMS templates (short responses)
// - Send immediately
```

---

## USER WORKFLOWS

### Workflow 1: Handle Incoming Call

1. **Call arrives** → appears in Queue tab
2. **Helpdesk sees** queue item with customer context
3. **Clicks "Take Call"** → modal shows customer details
4. **During call** → takes notes
5. **Ends call** → automatically creates case with:
   - Customer linked
   - Call recording attached
   - Transcription generated (async, appears later)
   - Status: "In Progress"
6. **Sends follow-up email** → stays in case
7. **Marks resolved** when issue complete

### Workflow 2: Handle Customer Reply

1. **Customer replies to email** → new communication in case
2. **Notification badge** appears on "Open Cases" tab
3. **Helpdesk views case** → sees new reply
4. **Responds** via email or SMS
5. **Marks resolved** if issue complete

### Workflow 3: Browse Case History

1. **Clicks "All Cases" tab**
2. **Filters** by status, date, customer
3. **Selects case** → views complete history
4. **Can reopen** if customer contacts again

---

## INTEGRATION WITH PAUL'S BACKEND

### API Endpoints Paul is Building (assumed)

```typescript
// Get queue items
GET /api/communications/queue
Response: QueueItem[]

// Take call (remove from queue, assign to user)
POST /api/communications/queue/{id}/take
Body: { userId: string }
Response: Case

// Get cases
GET /api/communications/cases?status=open&assignedTo={userId}
Response: Case[]

// Get case details
GET /api/communications/cases/{id}
Response: Case with Communications[]

// Send email
POST /api/communications/cases/{caseId}/email
Body: { to: string, subject: string, body: string, attachRecording?: boolean }
Response: Communication

// Send SMS
POST /api/communications/cases/{caseId}/sms
Body: { to: string, message: string }
Response: Communication

// Update case status
PATCH /api/communications/cases/{id}
Body: { status: 'resolved' | 'closed' }
Response: Case

// WebSocket for real-time updates
WS /api/communications/events
Events: new_queue_item, case_updated, new_communication
```

### Real-Time Updates

**Use WebSocket connection for:**
- New calls appear in queue immediately
- Queue wait times update every second
- New communications appear in case detail
- Case status changes reflect across all views

**Implementation:**
```typescript
// Establish WebSocket connection
const ws = new WebSocket('ws://api.managespace.com/communications/events');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  switch(data.type) {
    case 'new_queue_item':
      // Add to queue list
      break;
    case 'case_updated':
      // Refresh case details if viewing
      break;
    case 'new_communication':
      // Add to timeline, show notification badge
      break;
  }
};
```

---

## VISUAL DESIGN

### Color Palette

**Status Colors:**
- Open: Blue (#3B82F6)
- In Progress: Yellow (#F59E0B)
- Waiting: Orange (#FB923C)
- Resolved: Green (#10B981)
- Closed: Gray (#6B7280)

**Priority Colors:**
- Low: Gray (#9CA3AF)
- Medium: Blue (#3B82F6)
- High: Orange (#F59E0B)
- Urgent: Red (#EF4444)

**Communication Types:**
- Phone: Blue (#3B82F6) with phone icon
- Email: Green (#10B981) with envelope icon
- SMS: Purple (#8B5CF6) with message icon

### Typography

- Headers: Bold, 18-24px
- Body: Regular, 14-16px
- Timestamps: Gray, 12-14px
- Names: Bold, 14-16px

---

## IMPLEMENTATION PHASES

### Phase 1: Core Layout (Days 1-2)

- [ ] Main inbox layout (two-panel)
- [ ] Tab navigation (Queue, Cases)
- [ ] Queue item cards
- [ ] Case detail panel
- [ ] Static data for testing

### Phase 2: Queue Management (Day 3)

- [ ] "Take Call" action
- [ ] Real-time queue updates
- [ ] Customer context display
- [ ] Call timer

### Phase 3: Communications (Days 4-5)

- [ ] Communication timeline display
- [ ] Send email modal
- [ ] Send SMS modal
- [ ] Template system

### Phase 4: Polish & Integration (Day 6-7)

- [ ] WebSocket integration for real-time
- [ ] Notifications/badges
- [ ] Loading states
- [ ] Error handling
- [ ] Mobile responsiveness

---

## QUESTIONS FOR PAUL

**Before you start building, clarify with Paul:**

1. **API Endpoints:** What's the exact endpoint structure? (See assumptions above)

2. **Authentication:** How do modules authenticate with comms APIs?

3. **WebSocket:** Is real-time via WebSocket or polling?

4. **Twilio Integration:** Do I need to interact with Twilio directly or only through Paul's APIs?

5. **Customer Data:** How do I get customer details? ManageSpace core API or comms API?

6. **Recording Playback:** How are call recordings accessed? (URL? Twilio widget?)

7. **Email/SMS Sending:** Does Paul's API handle actual sending or do I call Twilio?

8. **Templates:** Are templates stored in backend or can I hardcode common ones in UI?

9. **Notifications:** How should "new communication" notifications work? (Badge count? Toast?)

10. **Test Data:** Can Paul provide mock data structure or test API?

---

## SUCCESS CRITERIA

**This UI is successful when:**

1. ✅ Helpdesk can see incoming calls in queue within 5 seconds of arrival
2. ✅ Taking a call shows customer context immediately
3. ✅ Case timeline shows all communications chronologically
4. ✅ Sending email/SMS takes <30 seconds
5. ✅ New replies appear in case detail within 10 seconds
6. ✅ Storage Vault team can demo full workflow end-to-end
7. ✅ UI feels fast, responsive, professional

---

## DEMO SCRIPT FOR STORAGE VAULT

**5-Minute Demo Flow:**

1. **Show empty queue** → "This is the helpdesk inbox"
2. **Trigger test call** → appears in queue instantly
3. **Click "Take Call"** → customer context loads
4. **Show notes field** → "Helpdesk takes notes during call"
5. **End call** → case created automatically
6. **Send follow-up email** → template, quick send
7. **Simulate customer reply** → appears in timeline
8. **Mark resolved** → case moves to resolved tab
9. **Show case history** → complete audit trail

**Key message:** "From call to resolution, everything tracked in one place."

---

**READY TO BUILD. This spec has everything you need to start coding the UI layer immediately.**
