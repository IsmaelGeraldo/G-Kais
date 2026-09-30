import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SessionMemoryWorkspace } from './SessionMemoryWorkspace';
import { useLanguage } from '../i18n/LanguageContext';
import { requestSessionCopilot, type SessionCopilotClient } from '../services/sessionCopilot';
import { emitWorkspaceStateChanged, SESSION_STAGE_EVENT, updateSessionClient } from './experts/workspaceState';

type Props = { onBack: () => void };
type JournalEntry = { clientId: string; title?: string; body?: string; createdAt?: string };
type StoredClient = SessionCopilotClient & {
  commitments: Array<{ id: string; label: string; status: 'pending' | 'done' | 'overdue' }>;
  copilot: {
    summary: string;
    gap: string;
    known: string[];
    risks: string[];
    questions: string[];
    howHelp: string[];
    plan: string[];
    callOpening: string;
  };
};

const CLIENT_STORAGE_KEY = 'gkais-experts-session-clients-v2';
const JOURNAL_STORAGE_KEY = 'gkais-experts-client-journal-v1';

function loadClients(): StoredClient[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLIENT_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as StoredClient[] : [];
  } catch {
    return [];
  }
}

function loadJournal(): JournalEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(JOURNAL_STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed as JournalEntry[] : [];
  } catch {
    return [];
  }
}

function cleanStoredText(value: unknown, language: 'es' | 'en'): string {
  if (typeof value !== 'string') return '';
  let text = value
    .replace(/^[\s•*-]+/, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:!?])/g, '$1')
    .trim();

  if (language === 'es') {
    text = text
      .replace(/\buna acciones realizadas\b/gi, 'una implementación')
      .replace(/\bacciones realizadas inconsistente(s?)\b/gi, 'implementación inconsistente$1')
      .replace(/\bfollow[- ]?up\b/gi, 'seguimiento')
      .replace(/\bfeedback\b/gi, 'comentarios')
      .replace(/\bpipeline\b/gi, 'proceso comercial')
      .replace(/\bfunnel\b/gi, 'sistema de captación')
      .replace(/\bdelivery\b/gi, 'entrega')
      .replace(/\bperformance\b/gi, 'rendimiento')
      .replace(/\bejecuci[oó]n\b/gi, 'implementación')
      .replace(/\badquisici[oó]n\b/gi, 'captación de clientes')
      .replace(/\btasa de conversi[oó]n\b/gi, 'tasa de cierre')
      .replace(/\bla conversi[oó]n\b/gi, 'el cierre')
      .replace(/\buna conversi[oó]n\b/gi, 'un cierre')
      .replace(/\bconversi[oó]n\b/gi, 'cierre')
      .replace(/\bescalar\b/gi, 'crecer');
  }

  if (!text) return '';
  if (/^[¿¡]/.test(text) && text.length > 1) return text.charAt(0) + text.charAt(1).toUpperCase() + text.slice(2);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cleanStoredQuestion(value: unknown, language: 'es' | 'en'): string {
  let text = cleanStoredText(value, language).replace(/[.!]+$/, '').trim();
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

function normalizeStoredCopilot(clientId: string, language: 'es' | 'en'): void {
  const clients = loadClients();
  const client = clients.find((item) => item.id === clientId);
  if (!client?.copilot) return;

  const cleanList = (items: unknown, questions = false) => Array.isArray(items)
    ? Array.from(new Set(items.map((item) => questions ? cleanStoredQuestion(item, language) : cleanStoredText(item, language)).filter(Boolean)))
    : [];

  const normalizedClient: StoredClient = {
    ...client,
    currentGap: cleanStoredText(client.currentGap, language),
    planSummary: cleanStoredText(client.planSummary, language),
    blockers: cleanList(client.blockers),
    copilot: {
      ...client.copilot,
      summary: cleanStoredText(client.copilot.summary, language),
      gap: cleanStoredText(client.copilot.gap, language),
      known: cleanList(client.copilot.known),
      risks: cleanList(client.copilot.risks),
      questions: cleanList(client.copilot.questions, true),
      howHelp: cleanList(client.copilot.howHelp),
      plan: cleanList(client.copilot.plan),
      callOpening: cleanStoredText(client.copilot.callOpening, language)
    }
  };

  if (JSON.stringify(normalizedClient) === JSON.stringify(client)) return;
  try {
    localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(clients.map((item) => item.id === clientId ? normalizedClient : item)));
    emitWorkspaceStateChanged();
  } catch {}
}

export function SessionMemoryWorkspaceAI({ onBack }: Props) {
  const { language } = useLanguage();
  const [clientId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get('client') || 'sofia';
    normalizeStoredCopilot(id, language);
    return id;
  });
  const [analyzing, setAnalyzing] = useState(true);
  const [usingAI, setUsingAI] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let runId = 0;

    const hydrate = async () => {
      const thisRun = ++runId;
      normalizeStoredCopilot(clientId, language);
      const clients = loadClients();
      const client = clients.find((item) => item.id === clientId);
      if (!client) {
        if (!cancelled && thisRun === runId) setAnalyzing(false);
        return;
      }

      setAnalyzing(true);
      try {
        const journal = loadJournal().filter((entry) => entry.clientId === clientId);
        const brief = await requestSessionCopilot(client, journal, language);
        if (cancelled || thisRun !== runId) return;
        updateSessionClient(clientId, (item) => ({
          ...item,
          copilot: brief,
          currentGap: brief.gap || item.currentGap
        }));
        setUsingAI(true);
      } catch {
        if (!cancelled && thisRun === runId) setUsingAI(false);
      } finally {
        if (!cancelled && thisRun === runId) setAnalyzing(false);
      }
    };

    const onStageCompleted = (event: Event) => {
      const detail = (event as CustomEvent<{ clientId?: string }>).detail;
      if (!detail?.clientId || detail.clientId === clientId) hydrate();
    };

    hydrate();
    window.addEventListener(SESSION_STAGE_EVENT, onStageCompleted as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_STAGE_EVENT, onStageCompleted as EventListener);
    };
  }, [clientId, language]);

  return (
    <div className="relative">
      <SessionMemoryWorkspace onBack={onBack} />
      {analyzing && (
        <div className="fixed right-4 top-16 z-[95] inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/92 px-3 py-2 text-[10px] font-medium text-black/50 shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[#0A3F4D]" />
          {language === 'es' ? 'Copilot actualizando esta etapa…' : 'Copilot updating this stage…'}
        </div>
      )}
      {!analyzing && !usingAI && (
        <div className="fixed bottom-4 right-4 z-[95] max-w-[280px] rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-[10px] leading-4 text-black/45 shadow-lg backdrop-blur">
          {language === 'es' ? 'Usando el último contexto disponible. Gemini se activa cuando existe una sesión autenticada.' : 'Using the latest available context. Gemini activates when an authenticated session exists.'}
        </div>
      )}
    </div>
  );
}
