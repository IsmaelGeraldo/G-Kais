import { ContactRequestPayload, ContactResponse } from '../types/audit';

/**
 * Service to submit a Contact / Engineering Inquiry to the backend API.
 */
export async function submitContactInquiry(payload: ContactRequestPayload): Promise<ContactResponse> {
  if (!payload.name?.trim() || !payload.email?.trim() || !payload.message?.trim()) {
    throw new Error('Please complete all fields: Name, Email, and Message.');
  }

  const response = await fetch('/api/contact', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit contact inquiry. Please try again.');
  }

  return data as ContactResponse;
}
