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
  { id: "q1", customerName: "John Smith", unitNumber: "105", phoneNumber: "(403) 555-0147", waitTime: 154, priority: "high", status: "waiting", facilityName: "IT Crossing", customerStatus: "active", balance: 0 },
  { id: "q2", customerName: "Jane Doe", unitNumber: "212", phoneNumber: "(403) 555-0283", waitTime: 45, priority: "medium", status: "waiting", facilityName: "IT Crossing", customerStatus: "active", balance: 125.0 },
  { id: "q3", customerName: null, unitNumber: null, phoneNumber: "(403) 555-0100", waitTime: 312, priority: "low", status: "waiting", facilityName: null, customerStatus: null, balance: null },
];
const MOCK_CASES = [
  { id: "CS-1001", customerName: "John Smith", unitNumber: "105", phone: "(403) 555-0147", email: "john.smith@email.com", facilityName: "IT Crossing", status: "in-progress", priority: "high", assignedTo: "You", subject: "Access code not working", customerStatus: "active", balance: 0, lastPayment: "Jan 15, 2026", unitType: "10x10 Climate Control", createdAt: "Today 2:10 PM", communications: [
    { id: "c1", type: "phone", direction: "inbound", timestamp: "Today 2:15 PM", duration: "3m 22s", preview: "Hi, I need help with my access code - it stopped working this morning when I tried to get into my unit.", from: "(403) 555-0147" },
    { id: "c2", type: "email", direction: "outbound", timestamp: "Today 2:18 PM", preview: "Thanks for calling. Here's your new access code: 4821. This should work immediately at the gate keypad.", subject: "Re: Access Code - Unit 105", from: "support@storagevault.ca" },
    { id: "c3", type: "sms", direction: "inbound", timestamp: "Today 2:45 PM", preview: "Thank you, that helps! The new code worked perfectly.", from: "(403) 555-0147" },
  ], history: [
    { id: "h1", timestamp: "Today 2:10 PM", action: "Case created", details: "Inbound call from customer", user: "System" },
    { id: "h2", timestamp: "Today 2:15 PM", action: "Call answered", details: "Call taken by agent", user: "You" },
    { id: "h3", timestamp: "Today 2:18 PM", action: "Email sent", details: "Re: Access Code - Unit 105", user: "You" },
  ]},
  { id: "CS-1002", customerName: "Jane Doe", unitNumber: "212", phone: "(403) 555-0283", email: "jane.doe@email.com", facilityName: "IT Crossing", status: "open", priority: "medium", assignedTo: "Unassigned", subject: "Billing inquiry - double charge", customerStatus: "active", balance: 125.0, lastPayment: "Jan 28, 2026", unitType: "5x10 Standard", createdAt: "Today 11:30 AM", communications: [
    { id: "c4", type: "email", direction: "inbound", timestamp: "Today 11:30 AM", preview: "I noticed I was charged twice for February rent. Can you please look into this and issue a refund for the duplicate charge?", subject: "Double Charge on My Account", from: "jane.doe@email.com" },
  ], history: [
    { id: "h4", timestamp: "Today 11:30 AM", action: "Case created", details: "Inbound email from customer", user: "System" },
  ]},
  { id: "CS-0998", customerName: "Robert Chen", unitNumber: "304", phone: "(403) 555-0391", email: "r.chen@outlook.com", facilityName: "IT Crossing", status: "waiting", priority: "low", assignedTo: "You", subject: "Request for unit transfer", customerStatus: "active", balance: 0, lastPayment: "Feb 1, 2026", unitType: "10x15 Drive-Up", createdAt: "Feb 5", communications: [
    { id: "c5", type: "email", direction: "inbound", timestamp: "Feb 5, 10:15 AM", preview: "I'd like to downsize to a smaller unit. Do you have any 5x10s available? Preferably on the ground floor.", subject: "Unit Transfer Request", from: "r.chen@outlook.com" },
    { id: "c6", type: "email", direction: "outbound", timestamp: "Feb 5, 2:30 PM", preview: "Hi Robert, we have a 5x10 on ground floor available (Unit 118). I'll hold it for 48 hours. Let me know if you'd like to proceed.", subject: "Re: Unit Transfer Request", from: "support@storagevault.ca" },
  ], history: [
    { id: "h5", timestamp: "Feb 5, 10:15 AM", action: "Case created", details: "Inbound email from customer", user: "System" },
    { id: "h6", timestamp: "Feb 5, 10:30 AM", action: "Assigned", details: "Assigned to You", user: "System" },
    { id: "h7", timestamp: "Feb 5, 2:30 PM", action: "Email sent", details: "Re: Unit Transfer Request", user: "You" },
    { id: "h8", timestamp: "Feb 5, 2:35 PM", action: "Status changed", details: "Changed to Waiting", user: "You" },
  ]},
  { id: "CS-0995", customerName: "Maria Garcia", unitNumber: "089", phone: "(403) 555-0512", email: "mgarcia@gmail.com", facilityName: "IT Crossing", status: "resolved", priority: "high", assignedTo: "You", subject: "Water leak reported near unit", customerStatus: "active", balance: 0, lastPayment: "Feb 1, 2026", unitType: "10x10 Climate Control", createdAt: "Feb 3", communications: [
    { id: "c7", type: "phone", direction: "inbound", timestamp: "Feb 3, 9:00 AM", duration: "5m 10s", preview: "There's water pooling in the hallway near my unit. I'm worried it might get inside. Can someone come check?", from: "(403) 555-0512" },
    { id: "c8", type: "sms", direction: "outbound", timestamp: "Feb 3, 9:15 AM", preview: "Hi Maria, maintenance is on the way now. We'll inspect your unit and the hallway. ETA 30 minutes.", from: "support@storagevault.ca" },
    { id: "c9", type: "sms", direction: "outbound", timestamp: "Feb 3, 10:45 AM", preview: "Update: The leak was from a pipe fitting above the hallway. Fixed now. Your unit was not affected - no water inside. All clear!", from: "support@storagevault.ca" },
    { id: "c10", type: "sms", direction: "inbound", timestamp: "Feb 3, 11:00 AM", preview: "Thank you so much for the fast response! Really appreciate it.", from: "(403) 555-0512" },
  ], history: [
    { id: "h9", timestamp: "Feb 3, 9:00 AM", action: "Case created", details: "Urgent inbound call", user: "System" },
    { id: "h10", timestamp: "Feb 3, 9:00 AM", action: "Priority set", details: "Set to High", user: "You" },
    { id: "h11", timestamp: "Feb 3, 9:15 AM", action: "SMS sent", details: "Maintenance on the way", user: "You" },
    { id: "h12", timestamp: "Feb 3, 10:45 AM", action: "SMS sent", details: "Issue resolved update", user: "You" },
    { id: "h13", timestamp: "Feb 3, 11:15 AM", action: "Status changed", details: "Marked as Resolved", user: "You" },
  ]},
];
function formatWaitTime(seconds: number) { const m = Math.floor(seconds / 60); const s = seconds % 60; return m + "m " + s.toString().padStart(2, "0") + "s"; }
function getPriorityConfig(priority: string) { const c: Record<string, any> = { urgent: { color: "#EF4444", bg: "#FEF2F2", label: "Urgent" }, high: { color: "#F59E0B", bg: "#FFFBEB", label: "High" }, medium: { color: "#3B82F6", bg: "#EFF6FF", label: "Medium" }, low: { color: "#6B7280", bg: "#F9FAFB", label: "Low" } }; return c[priority] || c.low; }
function getStatusConfig(status: string) { const c: Record<string, any> = { open: { color: "#3B82F6", bg: "#EFF6FF", label: "Open" }, "in-progress": { color: "#F59E0B", bg: "#FFFBEB", label: "In Progress" }, waiting: { color: "#FB923C", bg: "#FFF7ED", label: "Waiting" }, resolved: { color: "#10B981", bg: "#ECFDF5", label: "Resolved" }, closed: { color: "#6B7280", bg: "#F9FAFB", label: "Closed" } }; return c[status] || c.open; }
function getCommTypeConfig(type: string) { const c: Record<string, any> = { phone: { color: "#3B82F6", bg: "#EFF6FF", icon: "\u{1F4DE}", label: "Phone" }, email: { color: "#10B981", bg: "#ECFDF5", icon: "\u2709\uFE0F", label: "Email" }, sms: { color: "#8B5CF6", bg: "#F5F3FF", icon: "\u{1F4AC}", label: "SMS" } }; return c[type] || c.phone; }
function Badge({ children, color, bg }: { children: React.ReactNode; color: string; bg: string }) { return <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 8px", borderRadius: "9999px", fontSize: "11px", fontWeight: 600, letterSpacing: "0.025em", color, backgroundColor: bg, textTransform: "uppercase" }}>{children}</span>; }
function TabButton({ active, count, children, onClick }: { active: boolean; count?: number; children: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: active ? 600 : 500, color: active ? "#fff" : "#64748B", backgroundColor: active ? "#0F172A" : "transparent", border: active ? "none" : "1px solid #E2E8F0", cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap" }}>{children}{count !== undefined && <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "18px", height: "18px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700, color: active ? "#0F172A" : "#fff", backgroundColor: active ? "#fff" : "#94A3B8", padding: "0 5px" }}>{count}</span>}</button>; }
function QueueCard({ item, selected, onClick, onTakeCall }: { item: any; selected: boolean; onClick: () => void; onTakeCall: () => void }) { const priority = getPriorityConfig(item.priority); const isUnknown = !item.customerName; return <div onClick={onClick} style={{ padding: "14px 16px", borderRadius: "10px", cursor: "pointer", backgroundColor: selected ? "#F8FAFC" : "#fff", border: selected ? "2px solid #0F172A" : "1px solid #E2E8F0", transition: "all 0.15s ease", position: "relative", overflow: "hidden" }}><div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: "3px", backgroundColor: priority.color, borderRadius: "10px 0 0 10px" }} /><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}><div><div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A", display: "flex", alignItems: "center", gap: "6px" }}>{isUnknown && <span style={{ color: "#F59E0B", fontSize: "14px" }}>&#9888;</span>}{item.customerName || "Unknown Caller"}</div>{item.unitNumber ? <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>Unit {item.unitNumber} &middot; {item.facilityName}</div> : <div style={{ fontSize: "12px", color: "#64748B", marginTop: "2px" }}>{item.phoneNumber}</div>}</div><Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge></div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "10px" }}><div style={{ fontSize: "12px", color: item.waitTime > 180 ? "#EF4444" : "#64748B", fontWeight: item.waitTime > 180 ? 600 : 400, display: "flex", alignItems: "center", gap: "4px" }}><span style={{ fontSize: "14px" }}>&#9201;</span>{formatWaitTime(item.waitTime)}{item.waitTime > 180 && " \u2014 long wait"}</div><button onClick={(e) => { e.stopPropagation(); onTakeCall(); }} style={{ padding: "5px 14px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, color: "#fff", backgroundColor: "#10B981", border: "none", cursor: "pointer" }}>Take Call</button></div></div>; }
function CaseCard({ caseData, selected, onClick }: { caseData: any; selected: boolean; onClick: () => void }) { const status = getStatusConfig(caseData.status); const priority = getPriorityConfig(caseData.priority); const latestComm = caseData.communications[caseData.communications.length - 1]; const commType = getCommTypeConfig(latestComm?.type); return <div onClick={onClick} style={{ padding: "14px 16px", borderRadius: "10px", cursor: "pointer", backgroundColor: selected ? "#F8FAFC" : "#fff", border: selected ? "2px solid #0F172A" : "1px solid #E2E8F0", transition: "all 0.15s ease" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}><div style={{ fontSize: "14px", fontWeight: 600, color: "#0F172A" }}>{caseData.customerName}</div><Badge color={status.color} bg={status.bg}>{status.label}</Badge></div><div style={{ fontSize: "12px", color: "#64748B", marginBottom: "6px" }}>{caseData.id} &middot; Unit {caseData.unitNumber} &middot; {caseData.facilityName}</div><div style={{ fontSize: "13px", color: "#334155", marginBottom: "8px", fontWeight: 500 }}>{caseData.subject}</div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#64748B" }}><span>{commType.icon}</span><span>{latestComm?.direction === "inbound" ? "From" : "Sent"} &middot; {latestComm?.timestamp}</span></div><Badge color={priority.color} bg={priority.bg}>{priority.label}</Badge></div></div>; }
function CommunicationItem({ comm, isFirst }: { comm: any; isFirst: boolean }) { const config = getCommTypeConfig(comm.type); return <div style={{ display: "flex", gap: "12px" }}><div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "32px", flexShrink: 0 }}>{!isFirst && <div style={{ width: "2px", height: "12px", backgroundColor: "#E2E8F0" }} />}<div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: config.bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", flexShrink: 0 }}>{config.icon}</div><div style={{ width: "2px", flex: 1, backgroundColor: "#E2E8F0", minHeight: "12px" }} /></div><div style={{ flex: 1, padding: "8px 14px 16px" }}><div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px", flexWrap: "wrap" }}><span style={{ fontSize: "13px", fontWeight: 600, color: "#0F172A" }}>{config.label}</span><Badge color={comm.direction === "inbound" ? "#3B82F6" : "#10B981"} bg={comm.direction === "inbound" ? "#EFF6FF" : "#ECFDF5"}>{comm.direction}</Badge><span style={{ fontSize: "12px", color: "#94A3B8" }}>{comm.timestamp}</span>{comm.duration && <span style={{ fontSize: "12px", color: "#94A3B8" }}>&middot; {comm.duration}</span>}</div><div style={{ fontSize: "13px", color: "#475569", lineHeight: "1.5", backgroundColor: "#F8FAFC", borderRadius: "8px", padding: "10px 12px", border: "1px solid #F1F5F9" }}>{comm.preview}</div></div></div>; }
function applyTemplate(text: string, caseData: any) {
  return text
    .replace(/\{\{name\}\}/g, caseData?.customerName?.split(" ")[0] || "there")
    .replace(/\{\{fullname\}\}/g, caseData?.customerName || "Customer")
    .replace(/\{\{unit\}\}/g, caseData?.unitNumber || "N/A")
    .replace(/\{\{facility\}\}/g, caseData?.facilityName || "Storage Vault")
    .replace(/\{\{balance\}\}/g, caseData?.balance ? `$${caseData.balance.toFixed(2)}` : "$0.00")
    .replace(/\{\{phone\}\}/g, caseData?.phone || "");
}
function SendEmailModal({ caseData, onClose, onSend }: { caseData: any; onClose: () => void; onSend: (email: { to: string; subject: string; body: string }) => void }) {
  const [to, setTo] = useState(caseData?.email || "");
  const [subject, setSubject] = useState(caseData?.subject ? `Re: ${caseData.subject}` : "");
  const [body, setBody] = useState("");
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
          <select value={selectedTemplate} onChange={(e) => handleTemplateChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#fff" }}>
            <option value="">Select a template (optional)</option>
            {EMAIL_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
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
function SendSMSModal({ caseData, onClose, onSend }: { caseData: any; onClose: () => void; onSend: (sms: { to: string; message: string }) => void }) {
  const [to, setTo] = useState(caseData?.phone || "");
  const [message, setMessage] = useState("");
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
          <select value={selectedTemplate} onChange={(e) => handleTemplateChange(e.target.value)} style={{ ...inputStyle, cursor: "pointer", backgroundColor: "#fff" }}>
            <option value="">Select a template (optional)</option>
            {SMS_TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
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
  return <div style={{ height: "100%", display: "flex", flexDirection: "column", backgroundColor: "#fff" }}>
    <div style={{ padding: "20px 24px", borderBottom: "1px solid #F1F5F9", background: "linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: "#10B981", display: "flex", alignItems: "center", justifyContent: "center", animation: "pulse 2s infinite" }}>
            <span style={{ fontSize: "24px" }}>{"\u{1F4DE}"}</span>
          </div>
          <div>
            <div style={{ fontSize: "12px", fontWeight: 600, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.05em" }}>Active Call</div>
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
function CaseDetailPanel({ caseData, onStatusChange, onSendEmail, onSendSms, onAssign, onUpdateSubject, onUpdatePriority, activeCallCaseId, callStartTime, onEndCall }: { caseData: any; onStatusChange?: (caseId: string, newStatus: string) => void; onSendEmail?: () => void; onSendSms?: () => void; onAssign?: (caseId: string, agent: string) => void; onUpdateSubject?: (caseId: string, subject: string) => void; onUpdatePriority?: (caseId: string, priority: string) => void; activeCallCaseId?: string | null; callStartTime?: number; onEndCall?: (notes: string, summary: string) => void }) {
  const [editingSubject, setEditingSubject] = useState(false);
  const [subjectDraft, setSubjectDraft] = useState("");
  const [showPriorityDropdown, setShowPriorityDropdown] = useState(false);
  const [historyExpanded, setHistoryExpanded] = useState(true);

  if (caseData && activeCallCaseId === caseData.id && callStartTime && onEndCall) {
    return <ActiveCallView caseData={caseData} callStartTime={callStartTime} onEndCall={onEndCall} />;
  }
  if (!caseData) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", minHeight: "400px", color: "#94A3B8", fontSize: "14px", flexDirection: "column", gap: "8px" }}><span style={{ fontSize: "32px", opacity: 0.4 }}>&#128203;</span><span>Select a case to view details</span></div>;
  }

  const status = getStatusConfig(caseData.status);
  const priority = getPriorityConfig(caseData.priority);
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
        <div style={{ display: "flex", gap: "6px", position: "relative" }}>
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
          { label: "Unit", value: caseData.unitNumber + " \u00B7 " + caseData.unitType },
          { label: "Phone", value: caseData.phone },
          { label: "Email", value: caseData.email },
          { label: "Balance", value: "$" + caseData.balance.toFixed(2), highlight: caseData.balance > 0 },
          { label: "Status", value: caseData.customerStatus?.charAt(0).toUpperCase() + caseData.customerStatus?.slice(1) },
        ].map((item: any, i: number) => (
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
    <div style={{ padding: "16px 24px", borderTop: "1px solid #F1F5F9", display: "flex", gap: "8px", flexWrap: "wrap" }}>
      <button onClick={onSendEmail} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#10B981", backgroundColor: "transparent", border: "1px solid #10B981" }}><span style={{ fontSize: "14px" }}>{"\u2709\uFE0F"}</span>Send Email</button>
      <button onClick={onSendSms} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#8B5CF6", backgroundColor: "transparent", border: "1px solid #8B5CF6" }}><span style={{ fontSize: "14px" }}>{"\u{1F4AC}"}</span>Send SMS</button>
      {!isResolved && !isClosed && <button onClick={() => onStatusChange?.(caseData.id, "resolved")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#fff", backgroundColor: "#10B981", border: "none" }}><span style={{ fontSize: "14px" }}>{"\u2713"}</span>Mark Resolved</button>}
      {isResolved && <button onClick={() => onStatusChange?.(caseData.id, "in-progress")} style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", borderRadius: "8px", fontSize: "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s ease", color: "#fff", backgroundColor: "#F59E0B", border: "none" }}><span style={{ fontSize: "14px" }}>{"\u21A9"}</span>Reopen Case</button>}
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
  const [activeCallCaseId, setActiveCallCaseId] = useState<string | null>(null);
  const [callStartTime, setCallStartTime] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => { const interval = setInterval(() => { setQueueItems((prev) => prev.map((item) => ({ ...item, waitTime: item.waitTime + 1 }))); }, 1000); return () => clearInterval(interval); }, []);

  const handleTakeCall = (queueItem: any) => {
    // Generate new case ID
    const newCaseId = `CS-${nextCaseNum}`;
    setNextCaseNum((n) => n + 1);

    // Create new case from queue item
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

    // Remove from queue
    setQueueItems((prev) => prev.filter((item) => item.id !== queueItem.id));

    // Add to cases
    setCases((prev) => [newCase, ...prev]);

    // Switch to My Cases tab and select new case
    setActiveTab("my");
    setSelectedId(newCaseId);

    // Start active call
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

  const tabs = [{ id: "queue", label: "Queue", count: queueItems.length },{ id: "open", label: "Open Cases", count: cases.filter((c) => c.status === "open" || c.status === "in-progress").length },{ id: "my", label: "My Cases", count: cases.filter((c) => c.assignedTo === "You").length },{ id: "all", label: "All Cases", count: cases.length }];
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
    return filtered;
  };
  const selectedCase = cases.find((c) => c.id === selectedId);
  return <div style={{ width: "100%", height: "100vh", backgroundColor: "#F1F5F9", fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", display: "flex", flexDirection: "column", color: "#0F172A" }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 24px", backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}><div style={{ width: "32px", height: "32px", borderRadius: "8px", backgroundColor: "#0F172A", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: "14px", fontWeight: 700 }}>M</div><div><div style={{ fontSize: "16px", fontWeight: 700, color: "#0F172A", lineHeight: 1.2 }}>Communications Hub</div><div style={{ fontSize: "11px", color: "#94A3B8", fontWeight: 500 }}>Storage Vault &middot; IT Crossing</div></div></div>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", borderRadius: "8px", backgroundColor: queueItems.length > 0 ? "#FEF2F2" : "#ECFDF5", fontSize: "12px", fontWeight: 600, color: queueItems.length > 0 ? "#EF4444" : "#10B981" }}><span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "currentColor", animation: queueItems.length > 0 ? "pulse 2s infinite" : "none" }} />{queueItems.length > 0 ? queueItems.length + " in queue" : "Queue clear"}</div><div style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, color: "#475569", cursor: "pointer" }}>CS</div></div>
    </div>
    <div style={{ display: "flex", gap: "8px", padding: "12px 24px", backgroundColor: "#fff", borderBottom: "1px solid #E2E8F0", flexShrink: 0, overflowX: "auto" }}>{tabs.map((tab) => <TabButton key={tab.id} active={activeTab === tab.id} count={tab.count} onClick={() => { setActiveTab(tab.id); setSelectedId(null); }}>{tab.label}</TabButton>)}</div>
    <div style={{ flex: 1, display: "flex", overflow: "hidden", padding: "16px", gap: "16px" }}>
      <div style={{ width: "380px", flexShrink: 0, display: "flex", flexDirection: "column", gap: "8px", overflow: "hidden", paddingRight: "4px" }}>
        {activeTab !== "queue" && <div style={{ position: "relative", flexShrink: 0 }}>
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", fontSize: "16px", color: "#94A3B8" }}>{"\u{1F50D}"}</span>
          <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search by name, case ID, unit..." style={{ width: "100%", padding: "10px 12px 10px 38px", borderRadius: "8px", border: "1px solid #E2E8F0", fontSize: "13px", color: "#0F172A", outline: "none", backgroundColor: "#fff" }} />
          {searchQuery && <button onClick={() => setSearchQuery("")} style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", borderRadius: "50%", border: "none", backgroundColor: "#E2E8F0", cursor: "pointer", fontSize: "11px", color: "#64748B", display: "flex", alignItems: "center", justifyContent: "center" }}>{"\u2715"}</button>}
        </div>}
        <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
          {activeTab === "queue" ? (queueItems.length > 0 ? queueItems.map((item) => <QueueCard key={item.id} item={item} selected={selectedId === item.id} onClick={() => setSelectedId(item.id)} onTakeCall={() => handleTakeCall(item)} />) : <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8", fontSize: "14px" }}><div style={{ fontSize: "32px", marginBottom: "8px", opacity: 0.4 }}>{"\u2713"}</div>Queue is clear</div>) : (getFilteredCases().length > 0 ? getFilteredCases().map((c) => <CaseCard key={c.id} caseData={c} selected={selectedId === c.id} onClick={() => setSelectedId(c.id)} />) : <div style={{ textAlign: "center", padding: "40px 20px", color: "#94A3B8", fontSize: "14px" }}><div style={{ fontSize: "32px", marginBottom: "8px", opacity: 0.4 }}>{"\u{1F50D}"}</div>{searchQuery ? "No cases match your search" : "No cases"}</div>)}
        </div>
      </div>
      <div style={{ flex: 1, backgroundColor: "#fff", borderRadius: "12px", border: "1px solid #E2E8F0", overflow: "hidden", minWidth: "400px" }}><CaseDetailPanel caseData={selectedCase} onStatusChange={handleStatusChange} onSendEmail={() => setShowEmailModal(true)} onSendSms={() => setShowSmsModal(true)} onAssign={handleAssignCase} onUpdateSubject={handleUpdateSubject} onUpdatePriority={handleUpdatePriority} activeCallCaseId={activeCallCaseId} callStartTime={callStartTime || undefined} onEndCall={handleEndCall} /></div>
    </div>
    {showEmailModal && selectedCase && <SendEmailModal caseData={selectedCase} onClose={() => setShowEmailModal(false)} onSend={handleSendEmail} />}
    {showSmsModal && selectedCase && <SendSMSModal caseData={selectedCase} onClose={() => setShowSmsModal(false)} onSend={handleSendSms} />}
    <style>{"@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }"}</style>
  </div>;
}
