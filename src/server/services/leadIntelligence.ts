import { GoogleGenAI, Type } from '@google/genai';

export type LeadIntent = 'HIGH' | 'MEDIUM' | 'LOW';

export interface LeadIntelligenceInput {
  id: string;
  name: string;
  company?: string;
  email?: string;
  website?: string;
  source?: string;
  contactChannel?: string;
  status?: string;
  assignedTo?: string;
  nextAction?: string;
  followUpAt?: string;
  intakeContext?: string;
  internalNotes?: string;
  notes?: Array<{
    title: string;
    body: string;
    author?: string;
    createdAt?: string;
  }>;
}

export interface LeadIntelligenceBrief {
  intent: LeadIntent;
  summary: string;
  signals: string[];
  risks: string[];
  recommendedAction: string;
  qualificationQuestions: string[];
}

function cleanText(value: unknown, max: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, max);
}

export function sanitizeLeadIntelligenceInput(
  value: unknown
): LeadIntelligenceInput | null {
  if (!value || typeof value !== 'object') return null;
  const data = value as Record<string, unknown>;

  const id = cleanText(data.id, 200);
  const name = cleanText(data.name, 160);

  if (!id || !name) return null;

  const notes = Array.isArray(data.notes)
    ? data.notes
        .slice(-12)
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null;
          const note = entry as Record<string, unknown>;
          const title = cleanText(note.title, 120);
          const body = cleanText(note.body, 1200);
          if (!title || !body) return null;

          return {
            title,
            body,
            ...(cleanText(note.author, 120)
              ? { author: cleanText(note.author, 120) }
              : {}),
            ...(cleanText(note.createdAt, 60)
              ? { createdAt: cleanText(note.createdAt, 60) }
              : {})
          };
        })
        .filter(Boolean) as LeadIntelligenceInput['notes']
    : [];

  return {
    id,
    name,
    ...(cleanText(data.company, 180) ? { company: cleanText(data.company, 180) } : {}),
    ...(cleanText(data.email, 320) ? { email: cleanText(data.email, 320) } : {}),
    ...(cleanText(data.website, 300) ? { website: cleanText(data.website, 300) } : {}),
    ...(cleanText(data.source, 80) ? { source: cleanText(data.source, 80) } : {}),
    ...(cleanText(data.contactChannel, 80)
      ? { contactChannel: cleanText(data.contactChannel, 80) }
      : {}),
    ...(cleanText(data.status, 80) ? { status: cleanText(data.status, 80) } : {}),
    ...(cleanText(data.assignedTo, 120)
      ? { assignedTo: cleanText(data.assignedTo, 120) }
      : {}),
    ...(cleanText(data.nextAction, 260)
      ? { nextAction: cleanText(data.nextAction, 260) }
      : {}),
    ...(cleanText(data.followUpAt, 80)
      ? { followUpAt: cleanText(data.followUpAt, 80) }
      : {}),
    ...(cleanText(data.intakeContext, 2200)
      ? { intakeContext: cleanText(data.intakeContext, 2200) }
      : {}),
    ...(cleanText(data.internalNotes, 2200)
      ? { internalNotes: cleanText(data.internalNotes, 2200) }
      : {}),
    notes
  };
}

function normalizeBrief(value: unknown): LeadIntelligenceBrief {
  const data =
    value && typeof value === 'object'
      ? (value as Record<string, unknown>)
      : {};

  const intent: LeadIntent =
    data.intent === 'HIGH' || data.intent === 'MEDIUM' || data.intent === 'LOW'
      ? data.intent
      : 'MEDIUM';

  const list = (key: string, maxItems: number) =>
    Array.isArray(data[key])
      ? (data[key] as unknown[])
          .filter((entry): entry is string => typeof entry === 'string')
          .map((entry) => entry.trim())
          .filter(Boolean)
          .slice(0, maxItems)
      : [];

  return {
    intent,
    summary:
      typeof data.summary === 'string' && data.summary.trim()
        ? data.summary.trim().slice(0, 900)
        : 'Not enough verified context to summarize this lead yet.',
    signals: list('signals', 5),
    risks: list('risks', 4),
    recommendedAction:
      typeof data.recommendedAction === 'string' &&
      data.recommendedAction.trim()
        ? data.recommendedAction.trim().slice(0, 500)
        : 'Collect more context before deciding the next commercial action.',
    qualificationQuestions: list('qualificationQuestions', 5)
  };
}

function getGeminiErrorDetails(error: unknown): {
  status?: number;
  message: string;
} {
  const value = error as {
    status?: number;
    code?: number;
    message?: string;
    error?: { code?: number; status?: string; message?: string };
  };

  const status =
    value?.status ||
    value?.code ||
    value?.error?.code;

  const message = [
    value?.message,
    value?.error?.message,
    value?.error?.status
  ]
    .filter(Boolean)
    .join(' ');

  return { status, message };
}

function isUnavailableModelError(error: unknown): boolean {
  const { status, message } = getGeminiErrorDetails(error);
  const normalized = message.toUpperCase();

  return (
    status === 404 ||
    normalized.includes('NOT_FOUND') ||
    normalized.includes('NO LONGER AVAILABLE') ||
    normalized.includes('UPDATE YOUR CODE TO USE')
  );
}

function isTransientGeminiError(error: unknown): boolean {
  const { status, message } = getGeminiErrorDetails(error);
  const normalized = message.toUpperCase();

  return (
    status === 408 ||
    status === 429 ||
    (typeof status === 'number' && status >= 500) ||
    normalized.includes('UNAVAILABLE') ||
    normalized.includes('RESOURCE_EXHAUSTED') ||
    normalized.includes('HIGH DEMAND') ||
    normalized.includes('SERVICE UNAVAILABLE')
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateStructuredBrief(
  ai: GoogleGenAI,
  model: string,
  input: LeadIntelligenceInput
) {
  return ai.models.generateContent({
    model,
    contents: JSON.stringify(input),
    config: {
      systemInstruction: [
        'You are G-KAIS Lead Intelligence, an assistant for commercial operations.',
        'Analyze only the CRM context supplied by the administrator.',
        'Do not invent business facts, budget, authority, urgency, needs or intent that are not supported by the input.',
        'The intent label is a qualitative signal, not a probability and not a replacement for human judgment.',
        'HIGH means the available evidence shows strong commercial intent or a clear near-term buying/meeting signal.',
        'MEDIUM means there is some relevant engagement but important qualification information is missing.',
        'LOW means the available evidence shows weak intent, poor fit, explicit disinterest, or very limited context.',
        'Use concise operational language. Focus on what a human operator should know before the next contact.',
        'If context is missing, state the gap as a qualification question instead of guessing.',
        'Return only the requested JSON structure.'
      ].join('\n'),
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: {
            type: Type.STRING,
            enum: ['HIGH', 'MEDIUM', 'LOW']
          },
          summary: { type: Type.STRING },
          signals: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 5
          },
          risks: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 4
          },
          recommendedAction: { type: Type.STRING },
          qualificationQuestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            maxItems: 5
          }
        },
        required: [
          'intent',
          'summary',
          'signals',
          'risks',
          'recommendedAction',
          'qualificationQuestions'
        ]
      },
      temperature: 0.2,
      maxOutputTokens: 1200
    }
  });
}

export async function analyzeLeadWithGemini(
  input: LeadIntelligenceInput
): Promise<LeadIntelligenceBrief> {
  const apiKey =
    process.env.GOOGLE_API_KEY?.trim() ||
    process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error('Gemini API key is not configured.');
  }

  const ai = new GoogleGenAI({ apiKey });
  const preferredModel =
    process.env.GEMINI_MODEL?.trim() || 'gemini-3.5-flash-lite';

  const modelSequence = Array.from(
    new Set([
      preferredModel,
      'gemini-3.1-flash-lite',
      'gemini-3.5-flash'
    ])
  );

  let lastError: unknown = null;

  for (let modelIndex = 0; modelIndex < modelSequence.length; modelIndex += 1) {
    const model = modelSequence[modelIndex];
    const attempts = modelIndex === 0 ? 2 : 1;

    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const response = await generateStructuredBrief(ai, model, input);
        let parsed: unknown = {};

        try {
          parsed = JSON.parse(response.text || '{}');
        } catch {
          throw new Error('Gemini returned an invalid structured response.');
        }

        if (model !== preferredModel) {
          console.warn(
            `[AI LEAD BRIEF] Preferred model ${preferredModel} unavailable; used fallback ${model}.`
          );
        }

        return normalizeBrief(parsed);
      } catch (error) {
        lastError = error;

        if (isUnavailableModelError(error)) {
          console.warn(
            `[AI LEAD BRIEF] Model ${model} unavailable for this account; trying next fallback.`
          );
          break;
        }

        if (!isTransientGeminiError(error)) {
          throw error;
        }

        const hasAnotherAttempt =
          attempt + 1 < attempts ||
          modelIndex + 1 < modelSequence.length;

        if (!hasAnotherAttempt) break;

        if (attempt + 1 < attempts) {
          const delayMs = 900 * Math.pow(2, attempt);
          await sleep(delayMs);
        }
      }
    }
  }

  console.error('[AI LEAD BRIEF] All Gemini model attempts failed.', lastError);
  throw new Error(
    'G-KAIS AI is temporarily saturated. Please try the analysis again shortly.'
  );
}

