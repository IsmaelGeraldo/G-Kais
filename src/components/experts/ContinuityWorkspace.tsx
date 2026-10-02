import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarCheck2,
  CheckCircle2,
  ChevronDown,
  HeartHandshake,
  Search,
  Sparkles,
  UsersRound
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { continuityReasonLabel } from '../../services/expertsContinuity';
import {
  candidateLabel,
  contactPermissionLabel,
  engagementLabel,
  nurtureState,
  saveNurtureReview,
  type ContactPermission,
  type NurtureCandidate,
  type NurtureEngagement,
  type NurtureState
} from '../../services/expertsNurture';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type Props = { language: Language };
type EngagementKey = 'learning' | 'communityActivity' | 'youtubeActivity';
type Draft = {
  learning: NurtureEngagement;
  communityActivity: NurtureEngagement;
  youtubeActivity: NurtureEngagement;
  candidate: NurtureCandidate;
  reviewNote: string;
  contactPermission: ContactPermission;
  nextActionType: NurtureState['nextActionType'];
  nextActionDate: string;
  nextActionTime: string;
  assigneeUid: string;
};

const ENGAGEMENT: NurtureEngagement[] = ['unknown', 'none', 'low', 'medium', 'high'];
const CANDIDATES: NurtureCandidate[] = ['not-yet', 'course', 'scholarship', 'high-potential', 'not-interested'];
const PERMISSIONS: ContactPermission[] = ['unknown', 'confirmed', 'declined'];

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

function dueLabel(state: NurtureState, language: Language) {
  if (!state.nextActionDate) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${state.nextActionDate}T${state.nextActionTime || '12:00'}:00`);
  if (!Number.isFinite(date.getTime())) return state.nextActionDate;
  const label = new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { day: '2-digit', month: 'short' }).format(date);
  return `${label}${state.nextActionTime ? ` · ${state.nextActionTime}` : ''}`;
}

function initialDraft(person: ExpertPerson, currentUid: string): Draft {
  const state = nurtureState(person);
  return {
    learning: state.learning,
    communityActivity: state.communityActivity,
    youtubeActivity: state.youtubeActivity,
    candidate: state.candidate,
    reviewNote: state.reviewNote,
    contactPermission: state.contactPermission,
    nextActionType: state.nextActionType,
    nextActionDate: state.nextActionDate,
    nextActionTime: state.nextActionTime,
    assigneeUid: state.nextActionOwnerUid || currentUid
  };
}

export function ContinuityWorkspace({ language }: Props) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [activeId, setActiveId] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [savingId, setSavingId] = useState('');

  useEffect(() => {
    let stopPeople: (() => void) | undefined;
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
    }).catch(() => {});
    return () => stopPeople?.();
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const activePeople = useMemo(() => people
    .filter((person) => nurtureState(person).status === 'active')
    .sort((a, b) => {
      const aState = nurtureState(a);
      const bState = nurtureState(b);
      const aDue = `${aState.nextActionDate || '9999-12-31'}${aState.nextActionTime || '23:59'}`;
      const bDue = `${bState.nextActionDate || '9999-12-31'}${bState.nextActionTime || '23:59'}`;
      return aDue.localeCompare(bDue);
    }), [people]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return activePeople;
    return activePeople.filter((person) => {
      const state = nurtureState(person);
      return [person.name, person.email, person.phone, state.reasonNote, candidateLabel(state.candidate, language)]
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [activePeople, language, search]);

  const metrics = useMemo(() => ({
    active: activePeople.length,
    course: activePeople.filter((person) => ['course', 'high-potential'].includes(nurtureState(person).candidate)).length,
    scholarship: activePeople.filter((person) => nurtureState(person).candidate === 'scholarship').length,
    contactable: activePeople.filter((person) => nurtureState(person).contactPermission === 'confirmed').length
  }), [activePeople]);

  const openWork = (person: ExpertPerson) => {
    if (activeId === person.id) { setActiveId(''); return; }
    setDrafts((current) => ({ ...current, [person.id]: current[person.id] || initialDraft(person, currentUid) }));
    setActiveId(person.id);
  };

  const patchDraft = (person: ExpertPerson, patch: Partial<Draft>) => {
    setDrafts((current) => ({
      ...current,
      [person.id]: { ...(current[person.id] || initialDraft(person, currentUid)), ...patch }
    }));
  };

  const save = async (person: ExpertPerson) => {
    const draft = drafts[person.id] || initialDraft(person, currentUid);
    const assignee = members.find((member) => member.uid === draft.assigneeUid) || members.find((member) => member.uid === currentUid) || members[0];
    if (!assignee) return;
    if (draft.candidate !== 'not-interested' && !draft.nextActionDate) {
      setMessage(language === 'es' ? 'Define una próxima fecha antes de guardar el seguimiento.' : 'Set a next date before saving follow-up.');
      return;
    }
    setSavingId(person.id);
    try {
      await saveNurtureReview({
        personId: person.id,
        personName: person.name,
        learning: draft.learning,
        communityActivity: draft.communityActivity,
        youtubeActivity: draft.youtubeActivity,
        candidate: draft.candidate,
        reviewNote: draft.reviewNote,
        contactPermission: draft.contactPermission,
        nextActionType: draft.nextActionType,
        nextActionDate: draft.nextActionDate,
        nextActionTime: draft.nextActionTime,
        assignee,
        close: draft.candidate === 'not-interested'
      });
      setActiveId('');
      setMessage(draft.candidate === 'not-interested'
        ? (language === 'es' ? 'Seguimiento cerrado. La persona permanece en el historial de G-Kais.' : 'Follow-up closed. The person remains in G-Kais history.')
        : (language === 'es' ? 'Seguimiento actualizado y próxima acción guardada.' : 'Follow-up updated and next action saved.'));
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar el seguimiento.' : 'Could not save follow-up.');
    } finally { setSavingId(''); }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'SEGUIMIENTO' : 'FOLLOW-UP'}</p><h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Mantén cerca a quienes aceptaron seguir aprendiendo' : 'Keep close the people who chose to keep learning'}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">{language === 'es' ? 'Aquí llegan después del contacto post-webinar. Ya sabemos por qué no compraron y que aceptaron seguir vinculados mediante el Pack gratuito: curso/recursos, comunidad y contenido de YouTube.' : 'People arrive here after post-webinar contact. The non-purchase reason is already known and they accepted the free pack: course/resources, community and YouTube content.'}</p></div><div className="rounded-xl border border-black/8 bg-[#FAFAF8] px-4 py-3 text-xs leading-5 text-black/50"><HeartHandshake className="mr-1.5 inline h-4 w-4" />{language === 'es' ? 'Esta es una segunda mesa de trabajo, no una lista de ventas perdidas.' : 'This is a second work desk, not a lost-sales list.'}</div></div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [language === 'es' ? 'Seguimiento activo' : 'Active follow-up', metrics.active, UsersRound],
        [language === 'es' ? 'Candidatos a curso' : 'Course candidates', metrics.course, Sparkles],
        [language === 'es' ? 'Candidatos a beca' : 'Scholarship candidates', metrics.scholarship, HeartHandshake],
        [language === 'es' ? 'Contacto autorizado' : 'Contact allowed', metrics.contactable, CheckCircle2]
      ].map(([label, value, Icon]) => { const MetricIcon = Icon as React.ComponentType<{ className?: string }>; return <div key={String(label)} className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{String(label)}</p><MetricIcon className="h-4 w-4 text-[#0A3F4D]" /></div><p className="mt-2 text-2xl font-semibold">{Number(value)}</p></div>; })}</div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/7 bg-[#FAFAF8] p-4 md:flex-row md:items-center md:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'RELACIONES EN SEGUIMIENTO' : 'RELATIONSHIPS IN FOLLOW-UP'}</p><p className="mt-1 text-xs text-black/35">{language === 'es' ? 'Revisa aprendizaje, actividad y próxima oportunidad.' : 'Review learning, activity and the next opportunity.'}</p></div><label className="relative block md:w-[350px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar persona…' : 'Search person…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label></div>
      <div className="max-h-[760px] divide-y divide-black/5 overflow-y-auto">{filtered.map((person) => {
        const state = nurtureState(person);
        const opened = activeId === person.id;
        const draft = drafts[person.id] || initialDraft(person, currentUid);
        const engagementFields: Array<{ label: string; key: EngagementKey }> = [
          { label: language === 'es' ? 'Aprendizaje / curso' : 'Learning / course', key: 'learning' },
          { label: language === 'es' ? 'Actividad comunidad' : 'Community activity', key: 'communityActivity' },
          { label: language === 'es' ? 'YouTube / contenido' : 'YouTube / content', key: 'youtubeActivity' }
        ];
        return <div key={person.id} className="p-4 md:p-5">
          <div className="grid gap-3 lg:grid-cols-[minmax(230px,1fr)_150px_170px_150px_auto] lg:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{person.name}</p>{state.contactPermission === 'confirmed' && <span className="rounded-full bg-[#1E7A4D]/10 px-2 py-0.5 text-[9px] font-semibold text-[#17603D]">{language === 'es' ? 'OFERTAS OK' : 'OFFERS OK'}</span>}</div><p className="mt-1 truncate text-xs text-black/40">{person.email || person.phone || '—'}</p><p className="mt-1 text-[10px] text-black/35">{language === 'es' ? 'Motivo inicial: ' : 'Initial reason: '}{continuityReasonLabel(state.reason, language)}{state.reasonNote ? ` · ${state.reasonNote}` : ''}</p></div><div><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'CANDIDATO' : 'CANDIDATE'}</p><p className="mt-1 text-xs font-semibold">{candidateLabel(state.candidate, language)}</p></div><div><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PRÓXIMA ACCIÓN' : 'NEXT ACTION'}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-black/55"><CalendarCheck2 className="h-3.5 w-3.5" />{dueLabel(state, language)}</p></div><div><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESPONSABLE' : 'OWNER'}</p><p className="mt-1 truncate text-xs text-black/55">{state.nextActionOwnerName || '—'}</p></div><button type="button" onClick={() => openWork(person)} className="inline-flex items-center justify-center gap-1.5 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}<ChevronDown className={`h-3.5 w-3.5 transition ${opened ? 'rotate-180' : ''}`} /></button></div>

          {opened && <div className="mt-4 rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? '¿QUÉ TANTO ESTÁ APROVECHANDO EL PACK GRATUITO?' : 'HOW MUCH VALUE IS THE FREE PACK CREATING?'}</p><div className="mt-3 grid gap-2 sm:grid-cols-3">{engagementFields.map(({ label, key }) => <label key={key}><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{label}</span><select value={draft[key]} onChange={(event) => patchDraft(person, { [key]: event.target.value as NurtureEngagement } as Pick<Draft, EngagementKey>)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{ENGAGEMENT.map((item) => <option key={item} value={item}>{engagementLabel(item, language)}</option>)}</select></label>)}</div><label className="mt-3 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? '¿QUÉ HA APRENDIDO / QUÉ CAMBIÓ?' : 'WHAT HAS BEEN LEARNED / WHAT CHANGED?'}</span><textarea value={draft.reviewNote} onChange={(event) => patchDraft(person, { reviewNote: event.target.value })} rows={3} placeholder={language === 'es' ? 'Registra señales concretas, preguntas, resultados o participación.' : 'Record concrete signals, questions, outcomes or participation.'} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'DECISIÓN Y PRÓXIMO PASO' : 'DECISION & NEXT STEP'}</p><div className="mt-3 grid gap-2"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'POTENCIAL' : 'POTENTIAL'}</span><select value={draft.candidate} onChange={(event) => patchDraft(person, { candidate: event.target.value as NurtureCandidate })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{CANDIDATES.map((item) => <option key={item} value={item}>{candidateLabel(item, language)}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PERMISO PARA CONTACTO / OFERTAS' : 'CONTACT / OFFER PERMISSION'}</span><select value={draft.contactPermission} onChange={(event) => patchDraft(person, { contactPermission: event.target.value as ContactPermission })} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{PERMISSIONS.map((item) => <option key={item} value={item}>{contactPermissionLabel(item, language)}</option>)}</select></label>{draft.candidate !== 'not-interested' && <div className="grid gap-2 sm:grid-cols-2"><select value={draft.nextActionType} onChange={(event) => patchDraft(person, { nextActionType: event.target.value as NurtureState['nextActionType'] })} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><select value={draft.assigneeUid} onChange={(event) => patchDraft(person, { assigneeUid: event.target.value })} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select><input type="date" value={draft.nextActionDate} onChange={(event) => patchDraft(person, { nextActionDate: event.target.value })} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input type="time" value={draft.nextActionTime} onChange={(event) => patchDraft(person, { nextActionTime: event.target.value })} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></div>}</div><div className="mt-4 flex justify-end"><button type="button" disabled={savingId === person.id} onClick={() => void save(person)} className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40 ${draft.candidate === 'not-interested' ? 'bg-[#8D332C]' : 'bg-[#111413]'}`}><CheckCircle2 className="h-3.5 w-3.5" />{savingId === person.id ? (language === 'es' ? 'Guardando…' : 'Saving…') : draft.candidate === 'not-interested' ? (language === 'es' ? 'Cerrar seguimiento' : 'Close follow-up') : (language === 'es' ? 'Guardar próxima acción' : 'Save next action')}</button></div></div></div></div>}
        </div>;
      })}{filtered.length === 0 && <div className="p-10 text-center text-sm text-black/35">{language === 'es' ? 'No hay personas activas en Seguimiento.' : 'No people are active in Follow-up.'}</div>}</div>
    </section>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
