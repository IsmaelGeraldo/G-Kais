import React, { useMemo, useState } from 'react';
import { CheckCircle2, HeartHandshake } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import type { ExpertPerson } from '../../services/expertsAcquisition';
import { continuityReasonLabel, type NoPurchaseReason } from '../../services/expertsContinuity';
import { scheduleExpertFollowUpTask, type FollowUpActionType } from '../../services/expertsFollowUpTasks';
import {
  candidateLabel,
  contactPermissionLabel,
  engagementLabel,
  nurtureState,
  resolveWebinarNoPurchaseContact,
  saveNurtureReview,
  type ContactPermission,
  type NurtureCandidate,
  type NurtureEngagement
} from '../../services/expertsNurture';
import type { WorkspaceMember } from '../../services/expertsWorkspaceCore';

export type FollowUpTaskShape = {
  id: string;
  clientName: string;
  personId?: string;
  source?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: string;
};

type Props = {
  task: FollowUpTaskShape;
  person: ExpertPerson;
  assignee: WorkspaceMember;
  language: Language;
  onCompleted: (result: string) => void;
};

const REASONS: NoPurchaseReason[] = ['unknown', 'budget', 'timing', 'needs-trust', 'decision', 'not-fit', 'not-interested', 'other'];
const PERMISSIONS: ContactPermission[] = ['unknown', 'confirmed', 'declined'];
const ENGAGEMENT: NurtureEngagement[] = ['unknown', 'none', 'low', 'medium', 'high'];
const CANDIDATES: NurtureCandidate[] = ['not-yet', 'course', 'scholarship', 'high-potential', 'not-interested'];

export function FollowUpTaskPanel({ task, person, assignee, language, onCompleted }: Props) {
  const isInitialWebinarContact = task.sourceActionKind === 'follow-up' && task.source === 'webinar';
  const current = useMemo(() => nurtureState(person), [person]);
  const [reason, setReason] = useState<NoPurchaseReason>(current.reason || 'unknown');
  const [reasonNote, setReasonNote] = useState(current.reasonNote || '');
  const [decision, setDecision] = useState<'nurture' | 'closed'>('nurture');
  const [permission, setPermission] = useState<ContactPermission>(current.contactPermission || 'unknown');
  const [learning, setLearning] = useState<NurtureEngagement>(current.learning);
  const [communityActivity, setCommunityActivity] = useState<NurtureEngagement>(current.communityActivity);
  const [youtubeActivity, setYoutubeActivity] = useState<NurtureEngagement>(current.youtubeActivity);
  const [candidate, setCandidate] = useState<NurtureCandidate>(current.candidate);
  const [reviewNote, setReviewNote] = useState(current.reviewNote || '');
  const [nextActionType, setNextActionType] = useState<FollowUpActionType>(current.nextActionType || 'whatsapp');
  const [nextActionDate, setNextActionDate] = useState(current.nextActionDate || '');
  const [nextActionTime, setNextActionTime] = useState(current.nextActionTime || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const scheduleNext = async (title: string, note: string) => {
    if (!nextActionDate) return;
    await scheduleExpertFollowUpTask({
      person,
      assignee,
      type: nextActionType,
      dueDate: nextActionDate,
      dueTime: nextActionTime,
      title,
      note,
      sourceId: task.sourceId || person.id
    });
  };

  const resolveInitial = async () => {
    if (!task.personId || !task.sourceRegistrationId || !task.sourceId) {
      setMessage(language === 'es' ? 'Falta contexto del webinar.' : 'Webinar context is missing.');
      return;
    }
    if (reason === 'unknown') {
      setMessage(language === 'es' ? 'Registra primero por qué no compró.' : 'Record why the person did not purchase.');
      return;
    }
    if (decision === 'nurture' && !nextActionDate) {
      setMessage(language === 'es' ? 'Define la próxima fecha de seguimiento.' : 'Set the next follow-up date.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const result = await resolveWebinarNoPurchaseContact({
        taskId: task.id,
        registrationId: task.sourceRegistrationId,
        personId: task.personId,
        webinarId: task.sourceId,
        personName: person.name,
        reason,
        reasonNote,
        decision,
        assignee,
        nextActionType,
        nextActionDate,
        nextActionTime,
        contactPermission: permission,
        language
      });
      if (decision === 'nurture') {
        await scheduleNext(
          language === 'es' ? 'Seguimiento de Pack gratuito' : 'Free pack follow-up',
          language === 'es' ? 'Revisar aprendizaje, actividad en comunidad y contenido antes de definir una nueva oportunidad.' : 'Review learning, community activity and content before defining a new opportunity.'
        );
      }
      onCompleted(result);
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar el resultado.' : 'Could not save the outcome.');
    } finally {
      setBusy(false);
    }
  };

  const saveReview = async () => {
    const closes = candidate === 'not-interested';
    if (!closes && !nextActionDate) {
      setMessage(language === 'es' ? 'Define una próxima fecha.' : 'Set a next date.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      await saveNurtureReview({
        personId: person.id,
        personName: person.name,
        learning,
        communityActivity,
        youtubeActivity,
        candidate,
        reviewNote,
        contactPermission: permission,
        nextActionType,
        nextActionDate,
        nextActionTime,
        assignee,
        close: closes
      });
      if (!closes) {
        await scheduleNext(
          language === 'es' ? 'Seguimiento de continuidad' : 'Relationship follow-up',
          reviewNote || (language === 'es' ? 'Revisar evolución y próxima oportunidad.' : 'Review progress and next opportunity.')
        );
      }
      const result = closes
        ? (language === 'es' ? 'Seguimiento cerrado · sin interés actual.' : 'Follow-up closed · no current interest.')
        : `${language === 'es' ? 'Seguimiento actualizado' : 'Follow-up updated'} · ${candidateLabel(candidate, language)}.`;
      onCompleted(result);
    } catch {
      setMessage(language === 'es' ? 'No se pudo actualizar el seguimiento.' : 'Could not update follow-up.');
    } finally {
      setBusy(false);
    }
  };

  if (isInitialWebinarContact) {
    return <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.05]"><HeartHandshake className="h-4 w-4" /></div>
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">{language === 'es' ? 'NO COMPRÓ · PRIMER CONTACTO' : 'NO PURCHASE · FIRST CONTACT'}</p><p className="mt-1 text-sm font-semibold">{language === 'es' ? 'Entiende el motivo y decide si entra al seguimiento de continuidad.' : 'Understand the reason and decide whether to continue the relationship.'}</p></div>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? '¿POR QUÉ NO COMPRÓ?' : 'WHY NO PURCHASE?'}</span><select value={reason} onChange={(e) => setReason(e.target.value as NoPurchaseReason)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{REASONS.map((item) => <option key={item} value={item}>{continuityReasonLabel(item, language)}</option>)}</select></label>
        <label className="xl:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'CONTEXTO' : 'CONTEXT'}</span><input value={reasonNote} onChange={(e) => setReasonNote(e.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" placeholder={language === 'es' ? 'Ej. le interesa, pero hoy no tiene presupuesto' : 'E.g. interested, but budget is unavailable now'} /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO' : 'OUTCOME'}</span><select value={decision} onChange={(e) => setDecision(e.target.value as 'nurture' | 'closed')} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="nurture">{language === 'es' ? 'Acepta seguir vinculado' : 'Continue relationship'}</option><option value="closed">{language === 'es' ? 'No está interesado' : 'Not interested'}</option></select></label>
      </div>

      {decision === 'nurture' && <div className="mt-4 rounded-xl bg-[#F7F7F5] p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'PACK GRATUITO' : 'FREE PACK'}</p><p className="mt-1 text-xs text-black/50">{language === 'es' ? 'Curso/recursos + comunidad + YouTube/contenido abierto.' : 'Course/resources + community + YouTube/open content.'}</p></div>
          <label className="min-w-[190px]"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PERMISO DE CONTACTO' : 'CONTACT PERMISSION'}</span><select value={permission} onChange={(e) => setPermission(e.target.value as ContactPermission)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{PERMISSIONS.map((item) => <option key={item} value={item}>{contactPermissionLabel(item, language)}</option>)}</select></label>
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={nextActionType} onChange={(e) => setNextActionType(e.target.value as FollowUpActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input type="time" value={nextActionTime} onChange={(e) => setNextActionTime(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></div>
      </div>}

      <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={() => void resolveInitial()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar resultado' : 'Save outcome')}</button></div>
      {message && <p className="mt-2 text-xs text-[#8D332C]">{message}</p>}
    </div>;
  }

  return <div className="rounded-xl border border-black/10 bg-white p-4">
    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'REVISIÓN DE SEGUIMIENTO' : 'FOLLOW-UP REVIEW'}</p>
    <p className="mt-1 text-sm font-semibold">{language === 'es' ? 'Evalúa valor recibido, actividad y próxima oportunidad.' : 'Review value received, activity and the next opportunity.'}</p>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'APRENDIZAJE' : 'LEARNING'}</span><select value={learning} onChange={(e) => setLearning(e.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{ENGAGEMENT.map((item) => <option key={item} value={item}>{engagementLabel(item, language)}</option>)}</select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'COMUNIDAD' : 'COMMUNITY'}</span><select value={communityActivity} onChange={(e) => setCommunityActivity(e.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{ENGAGEMENT.map((item) => <option key={item} value={item}>{engagementLabel(item, language)}</option>)}</select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">YOUTUBE / CONTENIDO</span><select value={youtubeActivity} onChange={(e) => setYoutubeActivity(e.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{ENGAGEMENT.map((item) => <option key={item} value={item}>{engagementLabel(item, language)}</option>)}</select></label>
    </div>
    <div className="mt-3 grid gap-3 md:grid-cols-2">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'POTENCIAL' : 'POTENTIAL'}</span><select value={candidate} onChange={(e) => setCandidate(e.target.value as NurtureCandidate)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{CANDIDATES.map((item) => <option key={item} value={item}>{candidateLabel(item, language)}</option>)}</select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PERMISO DE CONTACTO' : 'CONTACT PERMISSION'}</span><select value={permission} onChange={(e) => setPermission(e.target.value as ContactPermission)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{PERMISSIONS.map((item) => <option key={item} value={item}>{contactPermissionLabel(item, language)}</option>)}</select></label>
    </div>
    <label className="mt-3 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'QUÉ APRENDIÓ / QUÉ CAMBIÓ' : 'WHAT CHANGED / WHAT WAS LEARNED'}</span><textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} rows={2} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
    {candidate !== 'not-interested' && <div className="mt-3 grid gap-2 sm:grid-cols-3"><select value={nextActionType} onChange={(e) => setNextActionType(e.target.value as FollowUpActionType)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><input type="date" value={nextActionDate} onChange={(e) => setNextActionDate(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input type="time" value={nextActionTime} onChange={(e) => setNextActionTime(e.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></div>}
    <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={() => void saveReview()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar y programar siguiente' : 'Save & schedule next')}</button></div>
    {message && <p className="mt-2 text-xs text-[#8D332C]">{message}</p>}
  </div>;
}
