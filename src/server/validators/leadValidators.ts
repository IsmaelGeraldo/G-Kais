export const ALLOWED_CONTACT_CHANNELS = [
  'WhatsApp',
  'Website',
  'Email',
  'Instagram',
  'Phone',
  'Multiple channels'
] as const;

export type AllowedContactChannel = typeof ALLOWED_CONTACT_CHANNELS[number];

// Standard RFC 5322 compatible email pattern
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export interface ValidationResult<T> {
  isValid: boolean;
  errors: string[];
  sanitizedData?: T;
}

/**
 * Validates a website URL string.
 * Supports http://, https:// or standard hostname.domain format.
 */
export function isValidUrl(urlStr: string): boolean {
  try {
    const candidate = urlStr.startsWith('http://') || urlStr.startsWith('https://')
      ? urlStr
      : `https://${urlStr}`;
    const parsed = new URL(candidate);
    return Boolean(parsed.hostname && parsed.hostname.includes('.') && parsed.hostname.length >= 4);
  } catch {
    return false;
  }
}

/**
 * Validates an email address.
 */
export function isValidEmail(emailStr: string): boolean {
  if (typeof emailStr !== 'string') return false;
  const trimmed = emailStr.trim();
  if (trimmed.length < 5 || trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export interface ValidatedAuditData {
  name: string;
  company: string;
  website?: string;
  email: string;
  contactChannel: string;
  inquiryNotes?: string;
}

export function validateAuditPayload(body: any): ValidationResult<ValidatedAuditData> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request payload.'] };
  }

  // Name validation: 1–100 characters
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.push('Name is required.');
  } else if (name.length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  // Company validation: 1–150 characters
  const company = typeof body.company === 'string' ? body.company.trim() : '';
  if (!company) {
    errors.push('Company name is required.');
  } else if (company.length > 150) {
    errors.push('Company name must be 150 characters or fewer.');
  }

  // Email validation
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    errors.push('Work email is required.');
  } else if (!isValidEmail(email)) {
    errors.push('A valid business email address is required.');
  }

  // Website validation: optional, validate if provided
  let website: string | undefined;
  if (body.website && typeof body.website === 'string' && body.website.trim().length > 0) {
    const trimmedWebsite = body.website.trim();
    if (trimmedWebsite.length > 250) {
      errors.push('Website URL is too long.');
    } else if (!isValidUrl(trimmedWebsite)) {
      errors.push('Website must be a valid URL.');
    } else {
      website = trimmedWebsite;
    }
  }

  // Contact channel validation: must belong to allowed list
  const contactChannel = typeof body.contactChannel === 'string' ? body.contactChannel.trim() : '';
  if (!contactChannel) {
    errors.push('Primary contact channel is required.');
  } else if (!ALLOWED_CONTACT_CHANNELS.includes(contactChannel as any)) {
    errors.push(`Invalid contact channel. Allowed channels: ${ALLOWED_CONTACT_CHANNELS.join(', ')}.`);
  }

  // Inquiry notes: optional, maximum 2000 characters
  let inquiryNotes: string | undefined;
  if (body.inquiryNotes && typeof body.inquiryNotes === 'string') {
    const trimmedNotes = body.inquiryNotes.trim();
    if (trimmedNotes.length > 2000) {
      errors.push('Inquiry notes cannot exceed 2,000 characters.');
    } else if (trimmedNotes.length > 0) {
      inquiryNotes = trimmedNotes;
    }
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      name,
      company,
      website,
      email,
      contactChannel,
      inquiryNotes
    }
  };
}

export interface ValidatedContactData {
  name: string;
  email: string;
  message: string;
}

export function validateContactPayload(body: any): ValidationResult<ValidatedContactData> {
  const errors: string[] = [];

  if (!body || typeof body !== 'object') {
    return { isValid: false, errors: ['Invalid request payload.'] };
  }

  // Name validation: 1–100 characters
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) {
    errors.push('Name is required.');
  } else if (name.length > 100) {
    errors.push('Name must be 100 characters or fewer.');
  }

  // Email validation
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  if (!email) {
    errors.push('Email is required.');
  } else if (!isValidEmail(email)) {
    errors.push('A valid email address is required.');
  }

  // Message validation: 1–5000 characters
  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) {
    errors.push('Message is required.');
  } else if (message.length > 5000) {
    errors.push('Message must be 5,000 characters or fewer.');
  }

  if (errors.length > 0) {
    return { isValid: false, errors };
  }

  return {
    isValid: true,
    errors: [],
    sanitizedData: {
      name,
      email,
      message
    }
  };
}
