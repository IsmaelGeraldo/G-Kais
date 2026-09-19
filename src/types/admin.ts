export type AdminLeadSource = 'AUDIT' | 'CONTACT';

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
  status: string;
  notificationStatus: string;
  createdAt: string;
}
