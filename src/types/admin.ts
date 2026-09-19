export type AdminLeadSource = 'AUDIT' | 'CONTACT';

export type LeadStatus =
  | 'PENDING_REVIEW'
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP'
  | 'MEETING'
  | 'CLIENT'
  | 'LOST';

export interface AdminLead {
  id: string;
  source: AdminLeadSource;
  name: string;
  company?: string;
  email: string;
  contactChannel?: string;
  website?: string;
  message?: string;
  inquiryNotes?: string;
  status: LeadStatus;
  notificationStatus: string;
  createdAt: string;
  updatedAt?: string;
  assignedTo?: string;
  nextAction?: string;
  followUpAt?: string;
  internalNotes?: string;
}

export interface LeadOperationsUpdate {
  status: LeadStatus;
  assignedTo?: string;
  nextAction?: string;
  followUpAt?: string;
  internalNotes?: string;
}
