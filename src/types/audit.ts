export type ContactChannel = 
  | 'WhatsApp'
  | 'Website'
  | 'Email'
  | 'Instagram'
  | 'Phone'
  | 'Multiple channels';

export interface AuditRequestPayload {
  name: string;
  company: string;
  website?: string;
  email: string;
  contactChannel: ContactChannel | string;
  inquiryNotes?: string;
}

export interface AuditResponse {
  success: boolean;
  submissionId?: string;
  message?: string;
  timestamp?: string;
  error?: string;
}

export interface ContactRequestPayload {
  name: string;
  email: string;
  message: string;
}

export interface ContactResponse {
  success: boolean;
  submissionId?: string;
  message?: string;
  timestamp?: string;
  error?: string;
}
