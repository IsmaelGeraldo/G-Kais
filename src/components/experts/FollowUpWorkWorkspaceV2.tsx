import React, { useEffect, useMemo, useState } from 'react';
import { BellRing, CheckCircle2, Inbox, ListTodo, Mail, MessageCircle, Pencil, Phone, Search, Trash2 } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
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
import { hydrateExpertsTaskMemory, persistExpertWorkTask } from '../../services/expertsTaskMemory';
import { appendExpertAuditLog, appendExpertRelationshipEvent, loadExpertWorkspaceTeam, type WorkspaceMember, type WorkspaceTeamState } from '../../services/expertsWorkspaceCore';
import { loadTasks, saveTasks, WORKSPACE_STATE_EVENT, type WorkActionType, type WorkTask } from './workspaceState';

type Segment = 'leads' | 'nurture';
type Lane = 'queue' | 'waiting' | 'replied';
type Interaction = 'queue' | 'waiting-reply' | 'reply-received';
type FollowTask = WorkTask & {
  personId?: string;
  sourceId?: string;
  sourceRegistrationId?: string;
  sourceActionKind?: string;
  assignedToUid?: string;
  assignedToName?: string;
  workstream?: string;
  interactionState?: Interaction;
  awaitingReplySince?: string;
  replyReceivedAt?: string;
  lastInteractionNote?: string;
  completedByUid?: string;
};

const REASONS: NoPurchaseReason[] = ['unknown', 'budget', 'timing', 'needs-trust', 'decision', 'not-fit', 'not-interested', 'other'];
const PERMISSIONS: ContactPermission[] = ['unknown', 'confirmed', 'declined'];
const SIGNALS: NurtureEngagement[] = ['unknown', 'none', 'low', 'medium', 'high'];
const CANDIDATES: NurtureCandidate[] = ['not-yet', 'course', 'scholarship', 'high-potential', 'not-interested'];

function isLead(task: FollowTask) {
  return task.source === 'webinar' && task.sourceActionKind === 'follow-up';
}

function isNurture(task: FollowTask) {
  return task.sourceActionKind === 'continuity' || (task.workstream === 'follow-up' && !isLead(task));
}

function stateOf(task: FollowTask): Interaction {
  return task.interactionState === 'waiting-reply' || task.interactionState === 'reply-received' ? task.interactionState : 'queue';
}

function asyncChannel(task: FollowTask) {
  return task.type === 'whatsapp' || task.type === 'email';
}

function relationshipAlreadyAdvanced(person?: ExpertPerson) {
  return person?.currentStage === 'student' || person?.currentStage === 'alumni' || person?.currentStage === 'mentoring';
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

function actionLabel(type: WorkActionType, language: Language) {
  if (type === 'whatsapp') return 'WhatsApp';
  if (type === 'email') return 'Email';
  if (type === 'call') return language === 'es' ? 'Llamada' : 'Call';
  if (type === 'meeting') return language === 'es' ? 'Reunión' : 'Meeting';
  return language === 'es' ? 'Tarea' : 'Task';
}

function ActionIcon({ type }: { type: WorkActionType }) {
  if (type === 'email') return <Mail className="h-4 w-4" />;
  if (type === 'whatsapp') return <MessageCircle className="h-4 w-4" />;
  if (type === 'call') return <Phone className="h-4 w-4" />;
  return <ListTodo className="h-4 w-4" />;
}

function activeStyle(active: boolean): React.CSSProperties | undefined {
  return active ? {
    background: 'var(--gkais-internal-accent, #111413)',
    color: 'var(--gkais-internal-accent-text, #ffffff)'
  } : undefined;
}

function candidateAction(candidate: NurtureCandidate, language: Language) {
  const es = {
    'not-yet': { title: 'Seguimiento de continuidad', note: 'Mantener la relación y revisar evolución antes de ofrecer una nueva solución.' },
    course: { title: 'Contactar por formación', note: 'Existe señal suficiente para conversar sobre una formación adecuada.' },
    scholarship: { title: 'Revisar beca / cupo', note: 'Evaluar disponibilidad, criterios y siguiente paso para beca o cupo.' },
    'high-potential': { title: 'Agendar conversación comercial', note: 'Alta oportunidad: conversar directamente sobre la mejor solución disponible.' },
    'not-interested': { title: 'Archivar seguimiento', note: 'Sin interés actual. Conservar historial sin nuevas tareas.' }
  } as const;
  const en = {
    'not-yet': { title: 'Relationship follow-up', note: 'Keep the relationship active and review progress before offering a new solution.' },
    course: { title: 'Contact about formation', note: 'There is enough signal to discuss a suitable formation.' },
    scholarship: { title: 'Review scholarship / seat', note: 'Review availability, criteria and next step for a scholarship or seat.' },
    'high-potential': { title: 'Schedule commercial conversation', note: 'High opportunity: discuss the best available solution directly.' },
    'not-interested': { title: 'Archive follow-up', note: 'No current interest. Keep history without creating new work.' }
  } as const;
  return (language === 'es' ? es : en)[candidate];
}

function LeadReview({ task, person, assignee, language, onDone }: {
  task: FollowTask;
  person: ExpertPerson;
  assignee: WorkspaceMember;
  language: Language;
  onDone: (result: string) => void;
}) {
  const current = useMemo(() => nurtureState(person), [person]);
  const [reason, setReason] = useState<NoPurchaseReason>(current.reason || 'unknown');
  const [note, setNote] = useState(current.reasonNote || '');
  const [decision, setDecision] = useState<'nurture' | 'closed'>('nurture');
  const [permission, setPermission] = useState<ContactPermission>(current.contactPermission || 'unknown');
  const [type, setType] = useState<FollowUpActionType>('whatsapp');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const save = async () => {
    if (!task.personId || !task.sourceRegistrationId || !task.sourceId) return;
    if (reason === 'unknown') {
      setMessage(language === 'es' ? 'Indica el motivo de no compra.' : 'Select a no-purchase reason.');
      return;
    }
    if (decision === 'nurture' && !date) {
      setMessage(language === 'es' ? 'Define la próxima fecha.' : 'Set the next date.');
      return;
    }
    setBusy(true);
    try {
      const result = await resolveWebinarNoPurchaseContact({
        taskId: task.id,
        registrationId: task.sourceRegistrationId,
        personId: task.personId,
        webinarId: task.sourceId,
        personName: person.name,
        reason,
        reasonNote: note,
        decision,
        assignee,
        nextActionType: type,
        nextActionDate: date,
        nextActionTime: time,
        contactPermission: permission,
        language
      });
      if (decision === 'nurture') {
        await scheduleExpertFollowUpTask({
          person,
          assignee,
          type,
          dueDate: date,
          dueTime: time,
          title: language === 'es' ? 'Revisión de seguimiento' : 'Follow-up review',
          note: language === 'es' ? 'Revisar valor recibido, interacción y señales de intención.' : 'Review value received, interaction and intent signals.',
          sourceId: task.sourceId
        });
      }
      onDone(result);
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar.' : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="grid gap-3 lg:grid-cols-[1.1fr_0.9fr]">
    <div className="grid gap-2 sm:grid-cols-2">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Motivo de no compra' : 'No-purchase reason'}</span><select value={reason} onChange={(event) => setReason(event.target.value as NoPurchaseReason)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{REASONS.map((value) => <option key={value} value={value}>{continuityReasonLabel(value, language)}</option>)}</select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Resultado' : 'Outcome'}</span><select value={decision} onChange={(event) => setDecision(event.target.value as 'nurture' | 'closed')} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="nurture">{language === 'es' ? 'Pasa a seguimiento gratuito' : 'Move to free follow-up'}</option><option value="closed">{language === 'es' ? 'No está interesado · archivar' : 'Not interested · archive'}</option></select></label>
      <label className="sm:col-span-2"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Contexto / motivo' : 'Context / reason'}</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs" /></label>
    </div>
    <div className="space-y-2">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Permiso de contacto' : 'Contact permission'}</span><select value={permission} onChange={(event) => setPermission(event.target.value as ContactPermission)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs">{PERMISSIONS.map((value) => <option key={value} value={value}>{contactPermissionLabel(value, language)}</option>)}</select></label>
      {decision === 'nurture' && <div className="grid grid-cols-3 gap-2"><select value={type} onChange={(event) => setType(event.target.value as FollowUpActionType)} className="rounded-lg border border-black/10 bg-white px-2 py-2 text-xs"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option></select><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-black/10 px-2 py-2 text-xs" /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="rounded-lg border border-black/10 px-2 py-2 text-xs" /></div>}
      <button type="button" disabled={busy} onClick={() => void save()} className="w-full rounded-lg bg-[#111413] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar revisión de lead' : 'Save lead review')}</button>
      {message && <p className="text-[10px] text-[#8D332C]">{message}</p>}
    </div>
  </div>;
}

function NurtureReview({ task, person, assignee, language, onDone, contactNote, setContactNote, canWait, onWaiting, onRemove }: {
  task: FollowTask;
  person: ExpertPerson;
  assignee: WorkspaceMember;
  language: Language;
  onDone: (result: string) => void;
  contactNote: string;
  setContactNote: (value: string) => void;
  canWait: boolean;
  onWaiting: () => void;
  onRemove: () => void;
}) {
  const current = useMemo(() => nurtureState(person), [person]);
  const [valueReceived, setValueReceived] = useState<NurtureEngagement>(current.learning);
  const [interaction, setInteraction] = useState<NurtureEngagement>(current.communityActivity);
  const [intent, setIntent] = useState<NurtureEngagement>(current.youtubeActivity);
  const [candidate, setCandidate] = useState<NurtureCandidate>(current.candidate);
  const [note, setNote] = useState(current.reviewNote || '');
  const [type, setType] = useState<FollowUpActionType>(current.nextActionType || 'whatsapp');
  const [date, setDate] = useState(current.nextActionDate || '');
  const [time, setTime] = useState(current.nextActionTime || '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const next = candidateAction(candidate, language);

  const save = async () => {
    const closes = candidate === 'not-interested';
    if (!closes && !date) {
      setMessage(language === 'es' ? 'Define la fecha de la próxima acción.' : 'Set a date for the next action.');
      return;
    }
    setBusy(true);
    try {
      await saveNurtureReview({
        personId: person.id,
        personName: person.name,
        learning: valueReceived,
        communityActivity: interaction,
        youtubeActivity: intent,
        candidate,
        reviewNote: note,
        contactPermission: current.contactPermission,
        nextActionType: type,
        nextActionDate: date,
        nextActionTime: time,
        assignee,
        close: closes
      });
      if (!closes) {
        await scheduleExpertFollowUpTask({
          person,
          assignee,
          type,
          dueDate: date,
          dueTime: time,
          title: next.title,
          note: note.trim() ? `${next.note}\n${note.trim()}` : next.note,
          sourceId: task.sourceId || person.id
        });
      }
      onDone(closes
        ? next.note
        : `${language === 'es' ? 'Seguimiento actualizado' : 'Follow-up updated'} · ${candidateLabel(candidate, language)} · ${next.title}`);
    } catch {
      setMessage(language === 'es' ? 'No se pudo guardar.' : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return <div className="grid gap-3 lg:grid-cols-[1fr_0.92fr] xl:items-start">
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="space-y-2">
          <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Valor recibido' : 'Value received'}</span><select value={valueReceived} onChange={(event) => setValueReceived(event.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">{SIGNALS.map((value) => <option key={value} value={value}>{engagementLabel(value, language)}</option>)}</select></label>
          <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Nivel de interacción' : 'Interaction level'}</span><select value={interaction} onChange={(event) => setInteraction(event.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">{SIGNALS.map((value) => <option key={value} value={value}>{engagementLabel(value, language)}</option>)}</select></label>
        </div>
        <div className="space-y-2">
          <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Señales de intención' : 'Intent signals'}</span><select value={intent} onChange={(event) => setIntent(event.target.value as NurtureEngagement)} className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">{SIGNALS.map((value) => <option key={value} value={value}>{engagementLabel(value, language)}</option>)}</select></label>
          <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Decisión' : 'Decision'}</span><select value={candidate} onChange={(event) => setCandidate(event.target.value as NurtureCandidate)} className="w-full rounded-lg border border-black/10 bg-white px-2 py-2 text-xs">{CANDIDATES.map((value) => <option key={value} value={value}>{candidateLabel(value, language)}</option>)}</select></label>
        </div>
      </div>
      <label className="mt-2 block"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Evidencia / qué cambió' : 'Evidence / what changed'}</span><textarea rows={2} value={note} onChange={(event) => setNote(event.target.value)} placeholder={language === 'es' ? 'Ej. participa semanalmente, vio el contenido y preguntó por la próxima edición.' : 'E.g. participates weekly, consumed content and asked about the next edition.'} className="w-full rounded-lg border border-black/10 px-3 py-2 text-xs" /></label>
    </div>
    <div className="space-y-2">
      <div className="rounded-lg bg-white px-3 py-2"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'QUÉ PASA DESPUÉS' : 'WHAT HAPPENS NEXT'}</p><p className="mt-1 text-xs font-semibold">{next.title}</p><p className="mt-1 text-[10px] leading-4 text-black/45">{next.note}</p></div>
      {candidate !== 'not-interested' && <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_140px_110px]"><select value={type} onChange={(event) => setType(event.target.value as FollowUpActionType)} className="min-w-0 rounded-lg border border-black/10 bg-white px-2 py-2 text-xs"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select><input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="min-w-0 rounded-lg border border-black/10 px-2 py-2 text-xs" /><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="min-w-0 rounded-lg border border-black/10 px-2 py-2 text-xs" /></div>}
      <input value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder={language === 'es' ? 'Nota breve de esta interacción' : 'Short interaction note'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" />
      <div className={`grid gap-2 ${canWait ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <button type="button" disabled={busy} onClick={() => void save()} className="rounded-lg bg-[#111413] px-3 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar' : 'Save')}</button>
        {canWait && <button type="button" onClick={onWaiting} className="rounded-lg border border-[#0A3F4D]/15 bg-white px-3 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'En espera' : 'Waiting'}</button>}
        <button type="button" onClick={onRemove} className="inline-flex items-center justify-center gap-1 rounded-lg border border-[#A23A32]/15 bg-white px-3 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Remove'}</button>
      </div>
      {message && <p className="text-[10px] text-[#8D332C]">{message}</p>}
    </div>
  </div>;
}

export function FollowUpWorkWorkspaceV2({ language }: { language: Language }) {
  const [tasks, setTasks] = useState<FollowTask[]>(() => loadTasks() as FollowTask[]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [team, setTeam] = useState<WorkspaceTeamState | null>(null);
  const [segment, setSegment] = useState<Segment>('leads');
  const [lane, setLane] = useState<Lane>('queue');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState('');
  const [contactNote, setContactNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [editingId, setEditingId] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editResult, setEditResult] = useState('');

  useEffect(() => {
    let stopPeople: (() => void) | undefined;
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void loadExpertWorkspaceTeam().then(setTeam).catch(() => {});
    void hydrateExpertsTaskMemory().then(() => setTasks(loadTasks() as FollowTask[]));
    const refresh = () => setTasks(loadTasks() as FollowTask[]);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    return () => { stopPeople?.(); window.removeEventListener(WORKSPACE_STATE_EVENT, refresh); };
  }, []);

  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const segmentTasks = useMemo(() => tasks.filter(segment === 'leads' ? isLead : isNurture), [tasks, segment]);
  const open = useMemo(() => segmentTasks.filter((task) => {
    if (task.status === 'done' || task.deletedAt) return false;
    const person = task.personId ? peopleById.get(task.personId) : undefined;
    return !relationshipAlreadyAdvanced(person);
  }), [segmentTasks, peopleById]);
  const queues = {
    queue: open.filter((task) => stateOf(task) === 'queue'),
    waiting: open.filter((task) => stateOf(task) === 'waiting-reply'),
    replied: open.filter((task) => stateOf(task) === 'reply-received')
  };
  const rows = queues[lane].filter((task) => {
    const term = search.trim().toLowerCase();
    return !term || [task.clientName, task.title, task.note].some((value) => String(value || '').toLowerCase().includes(term));
  });
  const history = segmentTasks
    .filter((task) => task.status === 'done' || Boolean(task.deletedAt) || relationshipAlreadyAdvanced(task.personId ? peopleById.get(task.personId) : undefined))
    .sort((a, b) => (b.deletedAt || b.completedAt || b.createdAt).localeCompare(a.deletedAt || a.completedAt || a.createdAt));

  const persist = (next: FollowTask[]) => { setTasks(next); saveTasks(next as WorkTask[]); };
  const patch = (task: FollowTask, change: Partial<FollowTask>) => {
    const updated = { ...task, ...change } as FollowTask;
    if (change.status === 'done' && !updated.completedAt) updated.completedAt = new Date().toISOString();
    persist(tasks.map((item) => item.id === task.id ? updated : item));
    void persistExpertWorkTask(updated);
    return updated;
  };
  const assignee = (task: FollowTask) => team?.members.find((member) => member.uid === task.assignedToUid) || team?.currentMember || team?.members[0];
  const log = (task: FollowTask, type: string, metadata: Record<string, unknown>) => {
    if (task.personId) void appendExpertRelationshipEvent({ personId: task.personId, type, sourceType: 'work_task', sourceId: task.id, metadata }).catch(() => {});
  };
  const markWaiting = (task: FollowTask) => {
    patch(task, { interactionState: 'waiting-reply', awaitingReplySince: new Date().toISOString(), lastInteractionNote: contactNote.trim() || task.lastInteractionNote || '', status: 'pending' });
    log(task, 'interaction.waiting_reply', { channel: task.type, note: contactNote.trim() });
    setActiveId(''); setContactNote(''); setLane('waiting');
  };
  const markReplied = (task: FollowTask) => {
    patch(task, { interactionState: 'reply-received', replyReceivedAt: new Date().toISOString(), status: 'pending' });
    setActiveId(''); setLane('replied');
  };
  const complete = (task: FollowTask, result: string) => {
    patch(task, { status: 'done', interactionState: 'queue', result: result.trim(), completedByUid: team?.currentUid || '' });
    setActiveId(''); setContactNote('');
  };
  const remove = (task: FollowTask) => {
    patch(task, { deletedAt: new Date().toISOString(), deletedFromStatus: task.status });
    setActiveId('');
  };
  const beginEdit = (task: FollowTask) => {
    setEditingId(task.id);
    setEditNote(task.note || '');
    setEditResult(task.result || '');
  };
  const saveEdit = (task: FollowTask) => {
    patch(task, { note: editNote.trim(), result: editResult.trim() });
    void appendExpertAuditLog({ entityType: 'work_task', entityId: task.id, action: 'followup.history_edited', changes: { note: editNote, result: editResult } }).catch(() => {});
    setEditingId('');
  };

  return <div className="space-y-4">
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="inline-flex rounded-xl bg-white p-1">
        <button type="button" onClick={() => { setSegment('leads'); setLane('queue'); setActiveId(''); }} className={`rounded-lg px-4 py-2 text-xs font-semibold ${segment === 'leads' ? '' : 'text-black/45'}`} style={activeStyle(segment === 'leads')}>{language === 'es' ? 'Leads' : 'Leads'}</button>
        <button type="button" onClick={() => { setSegment('nurture'); setLane('queue'); setActiveId(''); }} className={`rounded-lg px-4 py-2 text-xs font-semibold ${segment === 'nurture' ? '' : 'text-black/45'}`} style={activeStyle(segment === 'nurture')}>{language === 'es' ? 'En seguimiento' : 'In follow-up'}</button>
      </div>
      <div className="flex flex-wrap gap-2"><LaneButton active={lane === 'queue'} onClick={() => setLane('queue')} label={language === 'es' ? 'Por hacer' : 'To do'} count={queues.queue.length} /><LaneButton active={lane === 'waiting'} onClick={() => setLane('waiting')} label={language === 'es' ? 'Interacciones activas' : 'Active interactions'} count={queues.waiting.length} /><LaneButton active={lane === 'replied'} onClick={() => setLane('replied')} label={language === 'es' ? 'Respondieron' : 'Replied'} count={queues.replied.length} alert={queues.replied.length > 0} /></div>
    </div>

    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><label className="relative block sm:w-[360px]"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar persona o tarea…' : 'Search person or task…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label><label className="flex items-center gap-2 text-xs text-black/45"><input type="checkbox" checked={showHistory} onChange={(event) => setShowHistory(event.target.checked)} />{language === 'es' ? 'Historial' : 'History'}</label></div>

    <section className="overflow-hidden rounded-xl border border-black/8 bg-white">
      <div className="divide-y divide-black/5">{rows.map((task) => {
        const opened = activeId === task.id;
        const person = task.personId ? peopleById.get(task.personId) : undefined;
        const owner = assignee(task);
        const state = stateOf(task);
        return <div key={task.id} className="p-4">
          <div className="grid gap-3 lg:grid-cols-[1fr_120px_150px_auto] lg:items-center"><div><p className="text-sm font-semibold">{task.title}</p><p className="mt-1 text-xs font-medium text-[#0A3F4D]">{task.clientName}</p><p className="mt-1 line-clamp-1 text-xs text-black/40">{task.note}</p></div><div className="flex items-center gap-2 text-xs text-black/50"><ActionIcon type={task.type} />{actionLabel(task.type, language)}</div><span className="text-xs text-black/45">{task.assignedToName || task.assignee}</span><button type="button" onClick={() => { setActiveId(opened ? '' : task.id); setContactNote(task.lastInteractionNote || task.result || ''); }} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white">{opened ? (language === 'es' ? 'Cerrar' : 'Close') : (language === 'es' ? 'Trabajar' : 'Work')}</button></div>
          {opened && state === 'waiting-reply' && <div className="mt-3 flex flex-col gap-3 rounded-xl bg-[#FAFAF8] p-3 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-semibold">{language === 'es' ? 'Esperando respuesta' : 'Waiting for reply'}</p><p className="mt-1 text-xs text-black/45">{task.lastInteractionNote || task.note}</p></div><div className="flex gap-2"><button type="button" onClick={() => markReplied(task)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Marcar respuesta recibida' : 'Mark reply received'}</button><button type="button" onClick={() => patch(task, { interactionState: 'queue' })} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Volver a por hacer' : 'Back to to-do'}</button></div></div>}
          {opened && state !== 'waiting-reply' && person && owner && <div className="mt-3 rounded-xl bg-[#FAFAF8] p-3">
            {segment === 'leads' ? <>
              <LeadReview task={task} person={person} assignee={owner} language={language} onDone={(result) => complete(task, result)} />
              <div className="mt-3 flex flex-wrap gap-2 border-t border-black/5 pt-3"><input value={contactNote} onChange={(event) => setContactNote(event.target.value)} placeholder={language === 'es' ? 'Nota breve de esta interacción' : 'Short interaction note'} className="min-w-[240px] flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" />{asyncChannel(task) && <button type="button" onClick={() => markWaiting(task)} className="rounded-full border border-[#0A3F4D]/15 bg-white px-4 py-2 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'En espera de respuesta' : 'Waiting for reply'}</button>}<button type="button" onClick={() => remove(task)} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Remove'}</button></div>
            </> : <NurtureReview task={task} person={person} assignee={owner} language={language} onDone={(result) => complete(task, result)} contactNote={contactNote} setContactNote={setContactNote} canWait={asyncChannel(task)} onWaiting={() => markWaiting(task)} onRemove={() => remove(task)} />}
          </div>}
        </div>;
      })}{rows.length === 0 && <div className="p-8 text-center text-sm text-black/40">{segment === 'leads'
        ? (language === 'es' ? 'No hay leads pendientes en esta cola.' : 'No pending leads in this queue.')
        : (language === 'es' ? 'No hay relaciones en seguimiento en esta cola.' : 'No follow-up relationships in this queue.')}</div>}</div>
    </section>

    {showHistory && <section className="rounded-xl border border-black/8 bg-white p-4"><div className="flex items-center justify-between"><p className="text-xs font-semibold uppercase tracking-[0.13em] text-black/40">{language === 'es' ? 'HISTORIAL' : 'HISTORY'}</p><span className="rounded-full bg-black/5 px-2 py-1 text-xs font-semibold">{history.length}</span></div><div className="mt-3 divide-y divide-black/5">{history.map((task) => <div key={task.id} className="py-3">{editingId === task.id ? <div className="grid gap-2 md:grid-cols-2"><div><p className="text-sm font-semibold">{task.clientName}</p><p className="mt-1 text-xs text-black/40">{task.title}</p></div><div className="flex justify-end"><button type="button" onClick={() => setEditingId('')} className="text-xs text-black/40">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div><textarea rows={2} value={editNote} onChange={(event) => setEditNote(event.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-xs" /><textarea rows={2} value={editResult} onChange={(event) => setEditResult(event.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-xs" /><button type="button" onClick={() => saveEdit(task)} className="w-fit rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar cambios' : 'Save changes'}</button></div> : <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{task.clientName}</p><p className="mt-1 text-xs text-black/45">{task.title}{task.result ? ` · ${task.result}` : ''}</p></div><button type="button" onClick={() => beginEdit(task)} className="inline-flex items-center gap-1 rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button></div>}</div>)}</div></section>}
  </div>;
}

function LaneButton({ active, onClick, label, count, alert = false }: { active: boolean; onClick: () => void; label: string; count: number; alert?: boolean }) {
  const Icon = label.toLowerCase().includes('respond') || label.toLowerCase().includes('replied') ? BellRing : label.toLowerCase().includes('inter') || label.toLowerCase().includes('active') ? Inbox : ListTodo;
  return <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-semibold ${active ? 'border-[#111413] bg-[#111413] text-white' : alert ? 'border-[#A23A32]/15 bg-white text-[#8D332C]' : 'border-black/8 bg-white text-black/45'}`}><Icon className="h-3.5 w-3.5" />{label} <span>{count}</span></button>;
}
