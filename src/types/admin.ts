export type AdminLeadSource = 'AUDIT' | 'CONTACT';

export type LeadStatus =
  | 'PENDING_REVIEW'
  | 'NEW'
  | 'CONTACTED'
  | 'FOLLOW_UP'
  | 'MEETING'
  | 'CLIENT'
  | 'LOST';

export type FollowUpBucket =
  | 'OVERDUE'
  | 'TODAY'
  | 'UPCOMING'
  | 'UNSCHEDULED';

export type TaskOutcome =
  | 'COMPLETED'
  | 'NO_ANSWER'
  | 'INTERESTED'
  | 'MEETING_BOOKED'
  | 'PROPOSAL_SENT'
  | 'SALE_CLOSED'
  | 'NOT_INTERESTED';

export interface LeadNote {
  id: string;
  title: string;
  body: string;
  author: string;
  createdAt: string;
}

export interface LeadActivity {
  at: string;
  actor: string;
  fromStatus: LeadStatus;
  toStatus: LeadStatus;
  nextAction: string;
  result?: TaskOutcome;
}

export interface LeadActionCompletion {
  activity: LeadActivity;
  status: LeadStatus;
  nextAction: string;
  followUpAt: string;
}

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
  leadNotes?: LeadNote[];
  activityLog?: LeadActivity[];
}

export interface LeadOperationsUpdate {
  status: LeadStatus;
  assignedTo?: string;
  nextAction?: string;
  followUpAt?: string;
  internalNotes?: string;
}
