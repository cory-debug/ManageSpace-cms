/**
 * Data types for Storage Vault Communications Hub (from STORAGE_VAULT_COMMS_UI_SPEC.md)
 */

export type CaseStatus = 'open' | 'in-progress' | 'waiting' | 'resolved' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type CommType = 'phone' | 'email' | 'sms';
export type CommDirection = 'inbound' | 'outbound';
export type CommStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type CustomerStatus = 'active' | 'delinquent' | 'overlocked' | 'moved-out';
export type QueueItemStatus = 'waiting' | 'assigned' | 'active';

export interface Case {
  id: string;
  customerId: string;
  facilityId: string;
  status: CaseStatus;
  priority: Priority;
  subject: string;
  createdAt: Date;
  updatedAt: Date;
  assignedTo?: string;
  communications: Communication[];
  tags?: string[];
}

export interface Communication {
  id: string;
  caseId: string;
  type: CommType;
  direction: CommDirection;
  from: string;
  to: string;
  content?: string;
  transcription?: string;
  recordingUrl?: string;
  timestamp: Date;
  status: CommStatus;
  sentBy?: string;
  durationSeconds?: number; // for phone calls
}

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  facilityId: string;
  unitNumber?: string;
  currentRate?: number;
  balance?: number;
  status: CustomerStatus;
}

export interface QueueItem {
  id: string;
  customerId?: string;
  customerName?: string;
  phoneNumber: string;
  facilityId?: string;
  waitTime: number;
  priority: Priority;
  status: QueueItemStatus;
  assignedTo?: string;
  createdAt: Date;
}

/** Tab for left panel: Queue vs Open Cases vs My Cases vs All Cases */
export type InboxTab = 'queue' | 'open' | 'mine' | 'all';
