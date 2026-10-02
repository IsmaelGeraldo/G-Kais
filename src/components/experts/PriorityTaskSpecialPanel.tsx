import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, HeartHandshake } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  continuityReasonLabel,
  type NoPurchaseReason
} from '../../services/expertsContinuity';
import {
  enrollExpertPerson,
  subscribeExpertCohorts,
  subscribeExpertFormations,
  type ExpertCohort,
  type ExpertFormation
} from '../../services/expertsFormations';
import {
  contactPermissionLabel,
  resolveWebinarNoPurchaseContact,
  type ContactPermission,
  type NurtureState
} from '../../services/expertsNurture';
import { markWebinarWorkActionCompleted } from '../../services/expertsWebinarActions';
import type { WorkspaceMember } from '../../services/expertsWorkspaceCore';

export type PrioritySpecialTask = {
  id: string;
  clientName: string;
  personId?: string;
  title: string;
  source?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: string;
};

type Props = {
  task: PrioritySpecialTask;
  language: Language;
  assignee: WorkspaceMember;
  onCompleted: (result: string) => void;
};

const REASONS: NoPurchaseReason[] = ['unknown', 'budget', 'timing', 'needs-trust', 'decision', 'not-fit', 'not-interested', 'other'];
const PERMISSIONS: ContactPermission[] = ['unknown', 'confirmed', 'declined'];

function normalize(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function offerFromTask(task: PrioritySpecialTask): string {
  const esPrefix = 'Integrar a ';
  const enPrefix = 'Enroll in ';
  if (task.title.startsWith(esPrefix)) return task.title.slice(esPrefix.length).trim();
  if (task.title.startsWith(enPrefix)) return task.title.slice(enPrefix.length).trim();
  return '';
}

export function PriorityTaskSpecialPanel({ task, language, assignee, onCompleted }: Props) {
  const isEnrollment = task.sourceActionKind === 'enrollment';
  const isNoPurchase = task.sourceActionKind === 'follow-up' && task.source === 'webinar';
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [formationId, setFormationId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [reason, setReason] = useState<NoPurchaseReason>('unknown');
  const [reasonNote, setReasonNote] = useState('');
  const [decision, setDecision] = useState<'nurture' | 'closed'>('nurture');
  const [permission, setPermission] = useState<ContactPermission>('unknown');
  const [nextActionType, setNextActionType] = useState<NurtureState['nextActionType']>('whatsapp');
  const [nextActionDate, setNextActionDate] = useState('');
  const [nextActionTime, setNextActionTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isEnrollment) return;
    let stopFormations: (() => void) | undefined;
    let stopCohorts: (() => void) | undefined;
    void subscribeExpertFormations(setFormations).then((stop) => { stopFormations = stop; });
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; });
    return () => { stopFormations?.(); stopCohorts?.(); };
  }, [isEnrollment]);

  const activeFormations = useMemo(() => formations.filter((item) => item.status === 'active'), [formations]);
  const availableCohorts = useMemo(() => cohorts.filter((item) => item.formationId === formationId && (item.status === 'active' || item.status === 'planned')), [cohorts, formationId]);

  useEffect(() => {
    if (!isEnrollment || formationId || !activeFormations.length) return;
    const offer = offerFromTask(task);
    const matching = offer ? activeFormations.find((item) => normalize(item.title) === normalize(offer)) : undefined;
    setFormationId((matching || activeFormations[0]).id);
  }, [activeFormations, formationId, isEnrollment, task]);

  useEffect(() => {
    if (!isEnrollment) return;
    if (!availableCohorts.some((item) => item.id === cohortId)) {
      setCohortId(availableCohorts.find((item) => item.status === 'active')?.id || availableCohorts[0]?.id || '');
    }
  }, [availableCohorts, cohortId, isEnrollment]);

  const integratePurchase = async () => {
    if (!task.personId || !formationId || !cohortId) {
      setMessage(language === 'es' ? 'Selecciona una formación y una cohorte.' : 'Select a formation and cohort.');
      return;
    }
    setBusy(true);
    try {
      await enrollExpertPerson({ personId: task.personId, formationId, cohortId, status: 'active', progress: 0 });
      const formation = formations.find((item) => item.id === formationId);
      const cohort = cohorts.find((item) => item.id === cohortId);
      const result = language === 'es'
        ? `Integrado en ${formation?.title || 'formación'} · ${cohort?.title || 'cohorte'}.`
        : `Enrolled in ${formation?.title || 'formation'} · ${cohort?.title || 'cohort'}.`;
      if (task.sourceRegistrationId && task.personId) {
        await markWebinarWorkActionCompleted({
          registrationId: task.sourceRegistrationId,
          personId: task.personId,
          result,
          kind: 'enrollment',
          taskId: task.id
        });
      }
      onCompleted(result);
    } catch {
      setMessage(language === 'es' ? 'No se pudo completar la matrícula.' : 'Could not complete enrollment.');
    } finally { setBusy(false); }
  };

  const resolveNoPurchase = async () => {
    if (!task.personId || !task.sourceRegistrationId || !task.sourceId) {
      setMessage(language === 'es' ? 'Falta contexto del webinar para completar este seguimiento.' : 'Webinar context is missing for this follow-up.');
      return;
    }
    if (reason === 'unknown') {
      setMessage(language === 'es' ? 'Primero registra por qué no compró.' : 'First record why the person did not purchase.');
      return;
    }
    if (decision === 'nurture' && !nextActionDate) {
      setMessage(language === 'es' ? 'Define la fecha de la próxima acción.' : 'Set the next action date.');
      return;
    }
    setBusy(true);
    try {
      const result = await resolveWebinarNoPurchaseContact({
        taskId: task.id,
        registrationId: task.sourceRegistrationId,
        personId: task.personId,
        webinarId: task.sourceId,
        personName: task.clientName,
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
      onCompleted(result);
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar el resultado del contacto.' : 'Could not save contact outcome.');
    } finally { setBusy(false); }
  };

  if (isEnrollment) {
    return <div className="rounded-xl border border-[#1E7A4D]/15 bg-white p-4">
      <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1E7A4D]/10 text-[#17603D]"><GraduationCap className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#17603D]">{language === 'es' ? 'COMPRA CONFIRMADA' : 'PURCHASE CONFIRMED'}</p><h4 className="mt-1 text-sm font-semibold">{language === 'es' ? 'Integrar directamente a una formación y grupo' : 'Enroll directly into a formation and cohort'}</h4></div></div>
      <div className="mt-4 grid gap-2 md:grid-cols-2"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'FORMACIÓN ACTIVA' : 'ACTIVE FORMATION'}</span><select value={formationId} onChange={(event) => setFormationId(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>{activeFormations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'GRUPO / COHORTE' : 'GROUP / COHORT'}</span><select value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar' : 'Select'}</option>{availableCohorts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label></div>
      <div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] text-black/40">{language === 'es' ? 'La matrícula usa el mismo personId; no crea un contacto nuevo.' : 'Enrollment uses the same personId; no new contact is created.'}</p><button type="button" disabled={busy || !formationId || !cohortId} onClick={() => void integratePurchase()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{busy ? (language === 'es' ? 'Integrando…' : 'Enrolling…') : (language === 'es' ? 'Integrar y completar' : 'Enroll & complete')}</button></div>
      {message && <p className="mt-2 text-xs text-[#8D332C]">{message}</p>}
    </div>;
  }

  if (isNoPurchase) {
    return <div className="rounded-xl border border-black/10 bg-white p-4">
      <div className="flex items-start gap-3"><div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-black/[0.05]"><HeartHandshake className="h-4 w-4" /></div><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/45">{language === 'es' ? 'NO COMPRÓ · CONTACTO POST-WEBINAR' : 'NO PURCHASE · POST-WEBINAR CONTACT'}</p><h4 className="mt-1 text-sm font-semibold">{language === 'es' ? 'Entiende el motivo antes de decidir qué hacer con la relación' : 'Understand the reason before deciding the next relationship step'}</h4></div></div>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? '¿POR QUÉ NO COMPRÓ?' : 'WHY NO PURCHASE?'}</span><select value={reason} onChange={(event) => setReason(event.target.value as NoPurchaseReason)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm">{REASONS.map((item) => <option key={item} value={item}>{continuityReasonLabel(item, language)}</option>)}</select></label><label className="md:col-span-1 xl:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'CONTEXTO DEL MOTIVO' : 'REASON CONTEXT'}</span><input value={reasonNote} onChange={(event) => setReasonNote(event.target.value)} placeholder={language === 'es' ? 'Ej. le interesa, pero hoy no tiene presupuesto' : 'E.g. interested, but budget is not available now'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'RESULTADO' : 'OUTCOME'}</span><select value={decision} onChange={(event) => setDecision(event.target.value as 'nurture' | 'closed')} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="nurture">{language === 'es' ? 'Acepta seguir vinculado' : 'Continue relationship'}</option><option value="closed">{language === 'es' ? 'No está interesado' : 'Not interested'}</option></select></label></div>

      {decision === 'nurture' && <div className="mt-4 rounded-xl bg-[#F7F7F5] p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'PACK GRATUITO DE CONTINUIDAD' : 'FREE CONTINUITY PACK'}</p><div className="mt-2 flex flex-wrap gap-2">{[language === 'es' ? 'Curso / recursos gratuitos' : 'Free course / resources', language === 'es' ? 'Comunidad gratuita' : 'Free community', 'YouTube / contenido abierto'].map((item) => <span key={item} className="rounded-full border border-black/8 bg-white px-3 py-1.5 text-[10px] font-semibold text-black/55">{item}</span>)}</div></div><label className="min-w-[190px]"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PERMISO DE CONTACTO' : 'CONTACT PERMISSION'}</span><select value={permission} onChange={(event) => setPermission(event.target.value as ContactPermission)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{PERMISSIONS.map((item) => <option key={item} value={item}>{contactPermissionLabel(item, language)}</option>)}</select></label></div><div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4"><select value={nextActionType} onChange={(event) => setNextActionType(event.target.value as NurtureState['nextActionType'])} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><input type="date" value={nextActionDate} onChange={(event) => setNextActionDate(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input type="time" value={nextActionTime} onChange={(event) => setNextActionTime(event.target.value)} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><div className="flex items-center text-xs text-black/40">{language === 'es' ? 'Después aparecerá en Seguimiento, no como otra venta perdida.' : 'It will then appear in Follow-up, not as another lost sale.'}</div></div></div>}

      <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={() => void resolveNoPurchase()} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : decision === 'nurture' ? (language === 'es' ? 'Guardar y pasar a Seguimiento' : 'Save & move to Follow-up') : (language === 'es' ? 'Cerrar seguimiento' : 'Close follow-up')}</button></div>
      {message && <p className="mt-2 text-xs text-[#8D332C]">{message}</p>}
    </div>;
  }

  return null;
}
