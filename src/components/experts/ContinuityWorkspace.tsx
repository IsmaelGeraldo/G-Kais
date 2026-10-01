import React, { useEffect, useMemo, useState } from 'react';
import {
  CircleDollarSign,
  HeartHandshake,
  Search,
  Sparkles,
  UsersRound
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  subscribeExpertPeople,
  subscribeExpertWebinars,
  type ExpertPerson,
  type ExpertWebinar,
  type WebinarRegistration
} from '../../services/expertsAcquisition';
import {
  continuityPathLabel,
  continuityReasonLabel,
  continuityState,
  saveWebinarContinuity,
  subscribeAllWebinarRegistrations,
  suggestedContinuityPath,
  type ContinuityPath,
  type NoPurchaseReason
} from '../../services/expertsContinuity';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type Props = { language: Language };
type Draft = { reason: NoPurchaseReason; path: ContinuityPath; note: string };

const REASONS: NoPurchaseReason[] = ['unknown', 'budget', 'timing', 'needs-trust', 'decision', 'not-fit', 'not-interested', 'other'];
const PATHS: ContinuityPath[] = ['community', 'youtube', 'free-resources', 'future-offer', 'scholarship', 'history-only'];

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

function interestLabel(value: WebinarRegistration['interest'], language: Language) {
  if (value === 'high') return language === 'es' ? 'Interés alto' : 'High interest';
  if (value === 'medium') return language === 'es' ? 'Interés medio' : 'Medium interest';
  if (value === 'low') return language === 'es' ? 'Interés bajo' : 'Low interest';
  return language === 'es' ? 'Interés sin definir' : 'Interest unknown';
}

export function ContinuityWorkspace({ language }: Props) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [webinars, setWebinars] = useState<ExpertWebinar[]>([]);
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let stopPeople: (() => void) | undefined;
    let stopWebinars: (() => void) | undefined;
    let stopRegistrations: (() => void) | undefined;
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void subscribeExpertWebinars(setWebinars).then((stop) => { stopWebinars = stop; });
    void subscribeAllWebinarRegistrations(setRegistrations).then((stop) => { stopRegistrations = stop; });
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
    }).catch(() => {});
    return () => {
      stopPeople?.();
      stopWebinars?.();
      stopRegistrations?.();
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const webinarsById = useMemo(() => new Map(webinars.map((webinar) => [webinar.id, webinar])), [webinars]);
  const candidates = useMemo(() => registrations
    .filter((registration) => !registration.purchased && (registration.status === 'attended' || registration.status === 'no-show'))
    .filter((registration) => peopleById.has(registration.personId) && webinarsById.has(registration.webinarId)), [peopleById, registrations, webinarsById]);

  useEffect(() => {
    setDrafts((current) => {
      const next = { ...current };
      candidates.forEach((registration) => {
        if (next[registration.id]) return;
        const person = peopleById.get(registration.personId);
        if (!person) return;
        const saved = continuityState(person, registration.webinarId);
        next[registration.id] = { reason: saved.reason, path: saved.path, note: saved.note };
      });
      return next;
    });
  }, [candidates, peopleById]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return candidates;
    return candidates.filter((registration) => {
      const person = peopleById.get(registration.personId);
      const webinar = webinarsById.get(registration.webinarId);
      return [person?.name || '', person?.email || '', person?.phone || '', webinar?.title || '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [candidates, peopleById, search, webinarsById]);

  const metrics = useMemo(() => {
    let missingReason = 0;
    let active = 0;
    let budget = 0;
    candidates.forEach((registration) => {
      const person = peopleById.get(registration.personId);
      if (!person) return;
      const state = continuityState(person, registration.webinarId);
      if (state.reason === 'unknown') missingReason += 1;
      if (state.status === 'active') active += 1;
      if (state.reason === 'budget') budget += 1;
    });
    return { total: candidates.length, missingReason, active, budget };
  }, [candidates, peopleById]);

  const setDraft = (registrationId: string, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [registrationId]: { reason: 'unknown', path: 'history-only', note: '', ...(current[registrationId] || {}), ...patch }
    }));
  };

  const save = async (registration: WebinarRegistration) => {
    const person = peopleById.get(registration.personId);
    const webinar = webinarsById.get(registration.webinarId);
    const draft = drafts[registration.id];
    const assignee = members.find((member) => member.uid === currentUid) || members[0];
    if (!person || !webinar || !draft || !assignee) return;
    if (draft.reason === 'unknown') {
      setMessage(language === 'es' ? 'Primero registra por qué no compró.' : 'First record why the person did not purchase.');
      return;
    }
    setSavingId(registration.id);
    try {
      const result = await saveWebinarContinuity({
        registration,
        person,
        webinar,
        reason: draft.reason,
        note: draft.note,
        path: draft.path,
        assignee,
        language
      });
      setMessage(result.status === 'active'
        ? (language === 'es' ? 'Continuidad guardada y enviada a Trabajo prioritario.' : 'Continuity saved and sent to Priority Work.')
        : (language === 'es' ? 'Motivo guardado en el historial de la persona.' : 'Reason saved in the person history.'));
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar la continuidad.' : 'Could not save continuity.');
    } finally {
      setSavingId('');
    }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'CONTINUIDAD' : 'CONTINUITY'}</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'No comprar no significa perder la relación' : 'No purchase does not mean losing the relationship'}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">{language === 'es'
            ? 'Registra el motivo real y decide cómo seguir aportando valor: comunidad gratuita, contenido, recursos, una oportunidad futura o un posible cupo/beca.'
            : 'Record the real reason and choose how to keep providing value: free community, content, resources, a future opportunity or a possible scholarship/seat.'}</p>
        </div>
        <div className="rounded-xl bg-[#F7F7F5] px-4 py-3 text-xs leading-5 text-black/50">{language === 'es'
          ? 'Usa solo canales y comunidades donde la persona haya aceptado recibir comunicaciones.'
          : 'Use only channels and communities where the person has agreed to receive communications.'}</div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [language === 'es' ? 'No compradores' : 'Non-buyers', metrics.total, UsersRound],
          [language === 'es' ? 'Motivo pendiente' : 'Reason missing', metrics.missingReason, Search],
          [language === 'es' ? 'Continuidad activa' : 'Active continuity', metrics.active, HeartHandshake],
          [language === 'es' ? 'Freno económico' : 'Budget barrier', metrics.budget, CircleDollarSign]
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{String(label)}</p><MetricIcon className="h-4 w-4 text-[#0A3F4D]" /></div><p className="mt-2 text-2xl font-semibold">{Number(value)}</p></div>;
        })}
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="border-b border-black/7 bg-[#FAFAF8] p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'PERSONAS POR MANTENER CERCA' : 'PEOPLE TO KEEP CLOSE'}</p><p className="mt-1 text-xs text-black/35">{language === 'es' ? 'Asistieron o fueron no-show y no registran compra.' : 'Attended or no-show with no recorded purchase.'}</p></div><label className="relative block md:w-[330px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar persona o webinar…' : 'Search person or webinar…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label></div></div>

      <div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{filtered.map((registration) => {
        const person = peopleById.get(registration.personId)!;
        const webinar = webinarsById.get(registration.webinarId)!;
        const saved = continuityState(person, registration.webinarId);
        const draft = drafts[registration.id] || { reason: saved.reason, path: saved.path, note: saved.note };
        return <div key={registration.id} className="p-4 md:p-5">
          <div className="grid gap-4 xl:grid-cols-[minmax(220px,0.8fr)_minmax(220px,0.8fr)_minmax(250px,1fr)_minmax(250px,1fr)_auto] xl:items-end">
            <div className="min-w-0"><div className="flex items-center gap-2"><p className="truncate text-sm font-semibold">{person.name}</p>{saved.status === 'active' && <span className="rounded-full bg-[#0A3F4D]/8 px-2 py-1 text-[9px] font-semibold text-[#0A3F4D]">{language === 'es' ? 'Continuidad activa' : 'Active'}</span>}</div><p className="mt-1 truncate text-xs text-black/38">{person.email || person.phone || '—'}</p><p className="mt-2 text-[10px] text-black/35">{webinar.title} · {registration.status === 'attended' ? (language === 'es' ? 'Asistió' : 'Attended') : 'No-show'} · {interestLabel(registration.interest, language)}</p></div>

            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? '¿POR QUÉ NO COMPRÓ?' : 'WHY NO PURCHASE?'}</span><select value={draft.reason} onChange={(event) => { const reason = event.target.value as NoPurchaseReason; setDraft(registration.id, { reason, path: suggestedContinuityPath(reason) }); }} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs">{REASONS.map((reason) => <option key={reason} value={reason}>{continuityReasonLabel(reason, language)}</option>)}</select></label>

            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RUTA DE CONTINUIDAD' : 'CONTINUITY PATH'}</span><select value={draft.path} onChange={(event) => setDraft(registration.id, { path: event.target.value as ContinuityPath })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs">{PATHS.map((path) => <option key={path} value={path}>{continuityPathLabel(path, language)}</option>)}</select></label>

            <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'CONTEXTO / NOTA' : 'CONTEXT / NOTE'}</span><input value={draft.note} onChange={(event) => setDraft(registration.id, { note: event.target.value })} placeholder={language === 'es' ? 'Ej. quiere entrar cuando mejore caja en diciembre' : 'E.g. wants to join when cash flow improves in December'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-xs" /></label>

            <button type="button" disabled={savingId === registration.id} onClick={() => void save(registration)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><Sparkles className="h-3.5 w-3.5" />{savingId === registration.id ? (language === 'es' ? 'Guardando…' : 'Saving…') : draft.path === 'history-only' ? (language === 'es' ? 'Guardar motivo' : 'Save reason') : (language === 'es' ? 'Activar continuidad' : 'Activate continuity')}</button>
          </div>
        </div>;
      })}{filtered.length === 0 && <div className="p-10 text-center text-sm text-black/35">{language === 'es' ? 'No hay personas pendientes de continuidad con este filtro.' : 'No continuity candidates match this filter.'}</div>}</div>
    </section>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
