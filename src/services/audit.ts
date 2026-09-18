import { AuditRequestPayload, AuditResponse } from '../types/audit';

/**
 * Service to submit a Free AI Business Systems Audit request to the backend API.
 * Real network request with genuine server-side validation and record ID generation.
 */
export async function submitAuditRequest(payload: AuditRequestPayload): Promise<AuditResponse> {
  // Client-side quick check
  if (!payload.name?.trim() || !payload.company?.trim() || !payload.email?.trim()) {
    throw new Error('Please complete the required fields: Name, Company, and Business Email.');
  }

  const response = await fetch('/api/audit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to submit audit request. Please try again.');
  }

  return data as AuditResponse;
}
