import React, { useEffect, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { SessionMemoryWorkspace } from './SessionMemoryWorkspace';
import { useLanguage } from '../i18n/LanguageContext';
import { requestSessionCopilot, type SessionCopilotClient } from '../services/sessionCopilot';
import { emitWorkspaceStateChanged, SESSION_STAGE_EVENT } from './experts/workspaceState';

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

export function SessionMemoryWorkspaceAI({ onBack }: Props) {
  const { language } = useLanguage();
  const [analyzing, setAnalyzing] = useState(true);
  const [usingAI, setUsingAI] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let runId = 0;
    const clientId = new URLSearchParams(window.location.search).get('client') || 'sofia';

    const hydrate = async () => {
      const thisRun = ++runId;
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
        const current = loadClients();
        localStorage.setItem(CLIENT_STORAGE_KEY, JSON.stringify(current.map((item) => item.id === clientId ? { ...item, copilot: brief } : item)));
        emitWorkspaceStateChanged();
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
  }, [language]);

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
