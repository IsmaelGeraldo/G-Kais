import type { User } from 'firebase/auth';
import type { AdminLead } from '../types/admin';
import type { BusinessKnowledge } from './businessKnowledge';

export type LeadIntent = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LeadIntelligenceBrief {
  intent: LeadIntent;
  summary: string;
  signals: string[];
  risks: string[];
  recommendedAction: string;
  qualificationQuestions: string[];
  howGkaisCanHelp: string[];
  solutionPlan: string[];
  callPositioning: string;
}

function cleanCopilotText(value: unknown, language: 'es' | 'en'): string {
  if (typeof value !== 'string') return '';
  let text = value
    .replace(/^[\s•*-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (!text) return '';
  if (language === 'es') {
    text = text
      .replace(/\bfollow[- ]?up\b/gi, 'seguimiento')
      .replace(/\bfeedback\b/gi, 'comentarios')
      .replace(/\bpipeline\b/gi, 'proceso comercial')
      .replace(/\bfunnel\b/gi, 'sistema de captación')
      .replace(/\bdelivery\b/gi, 'entrega')
      .replace(/\bperformance\b/gi, 'rendimiento')
      .replace(/\bejecuci[oó]n\b/gi, 'implementación');
  }

  if (/^[¿¡]/.test(text) && text.length > 1) {
    return text.charAt(0) + text.charAt(1).toUpperCase() + text.slice(2);
  }
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanQuestion(value: unknown, language: 'es' | 'en'): string {
  let text = cleanCopilotText(value, language).replace(/[.!]+$/, '').trim();
  if (!text) return '';
  if (language === 'es') {
    text = text.replace(/^\?+/, '').replace(/\?+$/, '').trim();
    if (!text.startsWith('¿')) text = `¿${text}`;
    if (!text.endsWith('?')) text = `${text}?`;
  } else if (!text.endsWith('?')) {
    text = `${text}?`;
  }
  return text;
}

function normalizeBrief(value: unknown, language: 'es' | 'en'): LeadIntelligenceBrief | null {
  if (!value || typeof value !== 'object') return null;
  const brief = value as Record<string, unknown>;
  const list = (key: string, questions = false) => Array.isArray(brief[key])
    ? Array.from(new Set((brief[key] as unknown[]).map((item) => questions ? cleanQuestion(item, language) : cleanCopilotText(item, language)).filter(Boolean)))
    : [];
  const intent: LeadIntent = brief.intent === 'HIGH' || brief.intent === 'LOW' ? brief.intent : 'MEDIUM';

  return {
    intent,
    summary: cleanCopilotText(brief.summary, language),
    signals: list('signals'),
    risks: list('risks'),
    recommendedAction: cleanCopilotText(brief.recommendedAction, language),
    qualificationQuestions: list('qualificationQuestions', true),
    howGkaisCanHelp: list('howGkaisCanHelp'),
    solutionPlan: list('solutionPlan'),
    callPositioning: cleanCopilotText(brief.callPositioning, language)
  };
}

export async function requestLeadIntelligence(
  lead: AdminLead,
  user: User,
  language: 'es' | 'en',
  businessKnowledge?: BusinessKnowledge
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
      businessKnowledge: businessKnowledge
        ? {
            businessName: businessKnowledge.businessName,
            businessDescription: businessKnowledge.businessDescription,
            offers: businessKnowledge.offers,
            idealCustomer: businessKnowledge.idealCustomer,
            qualificationCriteria: businessKnowledge.qualificationCriteria,
            faqObjections: businessKnowledge.faqObjections,
            policies: businessKnowledge.policies,
            tone: businessKnowledge.tone
          }
        : undefined,
      id: lead.id,
      name: lead.name,
      company: lead.company || '',
      email: lead.email || '',
      phone: lead.phone || '',
      website: lead.website || '',
      businessType: lead.businessType || '',
      primaryService: lead.primaryService || '',
      digitalPresence: lead.digitalPresence || '',
      acquisitionChannel: lead.acquisitionChannel || '',
      leadVolume: lead.leadVolume || '',
      currentCrm: lead.currentCrm || '',
      primaryProblem: lead.primaryProblem || '',
      currentSolution: lead.currentSolution || '',
      businessGoal: lead.businessGoal || '',
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
  const normalized = normalizeBrief(payload?.brief, language);

  if (!response.ok || !normalized) {
    throw new Error(
      payload?.error ||
        payload?.message ||
        'G-KAIS could not analyze this lead.'
    );
  }

  return normalized;
}
