import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardPaste,
  Flag,
  MessageSquareText,
  Plus,
  Save,
  Sparkles,
  Target,
  UserRound
} from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

type SessionRecord = {
  id: string;
  client: string;
  date: string;
  source: 'manual' | 'summary' | 'transcript';
  rawInput: string;
  whatHappened: string;
  whatChanged: string;
  decisions: string;
  commitments: string;
  blockers: string;
  nextAction: string;
};

type SessionMemoryWorkspaceProps = {
  onBack: () => void;
};

const CLIENTS = ['Sofía Martínez', 'Andrés Silva', 'Diego Rojas'];

const INITIAL_SESSIONS: SessionRecord[] = [
  {
    id: 'session-sofia-1',
    client: 'Sofía Martínez',
    date: '19 sep 2026',
    source: 'summary',
    rawInput: 'Revisamos el funnel. Sigue activo, pero la ejecución fue baja. Sofía publicó solo una pieza y contactó 8 prospectos. Decidimos no cambiar la estrategia todavía.',
    whatHappened: 'Se revisó el rendimiento del funnel y la ejecución de la semana.',
    whatChanged: 'El problema principal dejó de ser la estructura del funnel y pasó a ser la consistencia de ejecución.',
    decisions: 'Mantener el funnel actual una semana más antes de cambiar la estrategia.',
    commitments: 'Publicar 3 piezas de contenido y contactar 25 prospectos antes de la próxima sesión.',
    blockers: 'Ejecución inconsistente y dificultad para proteger tiempo comercial.',
    nextAction: 'Revisar compromisos antes de la próxima sesión.'
  }
];

const STORAGE_KEY = 'gkais-experts-session-memory-v1';

function loadSessions(): SessionRecord[] {
  if (typeof window === 'undefined') return INITIAL_SESSIONS;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return INITIAL_SESSIONS;
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : INITIAL_SESSIONS;
  } catch {
    return INITIAL_SESSIONS;
  }
}

export function SessionMemoryWorkspace({ onBack }: SessionMemoryWorkspaceProps) {
  const { language } = useLanguage();
  const [sessions, setSessions] = useState<SessionRecord[]>(loadSessions);
  const [client, setClient] = useState(CLIENTS[0]);
  const [source, setSource] = useState<SessionRecord['source']>('summary');
  const [rawInput, setRawInput] = useState('');
  const [whatHappened, setWhatHappened] = useState('');
  const [whatChanged, setWhatChanged] = useState('');
  const [decisions, setDecisions] = useState('');
  const [commitments, setCommitments] = useState('');
  const [blockers, setBlockers] = useState('');
  const [nextAction, setNextAction] = useState('');
  const [saved, setSaved] = useState(false);

  const latest = useMemo(() => sessions[0], [sessions]);

  const saveSession = () => {
    const record: SessionRecord = {
      id: `session-${Date.now()}`,
      client,
      date: new Date().toLocaleDateString(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short', year: 'numeric' }),
      source,
      rawInput,
      whatHappened,
      whatChanged,
      decisions,
      commitments,
      blockers,
      nextAction
    };
    const next = [record, ...sessions];
    setSessions(next);
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const fields = [
    [language === 'es' ? 'Qué ocurrió' : 'What happened', whatHappened, setWhatHappened],
    [language === 'es' ? 'Qué cambió' : 'What changed', whatChanged, setWhatChanged],
    [language === 'es' ? 'Decisiones' : 'Decisions', decisions, setDecisions],
    [language === 'es' ? 'Compromisos' : 'Commitments', commitments, setCommitments],
    [language === 'es' ? 'Bloqueadores' : 'Blockers', blockers, setBlockers],
    [language === 'es' ? 'Próxima acción' : 'Next action', nextAction, setNextAction]
  ] as const;

  return (
    <div className="min-h-screen bg-[#F4F4F1] text-[#0A0A0A]">
      <header className="sticky top-0 z-20 border-b border-black/8 bg-[#F4F4F1]/95 px-4 py-3 backdrop-blur md:px-8 lg:px-10">
        <div className="mx-auto flex max-w-[1500px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white text-black/60 transition hover:text-black" aria-label={language === 'es' ? 'Volver al Workspace' : 'Back to Workspace'}>
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS FOR EXPERTS</p>
              <h1 className="text-sm font-semibold">Session Memory</h1>
            </div>
          </div>
          <span className="rounded-full border border-[#0A3F4D]/15 bg-[#0A3F4D]/5 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#0A3F4D]">
            {language === 'es' ? 'Piloto v1' : 'Pilot v1'}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8 md:px-8 lg:px-10 lg:py-10">
        <div className="mb-7">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">SESSION MEMORY</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em] md:text-4xl">{language === 'es' ? 'Registrar lo que cambió.' : 'Record what changed.'}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">
            {language === 'es'
              ? 'Convierte cada sesión en memoria útil: qué ocurrió, qué decisiones se tomaron, qué se comprometió y qué debe pasar después.'
              : 'Turn every session into useful memory: what happened, what was decided, what was committed to and what should happen next.'}
          </p>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-2xl border border-black/10 bg-white p-5 shadow-[0_12px_35px_rgba(10,10,10,0.04)] md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'NUEVA SESIÓN' : 'NEW SESSION'}</p>
                <h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Captura mínima, memoria estructurada' : 'Minimal capture, structured memory'}</h3>
              </div>
              <Plus className="h-5 w-5 text-[#0A3F4D]" />
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'CLIENTE' : 'CLIENT'}</span>
                <select value={client} onChange={(event) => setClient(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45">
                  {CLIENTS.map((name) => <option key={name}>{name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'FUENTE' : 'SOURCE'}</span>
                <select value={source} onChange={(event) => setSource(event.target.value as SessionRecord['source'])} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#0A3F4D]/45">
                  <option value="manual">{language === 'es' ? 'Entrada manual' : 'Manual entry'}</option>
                  <option value="summary">{language === 'es' ? 'Resumen pegado' : 'Pasted summary'}</option>
                  <option value="transcript">{language === 'es' ? 'Transcripción pegada' : 'Pasted transcript'}</option>
                </select>
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40"><ClipboardPaste className="h-3.5 w-3.5" />{language === 'es' ? 'NOTAS / RESUMEN / TRANSCRIPCIÓN' : 'NOTES / SUMMARY / TRANSCRIPT'}</span>
              <textarea value={rawInput} onChange={(event) => setRawInput(event.target.value)} rows={6} placeholder={language === 'es' ? 'Pega aquí lo ocurrido en la sesión. En esta primera versión G-KAIS no inventa datos: tú confirmas la memoria estructurada antes de guardar.' : 'Paste what happened in the session. In this first version G-KAIS does not invent data: you confirm the structured memory before saving.'} className="w-full resize-y rounded-xl border border-black/10 bg-[#FAFAF8] px-3.5 py-3 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
            </label>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              {fields.map(([label, value, setter]) => (
                <label key={label} className="block">
                  <span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{label}</span>
                  <textarea value={value} onChange={(event) => setter(event.target.value)} rows={3} className="w-full resize-y rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none focus:border-[#0A3F4D]/45" />
                </label>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-black/7 pt-5">
              <p className="text-xs text-black/40">{language === 'es' ? 'Piloto: guardado local en este navegador.' : 'Pilot: saved locally in this browser.'}</p>
              <button onClick={saveSession} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-5 py-2.5 text-xs font-semibold text-white transition hover:bg-black">
                {saved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
                {saved ? (language === 'es' ? 'Sesión guardada' : 'Session saved') : (language === 'es' ? 'Guardar Session Memory' : 'Save Session Memory')}
              </button>
            </div>
          </section>

          <div className="space-y-6">
            <section className="rounded-2xl bg-[#0A3F4D] p-5 text-white shadow-[0_18px_45px_rgba(10,63,77,0.16)] md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/55">G-KAIS COPILOT</p><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Qué debe pasar después' : 'What should happen next'}</h3></div>
                <Sparkles className="h-5 w-5 text-white/80" />
              </div>
              <p className="mt-4 text-sm leading-6 text-white/72">{nextAction || (language === 'es' ? 'La próxima acción confirmada en la sesión aparecerá aquí y luego alimentará Priority Radar.' : 'The confirmed next action from the session will appear here and later feed Priority Radar.')}</p>
            </section>

            {latest && (
              <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-black/40">{language === 'es' ? 'ÚLTIMA MEMORIA' : 'LATEST MEMORY'}</p><h3 className="mt-2 text-lg font-semibold">{latest.client}</h3></div>
                  <CalendarDays className="h-5 w-5 text-[#0A3F4D]" />
                </div>
                <div className="mt-4 space-y-3 text-sm text-black/62">
                  <div className="rounded-xl bg-[#F7F7F5] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'DECISIÓN' : 'DECISION'}</p><p className="mt-1.5 leading-6">{latest.decisions || '—'}</p></div>
                  <div className="rounded-xl bg-[#F7F7F5] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'COMPROMISO' : 'COMMITMENT'}</p><p className="mt-1.5 leading-6">{latest.commitments || '—'}</p></div>
                  <div className="rounded-xl bg-[#F7F7F5] p-3.5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p><p className="mt-1.5 leading-6">{latest.nextAction || '—'}</p></div>
                </div>
              </section>
            )}

            <section className="rounded-2xl border border-black/10 bg-[#111413] p-5 text-white md:p-6">
              <div className="flex items-start gap-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.08]"><UserRound className="h-5 w-5 text-white/75" /></div>
                <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/40">OUTCOME MEMORY</p><p className="mt-2 text-sm leading-6 text-white/70">{language === 'es' ? 'Cada sesión añade una nueva capa a la relación: situación → intervención → comportamiento → resultado.' : 'Each session adds another layer to the relationship: situation → intervention → behavior → outcome.'}</p></div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
