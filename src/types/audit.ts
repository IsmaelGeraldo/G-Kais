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
  _formRenderedAt?: number;
  _hp_website_title?: string;
}

export interface AuditResponse {
  success: boolean;
  code?: string;
  submissionId?: string;
  message?: string;
  timestamp?: string;
  error?: string;
  errors?: string[];
}

export interface ContactRequestPayload {
  name: string;
  email: string;
  message: string;
  _formRenderedAt?: number;
  _hp_website_title?: string;
}

export interface ContactResponse {
  success: boolean;
  code?: string;
  submissionId?: string;
  message?: string;
  timestamp?: string;
  error?: string;
  errors?: string[];
}
