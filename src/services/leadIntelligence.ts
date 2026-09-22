import type { User } from 'firebase/auth';
import type { AdminLead } from '../types/admin';

export type LeadIntent = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LeadIntelligenceBrief {
  intent: LeadIntent;
  summary: string;
  signals: string[];
  risks: string[];
  recommendedAction: string;
  qualificationQuestions: string[];
}

export async function requestLeadIntelligence(
  lead: AdminLead,
  user: User,
  language: 'es' | 'en'
): Promise<LeadIntelligenceBrief> {
  const idToken = await user.getIdToken(true);

  const response = await fetch('/api/admin/ai/lead-brief', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      language,
      id: lead.id,
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      website: lead.website || '',
      source: lead.source,
      contactChannel: lead.contactChannel || '',
      status: lead.status,
      assignedTo: lead.assignedTo || '',
      nextAction: lead.nextAction || '',
      followUpAt: lead.followUpAt || '',
      intakeContext: lead.inquiryNotes || lead.message || '',
      internalNotes: lead.internalNotes || '',
      notes: (lead.leadNotes || []).slice(-12).map((note) => ({
        title: note.title,
        body: note.body,
        author: note.author,
        createdAt: note.createdAt
      }))
    })
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok || !payload?.brief) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        'G-KAIS could not analyze this lead.'
    );
  }

  return payload.brief as LeadIntelligenceBrief;
}
