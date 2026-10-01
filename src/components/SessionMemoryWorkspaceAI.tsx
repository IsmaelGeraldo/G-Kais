import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { SessionMemoryWorkspace } from './SessionMemoryWorkspace';
import { useLanguage } from '../i18n/LanguageContext';
import { requestSessionCopilot, type SessionCopilotClient } from '../services/sessionCopilot';
import {
  emitWorkspaceStateChanged,
  SESSION_STAGE_EVENT,
  updateSessionClient,
  WORKSPACE_STATE_EVENT
} from './experts/workspaceState';
import { scopedWorkspaceStorageKey } from '../services/expertsWorkspaceStorage';
import { WorkspacePersistenceStatus } from './experts/WorkspacePersistenceStatus';

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
    const parsed = JSON.parse(localStorage.getItem(scopedWorkspaceStorageKey(CLIENT_STORAGE_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed as StoredClient[] : [];
  } catch {
    return [];
  }
}

function loadJournal(): JournalEntry[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(scopedWorkspaceStorageKey(JOURNAL_STORAGE_KEY)) || '[]');
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
  if (!clientId) return;
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
    localStorage.setItem(scopedWorkspaceStorageKey(CLIENT_STORAGE_KEY), JSON.stringify(clients.map((item) => item.id === clientId ? normalizedClient : item)));
    emitWorkspaceStateChanged();
  } catch {}
}

export function SessionMemoryWorkspaceAI({ onBack }: Props) {
  const { language } = useLanguage();
  const [workspaceRevision, setWorkspaceRevision] = useState(0);
  const [analyzing, setAnalyzing] = useState(true);
  const [usingAI, setUsingAI] = useState(false);
  const [showFallbackNotice, setShowFallbackNotice] = useState(false);
  const fallbackNoticeShownRef = useRef(false);
  const fallbackNoticeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    const refresh = () => setWorkspaceRevision((value) => value + 1);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => () => {
    if (fallbackNoticeTimerRef.current !== null) window.clearTimeout(fallbackNoticeTimerRef.current);
  }, []);

  const clients = useMemo(() => loadClients(), [workspaceRevision]);
  const requestedClientId = new URLSearchParams(window.location.search).get('client') || '';
  const clientId = clients.some((item) => item.id === requestedClientId)
    ? requestedClientId
    : clients[0]?.id || '';

  useEffect(() => {
    let cancelled = false;
    let runId = 0;

    const showInitialFallbackNotice = () => {
      if (fallbackNoticeShownRef.current) return;
      fallbackNoticeShownRef.current = true;
      setShowFallbackNotice(true);
      if (fallbackNoticeTimerRef.current !== null) window.clearTimeout(fallbackNoticeTimerRef.current);
      fallbackNoticeTimerRef.current = window.setTimeout(() => {
        setShowFallbackNotice(false);
        fallbackNoticeTimerRef.current = null;
      }, 4500);
    };

    const hydrate = async () => {
      const thisRun = ++runId;
      if (!clientId) {
        setAnalyzing(false);
        setUsingAI(false);
        return;
      }
      normalizeStoredCopilot(clientId, language);
      const liveClients = loadClients();
      const client = liveClients.find((item) => item.id === clientId);
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
        setShowFallbackNotice(false);
      } catch (error) {
        console.error('[G-KAIS SESSION COPILOT ERROR]', error);
        if (!cancelled && thisRun === runId) {
          setUsingAI(false);
          showInitialFallbackNotice();
        }
      } finally {
        if (!cancelled && thisRun === runId) setAnalyzing(false);
      }
    };

    const onStageCompleted = (event: Event) => {
      const detail = (event as CustomEvent<{ clientId?: string }>).detail;
      if (!detail?.clientId || detail.clientId === clientId) void hydrate();
    };

    void hydrate();
    window.addEventListener(SESSION_STAGE_EVENT, onStageCompleted as EventListener);
    return () => {
      cancelled = true;
      window.removeEventListener(SESSION_STAGE_EVENT, onStageCompleted as EventListener);
    };
  }, [clientId, language]);

  if (!clients.length) {
    return (
      <div className="min-h-screen bg-[#F6F6F3] px-6 py-8 text-[#111413]">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-black/55 transition hover:bg-black/5 hover:text-black">
          <ArrowLeft className="h-4 w-4" />
          {language === 'es' ? 'Volver a clientes' : 'Back to clients'}
        </button>
        <div className="mx-auto mt-24 max-w-xl rounded-2xl border border-black/8 bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-semibold">{language === 'es' ? 'Todavía no hay clientes para una sesión' : 'There are no clients ready for a session yet'}</h1>
          <p className="mt-3 text-sm leading-6 text-black/50">
            {language === 'es'
              ? 'Cuando agregues un cliente real, su contexto y su historial aparecerán aquí. G-KAIS ya no completa cuentas vacías con información de demostración.'
              : 'When you add a real client, their context and history will appear here. G-KAIS no longer fills empty accounts with demo information.'}
          </p>
          <button type="button" onClick={onBack} className="mt-6 rounded-xl bg-[#111413] px-4 py-2.5 text-sm font-semibold text-white">
            {language === 'es' ? 'Ir a Clientes' : 'Go to Clients'}
          </button>
        </div>
        <WorkspacePersistenceStatus />
      </div>
    );
  }

  return (
    <div className="relative">
      <SessionMemoryWorkspace onBack={onBack} />
      {analyzing && (
        <div className="fixed right-4 top-16 z-[95] inline-flex items-center gap-2 rounded-full border border-black/10 bg-white/92 px-3 py-2 text-[10px] font-medium text-black/50 shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-[#0A3F4D]" />
          {language === 'es' ? 'Copilot actualizando esta etapa…' : 'Copilot updating this stage…'}
        </div>
      )}
      {!analyzing && !usingAI && showFallbackNotice && (
        <div className="fixed bottom-4 right-4 z-[95] max-w-[280px] rounded-xl border border-black/10 bg-white/95 px-3 py-2 text-[10px] leading-4 text-black/45 shadow-lg backdrop-blur">
          {language === 'es' ? 'Usando el último contexto disponible. Gemini se activa cuando existe una sesión autenticada.' : 'Using the latest available context. Gemini activates when an authenticated session exists.'}
        </div>
      )}
      <WorkspacePersistenceStatus />
    </div>
  );
}
