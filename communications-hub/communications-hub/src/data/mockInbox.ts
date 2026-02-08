/**
 * Mock data for Helpdesk Inbox (Screen 1).
 * Replace with API calls when backend is ready.
 */

import type { Case, Communication, Customer, QueueItem } from '../types';

const now = new Date();
const today = (h: number, m: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);

export const mockCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'John Smith',
    email: 'johnsmith@email.com',
    phone: '(555) 123-4567',
    facilityId: 'fac-1',
    unitNumber: '105',
    currentRate: 145,
    balance: 0,
    status: 'active',
  },
  {
    id: 'cust-2',
    name: 'Jane Doe',
    email: 'janedoe@email.com',
    phone: '(555) 987-6543',
    facilityId: 'fac-1',
    unitNumber: '212',
    currentRate: 89,
    balance: 0,
    status: 'active',
  },
];

export const mockCommunications: Communication[] = [
  {
    id: 'comm-1',
    caseId: 'case-1',
    type: 'phone',
    direction: 'inbound',
    from: '(555) 123-4567',
    to: 'Helpdesk',
    transcription: 'Hi, I need help with my access code - it stopped working this morning.',
    timestamp: today(14, 15),
    status: 'delivered',
    durationSeconds: 202,
  },
  {
    id: 'comm-2',
    caseId: 'case-1',
    type: 'email',
    direction: 'outbound',
    from: 'helpdesk@managespace.com',
    to: 'johnsmith@email.com',
    content: "Thanks for calling. Here's your new access code: 1234. Let me know if you have any other questions.",
    timestamp: today(14, 18),
    status: 'sent',
    sentBy: 'current-user',
  },
  {
    id: 'comm-3',
    caseId: 'case-1',
    type: 'sms',
    direction: 'inbound',
    from: '(555) 123-4567',
    to: 'Helpdesk',
    content: 'Thank you, that helps!',
    timestamp: today(14, 45),
    status: 'delivered',
  },
];

export const mockCases: Case[] = [
  {
    id: 'case-1',
    customerId: 'cust-1',
    facilityId: 'fac-1',
    status: 'in-progress',
    priority: 'high',
    subject: 'Access code issue',
    createdAt: today(14, 15),
    updatedAt: today(14, 45),
    assignedTo: 'current-user',
    communications: mockCommunications,
    tags: ['access'],
  },
  {
    id: 'case-2',
    customerId: 'cust-2',
    facilityId: 'fac-1',
    status: 'open',
    priority: 'medium',
    subject: 'Billing question',
    createdAt: today(13, 0),
    updatedAt: today(13, 0),
    communications: [],
    tags: [],
  },
];

export const mockQueueItems: QueueItem[] = [
  {
    id: 'queue-1',
    customerId: 'cust-1',
    customerName: 'John Smith',
    phoneNumber: '(555) 123-4567',
    facilityId: 'fac-1',
    waitTime: 154, // 2m 34s
    priority: 'high',
    status: 'waiting',
    createdAt: new Date(Date.now() - 154 * 1000),
  },
  {
    id: 'queue-2',
    customerId: 'cust-2',
    customerName: 'Jane Doe',
    phoneNumber: '(555) 987-6543',
    facilityId: 'fac-1',
    waitTime: 45,
    priority: 'medium',
    status: 'waiting',
    createdAt: new Date(Date.now() - 45 * 1000),
  },
  {
    id: 'queue-3',
    phoneNumber: '(555) 555-0100',
    waitTime: 312, // 5m 12s
    priority: 'low',
    status: 'waiting',
    createdAt: new Date(Date.now() - 312 * 1000),
  },
];

/** Get customer by id */
export function getCustomerById(id: string): Customer | undefined {
  return mockCustomers.find((c) => c.id === id);
}

/** Get case by id */
export function getCaseById(id: string): Case | undefined {
  return mockCases.find((c) => c.id === id);
}
