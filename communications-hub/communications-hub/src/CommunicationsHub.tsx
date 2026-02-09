import { useState, useEffect } from "react";

const AGENTS = ["You", "Sarah M.", "Paul B.", "Unassigned"];

const EMAIL_TEMPLATES = [
  { id: "access-code", name: "Access Code Reset", subject: "Your New Access Code - Unit {{unit}}", body: "Hi {{name}},\n\nYour new access code is: [CODE]\n\nThis code is active immediately and will work at the gate keypad. Please keep this code secure and do not share it with others.\n\nIf you have any issues, please don't hesitate to contact us.\n\nBest regards,\nStorage Vault Team" },
  { id: "payment-reminder", name: "Payment Reminder", subject: "Payment Reminder - Unit {{unit}}", body: "Hi {{name}},\n\nThis is a friendly reminder that your account has an outstanding balance of {{balance}}.\n\nTo avoid any late fees or service interruptions, please make a payment at your earliest convenience. You can pay online through your tenant portal or by calling our office.\n\nIf you've already made this payment, please disregard this message.\n\nThank you,\nStorage Vault Team" },
  { id: "maintenance-update", name: "Maintenance Update", subject: "Maintenance Update - {{facility}}", body: "Hi {{name}},\n\nWe wanted to update you on the maintenance issue you reported.\n\n[DESCRIBE UPDATE HERE]\n\nIf you have any questions or concerns, please let us know.\n\nThank you for your patience,\nStorage Vault Team" },
  { id: "follow-up", name: "Follow-up / Thank You", subject: "Following Up - {{facility}}", body: "Hi {{name}},\n\nThank you for contacting Storage Vault. We wanted to follow up and make sure your issue has been resolved to your satisfaction.\n\nIf there's anything else we can help you with, please don't hesitate to reach out.\n\nBest regards,\nStorage Vault Team" },
  { id: "unit-transfer", name: "Unit Transfer Confirmation", subject: "Unit Transfer Details - {{facility}}", body: "Hi {{name}},\n\nWe're pleased to confirm your unit transfer request.\n\nNew Unit: [UNIT NUMBER]\nMove Date: [DATE]\nNew Rate: [RATE]\n\nPlease ensure your current unit is emptied by the move date. Your new access code will remain the same.\n\nLet us know if you have any questions.\n\nBest regards,\nStorage Vault Team" },
];

const SMS_TEMPLATES = [
  { id: "access-code", name: "Access Code", message: "Hi {{name}}, your new Storage Vault access code is: [CODE]. This is active now at {{facility}}." },
  { id: "payment-reminder", name: "Payment Reminder", message: "Hi {{name}}, friendly reminder: your Storage Vault account has a balance of {{balance}}. Pay online or call us to avoid late fees." },
  { id: "maintenance-coming", name: "Maintenance On Way", message: "Hi {{name}}, maintenance is on the way to {{facility}} now. ETA: [TIME]. We'll update you when complete." },
  { id: "maintenance-complete", name: "Maintenance Complete", message: "Hi {{name}}, the maintenance issue at {{facility}} has been resolved. Your unit was not affected. All clear!" },
  { id: "follow-up", name: "Quick Follow-up", message: "Hi {{name}}, just checking in - is everything resolved with your Storage Vault unit? Let us know if you need anything else!" },
  { id: "gate-hours", name: "Gate Hours", message: "Hi {{name}}, {{facility}} gate hours are 6am-10pm daily. Your access code works during these hours. Questions? Call us!" },
];

const MOCK_QUEUE = [
  { id: "q1", customerName: "John Smith", unitNumber: "105", phoneNumber: "(403) 555-0147", waitTime: 154, priority: "high", status: "waiting", facilityName: "IT Crossing", customerStatus: "active", balance: 0, skillGroup: "General" },
  { id: "q2", customerName: "Jane Doe", unitNumber: "212", phoneNumber: "(403) 555-0283", waitTime: 45, priority: "medium", status: "waiting", facilityName: "IT Crossing", customerStatus: "active", balance: 125.0, skillGroup: "Billing" },
  { id: "q3", customerName: null, unitNumber: null, phoneNumber: "(403) 555-0100", waitTime: 312, priority: "low", status: "waiting", facilityName: null, customerStatus: null, balance: null, skillGroup: "Move-In" },
  { id: "q4", customerName: "Mike Thompson", unitNumber: "078", phoneNumber: "(403) 555-0234", waitTime: 847, priority: "high", status: "missed", facilityName: "IT Crossing", customerStatus: "active", balance: 0, missedAt: "Today 1:45 PM", skillGroup: "Maintenance" },
  { id: "q5", customerName: null, unitNumber: null, phoneNumber: "(403) 555-0399", waitTime: 1523, priority: "medium", status: "missed", facilityName: null, customerStatus: null, balance: null, missedAt: "Today 12:30 PM", skillGroup: "Billing" },
];
const MOCK_CASES = [
  { id: "CS-1001", customerName: "John Smith", unitNumber: "105", phone: "(403) 555-0147", email: "john.smith@email.com", facilityName: "IT Crossing", status: "in-progress", priority: "high", assignedTo: "You", subject: "Access code not working", customerStatus: "active", balance: 0, lastPayment: "Jan 15, 2026", unitType: "10x10 Climate Control", createdAt: "Today 2:10 PM", communications: [
    { id: "c1", type: "phone", direction: "inbound", timestamp: "Today 2:15 PM", duration: "3m 22s", preview: "Hi, I need help with my access code - it stopped working this morning when I tried to get into my unit.", from: "(403) 555-0147",
      recordingUrl: "https://api.twilio.com/recordings/RE-mock-recording-001.mp3",
      aiSummary: "Customer called because his gate access code stopped working this morning. Agent verified the account for Unit 105 and generated a new access code (4821). Customer confirmed he would test it right away.",
      transcription: [
        { timestamp: "0:00", speaker: "Agent", text: "Thank you for calling Storage Vault IT Crossing, this is Sarah speaking. How can I help you today?" },
        { timestamp: "0:05", speaker: "Customer", text: "Hi, I need help with my access code. It stopped working this morning when I tried to get into my unit." },
        { timestamp: "0:12", speaker: "Agent", text: "I'm sorry to hear that. I can definitely help you with that. Can you please confirm your name and unit number?" },
        { timestamp: "0:18", speaker: "Customer", text: "Sure, it's John Smith, Unit 105." },
        { timestamp: "0:22", speaker: "Agent", text: "Thank you, Mr. Smith. Let me pull up your account... I can see your unit here. I'll generate a new access code for you right now." },
        { timestamp: "0:35", speaker: "Customer", text: "Great, thank you." },
        { timestamp: "0:45", speaker: "Agent", text: "Alright, your new code is 4821. That's 4-8-2-1. This should work immediately at the gate keypad." },
        { timestamp: "0:55", speaker: "Customer", text: "4821, got it. Should I try it right now?" },
        { timestamp: "1:00", speaker: "Agent", text: "Yes, you can test it anytime. It's already active in the system. Is there anything else I can help you with today?" },
        { timestamp: "1:08", speaker: "Customer", text: "No, that's everything. I'll head over and try it now." },
        { timestamp: "1:12", speaker: "Agent", text: "Sounds good. If you have any issues, don't hesitate to call back. Have a great day!" },
        { timestamp: "1:18", speaker: "Customer", text: "Thanks, you too. Bye." },
      ]
    },
    { id: "c2", type: "email", direction: "outbound", timestamp: "Today 2:18 PM", preview: "Thanks for calling. Here's your new access code: 4821. This should work immediately at the gate keypad.", subject: "Re: Access Code - Unit 105", from: "support@storagevault.ca" },
    { id: "c3", type: "sms", direction: "inbound", timestamp: "Today 2:45 PM", preview: "Thank you, that helps! The new code worked perfectly.", from: "(403) 555-0147" },
    { id: "c3b", type: "sms", direction: "outbound", timestamp: "Today 2:47 PM", preview: "Great to hear! Glad the new code is working. Don't hesitate to reach out if you need anything else.", from: "support@storagevault.ca" },
  ], history: [
    { id: "h1", timestamp: "Today 2:10 PM", action: "Case created", details: "Inbound call from customer", user: "System" },
    { id: "h2", timestamp: "Today 2:15 PM", action: "Call answered", details: "Call taken by agent", user: "You" },
    { id: "h3", timestamp: "Today 2:18 PM", action: "Email sent", details: "Re: Access Code - Unit 105", user: "You" },
    { id: "h3b", timestamp: "Today 2:47 PM", action: "SMS sent", details: "Glad the new code is working", user: "You" },
  ], suggestedReplies: [
    { id: "sr1", label: "Confirm resolution", message: "Hi John,\n\nGreat to hear the new code is working! If you have any other issues with your unit or access, don't hesitate to reach out.\n\nBest regards,\nStorage Vault Team", channel: "email" },
    { id: "sr2", label: "Quick follow-up", message: "Glad the new code worked! Let us know if you need anything else.", channel: "sms" },
  ]},
  { id: "CS-1002", customerName: "Jane Doe", unitNumber: "212", phone: "(403) 555-0283", email: "jane.doe@email.com", facilityName: "IT Crossing", status: "open", priority: "medium", assignedTo: "Unassigned", subject: "Billing inquiry - double charge", customerStatus: "active", balance: 125.0, lastPayment: "Jan 28, 2026", unitType: "5x10 Standard", createdAt: "Today 11:30 AM", communications: [
    { id: "c4a", type: "email", direction: "outbound", timestamp: "Jan 28, 10:00 AM", preview: "Your payment of $125.00 for Unit 212 at IT Crossing has been processed successfully. Thank you for your payment!\n\nTransaction ID: TXN-2026-0128-001\nAmount: $125.00\nUnit: 212\nNext payment due: February 28, 2026", subject: "Payment Confirmation - Unit 212", from: "billing@storagevault.ca", sentBy: "system" },
    { id: "c4b", type: "email", direction: "outbound", timestamp: "Feb 3, 10:00 AM", preview: "Your payment of $125.00 for Unit 212 at IT Crossing has been processed successfully. Thank you for your payment!\n\nTransaction ID: TXN-2026-0203-001\nAmount: $125.00\nUnit: 212\nNext payment due: March 28, 2026", subject: "Payment Confirmation - Unit 212", from: "billing@storagevault.ca", sentBy: "system" },
    { id: "c4", type: "email", direction: "inbound", timestamp: "Today 11:30 AM", preview: "I noticed I was charged twice for February rent. Can you please look into this and issue a refund for the duplicate charge?", subject: "Double Charge on My Account", from: "jane.doe@email.com" },
  ], history: [
    { id: "h4", timestamp: "Today 11:30 AM", action: "Case created", details: "Inbound email from customer", user: "System" },
  ], suggestedReplies: [
    { id: "sr3", label: "Acknowledge & investigate", message: "Hi Jane,\n\nThank you for bringing this to our attention. I can see there was a duplicate charge on your account for February rent.\n\nI'm looking into this now and will process a refund for the duplicate amount. You should see the credit back on your card within 3-5 business days.\n\nI apologize for any inconvenience this caused.\n\nBest regards,\nStorage Vault Team", channel: "email" },
    { id: "sr4", label: "Request transaction details", message: "Hi Jane,\n\nThank you for contacting us. To help investigate the duplicate charge, could you please provide the last 4 digits of the card that was charged and the exact dates/amounts you see?\n\nThis will help me locate the transactions quickly.\n\nThank you,\nStorage Vault Team", channel: "email" },
    { id: "sr5", label: "Quick acknowledgment", message: "Hi Jane, we received your message about the double charge. Looking into it now and will follow up shortly with details.", channel: "sms" },
  ]},
  { id: "CS-0998", customerName: "Robert Chen", unitNumber: "304", phone: "(403) 555-0391", email: "r.chen@outlook.com", facilityName: "IT Crossing", status: "waiting", priority: "low", assignedTo: "You", subject: "Request for unit transfer", customerStatus: "active", balance: 0, lastPayment: "Feb 1, 2026", unitType: "10x15 Drive-Up", createdAt: "Feb 5", communications: [
    { id: "c5", type: "email", direction: "inbound", timestamp: "Feb 5, 10:15 AM", preview: "I'd like to downsize to a smaller unit. Do you have any 5x10s available? Preferably on the ground floor.", subject: "Unit Transfer Request", from: "r.chen@outlook.com" },
    { id: "c6", type: "email", direction: "outbound", timestamp: "Feb 5, 2:30 PM", preview: "Hi Robert, we have a 5x10 on ground floor available (Unit 118). I'll hold it for 48 hours. Let me know if you'd like to proceed.", subject: "Re: Unit Transfer Request", from: "support@storagevault.ca" },
  ], history: [
    { id: "h5", timestamp: "Feb 5, 10:15 AM", action: "Case created", details: "Inbound email from customer", user: "System" },
    { id: "h6", timestamp: "Feb 5, 10:30 AM", action: "Assigned", details: "Assigned to You", user: "System" },
    { id: "h7", timestamp: "Feb 5, 2:30 PM", action: "Email sent", details: "Re: Unit Transfer Request", user: "You" },
    { id: "h8", timestamp: "Feb 5, 2:35 PM", action: "Status changed", details: "Changed to Waiting", user: "You" },
  ], suggestedReplies: [
    { id: "sr6", label: "Follow up on transfer", message: "Hi Robert,\n\nJust following up on the unit transfer. The 5x10 ground floor unit (Unit 118) is still available if you'd like to proceed.\n\nLet me know and I can schedule the move for you.\n\nBest regards,\nStorage Vault Team", channel: "email" },
    { id: "sr7", label: "Quick check-in", message: "Hi Robert, just checking in - are you still interested in transferring to Unit 118? Let me know!", channel: "sms" },
  ]},
  { id: "CS-0995", customerName: "Maria Garcia", unitNumber: "089", phone: "(403) 555-0512", email: "mgarcia@gmail.com", facilityName: "IT Crossing", status: "resolved", priority: "high", assignedTo: "You", subject: "Water leak reported near unit", customerStatus: "active", balance: 0, lastPayment: "Feb 1, 2026", unitType: "10x10 Climate Control", createdAt: "Feb 3", communications: [
    { id: "c7", type: "phone", direction: "inbound", timestamp: "Feb 3, 9:00 AM", duration: "5m 10s", preview: "There's water pooling in the hallway near my unit. I'm worried it might get inside. Can someone come check?", from: "(403) 555-0512",
      recordingUrl: "https://api.twilio.com/recordings/RE-mock-recording-002.mp3",
      aiSummary: "Customer reported water pooling in the hallway near Unit 089 and was concerned about potential damage to her belongings. Agent marked it as urgent and dispatched maintenance immediately with a 30-minute ETA. Customer was reassured that she would receive updates via text.",
      transcription: [
        { timestamp: "0:00", speaker: "Agent", text: "Storage Vault IT Crossing, this is Paul. How can I help you?" },
        { timestamp: "0:04", speaker: "Customer", text: "Hi, this is Maria Garcia. I'm at the facility right now and there's water pooling in the hallway near my unit. I'm really worried it might get inside." },
        { timestamp: "0:14", speaker: "Agent", text: "Oh no, I'm sorry to hear that. Let me get your information. You said Maria Garcia — what's your unit number?" },
        { timestamp: "0:20", speaker: "Customer", text: "Unit 089. It's on the ground floor in Building B." },
        { timestamp: "0:25", speaker: "Agent", text: "Got it. I'm pulling up your account now. Can you describe how much water we're talking about?" },
        { timestamp: "0:32", speaker: "Customer", text: "It's like a puddle, maybe two feet wide? It seems to be coming from the ceiling area. I can see it's dripping." },
        { timestamp: "0:42", speaker: "Agent", text: "Okay, that sounds like it could be a pipe issue. I'm going to mark this as urgent and dispatch our maintenance team right away." },
        { timestamp: "0:50", speaker: "Customer", text: "Thank you. How long do you think it will take? I have some important documents in there." },
        { timestamp: "0:58", speaker: "Agent", text: "I completely understand your concern. Our maintenance team should be there within 30 minutes. I'll also send you a text with updates." },
        { timestamp: "1:08", speaker: "Customer", text: "Okay, that would be great. Should I wait here or..." },
        { timestamp: "1:12", speaker: "Agent", text: "You don't have to wait if you don't want to. We'll inspect your unit and text you with what we find. If there's any damage, we'll document everything." },
        { timestamp: "1:22", speaker: "Customer", text: "Alright, I'll wait for a bit and see if they arrive. Thank you for taking this seriously." },
        { timestamp: "1:28", speaker: "Agent", text: "Of course, Ms. Garcia. We take these situations very seriously. You'll get a text shortly confirming maintenance is on the way. Is there anything else?" },
        { timestamp: "1:38", speaker: "Customer", text: "No, that's all. I just want to make sure my stuff is safe." },
        { timestamp: "1:42", speaker: "Agent", text: "Absolutely. We'll take care of it. You'll hear from us soon." },
        { timestamp: "1:46", speaker: "Customer", text: "Thank you so much. Bye." },
      ]
    },
    { id: "c8", type: "sms", direction: "outbound", timestamp: "Feb 3, 9:15 AM", preview: "Hi Maria, maintenance is on the way now. We'll inspect your unit and the hallway. ETA 30 minutes.", from: "support@storagevault.ca" },
    { id: "c9", type: "sms", direction: "outbound", timestamp: "Feb 3, 10:45 AM", preview: "Update: The leak was from a pipe fitting above the hallway. Fixed now. Your unit was not affected - no water inside. All clear!", from: "support@storagevault.ca" },
    { id: "c10", type: "sms", direction: "inbound", timestamp: "Feb 3, 11:00 AM", preview: "Thank you so much for the fast response! Really appreciate it.", from: "(403) 555-0512" },
    { id: "c11", type: "email", direction: "outbound", timestamp: "Feb 3, 2:00 PM", preview: "Dear Maria,\n\nThank you for your patience during the water leak incident at IT Crossing today. We wanted to follow up and confirm that:\n\n• The pipe fitting has been fully repaired\n• Your unit (089) was inspected and confirmed dry with no water damage\n• Our maintenance team has completed a full inspection of the surrounding area\n\nWe take facility maintenance very seriously and appreciate you alerting us promptly. If you notice any issues in the future, please don't hesitate to contact us.\n\nBest regards,\nStorage Vault Team", subject: "Follow-up: Water Leak Incident - Unit 089", from: "support@storagevault.ca", sentBy: "ai" },
  ], history: [
    { id: "h9", timestamp: "Feb 3, 9:00 AM", action: "Case created", details: "Urgent inbound call", user: "System" },
    { id: "h10", timestamp: "Feb 3, 9:00 AM", action: "Priority set", details: "Set to High", user: "You" },
    { id: "h11", timestamp: "Feb 3, 9:15 AM", action: "SMS sent", details: "Maintenance on the way", user: "You" },
    { id: "h12", timestamp: "Feb 3, 10:45 AM", action: "SMS sent", details: "Issue resolved update", user: "You" },
    { id: "h13", timestamp: "Feb 3, 11:15 AM", action: "Status changed", details: "Marked as Resolved", user: "You" },
  ], suggestedReplies: [
    { id: "sr8", label: "Thank you follow-up", message: "Hi Maria,\n\nThank you for your kind words! We're glad we could resolve the issue quickly. Your belongings' safety is our top priority.\n\nIf you ever notice anything unusual at the facility, please don't hesitate to contact us.\n\nBest regards,\nStorage Vault Team", channel: "email" },
    { id: "sr9", label: "Request feedback", message: "Hi Maria, thanks again for letting us know about the leak. If you have a moment, we'd love to hear your feedback on how we handled the situation. Reply to this message or call us anytime!", channel: "sms" },
  ]},
];
function formatWaitTime(seconds: number) { const m = Math.floor(seconds / 60); const s = seconds % 60; return m + "m " + s.toString().padStart(2, "0") + "s"; }

// SLA helper - returns { status, label, color, bg, minutesAgo }
function getSLAStatus(caseData: any): { status: 'ok' | 'warning' | 'breach'; label: string; color: string; bg: string; minutesAgo: number } | null {
  // Skip SLA for resolved/closed cases
  if (caseData.status === 'resolved' || caseData.status === 'closed') return null;

  // Find the last inbound communication
  const lastInbound = [...(caseData.communications || [])].reverse().find((c: any) => c.direction === 'inbound');
  if (!lastInbound) return null;

  // Find the last outbound communication after the last inbound
  const lastInboundIndex = caseData.communications.findIndex((c: any) => c.id === lastInbound.id);
  const hasResponseAfter = caseData.communications.slice(lastInboundIndex + 1).some((c: any) => c.direction === 'outbound' && c.sentBy !== 'system');

  if (hasResponseAfter) {
    return { status: 'ok', label: 'Responded', color: '#10B981', bg: '#ECFDF5', minutesAgo: 0 };
  }

  // Calculate time since last inbound (mock: use simple heuristics from timestamp)
  // In production this would use actual timestamps
  const timestamp = lastInbound.timestamp?.toLowerCase() || '';
  let minutesAgo = 30; // default

  if (timestamp.includes('today')) {
    // Parse time like "Today 11:30 AM"
    const timeMatch = timestamp.match(/(\d{1,2}):(\d{2})\s*(am|pm)/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1]);
      const mins = parseInt(timeMatch[2]);
      const isPM = timeMatch[3].toLowerCase() === 'pm';
      if (isPM && hours !== 12) hours += 12;
      if (!isPM && hours === 12) hours = 0;
      const now = new Date();
      const commTime = new Date();
      commTime.setHours(hours, mins, 0, 0);
      minutesAgo = Math.floor((now.getTime() - commTime.getTime()) / 60000);
      if (minutesAgo < 0) minutesAgo = 30; // fallback
    }
  } else if (timestamp.includes('feb')) {
    // Older date - assume > 4 hours for demo
    minutesAgo = 300;
  }

  if (minutesAgo < 60) {
    return { status: 'ok', label: `${minutesAgo}m`, color: '#10B981', bg: '#ECFDF5', minutesAgo };
  } else if (minutesAgo < 240) {
    const hours = Math.floor(minutesAgo / 60);
    return { status: 'warning', label: `${hours}h ${minutesAgo % 60}m`, color: '#F59E0B', bg: '#FFFBEB', minutesAgo };
  } else {
    const hours = Math.floor(minutesAgo / 60);
    return { status: 'breach', label: `${hours}h+ overdue`, color: '#EF4444', bg: '#FEF2F2', minutesAgo };
  }
}

function getPriorityConfig(priority: string) { const c: Record<string, any> = { urgent: { color: "#EF4444", bg: "#FEF2F2", label: "Urgent" }, high: { color: "#F59E0B", bg: "#FFFBEB", label: "High" }, medium: { color: "#3B82F6", bg: "#EFF6FF", label: "Medium" }, low: { color: "#6B7280", bg: "#F9FAFB", label: "Low" } }; return c[priority] || c.low; }
function getStatusConfig(status: string) { const c: Record<string, any> = { open: { color: "#3B82F6", bg: "#EFF6FF", label: "Open" }, "in-progress": { color: "#F59E0B", bg: "#FFFBEB", label: "In Progress" }, waiting: { color: "#FB923C", bg: "#FFF7ED", label: "Waiting" }, resolved: { color: "#10B981", bg: "#ECFDF5", label: "Resolved" }, closed: { color: "#6B7280", bg: "#F9FAFB", label: "Closed" } }; return c[status] || c.open; }
function getCommTypeConfig(type: string) { const c: Record<string, any> = { phone: { color: "#3B82F6", bg: "#EFF6FF", icon: "\u{1F4DE}", label: "Phone" }, email: { color: "#10B981", bg: "#ECFDF5", icon: "\u2709\uFE0F", label: "Email" }, sms: { color: "#8B5CF6", bg: "#F5F3FF", icon: "\u{1F4AC}", label: "SMS" } }; return c[type] || c.phone; }
function getRecommendedEmailTemplate(caseData: any): { id: string; reason: string } | null {
  const subject = (caseData?.subject || "").toLowerCase();
  if (subject.includes("access") || subject.includes("code") || subject.includes("gate")) {
    return { id: "access-code", reason: "This case is about access code issues" };
  }
  if (subject.includes("billing") || subject.includes("charge") || subject.includes("payment") || subject.includes("refund")) {
    return { id: "payment-reminder", reason: "This case involves billing or payment" };
  }
  if (subject.includes("transfer") || subject.includes("move") || subject.includes("downsize") || subject.includes("upgrade")) {
    return { id: "unit-transfer", reason: "This case is about unit transfers" };
  }
  if (subject.includes("maintenance") || subject.includes("leak") || subject.includes("repair") || subject.includes("broken")) {
    return { id: "maintenance-update", reason: "This case involves maintenance issues" };
  }
  if (caseData?.status === "resolved" || caseData?.status === "waiting") {
    return { id: "follow-up", reason: "Good time to follow up on this case" };
  }
  return null;
}
function getRecommendedSmsTemplate(caseData: any): { id: string; reason: string } | null {
  const subject = (caseData?.subject || "").toLowerCase();
  if (subject.includes("access") || subject.includes("code") || subject.includes("gate")) {
    return { id: "access-code", reason: "This case is about access code issues" };
  }
  if (subject.includes("billing") || subject.includes("charge") || subject.includes("payment")) {
    return { id: "payment-reminder", reason: "This case involves billing" };
  }
  if (subject.includes("maintenance") || subject.includes("leak") || subject.includes("repair")) {
    return { id: "maintenance-complete", reason: "Send maintenance status update" };
  }
  if (caseData?.status === "resolved" || caseData?.status === "waiting") {
    return { id: "follow-up", reason: "Good time for a quick check-in" };
  }
  return null;
}
function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) { return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.025em", color, backgroundColor: bg, textTransform: "uppercase" }}>{children}</span>; }

function Toast({ message, type, icon, onDismiss, onAction, actionLabel }: { message: string; type: 'sms' | 'email' | 'phone' | 'info'; icon?: string; onDismiss: () => void; onAction?: () => void; actionLabel?: string }) {
  const typeConfig: Record<string, { color: string; bg: string; icon: string }> = {
    sms: { color: "#8B5CF6", bg: "#F5F3FF", icon: "\u{1F4AC}" },
    email: { color: "#10B981", bg: "#ECFDF5", icon: "\u2709\uFE0F" },
    phone: { color: "#3B82F6", bg: "#EFF6FF", icon: "\u{1F4DE}" },
    info: { color: "#0F172A", bg: "#F8FAFC", icon: "\u{1F514}" },
  };
  const config = typeConfig[type] || typeConfig.info;

  return (
    <div style={{
      position: "fixed",
      top: "20px",
      right: "20px",
      backgroundColor: "#fff",
      borderRadius: "12px",
      boxShadow: "0 10px 40px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      padding: "16px",
      display: "flex",
      alignItems: "flex-start",
      gap: "12px",
      maxWidth: "380px",
      zIndex: 2000,
      animation: "slideIn 0.3s ease-out",
    }}>
      <div style={{ width: "40px", height: "40px", borderRadius: "10px", backgroundColor: config.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>
        {icon || config.icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#0F172A", lineHeight: 1.4 }}>{message}</div>
        {onAction && actionLabel && (
          <button onClick={onAction} style={{ marginTop: "8px", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#fff", backgroundColor: config.color, border: "none", cursor: "pointer" }}>
            {actionLabel}
          </button>
        )}
      </div>
      <button onClick={onDismiss} style={{ width: "24px", height: "24px", borderRadius: "6px", border: "none", backgroundColor: "transparent", cursor: "pointer", fontSize: "14px", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{"\u2715"}</button>
    </div>
  );
}

function TabButton({ active, count, newCount, children, onClick }: { active: boolean; count?: number; newCount?: number; children: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 600 : 500, color: active ? "#fff" : "#64748B", backgroundColor: active ? "#0F172A" : "transparent", border: active ? "none" : "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap" }}>{children}{count !== undefined && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700, color: active ? "#0F172A" : "#fff", backgroundColor: active ? "#fff" : "#94A3B8", padding: "0 5px" }}>{count}</span>}{newCount !== undefined && newCount > 0 && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", borderRadius: "9999px", fontSize: "10px", fontWeight: 700, color: "#fff", backgroundColor: "#EF4444", padding: "0 5px", animation: "pulse 2s infinite" }}>{newCount} new</span>}</button>; }
function getSkillGroupConfig(skillGroup: string) {
  const c: Record<string, { color: string; bg: string }> = {
    "Move-In": { color: "#10B981", bg: "#ECFDF5" },
    "Billing": { color: "#3B82F6", bg: "#EFF6FF" },
    "Maintenance": { color: "#F59E0B", bg: "#FFFBEB" },
    "General": { color: "#6B7280", bg: "#F9FAFB" },
  };
  return c[skillGroup] || c["General"];
}

function QueueCard({ item, selected, onClick, onTakeCall }: { item: any; selected: boolean; onClick: () => void; onTakeCall: () => void }) {
  const priority = getPriorityConfig(item.priority);
  const isUnknown = !item.customerName;
  const isMissed = item.status === "missed";
  const accentColor = isMissed ? "#EF4444" : priority.color;
  const skill = item.skillGroup ? getSkillGroupConfig(item.skillGroup) : null;

  return <div onClick={onClick} style={{ padding: "14px 16px", borderRadius: "10px", cursor: "pointer", backgroundColor: selected ? (isMissed ? "#FEF2F2" : "#F8FAFC") : "#fff", border: selected ? `2px solid ${isMissed ? "#EF4444" : "#0F172A"}` : "1px solid #E2E8F0", transition: "all 0.15s ease", position: "relative", overflow: "hidden" }}>
    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", backgroundColor: accentColor, borderRadius: "10px 0 0 10px" }} />
    {isMissed && <div style={{ position: "absolute", right: "12px", top: "12px" }}><Badge color="#EF4444" bg="#FEF2F2">Missed</Badge></div>}
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
      <div style={{ maxWidth: isMissed ? "65%" : "75%" }}>
        <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>
          {isMissed && <span style={{ color: "#EF4444", fontSize: "14px" }}>&#128222;</span>}
          {isUnknown && !isMissed && <span style={{ color: "#F59E0B", fontSize: "14px" }}>&#9888;</span>}
          {item.customerName || "Unknown Caller"}
        </div>
        {item.unitNumber ? <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Unit {item.unitNumber} &middot; {item.facilityName}</div> : <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{item.phoneNumber}</div>}
        {skill && <div style={{ display: "inline-flex", alignItems: "center", gap: "4px", marginTop: "4px", padding: "2px 8px", borderRadius: "4px", backgroundColor: skill.bg, border: `1px solid ${skill.color}25`, fontSize: "11px", fontWeight: 500, color: skill.color }}>{item.skillGroup}</div>}
      </div>
      {!isMissed && <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>}
    </div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}>
      <div style={{ fontSize: "12px", color: isMissed ? "#EF4444" : (item.waitTime > 180 ? "#EF4444" : "#64748B"), fontWeight: isMissed || item.waitTime > 180 ? 600 : 400, display: "flex", alignItems: "center", gap: "4px" }}>
        {isMissed ? (
          <><span style={{ fontSize: "14px" }}>&#128337;</span>Missed {item.missedAt || formatWaitTime(item.waitTime) + " ago"}</>
        ) : (
          <><span style={{ fontSize: "14px" }}>&#9201;</span>{formatWaitTime(item.waitTime)}{item.waitTime > 180 && " \u2014 long wait"}</>
        )}
      </div>
      <button onClick={(e) => { e.stopPropagation(); onTakeCall(); }} style={{ padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#fff", backgroundColor: isMissed ? "#EF4444" : "#10B981", border: "none", cursor: "pointer" }}>
        {isMissed ? "Callback" : "Take Call"}
      </button>
    </div>
  </div>;
}
function CaseCard({ caseData, selected, onClick }: { caseData: any; selected: boolean; onClick: () => void }) {
  const status = getStatusConfig(caseData.status);
  const priority = getPriorityConfig(caseData.priority);
  const latestComm = caseData.communications[caseData.communications.length - 1];
  const commType = getCommTypeConfig(latestComm?.type);
  const hasUnread = caseData.hasUnread;
  const sla = getSLAStatus(caseData);

  return (
    <div onClick={onClick} style={{ padding: "14px 16px", borderRadius: "10px", cursor: "pointer", backgroundColor: selected ? "#F8FAFC" : (hasUnread ? "#EFF6FF" : (sla?.status === 'breach' ? "#FEF2F2" : "#fff")), border: selected ? "2px solid #0F172A" : (hasUnread ? "2px solid #3B82F6" : (sla?.status === 'breach' ? "2px solid #EF4444" : "1px solid #E2E8F0")), transition: "all 0.15s ease", position: "relative" }}>
      {hasUnread && <div style={{ position: "absolute", top: "12px", right: "12px", width: "10px", height: "10px", borderRadius: "50%", backgroundColor: "#3B82F6", boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.2)", animation: "pulse 2s infinite" }} />}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{caseData.customerName}</div>
          {hasUnread && <span style={{ fontSize: "10px", fontWeight: 600, color: "#3B82F6", textTransform: "uppercase" }}>New</span>}
        </div>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {sla && <Badge color={sla.color} bg={sla.bg}>{sla.status === 'breach' ? `\u{1F6A8} ${sla.label}` : (sla.status === 'warning' ? `\u23F1 ${sla.label}` : sla.label)}</Badge>}
          <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
        </div>
      </div>
      <div style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>{caseData.id} &middot; Unit {caseData.unitNumber} &middot; {caseData.facilityName}</div>
      <div style={{ fontSize: "13px", color: "#334155", marginBottom: "8px", fontWeight: 500 }}>{caseData.subject}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748B" }}>
          <span>{commType.icon}</span>
          <span>{latestComm?.direction === "inbound" ? "From" : "Sent"} &middot; {latestComm?.timestamp}</span>
        </div>
        <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>
      </div>
    </div>
  );
}
function AudioPlayer({ recordingUrl, duration }: { recordingUrl: string; duration?: string }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");

  // Parse duration string like "3m 22s" to total seconds
  const parseDuration = (dur?: string): number => {
    if (!dur) return 180; // default 3 min
    const match = dur.match(/(\d+)m\s*(\d+)s/);
    if (match) return parseInt(match[1]) * 60 + parseInt(match[2]);
    return 180;
  };

  const totalSeconds = parseDuration(duration);
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Simulate playback for demo
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setProgress((p) => {
        const newProgress = p + (100 / totalSeconds);
        if (newProgress >= 100) {
          setIsPlaying(false);
          setCurrentTime(formatTime(totalSeconds));
          return 100;
        }
        setCurrentTime(formatTime((newProgress / 100) * totalSeconds));
        return newProgress;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying, totalSeconds]);

  const handlePlayPause = () => {
    if (progress >= 100) {
      setProgress(0);
      setCurrentTime("0:00");
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const newProgress = (clickX / rect.width) * 100;
    setProgress(newProgress);
    setCurrentTime(formatTime((newProgress / 100) * totalSeconds));
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", backgroundColor: "#F8FAFC", borderRadius: "6px", border: "1px solid #E2E8F0", marginTop: "8px" }}>
      <button
        onClick={handlePlayPause}
        style={{ width: "28px", height: "28px", borderRadius: "50%", border: "none", backgroundColor: "#3B82F6", color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", flexShrink: 0 }}
      >
        {isPlaying ? "❚❚" : "▶"}
      </button>
      <div
        onClick={handleProgressClick}
        style={{ flex: 1, height: "6px", backgroundColor: "#E2E8F0", borderRadius: "3px", cursor: "pointer", position: "relative" }}
      >
        <div style={{ width: `${progress}%`, height: "100%", backgroundColor: "#3B82F6", borderRadius: "3px", transition: "width 0.1s ease" }} />
      </div>
      <span style={{ fontSize: "11px", color: "#64748B", fontVariantNumeric: "tabular-nums", minWidth: "70px" }}>
        {currentTime} / {formatTime(totalSeconds)}
      </span>
      <a
        href={recordingUrl}
        download
        onClick={(e) => e.stopPropagation()}
        style={{ fontSize: "11px", color: "#3B82F6", textDecoration: "none", whiteSpace: "nowrap" }}
      >
        Download
      </a>
    </div>
  );
}

function TranscriptSection({ transcription }: { transcription: Array<{ timestamp: string; speaker: string; text: string }> }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const text = transcription.map((line) => `[${line.timestamp}] ${line.speaker}: ${line.text}`).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ marginTop: "8px" }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{ background: "none", border: "none", padding: 0, fontSize: "12px", color: "#3B82F6", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
      >
        <span style={{ transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "rotate(0deg)", display: "inline-block" }}>▶</span>
        {expanded ? "Hide Transcript" : "Show Transcript"}
      </button>
      {expanded && (
        <div style={{ marginTop: "8px", backgroundColor: "#F8FAFC", borderRadius: "8px", border: "1px solid #E2E8F0", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderBottom: "1px solid #E2E8F0", backgroundColor: "#F1F5F9" }}>
            <span style={{ fontSize: "11px", fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em" }}>Transcript</span>
            <button
              onClick={handleCopy}
              style={{ background: "none", border: "1px solid #E2E8F0", borderRadius: "4px", padding: "4px 8px", fontSize: "11px", color: copied ? "#10B981" : "#64748B", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
          <div style={{ maxHeight: "240px", overflow: "auto", padding: "12px" }}>
            {transcription.map((line, i) => (
              <div key={i} style={{ marginBottom: "8px", fontSize: "12px", lineHeight: "1.5", fontFamily: "'SF Mono', 'Menlo', 'Monaco', monospace" }}>
                <span style={{ color: "#94A3B8", marginRight: "8px" }}>[{line.timestamp}]</span>
                <span style={{ color: line.speaker === "Agent" ? "#3B82F6" : "#0F172A", fontWeight: 500 }}>{line.speaker}:</span>
                <span style={{ color: "#475569", marginLeft: "4px" }}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AISummary({ summary }: { summary: string }) {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = () => {
    setRegenerating(true);
    // Mock regeneration - just show spinner for 1.5s then same text
    setTimeout(() => setRegenerating(false), 1500);
  };

  return (
    <div style={{ marginTop: "8px", padding: "12px", backgroundColor: "#F5F3FF", borderRadius: "8px", border: "1px solid #E9D5FF" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
        <span style={{ fontSize: "11px", fontWeight: 600, color: "#6366F1", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>✨</span> AI Summary
        </span>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          style={{ background: "none", border: "1px solid #E9D5FF", borderRadius: "4px", padding: "3px 8px", fontSize: "10px", color: "#6366F1", cursor: regenerating ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px" }}
        >
          {regenerating ? (
            <>
              <span style={{ display: "inline-block", animation: "spin 1s linear infinite" }}>↻</span>
              Regenerating...
            </>
          ) : (
            "Regenerate"
          )}
        </button>
      </div>
      <p style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", margin: 0 }}>
        {regenerating ? <span style={{ color: "#94A3B8" }}>Generating summary...</span> : summary}
      </p>
    </div>
  );
}

function CommunicationItem({ comm, isFirst }: { comm: any; isFirst: boolean }) {
  const config = getCommTypeConfig(comm.type);
  const hasRecording = comm.type === "phone" && comm.recordingUrl;
  const hasTranscript = comm.type === "phone" && comm.transcription && comm.transcription.length > 0;
  const hasAISummary = comm.type === "phone" && comm.aiSummary;
  const isMissedCall = comm.type === "phone" && comm.callStatus === "missed";
  const isSystem = comm.sentBy === "system";
  const isAI = comm.sentBy === "ai";

  // Determine icon based on sentBy
  const getIcon = () => {
    if (isMissedCall) return "\u{1F4F5}";
    if (isSystem) return "\u2699\uFE0F";
    if (isAI) return "\u2728";
    return config.icon;
  };

  // Determine icon background
  const getIconBg = () => {
    if (isMissedCall) return "#FEF2F2";
    if (isSystem) return "#F1F5F9";
    if (isAI) return "#F5F3FF";
    return config.bg;
  };

  return (
    <div style={{ display: "flex", gap: "12px" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>
        {!isFirst && <div style={{ width: "2px", height: "12px", backgroundColor: "#E2E8F0" }} />}
        <div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: getIconBg(), display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{getIcon()}</div>
        <div style={{ width: "2px", flex: 1, backgroundColor: "#E2E8F0", minHeight: "12px" }} />
      </div>
      <div style={{ flex: 1, padding: "8px 14px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: isMissedCall ? "#EF4444" : (isSystem ? "#64748B" : (isAI ? "#6366F1" : "#0F172A")) }}>{isMissedCall ? "Missed Call" : config.label}</span>
          {isMissedCall ? (
            <Badge color="#EF4444" bg="#FEF2F2">missed</Badge>
          ) : isSystem ? (
            <Badge color="#64748B" bg="#F1F5F9">automated</Badge>
          ) : isAI ? (
            <Badge color="#6366F1" bg="#F5F3FF">ai generated</Badge>
          ) : (
            <Badge color={comm.direction === "inbound" ? "#3B82F6" : "#10B981"} bg={comm.direction === "inbound" ? "#EFF6FF" : "#ECFDF5"}>{comm.direction}</Badge>
          )}
          <span style={{ fontSize: "12px", color: "#94A3B8" }}>{comm.timestamp}</span>
          {comm.duration && !isMissedCall && <span style={{ fontSize: "12px", color: "#94A3B8" }}>&middot; {comm.duration}</span>}
        </div>
        <div style={{ fontSize: "13px", color: isMissedCall ? "#DC2626" : "#475569", lineHeight: "1.5", backgroundColor: isMissedCall ? "#FEF2F2" : (isSystem ? "#F8FAFC" : (isAI ? "#FAFAFE" : "#F8FAFC")), borderRadius: "8px", padding: "10px 12px", border: isMissedCall ? "1px solid #FECACA" : (isSystem ? "1px solid #E2E8F0" : (isAI ? "1px solid #E9D5FF" : "1px solid #F1F5F9")) }}>
          {(isSystem || isAI) && <div style={{ fontSize: "10px", fontWeight: 600, color: isAI ? "#6366F1" : "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px" }}>{isAI ? "\u2728 AI Generated" : "\u{1F916} Sent automatically"}</div>}
          {comm.preview}
        </div>
        {hasRecording && <AudioPlayer recordingUrl={comm.recordingUrl} duration={comm.duration} />}
        {hasAISummary && <AISummary summary={comm.aiSummary} />}
        {hasTranscript && <TranscriptSection transcription={comm.transcription} />}
      </div>
    </div>
  );
}
function applyTemplate(text: string, caseData: any) {
  return text
    .replace(/\{\{name\}\}/g, caseData?.customerName?.split(" ")[0] || "there")
    .replace(/\{\{fullname\}\}/g, caseData?.customerName || "Customer")
    .replace(/\{\{unit\}\}/g, caseData?.unitNumber || "N/A")
    .replace(/\{\{facility\}\}/g, caseData?.facilityName || "Storage Vault")
    .replace(/\{\{balance\}\}/g, caseData?.balance ? `$${caseData.balance.toFixed(2)}` : "$0.00")
    .replace(/\{\{phone\}\}/g, caseData?.phone || "");
}
function SendEmailModal({ caseData, prefilledBody, onClose, onSend }: { caseData: any; prefilledBody?: string; onClose: () => void; onSend: (email: { to: string; subject: string; body: string }) => void }) {
  const [to, setTo] = useState(caseData?.email || "");
  const [subject, setSubject] = useState(caseData?.subject ? `Re: ${caseData.subject}` : "");
  const [body, setBody] = useState(prefilledBody || "");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = EMAIL_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setSubject(applyTemplate(template.subject, caseData));
        setBody(applyTemplate(template.body, caseData));
      }
    }
  };
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "14px", color: "#0F172A", outline: "none", transition: "border-color 0.15s ease" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
  return <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
    <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#ECFDF5", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u2709\uFE0F"}</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Send Email</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>to {caseData?.customerName}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#F1F5F9", cursor: "pointer", fontSize: "18px", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px", maxHeight: "60vh", overflow: "auto" }}>
        <div>
          <label style={labelStyle}>Template</label>
          {(() => {
            const recommended = getRecommendedEmailTemplate(caseData);
            const recommendedTemplate = recommended ? EMAIL_TEMPLATES.find(t => t.id === recommended.id) : null;
            const otherTemplates = recommended ? EMAIL_TEMPLATES.filter(t => t.id !== recommended.id) : EMAIL_TEMPLATES;
            return (
              <>
                {recommended && recommendedTemplate && (
                  <div
                    onClick={() => handleTemplateChange(recommended.id)}
                    style={{ marginBottom: "8px", padding: "10px 12px", backgroundColor: selectedTemplate === recommended.id ? "#F5F3FF" : "#FAFAFA", borderRadius: "8px", border: selectedTemplate === recommended.id ? "2px solid #6366F1" : "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.15s ease" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#6366F1", fontWeight: 600 }}>✨ Recommended</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{recommendedTemplate.name}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{recommended.reason}</div>
                  </div>
                )}
                <select value={selectedTemplate} onChange={(e) => handleTemplateChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#fff" }}>
                  <option value="">Select a template (optional)</option>
                  {recommended && <option value={recommended.id}>✨ {EMAIL_TEMPLATES.find(t => t.id === recommended.id)?.name} (Recommended)</option>}
                  {otherTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </>
            );
          })()}
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="email" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} placeholder="customer@email.com" />
        </div>
        <div>
          <label style={labelStyle}>Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} style={inputStyle} placeholder="Email subject..." />
        </div>
        <div>
          <label style={labelStyle}>Message</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} style={{ ...inputStyle, resize: "vertical", minHeight: "160px", fontFamily: "inherit" }} placeholder="Type your message here..." />
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#64748B", backgroundColor: "transparent", border: "1px solid #E2E8F0" }}>Cancel</button>
        <button onClick={() => { if (to && subject && body) { onSend({ to, subject, body }); } }} disabled={!to || !subject || !body} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: !to || !subject || !body ? "not-allowed" : "pointer", color: "#fff", backgroundColor: !to || !subject || !body ? "#94A3B8" : "#10B981", border: "none", display: "flex", alignItems: "center", gap: "6px" }}><span>{"\u2709\uFE0F"}</span>Send Email</button>
      </div>
    </div>
  </div>;
}
function SendSMSModal({ caseData, prefilledMessage, onClose, onSend }: { caseData: any; prefilledMessage?: string; onClose: () => void; onSend: (sms: { to: string; message: string }) => void }) {
  const [to, setTo] = useState(caseData?.phone || "");
  const [message, setMessage] = useState(prefilledMessage || "");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const handleTemplateChange = (templateId: string) => {
    setSelectedTemplate(templateId);
    if (templateId) {
      const template = SMS_TEMPLATES.find((t) => t.id === templateId);
      if (template) {
        setMessage(applyTemplate(template.message, caseData));
      }
    }
  };
  const maxChars = 160;
  const segments = Math.ceil(message.length / maxChars) || 1;
  const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "14px", color: "#0F172A", outline: "none", transition: "border-color 0.15s ease" };
  const labelStyle = { display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "6px", textTransform: "uppercase" as const, letterSpacing: "0.05em" };
  return <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onClose}>
    <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "480px", maxHeight: "90vh", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={(e) => e.stopPropagation()}>
      <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "10px", backgroundColor: "#F5F3FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>{"\u{1F4AC}"}</div>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A" }}>Send SMS</div>
            <div style={{ fontSize: "12px", color: "#64748B" }}>to {caseData?.customerName}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ width: "32px", height: "32px", borderRadius: "8px", border: "none", backgroundColor: "#F1F5F9", cursor: "pointer", fontSize: "18px", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>
      </div>
      <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <label style={labelStyle}>Template</label>
          {(() => {
            const recommended = getRecommendedSmsTemplate(caseData);
            const recommendedTemplate = recommended ? SMS_TEMPLATES.find(t => t.id === recommended.id) : null;
            const otherTemplates = recommended ? SMS_TEMPLATES.filter(t => t.id !== recommended.id) : SMS_TEMPLATES;
            return (
              <>
                {recommended && recommendedTemplate && (
                  <div
                    onClick={() => handleTemplateChange(recommended.id)}
                    style={{ marginBottom: "8px", padding: "10px 12px", backgroundColor: selectedTemplate === recommended.id ? "#F5F3FF" : "#FAFAFA", borderRadius: "8px", border: selectedTemplate === recommended.id ? "2px solid #6366F1" : "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.15s ease" }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "#6366F1", fontWeight: 600 }}>✨ Recommended</span>
                      <span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{recommendedTemplate.name}</span>
                    </div>
                    <div style={{ fontSize: "11px", color: "#64748B" }}>{recommended.reason}</div>
                  </div>
                )}
                <select value={selectedTemplate} onChange={(e) => handleTemplateChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#fff" }}>
                  <option value="">Select a template (optional)</option>
                  {recommended && <option value={recommended.id}>✨ {SMS_TEMPLATES.find(t => t.id === recommended.id)?.name} (Recommended)</option>}
                  {otherTemplates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </>
            );
          })()}
        </div>
        <div>
          <label style={labelStyle}>To</label>
          <input type="tel" value={to} onChange={(e) => setTo(e.target.value)} style={inputStyle} placeholder="(403) 555-0123" />
        </div>
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>Message</label>
            <span style={{ fontSize: "12px", color: message.length > maxChars ? "#F59E0B" : "#94A3B8", fontWeight: 500 }}>{message.length}/{maxChars} {segments > 1 && `(${segments} segments)`}</span>
          </div>
          <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} style={{ ...inputStyle, resize: "vertical", minHeight: "100px", fontFamily: "inherit" }} placeholder="Type your message here..." />
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "flex-end", gap: "10px" }}>
        <button onClick={onClose} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#64748B", backgroundColor: "transparent", border: "1px solid #E2E8F0" }}>Cancel</button>
        <button onClick={() => { if (to && message) { onSend({ to, message }); } }} disabled={!to || !message} style={{ padding: "10px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: !to || !message ? "not-allowed" : "pointer", color: "#fff", backgroundColor: !to || !message ? "#94A3B8" : "#8B5CF6", border: "none", display: "flex", alignItems: "center", gap: "6px" }}><span>{"\u{1F4AC}"}</span>Send SMS</button>
      </div>
    </div>
  </div>;
}
function ActiveCallView({ caseData, callStartTime, onEndCall }: { caseData: any; callStartTime: number; onEndCall: (notes: string, summary: string) => void }) {
  const [elapsed, setElapsed] = useState(0);
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState("");
  useEffect(() => {
    const interval = setInterval(() => { setElapsed(Math.floor((Date.now() - callStartTime) / 1000)); }, 1000);
    return () => clearInterval(interval);
  }, [callStartTime]);
  const formatTime = (secs: number) => { const m = Math.floor(secs / 60); const s = secs % 60; return `${m}:${s.toString().padStart(2, "0")}`; };
  const priority = getPriorityConfig(caseData?.priority);

  // Check if this is an outbound callback (last comm is outbound phone)
  const lastComm = caseData?.communications?.[caseData.communications.length - 1];
  const isOutboundCallback = lastComm?.type === "phone" && lastComm?.direction === "outbound";

  return <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", background: isOutboundCallback ? "linear-gradient(135deg, #FEF2F2 0%, #FFF7ED 100%)" : "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: isOutboundCallback ? "#F59E0B" : "#10B981", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s infinite" }}>
            <span style={{ fontSize: "24px" }}>{isOutboundCallback ? "\u{1F4F2}" : "\u{1F4DE}"}</span>
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: isOutboundCallback ? "#F59E0B" : "#10B981", textTransform: "uppercase", letterSpacing: "0.05em" }}>{isOutboundCallback ? "Callback to Customer" : "Active Call"}</div>
            <div style={{ fontSize: "28px", fontWeight: 700, color: "#0F172A", fontVariantNumeric: "tabular-nums" }}>{formatTime(elapsed)}</div>
          </div>
        </div>
        <button onClick={() => onEndCall(notes, summary)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer", color: "#fff", backgroundColor: "#EF4444", border: "none", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)" }}>
          <span style={{ fontSize: "18px" }}>{"\u{1F4F5}"}</span>End Call
        </button>
      </div>
    </div>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ fontSize: "20px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>{caseData?.customerName}</div>
      <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "16px" }}>{caseData?.phone}</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
        {[
          { label: "Unit", value: caseData?.unitNumber || "N/A", icon: "\u{1F4E6}" },
          { label: "Facility", value: caseData?.facilityName || "N/A", icon: "\u{1F3E2}" },
          { label: "Balance", value: caseData?.balance ? `$${caseData.balance.toFixed(2)}` : "$0.00", icon: "\u{1F4B3}", highlight: caseData?.balance > 0 },
        ].map((item, i) => (
          <div key={i} style={{ padding: "12px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #F1F5F9" }}>
            <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "4px", display: "flex", alignItems: "center", gap: "4px" }}>
              <span>{item.icon}</span>{item.label}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: item.highlight ? "#EF4444" : "#0F172A" }}>{item.value}</div>
          </div>
        ))}
      </div>
      {caseData?.balance > 0 && <div style={{ marginTop: "12px", padding: "10px 14px", backgroundColor: "#FEF2F2", borderRadius: "8px", border: "1px solid #FECACA", display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "16px" }}>{"\u26A0\uFE0F"}</span>
        <span style={{ fontSize: "13px", color: "#DC2626", fontWeight: 500 }}>Customer has outstanding balance</span>
      </div>}
    </div>
    <div style={{ flex: 1, padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px", overflow: "auto" }}>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Call Notes</label>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Take notes during the call..." style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "14px", color: "#0F172A", resize: "vertical", minHeight: "120px", fontFamily: "inherit", outline: "none" }} />
      </div>
      <div>
        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Call Summary <span style={{ fontWeight: 400, color: "#94A3B8" }}>(shown in timeline)</span></label>
        <textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Brief summary of what was discussed..." style={{ width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #E2E8F0", fontSize: "14px", color: "#0F172A", resize: "vertical", minHeight: "80px", fontFamily: "inherit", outline: "none" }} />
      </div>
      <div style={{ padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #F1F5F9" }}>
        <div style={{ fontSize: "12px", fontWeight: 600, color: "#64748B", marginBottom: "10px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Quick Actions</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            { label: "Reset Access Code", action: () => setSummary((s) => s + (s ? "\n" : "") + "Reset customer's access code.") },
            { label: "Transfer to Billing", action: () => setSummary((s) => s + (s ? "\n" : "") + "Transferred to billing department.") },
            { label: "Schedule Callback", action: () => setSummary((s) => s + (s ? "\n" : "") + "Scheduled callback for follow-up.") },
            { label: "Create Maintenance Ticket", action: () => setSummary((s) => s + (s ? "\n" : "") + "Created maintenance ticket.") },
          ].map((btn, i) => (
            <button key={i} onClick={btn.action} style={{ padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 500, cursor: "pointer", color: "#475569", backgroundColor: "#fff", border: "1px solid #E2E8F0" }}>{btn.label}</button>
          ))}
        </div>
      </div>
    </div>
  </div>;
}
function HistoryItem({ entry }: { entry: any }) {
  return <div style={{ display: "flex", gap: "10px", padding: "8px 0" }}>
    <div style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: "#94A3B8", marginTop: "6px", flexShrink: 0 }} />
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <span style={{ fontSize: "13px", fontWeight: 500, color: "#0F172A" }}>{entry.action}</span>
          {entry.details && <span style={{ fontSize: "13px", color: "#64748B" }}> — {entry.details}</span>}
        </div>
        <span style={{ fontSize: "11px", color: "#94A3B8", whiteSpace: "nowrap", marginLeft: "8px" }}>{entry.timestamp}</span>
      </div>
      <div style={{ fontSize: "11px", color: "#94A3B8", marginTop: "2px" }}>by {entry.user}</div>
    </div>
  </div>;
}
function SuggestedReplies({ suggestions, onSelect, onDismiss }: { suggestions: Array<{ id: string; label: string; message: string; channel: 'email' | 'sms' }>; onSelect: (suggestion: any) => void; onDismiss: () => void }) {
  return (
    <div style={{ padding: "12px 24px", borderTop: "1px solid #F1F5F9", backgroundColor: "#FAFAFA" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "#6366F1", display: "flex", alignItems: "center", gap: "4px" }}>
          <span>✨</span> Suggested Replies
        </span>
        <button onClick={onDismiss} style={{ background: "none", border: "none", fontSize: "11px", color: "#94A3B8", cursor: "pointer", padding: "2px 6px" }}>
          Dismiss
        </button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {suggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            onClick={() => onSelect(suggestion)}
            style={{ padding: "10px 12px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.15s ease" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#6366F1"; e.currentTarget.style.backgroundColor = "#F5F3FF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#E2E8F0"; e.currentTarget.style.backgroundColor = "#fff"; }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
              <span style={{ fontSize: "12px", fontWeight: 600, color: "#0F172A" }}>{suggestion.label}</span>
              <Badge color={suggestion.channel === "email" ? "#10B981" : "#8B5CF6"} bg={suggestion.channel === "email" ? "#ECFDF5" : "#F5F3FF"}>
                {suggestion.channel}
              </Badge>
            </div>
            <p style={{ fontSize: "12px", color: "#64748B", margin: 0, lineHeight: "1.4", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
              {suggestion.message.split("\n")[0]}...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function CallConfirmModal({ phone, customerName, onConfirm, onCancel }: { phone: string; customerName: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }} onClick={onCancel}>
      <div style={{ backgroundColor: "#fff", borderRadius: "16px", width: "100%", maxWidth: "400px", overflow: "hidden", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ padding: "24px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", backgroundColor: "#EFF6FF", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", margin: "0 auto 16px" }}>{"\u{1F4DE}"}</div>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "8px" }}>Call Customer?</div>
          <div style={{ fontSize: "14px", color: "#64748B", marginBottom: "4px" }}>{customerName}</div>
          <div style={{ fontSize: "16px", fontWeight: 600, color: "#0F172A" }}>{phone}</div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: "12px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 500, cursor: "pointer", color: "#64748B", backgroundColor: "transparent", border: "1px solid #E2E8F0" }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: "12px 20px", borderRadius: "8px", fontSize: "14px", fontWeight: 600, cursor: "pointer", color: "#fff", backgroundColor: "#3B82F6", border: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}><span>{"\u{1F4DE}"}</span>Call Now</button>
        </div>
      </div>
    </div>
  );
}

function CaseDetailPanel({ caseData, onStatusChange, onSendEmail, onSendSms, onSuggestedReply, onAssign, onUpdateSubject, onUpdatePriority, onCallCustomer, activeCallCaseId, callStartTime, onEndCall }: { caseData: any; onStatusChange?: (caseId: string, newStatus: string) => void; onSendEmail?: () => void; onSendSms?: () => void; onSuggestedReply?: (suggestion: { message: string; channel: 'email' | 'sms' }) => void; onAssign?: (caseId: string, agent: string) => void; onUpdateSubject?: (caseId: string, subject: string) => void; onUpdatePriority?: (caseId: string, priority: string) => void; onCallCustomer?: () => void; activeCallCaseId?: string | null; callStartTime?: number; onEndCall?: (notes: string, summary: string) => void }) {
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);

  if (caseData && activeCallCaseId === caseData.id && callStartTime && onEndCall) {
    return <ActiveCallView caseData={caseData} callStartTime={callStartTime} onEndCall={onEndCall} />;
  }
  if (!caseData) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: "400px", color: "#94A3B8", fontSize: "14px", flexDirection: "column", gap: "8px" }}><span style={{ fontSize: "32px", opacity: 0.4 }}>&#128203;</span><span>Select a case to view details</span></div>;
  }

  const status = getStatusConfig(caseData.status);
  const priority = getPriorityConfig(caseData.priority);
  const sla = getSLAStatus(caseData);
  const isResolved = caseData.status === "resolved";
  const isClosed = caseData.status === "closed";
  const priorities = ["urgent", "high", "medium", "low"];

  const handleStartEditSubject = () => {
    setSubjectDraft(caseData.subject);
    setEditingSubject(true);
  };

  const handleSaveSubject = () => {
    if (subjectDraft.trim() && subjectDraft !== caseData.subject) {
      onUpdateSubject?.(caseData.id, subjectDraft.trim());
    }
    setEditingSubject(false);
  };

  const handleCancelEditSubject = () => {
    setEditingSubject(false);
    setSubjectDraft("");
  };

  const handleKeyDownSubject = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveSubject();
    } else if (e.key === "Escape") {
      handleCancelEditSubject();
    }
  };

  const handlePrioritySelect = (p: string) => {
    onUpdatePriority?.(caseData.id, p);
    setShowPriorityDropdown(false);
  };

  return <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>{caseData.customerName}</div>
          <div style={{ fontSize: "13px", color: "#64748B", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>{caseData.id}</span>
            <span>&middot;</span>
            {editingSubject ? (
              <input
                type="text"
                value={subjectDraft}
                onChange={(e) => setSubjectDraft(e.target.value)}
                onKeyDown={handleKeyDownSubject}
                onBlur={handleSaveSubject}
                autoFocus
                style={{ fontSize: "13px", color: "#0F172A", border: "1px solid #3B82F6", borderRadius: "4px", padding: "2px 6px", outline: "none", minWidth: "200px" }}
              />
            ) : (
              <span
                onClick={handleStartEditSubject}
                style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "4px" }}
                title="Click to edit subject"
              >
                {caseData.subject}
                <span style={{ fontSize: "11px", color: "#94A3B8" }}>{"\u270E"}</span>
              </span>
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: "6px", position: "relative", alignItems: "center" }}>
          {sla && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "6px", backgroundColor: sla.bg, border: `1px solid ${sla.color}20` }}>
              <span style={{ fontSize: "12px" }}>{sla.status === 'breach' ? "\u{1F6A8}" : (sla.status === 'warning' ? "\u23F1" : "\u2713")}</span>
              <span style={{ fontSize: "11px", fontWeight: 600, color: sla.color }}>{sla.status === 'ok' ? 'Responded' : (sla.status === 'warning' ? `No response: ${sla.label}` : `SLA Breach: ${sla.label}`)}</span>
            </div>
          )}
          <Badge color={status.color} bg={status.bg}>{status.label}</Badge>
          <div style={{ position: "relative" }}>
            <div onClick={() => setShowPriorityDropdown(!showPriorityDropdown)} style={{ cursor: "pointer" }} title="Click to change priority">
              <Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge>
            </div>
            {showPriorityDropdown && (
              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: "4px", backgroundColor: "#fff", borderRadius: "8px", border: "1px solid #E2E8F0", boxShadow: "0 4px 12px rgba(0,0,0,0.1)", zIndex: 10, minWidth: "100px", overflow: "hidden" }}>
                {priorities.map((p) => {
                  const pc = getPriorityConfig(p);
                  return <div key={p} onClick={() => handlePrioritySelect(p)} style={{ padding: "8px 12px", cursor: "pointer", backgroundColor: caseData.priority === p ? "#F8FAFC" : "#fff", display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: pc.color }} />
                    {pc.label}
                  </div>;
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #F1F5F9" }}>
        {[
          { label: "Unit", value: caseData.unitType && caseData.unitType !== "N/A" ? caseData.unitNumber + " \u00B7 " + caseData.unitType : caseData.unitNumber },
          { label: "Phone", value: caseData.phone },
          { label: "Email", value: caseData.email },
          { label: "Balance", value: "$" + caseData.balance.toFixed(2), highlight: caseData.balance > 0 },
          { label: "Status", value: caseData.customerStatus?.charAt(0).toUpperCase() + caseData.customerStatus?.slice(1) },
        ].filter((item: any) => item.value && item.value !== "N/A" && item.value !== "Unknown").map((item: any, i: number) => (
          <div key={i}>
            <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>{item.label}</div>
            <div style={{ fontSize: "13px", fontWeight: 500, color: item.highlight ? "#EF4444" : "#334155" }}>{item.value}</div>
          </div>
        ))}
        <div>
          <div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Assigned</div>
          <select
            value={caseData.assignedTo}
            onChange={(e) => onAssign?.(caseData.id, e.target.value)}
            style={{ fontSize: "13px", fontWeight: 500, color: "#334155", border: "none", backgroundColor: "transparent", cursor: "pointer", padding: 0, margin: 0, outline: "none" }}
          >
            {AGENTS.map((agent) => <option key={agent} value={agent}>{agent}</option>)}
          </select>
        </div>
      </div>
    </div>
    <div style={{ flex: 1, overflow: "auto", padding: "20px 24px" }}>
      <div style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "16px" }}>Communications ({caseData.communications.length})</div>
      <div>{caseData.communications.map((comm: any, i: number) => <CommunicationItem key={comm.id} comm={comm} isFirst={i === 0} />)}</div>

      {caseData.history && caseData.history.length > 0 && (
        <div style={{ marginTop: "24px", borderTop: "1px solid #F1F5F9", paddingTop: "20px" }}>
          <div
            onClick={() => setHistoryExpanded(!historyExpanded)}
            style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A", marginBottom: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span style={{ transition: "transform 0.15s", transform: historyExpanded ? "rotate(90deg)" : "rotate(0deg)" }}>{"\u25B6"}</span>
            Case History ({caseData.history.length})
          </div>
          {historyExpanded && (
            <div style={{ borderLeft: "2px solid #E2E8F0", marginLeft: "3px", paddingLeft: "12px" }}>
              {[...caseData.history].reverse().map((entry: any) => <HistoryItem key={entry.id} entry={entry} />)}
            </div>
          )}
        </div>
      )}
    </div>
    {caseData.suggestedReplies && caseData.suggestedReplies.length > 0 && !suggestionsDismissed && !isResolved && !isClosed && (
      <SuggestedReplies
        suggestions={caseData.suggestedReplies}
        onSelect={(suggestion) => onSuggestedReply?.(suggestion)}
        onDismiss={() => setSuggestionsDismissed(true)}
      />
    )}
    <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button onClick={onCallCustomer} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#3B82F6", backgroundColor: "transparent", border: "1px solid #3B82F6" }}><span style={{ fontSize: "14px" }}>{"\u{1F4DE}"}</span>Call Customer</button>
      <button onClick={onSendEmail} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#10B981", backgroundColor: "transparent", border: "1px solid #10B981" }}><span style={{ fontSize: "14px" }}>{"\u2709\uFE0F"}</span>Send Email</button>
      <button onClick={onSendSms} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#8B5CF6", backgroundColor: "transparent", border: "1px solid #8B5CF6" }}><span style={{ fontSize: "14px" }}>{"\u{1F4AC}"}</span>Send SMS</button>
      {!isResolved && !isClosed && <button onClick={() => onStatusChange?.(caseData.id, "resolved")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#fff", backgroundColor: "#10B981", border: "none" }}><span style={{ fontSize: "14px" }}>{"\u2713"}</span>Mark Resolved</button>}
      {(isResolved || isClosed) && <button onClick={() => onStatusChange?.(caseData.id, "in-progress")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#fff", backgroundColor: "#F59E0B", border: "none" }}><span style={{ fontSize: "14px" }}>{"\u21A9"}</span>Reopen Case</button>}
      {!isClosed && <button onClick={() => onStatusChange?.(caseData.id, "closed")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#64748B", backgroundColor: "transparent", border: "1px solid #E2E8F0" }}><span style={{ fontSize: "14px" }}>{"\u2715"}</span>Close Case</button>}
    </div>
  </div>;
}
export default function CommunicationsHub() {
  const [activeTab, setActiveTab] = useState("queue");
  const [selectedId, setSelectedId] = useState<string | null>("CS-1001");
  const [queueItems, setQueueItems] = useState(MOCK_QUEUE);
  const [cases, setCases] = useState(MOCK_CASES);
  const [nextCaseNum, setNextCaseNum] = useState(1003);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showSmsModal, setShowSmsModal] = useState(false);
  const [prefilledMessage, setPrefilledMessage] = useState("");
  const [activeCallCaseId, setActiveCallCaseId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showCallConfirm, setShowCallConfirm] = useState(false);
  const [pendingCallbackItem, setPendingCallbackItem] = useState<any>(null);
  const [selectedQueueItem, setSelectedQueueItem] = useState<any>(null);
  const [toast, setToast] = useState<{ message: string; type: 'sms' | 'email' | 'phone' | 'info'; caseId?: string } | null>(null);

  // Timer for queue wait times
  useEffect(() => { const interval = setInterval(() => { setQueueItems((prev) => prev.map((item) => ({ ...item, waitTime: item.waitTime + 1 }))); }, 1000); return () => clearInterval(interval); }, []);

  // Simulate incoming SMS after 8 seconds (for demo)
  useEffect(() => {
    const timer = setTimeout(() => {
      const targetCaseId = "CS-1002"; // Jane Doe's case
      const now = new Date();
      const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

      // Add new inbound SMS to the case
      const newComm = {
        id: `c-${Date.now()}`,
        type: "sms" as const,
        direction: "inbound" as const,
        timestamp: `Today ${timeStr}`,
        preview: "I found the duplicate charge on my bank statement. The second one was on Feb 3rd for $125. Can you refund this ASAP?",
        from: "(403) 555-0283",
      };

      setCases((prev) => prev.map((c) => c.id === targetCaseId
        ? { ...c, communications: [...c.communications, newComm], hasUnread: true }
        : c
      ));

      // Show toast notification
      setToast({
        message: "New SMS from Jane Doe on case CS-1002",
        type: "sms",
        caseId: targetCaseId,
      });

      // Auto-dismiss toast after 8 seconds
      setTimeout(() => setToast(null), 8000);
    }, 8000);

    return () => clearTimeout(timer);
  }, []);

  const handleTakeCall = (queueItem: any) => {
    const isMissedCall = queueItem.status === "missed";

    if (isMissedCall) {
      // Show confirmation modal before calling back
      setPendingCallbackItem(queueItem);
      return;
    }

    // Normal inbound call handling
    const newCaseId = `CS-${nextCaseNum}`;
    setNextCaseNum((n) => n + 1);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const newCase = {
      id: newCaseId,
      customerName: queueItem.customerName || "Unknown Caller",
      unitNumber: queueItem.unitNumber || "N/A",
      phone: queueItem.phoneNumber,
      email: "",
      facilityName: queueItem.facilityName || "Unknown Facility",
      status: "in-progress" as const,
      priority: queueItem.priority,
      assignedTo: "You",
      subject: "Inbound call",
      customerStatus: queueItem.customerStatus || "unknown",
      balance: queueItem.balance || 0,
      lastPayment: "N/A",
      unitType: "N/A",
      createdAt: `Today ${timeStr}`,
      communications: [{
        id: `c-${Date.now()}`,
        type: "phone" as const,
        direction: "inbound" as const,
        timestamp: `Today ${timeStr}`,
        duration: "Active",
        preview: "Call in progress...",
        from: queueItem.phoneNumber,
      }],
      history: [
        { id: `h-${Date.now()}`, timestamp: `Today ${timeStr}`, action: "Case created", details: "Inbound call from queue", user: "System" },
        { id: `h-${Date.now() + 1}`, timestamp: `Today ${timeStr}`, action: "Call answered", details: "Call taken from queue", user: "You" },
      ],
    };

    setQueueItems((prev) => prev.filter((item) => item.id !== queueItem.id));
    setCases((prev) => [newCase, ...prev]);
    setActiveTab("my");
    setSelectedId(newCaseId);
    setActiveCallCaseId(newCaseId);
    setCallStartTime(Date.now());
  };

  const handleConfirmCallback = () => {
    if (!pendingCallbackItem) return;
    const queueItem = pendingCallbackItem;
    setPendingCallbackItem(null);

    const newCaseId = `CS-${nextCaseNum}`;
    setNextCaseNum((n) => n + 1);
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    const newCase = {
      id: newCaseId,
      customerName: queueItem.customerName || "Unknown Caller",
      unitNumber: queueItem.unitNumber || "N/A",
      phone: queueItem.phoneNumber,
      email: "",
      facilityName: queueItem.facilityName || "Unknown Facility",
      status: "in-progress" as const,
      priority: queueItem.priority,
      assignedTo: "You",
      subject: "Missed call — callback needed",
      customerStatus: queueItem.customerStatus || "unknown",
      balance: queueItem.balance || 0,
      lastPayment: "N/A",
      unitType: "N/A",
      createdAt: `Today ${timeStr}`,
      communications: [
        {
          id: `c-${Date.now() - 1}`,
          type: "phone" as const,
          direction: "inbound" as const,
          timestamp: queueItem.missedAt || `Today ${timeStr}`,
          duration: "0:00",
          preview: "Missed call — no answer",
          from: queueItem.phoneNumber,
          callStatus: "missed" as const,
        },
        {
          id: `c-${Date.now()}`,
          type: "phone" as const,
          direction: "outbound" as const,
          timestamp: `Today ${timeStr}`,
          duration: "Active",
          preview: "Callback in progress...",
          from: queueItem.phoneNumber,
        }
      ],
      history: [
        { id: `h-${Date.now() - 1}`, timestamp: queueItem.missedAt || `Today ${timeStr}`, action: "Missed call", details: "Inbound call was not answered", user: "System" },
        { id: `h-${Date.now()}`, timestamp: `Today ${timeStr}`, action: "Case created", details: "Created from missed call — callback initiated", user: "System" },
      ],
    };

    setQueueItems((prev) => prev.filter((item) => item.id !== queueItem.id));
    setCases((prev) => [newCase, ...prev]);
    setActiveTab("my");
    setSelectedId(newCaseId);
    setActiveCallCaseId(newCaseId);
    setCallStartTime(Date.now());
  };

  const addHistoryEntry = (caseId: string, action: string, details: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const entry = { id: `h-${Date.now()}`, timestamp: `Today ${timeStr}`, action, details, user: "You" };
    setCases((prev) => prev.map((c) => c.id === caseId
      ? { ...c, history: [...(c.history || []), entry] }
      : c
    ));
  };

  const handleStatusChange = (caseId: string, newStatus: string) => {
    const statusLabels: Record<string, string> = { open: "Open", "in-progress": "In Progress", waiting: "Waiting", resolved: "Resolved", closed: "Closed" };
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, status: newStatus } : c));
    addHistoryEntry(caseId, "Status changed", `Changed to ${statusLabels[newStatus] || newStatus}`);
  };

  const handleAssignCase = (caseId: string, agent: string) => {
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, assignedTo: agent } : c));
    addHistoryEntry(caseId, "Assigned", `Assigned to ${agent}`);
  };

  const handleUpdateSubject = (caseId: string, subject: string) => {
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, subject } : c));
    addHistoryEntry(caseId, "Subject updated", subject);
  };

  const handleUpdatePriority = (caseId: string, priority: string) => {
    const priorityLabels: Record<string, string> = { urgent: "Urgent", high: "High", medium: "Medium", low: "Low" };
    setCases((prev) => prev.map((c) => c.id === caseId ? { ...c, priority } : c));
    addHistoryEntry(caseId, "Priority changed", `Changed to ${priorityLabels[priority] || priority}`);
  };

  const handleEndCall = (notes: string, summary: string) => {
    if (!activeCallCaseId || !callStartTime) return;
    const durationSecs = Math.floor((Date.now() - callStartTime) / 1000);
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const durationStr = `${mins}m ${secs.toString().padStart(2, "0")}s`;

    // Update the call communication with duration and summary
    setCases((prev) => prev.map((c) => {
      if (c.id !== activeCallCaseId) return c;
      const updatedComms = c.communications.map((comm: any, i: number) => {
        // Update the last phone communication (the active call)
        if (i === c.communications.length - 1 && comm.type === "phone" && comm.duration === "Active") {
          return { ...comm, duration: durationStr, preview: summary || "Call completed." };
        }
        return comm;
      });
      return { ...c, communications: updatedComms };
    }));

    // Clear active call state
    setActiveCallCaseId(null);
    setCallStartTime(null);
  };

  const handleInitiateCall = () => {
    if (!selectedId) return;
    const caseData = cases.find((c) => c.id === selectedId);
    if (!caseData) return;

    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

    // Add outbound phone communication
    const newComm = {
      id: `c-${Date.now()}`,
      type: "phone" as const,
      direction: "outbound" as const,
      timestamp: `Today ${timeStr}`,
      duration: "Active",
      preview: "Outbound call in progress...",
      from: caseData.phone,
    };

    setCases((prev) => prev.map((c) => c.id === selectedId ? { ...c, communications: [...c.communications, newComm], status: "in-progress" } : c));
    addHistoryEntry(selectedId, "Outbound call", `Calling ${caseData.phone}`);

    // Start active call view
    setActiveCallCaseId(selectedId);
    setCallStartTime(Date.now());
    setShowCallConfirm(false);
  };

  const handleSendEmail = (email: { to: string; subject: string; body: string }) => {
    if (!selectedId) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const newComm = {
      id: `c-${Date.now()}`,
      type: "email" as const,
      direction: "outbound" as const,
      timestamp: `Today ${timeStr}`,
      subject: email.subject,
      preview: email.body,
      from: "support@storagevault.ca",
    };
    setCases((prev) => prev.map((c) => c.id === selectedId ? { ...c, communications: [...c.communications, newComm] } : c));
    addHistoryEntry(selectedId, "Email sent", email.subject);
    setShowEmailModal(false);
  };

  const handleSendSms = (sms: { to: string; message: string }) => {
    if (!selectedId) return;
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    const newComm = {
      id: `c-${Date.now()}`,
      type: "sms" as const,
      direction: "outbound" as const,
      timestamp: `Today ${timeStr}`,
      preview: sms.message,
      from: "support@storagevault.ca",
    };
    setCases((prev) => prev.map((c) => c.id === selectedId ? { ...c, communications: [...c.communications, newComm] } : c));
    addHistoryEntry(selectedId, "SMS sent", sms.message.substring(0, 40) + (sms.message.length > 40 ? "..." : ""));
    setShowSmsModal(false);
  };

  const unreadCount = cases.filter((c) => c.hasUnread).length;
  const openCases = cases.filter((c) => c.status === "open" || c.status === "in-progress");
  const myCases = cases.filter((c) => c.assignedTo === "You");
  const tabs = [
    { id: "queue", label: "Queue", count: queueItems.length },
    { id: "open", label: "Open Cases", count: openCases.length, newCount: openCases.filter((c) => c.hasUnread).length },
    { id: "my", label: "My Cases", count: myCases.length, newCount: myCases.filter((c) => c.hasUnread).length },
    { id: "all", label: "All Cases", count: cases.length, newCount: unreadCount },
  ];
  const getFilteredCases = () => {
    let filtered: typeof cases = [];
    switch (activeTab) {
      case "open": filtered = cases.filter((c) => c.status === "open" || c.status === "in-progress"); break;
      case "my": filtered = cases.filter((c) => c.assignedTo === "You"); break;
      case "all": filtered = cases; break;
      default: filtered = [];
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) =>
        c.customerName?.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q) ||
        c.unitNumber?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q) ||
        c.phone?.includes(q)
      );
    }
    // Sort by SLA urgency (breach first, then warning, then ok/null)
    filtered.sort((a, b) => {
      const slaA = getSLAStatus(a);
      const slaB = getSLAStatus(b);
      const urgencyOrder = { breach: 0, warning: 1, ok: 2 };
      const urgencyA = slaA ? urgencyOrder[slaA.status] : 3;
      const urgencyB = slaB ? urgencyOrder[slaB.status] : 3;
      if (urgencyA !== urgencyB) return urgencyA - urgencyB;
      // Within same urgency, sort by minutes waiting (higher first)
      return (slaB?.minutesAgo || 0) - (slaA?.minutesAgo || 0);
    });
    return filtered;
  };
  const selectedCase = cases.find((c) => c.id === selectedId);
  return <div style={{ width: "100%", height: "100vh", backgroundColor: "#F1F5F9", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", color: "#0F172A" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", fontWeight: 700 }}>M</div><div><div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>Communications Hub</div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>Storage Vault &middot; IT Crossing</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", backgroundColor: queueItems.length > 0 ? "#FEF2F2" : "#ECFDF5", fontSize: "12px", fontWeight: 600, color: queueItems.length > 0 ? "#EF4444" : "#10B981" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor", animation: queueItems.length > 0 ? "pulse 2s infinite" : "none" }} />{queueItems.length > 0 ? queueItems.length + " in queue" : "Queue clear"}</div><div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>CS</div></div>
    </div>
    <div style={{ display: "flex", gap: "8px", padding: "12px 24px", backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0, overflowX: "auto" }}>{tabs.map((tab) => <TabButton key={tab.id} active={activeTab === tab.id} count={tab.count} newCount={tab.newCount} onClick={() => { setActiveTab(tab.id); setSelectedId(null); setSelectedQueueItem(null); }}>{tab.label}</TabButton>)}</div>
    <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "16px", gap: "16px" }}>
      <div style={{ width: "380px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", paddingRight: "4px" }}>
        {activeTab !== "queue" && <div style={{ position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#94A3B8" }}>{"\u{1F50D}"}</span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, case ID, unit..." style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px", color: "#0F172A", outline: "none", backgroundColor: "#fff" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", borderRadius: "50%", border: "none", backgroundColor: "#E2E8F0", cursor: "pointer", fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>}
        </div>}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeTab === "queue" ? (queueItems.length > 0 ? queueItems.map((item) => {
            const matchedCase = cases.find((c) => c.phone === item.phoneNumber);
            return <QueueCard key={item.id} item={item} selected={selectedId === item.id || selectedId === matchedCase?.id} onClick={() => { if (matchedCase) { setSelectedId(matchedCase.id); setSelectedQueueItem(null); } else { setSelectedId(item.id); setSelectedQueueItem(item); } }} onTakeCall={() => handleTakeCall(item)} />;
          }) : <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8", fontSize: "14px" }}><div style={{ fontSize: "32px", marginBottom: "8px", opacity: 0.4 }}>{"\u2713"}</div>Queue is clear</div>) : (getFilteredCases().length > 0 ? getFilteredCases().map((c) => <CaseCard key={c.id} caseData={c} selected={selectedId === c.id} onClick={() => { setSelectedId(c.id); if (c.hasUnread) setCases((prev) => prev.map((pc) => pc.id === c.id ? { ...pc, hasUnread: false } : pc)); }} />) : <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8", fontSize: "14px" }}><div style={{ fontSize: "32px", marginBottom: "8px", opacity: 0.4 }}>{"\u{1F50D}"}</div>{searchQuery ? "No cases match your search" : "No cases"}</div>)}
        </div>
      </div>
      <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden", minWidth: "400px" }}>
        {selectedCase ? (
          <CaseDetailPanel caseData={selectedCase} onStatusChange={handleStatusChange} onSendEmail={() => { setPrefilledMessage(""); setShowEmailModal(true); }} onSendSms={() => { setPrefilledMessage(""); setShowSmsModal(true); }} onSuggestedReply={(suggestion) => { setPrefilledMessage(suggestion.message); if (suggestion.channel === "email") setShowEmailModal(true); else setShowSmsModal(true); }} onAssign={handleAssignCase} onUpdateSubject={handleUpdateSubject} onUpdatePriority={handleUpdatePriority} onCallCustomer={() => setShowCallConfirm(true)} activeCallCaseId={activeCallCaseId} callStartTime={callStartTime || undefined} onEndCall={handleEndCall} />
        ) : selectedQueueItem ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "18px", fontWeight: 700, color: "#0F172A", marginBottom: "4px" }}>{selectedQueueItem.customerName || "Unknown Caller"}</div>
                  <div style={{ fontSize: "13px", color: "#64748B" }}>{selectedQueueItem.phoneNumber}{selectedQueueItem.status === "missed" && selectedQueueItem.missedAt ? ` \u00B7 ${selectedQueueItem.missedAt}` : ""}</div>
                </div>
                <div style={{ display: "flex", gap: "6px" }}>
                  {selectedQueueItem.status === "missed" && <Badge color="#EF4444" bg="#FEF2F2">Missed Call</Badge>}
                  {selectedQueueItem.status === "waiting" && <Badge color="#F59E0B" bg="#FFFBEB">Waiting</Badge>}
                  <Badge color={getPriorityConfig(selectedQueueItem.priority).color} bg={getPriorityConfig(selectedQueueItem.priority).bg}>{getPriorityConfig(selectedQueueItem.priority).label}</Badge>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", padding: "14px 16px", backgroundColor: "#F8FAFC", borderRadius: "10px", border: "1px solid #F1F5F9" }}>
                <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Unit</div><div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>{selectedQueueItem.unitNumber || "Unknown"}</div></div>
                <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Phone</div><div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>{selectedQueueItem.phoneNumber}</div></div>
                <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Facility</div><div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>{selectedQueueItem.facilityName || "Unknown"}</div></div>
                <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Status</div><div style={{ fontSize: "13px", fontWeight: 500, color: "#334155" }}>{selectedQueueItem.customerStatus ? selectedQueueItem.customerStatus.charAt(0).toUpperCase() + selectedQueueItem.customerStatus.slice(1) : "Unknown"}</div></div>
                <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Balance</div><div style={{ fontSize: "13px", fontWeight: 500, color: selectedQueueItem.balance > 0 ? "#EF4444" : "#334155" }}>{selectedQueueItem.balance != null ? `$${selectedQueueItem.balance.toFixed(2)}` : "N/A"}</div></div>
                {selectedQueueItem.skillGroup && <div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>Team</div><div style={{ fontSize: "13px", fontWeight: 500, color: getSkillGroupConfig(selectedQueueItem.skillGroup).color }}>{selectedQueueItem.skillGroup}</div></div>}
              </div>
            </div>
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 24px" }}>
              <div style={{ textAlign: "center" }}>
                {selectedQueueItem.status === "missed" ? (
                  <>
                    <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.6 }}>{"\u{1F4DE}"}</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#EF4444", marginBottom: "4px" }}>Missed Call</div>
                    <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>{selectedQueueItem.missedAt || "Call was not answered"}</div>
                    <button onClick={() => handleTakeCall(selectedQueueItem)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer", color: "#fff", backgroundColor: "#EF4444", border: "none", boxShadow: "0 4px 14px rgba(239, 68, 68, 0.3)" }}><span style={{ fontSize: "18px" }}>{"\u{1F4DE}"}</span>Callback</button>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.6 }}>{"\u{1F4DE}"}</div>
                    <div style={{ fontSize: "16px", fontWeight: 600, color: "#10B981", marginBottom: "4px" }}>Incoming Call</div>
                    <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "4px" }}>Waiting: {formatWaitTime(selectedQueueItem.waitTime)}</div>
                    <div style={{ fontSize: "13px", color: "#64748B", marginBottom: "20px" }}>No existing case for this caller</div>
                    <button onClick={() => handleTakeCall(selectedQueueItem)} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px", borderRadius: "10px", fontSize: "15px", fontWeight: 600, cursor: "pointer", color: "#fff", backgroundColor: "#10B981", border: "none", boxShadow: "0 4px 14px rgba(16, 185, 129, 0.3)" }}><span style={{ fontSize: "18px" }}>{"\u{1F4DE}"}</span>Take Call</button>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <CaseDetailPanel caseData={null} />
        )}
      </div>
    </div>
    {showEmailModal && selectedCase && <SendEmailModal caseData={selectedCase} prefilledBody={prefilledMessage} onClose={() => { setShowEmailModal(false); setPrefilledMessage(""); }} onSend={handleSendEmail} />}
    {showSmsModal && selectedCase && <SendSMSModal caseData={selectedCase} prefilledMessage={prefilledMessage} onClose={() => { setShowSmsModal(false); setPrefilledMessage(""); }} onSend={handleSendSms} />}
    {showCallConfirm && selectedCase && <CallConfirmModal phone={selectedCase.phone} customerName={selectedCase.customerName} onConfirm={handleInitiateCall} onCancel={() => setShowCallConfirm(false)} />}
    {pendingCallbackItem && <CallConfirmModal phone={pendingCallbackItem.phoneNumber} customerName={pendingCallbackItem.customerName || "Unknown Caller"} onConfirm={handleConfirmCallback} onCancel={() => setPendingCallbackItem(null)} />}
    {toast && <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} onAction={toast.caseId ? () => { setActiveTab("open"); setSelectedId(toast.caseId!); setCases((prev) => prev.map((c) => c.id === toast.caseId ? { ...c, hasUnread: false } : c)); setToast(null); } : undefined} actionLabel={toast.caseId ? "View Case" : undefined} />}
    <style>{"@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }"}</style>
  </div>;
}
