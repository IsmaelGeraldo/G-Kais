import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  FileUp,
  Plus,
  Presentation,
  Search,
  Users
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  createOperationalWebinar,
  recordOperationalWebinarRegistration,
  subscribeExpertPeople,
  subscribeExpertWebinars,
  subscribeWebinarRegistrations,
  updateOperationalWebinar,
  webinarSignalLevel,
  type ExpertPerson,
  type ExpertWebinar,
  type ExpertWebinarStatus,
  type WebinarAttendanceStatus,
  type WebinarInterest,
  type WebinarRegistration
} from '../../services/expertsAcquisition';
import {
  createWebinarWorkAction,
  webinarNeedsWorkAction,
  webinarWorkActionKind,
  webinarWorkPriority,
  type WebinarWorkActionType
} from '../../services/expertsWebinarActions';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type ParticipantDraft = {
  name: string;
  email: string;
  phone: string;
  status: WebinarAttendanceStatus;
  attendanceMinutes: string;
  purchased: boolean;
  interest: WebinarInterest;
};

type CsvRow = Record<string, string>;

const EMPTY_PARTICIPANT: ParticipantDraft = {
  name: '',
  email: '',
  phone: '',
  status: 'registered',
  attendanceMinutes: '0',
  purchased: false,
  interest: 'unknown'
};

function parseCsv(text: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { field += '"'; i += 1; }
      else quoted = !quoted;
    } else if ((char === ',' || char === ';' || char === '\t') && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field.trim());
      field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some(Boolean)) rows.push(row);
  if (rows.length < 2) return [];
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function pick(row: CsvRow, names: string[]): string {
  for (const name of names) {
    const direct = row[name];
    if (direct) return direct;
    const found = Object.entries(row).find(([key]) => key.replace(/[ _-]/g, '').toLowerCase() === name.replace(/[ _-]/g, '').toLowerCase());
    if (found?.[1]) return found[1];
  }
  return '';
}

function parseAttendance(value: string): WebinarAttendanceStatus {
  const normalized = value.trim().toLowerCase();
  if (['attended', 'asistio', 'asistió', 'presente', 'present', 'yes', 'si', 'sí'].includes(normalized)) return 'attended';
  if (['no-show', 'noshow', 'no show', 'ausente', 'absent', 'did not attend'].includes(normalized)) return 'no-show';
  return 'registered';
}

function parseInterest(value: string): WebinarInterest {
  const normalized = value.trim().toLowerCase();
  if (['high', 'alto', 'alta'].includes(normalized)) return 'high';
  if (['medium', 'medio', 'media'].includes(normalized)) return 'medium';
  if (['low', 'bajo', 'baja'].includes(normalized)) return 'low';
  return 'unknown';
}

function parseBoolean(value: string): boolean {
  return ['1', 'true', 'yes', 'si', 'sí', 'compró', 'compro', 'purchased', 'buyer'].includes(value.trim().toLowerCase());
}

function formatWebinarDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function statusLabel(status: WebinarAttendanceStatus, language: Language) {
  if (status === 'attended') return language === 'es' ? 'Asistió' : 'Attended';
  if (status === 'no-show') return 'No-show';
  return language === 'es' ? 'Registrado' : 'Registered';
}

function interestLabel(interest: WebinarInterest, language: Language) {
  if (interest === 'high') return language === 'es' ? 'Alto' : 'High';
  if (interest === 'medium') return language === 'es' ? 'Medio' : 'Medium';
  if (interest === 'low') return language === 'es' ? 'Bajo' : 'Low';
  return language === 'es' ? 'Sin definir' : 'Unknown';
}

function memberLabel(member: WorkspaceMember) {
  return member.displayName || member.email || member.uid;
}

function draftPerson(personId: string, draft: ParticipantDraft): ExpertPerson {
  return {
    id: personId,
    name: draft.name.trim(),
    email: draft.email.trim(),
    phone: draft.phone.trim(),
    firstSource: 'webinar',
    latestSource: 'webinar',
    currentStage: 'webinar',
    outcomeMemory: {}
  };
}

function draftRegistration(registrationId: string, personId: string, webinarId: string, draft: ParticipantDraft): WebinarRegistration {
  return {
    id: registrationId,
    personId,
    webinarId,
    status: draft.status,
    attendanceMinutes: Number(draft.attendanceMinutes) || 0,
    purchased: draft.purchased,
    interest: draft.interest,
    followUpStatus: draft.purchased ? 'not-needed' : (draft.status === 'attended' || draft.status === 'no-show') ? 'needed' : undefined
  };
}

function shouldCreateAutomaticAction(draft: ParticipantDraft) {
  return draft.purchased || draft.status === 'attended' || draft.status === 'no-show';
}

export function WebinarsWorkspace({ language }: { language: Language }) {
  const [webinars, setWebinars] = useState<ExpertWebinar[]>([]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showParticipant, setShowParticipant] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement | null>(null);

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [platform, setPlatform] = useState('Zoom');
  const [externalUrl, setExternalUrl] = useState('');
  const [source, setSource] = useState('');
  const [offerLabel, setOfferLabel] = useState('');

  const [participant, setParticipant] = useState<ParticipantDraft>(EMPTY_PARTICIPANT);
  const [actionAssigneeUid, setActionAssigneeUid] = useState('');
  const [actionType, setActionType] = useState<WebinarWorkActionType>('whatsapp');
  const [actionDate, setActionDate] = useState('');
  const [actionTime, setActionTime] = useState('');

  useEffect(() => {
    let stopWebinars: (() => void) | undefined;
    let stopPeople: (() => void) | undefined;
    void subscribeExpertWebinars((next) => {
      setWebinars(next);
      setSelectedId((current) => current || next[0]?.id || '');
    }).then((stop) => { stopWebinars = stop; }).catch(() => {});
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; }).catch(() => {});
    void loadExpertWorkspaceTeam().then((team) => {
      const active = team.members.filter((member) => member.status === 'active');
      setMembers(active);
      setCurrentUid(team.currentUid);
      setActionAssigneeUid(team.currentUid);
    }).catch(() => {});
    return () => {
      stopWebinars?.();
      stopPeople?.();
    };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRegistrations([]);
      return;
    }
    let stop: (() => void) | undefined;
    void subscribeWebinarRegistrations(selectedId, setRegistrations)
      .then((unsubscribe) => { stop = unsubscribe; })
      .catch(() => setRegistrations([]));
    return () => stop?.();
  }, [selectedId]);

  const selected = webinars.find((webinar) => webinar.id === selectedId) || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const filteredRegistrations = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return registrations;
    return registrations.filter((registration) => {
      const person = peopleById.get(registration.personId);
      return [person?.name || '', person?.email || '', person?.phone || '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [registrations, peopleById, search]);

  const metrics = useMemo(() => ({
    registered: registrations.length,
    attended: registrations.filter((item) => item.status === 'attended').length,
    noShow: registrations.filter((item) => item.status === 'no-show').length,
    purchased: registrations.filter((item) => item.purchased).length,
    pendingActions: registrations.filter(webinarNeedsWorkAction).length
  }), [registrations]);

  const selectedAssignee = () => members.find((member) => member.uid === actionAssigneeUid)
    || members.find((member) => member.uid === currentUid)
    || members[0];

  const resetParticipantForm = () => {
    setParticipant(EMPTY_PARTICIPANT);
    setActionType('whatsapp');
    setActionDate('');
    setActionTime('');
    setActionAssigneeUid(currentUid);
  };

  const createWebinar = async () => {
    if (!title.trim()) return;
    setBusy(true);
    setMessage('');
    try {
      const id = await createOperationalWebinar({ title, startsAt, platform, externalUrl, source, offerLabel, status: 'scheduled' });
      setTitle('');
      setStartsAt('');
      setExternalUrl('');
      setSource('');
      setOfferLabel('');
      setSelectedId(id);
      setShowCreate(false);
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear el webinar.' : 'Could not create webinar.');
    } finally {
      setBusy(false);
    }
  };

  const addParticipant = async () => {
    if (!selected) return;
    if (!participant.name.trim()) {
      setMessage(language === 'es' ? 'Ingresa nombre y apellidos.' : 'Enter first and last name.');
      return;
    }
    if (!participant.email.trim() && !participant.phone.trim()) {
      setMessage(language === 'es'
        ? 'Ingresa al menos un dato de contacto: email o teléfono. G-KAIS lo necesita para identificar a la persona sin duplicarla.'
        : 'Enter at least one contact detail: email or phone. G-KAIS needs it to identify the person without duplicates.');
      return;
    }

    setBusy(true);
    setMessage('');
    try {
      const result = await recordOperationalWebinarRegistration({
        webinarId: selected.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        status: participant.status,
        attendanceMinutes: Number(participant.attendanceMinutes) || 0,
        purchased: participant.purchased,
        interest: participant.interest
      });

      const registration = draftRegistration(result.registrationId, result.personId, selected.id, participant);
      const person = draftPerson(result.personId, participant);
      const assignee = selectedAssignee();
      let actionCreated = false;

      if (shouldCreateAutomaticAction(participant) && assignee) {
        await createWebinarWorkAction({
          registration,
          person,
          webinar: selected,
          assignee,
          type: actionType,
          dueDate: actionDate,
          dueTime: actionTime,
          kind: webinarWorkActionKind(registration),
          priority: webinarWorkPriority(registration)
        });
        actionCreated = true;
      }

      setMessage(language === 'es'
        ? `${participant.name.trim()} registrada${actionCreated ? ' · próxima acción creada' : ''}.`
        : `${participant.name.trim()} registered${actionCreated ? ' · next action created' : ''}.`);
      resetParticipantForm();
      setShowParticipant(false);
    } catch (error) {
      if (error instanceof Error && error.message === 'IDENTITY_CONFLICT') {
        setMessage(language === 'es'
          ? 'Existe un conflicto de identidad por email/teléfono. No se fusionó automáticamente.'
          : 'Identity conflict found. No automatic merge was performed.');
      } else if (error instanceof Error && error.message === 'PERSON_IDENTITY_REQUIRED') {
        setMessage(language === 'es' ? 'Ingresa email o teléfono para identificar a la persona.' : 'Enter an email or phone to identify the person.');
      } else {
        setMessage(language === 'es' ? 'No se pudo registrar la persona.' : 'Could not register the person.');
      }
    } finally {
      setBusy(false);
    }
  };

  const ensureWorkAction = async (
    registration: WebinarRegistration,
    person: ExpertPerson,
    options?: { type?: WebinarWorkActionType; dueDate?: string; dueTime?: string }
  ) => {
    if (!selected) return false;
    const assignee = selectedAssignee();
    if (!assignee) return false;
    await createWebinarWorkAction({
      registration,
      person,
      webinar: selected,
      assignee,
      type: options?.type || (registration.purchased ? 'task' : 'whatsapp'),
      dueDate: options?.dueDate,
      dueTime: options?.dueTime,
      kind: webinarWorkActionKind(registration),
      priority: webinarWorkPriority(registration)
    });
    return true;
  };

  const updateRegistration = async (
    registration: WebinarRegistration,
    patch: Partial<Pick<WebinarRegistration, 'status' | 'attendanceMinutes' | 'purchased' | 'interest'>>
  ) => {
    if (!selected) return;
    const person = peopleById.get(registration.personId);
    if (!person) return;
    const nextRegistration: WebinarRegistration = {
      ...registration,
      status: patch.status ?? registration.status,
      attendanceMinutes: patch.attendanceMinutes ?? registration.attendanceMinutes,
      purchased: patch.purchased ?? registration.purchased,
      interest: patch.interest ?? registration.interest
    };

    try {
      await recordOperationalWebinarRegistration({
        webinarId: selected.id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        status: nextRegistration.status,
        attendanceMinutes: nextRegistration.attendanceMinutes,
        purchased: nextRegistration.purchased,
        interest: nextRegistration.interest
      });
      const becamePurchased = nextRegistration.purchased && !registration.purchased;
      const becameActionable = webinarNeedsWorkAction(nextRegistration);
      if (becamePurchased || becameActionable) {
        await ensureWorkAction(nextRegistration, person, { type: nextRegistration.purchased ? 'task' : 'whatsapp' });
      }
    } catch {
      setMessage(language === 'es' ? 'No se pudo actualizar el participante.' : 'Could not update participant.');
    }
  };

  const createLegacyAction = async (registration: WebinarRegistration) => {
    if (!selected) return;
    const person = peopleById.get(registration.personId);
    if (!person) return;
    try {
      await ensureWorkAction(registration, person);
      setMessage(language === 'es'
        ? `${registration.purchased ? 'Integración' : 'Seguimiento'} enviado a Trabajo prioritario.`
        : `${registration.purchased ? 'Enrollment' : 'Follow-up'} sent to Priority Work.`);
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear la acción.' : 'Could not create action.');
    }
  };

  const importCsv = async (file: File) => {
    if (!selected) return;
    setImporting(true);
    setMessage('');
    try {
      const rows = parseCsv(await file.text());
      let imported = 0;
      let skipped = 0;
      let enrollmentTasks = 0;
      const assignee = selectedAssignee();
      const inputs = rows.map((row) => {
        const email = pick(row, ['email', 'correo', 'e-mail']);
        const phone = pick(row, ['phone', 'telefono', 'teléfono', 'mobile', 'celular']);
        const rawName = pick(row, ['name', 'nombre', 'full name', 'fullname', 'attendee name']);
        const name = rawName || (email ? email.split('@')[0] : phone);
        if (!name || (!email && !phone)) return null;
        const minutesRaw = pick(row, ['attendance minutes', 'attendanceminutes', 'minutes', 'minutos', 'duration', 'duracion', 'duración']);
        return {
          webinarId: selected.id,
          name,
          email,
          phone,
          status: parseAttendance(pick(row, ['status', 'attendance', 'asistencia', 'attendance status'])),
          attendanceMinutes: Number(minutesRaw.replace(/[^0-9.]/g, '')) || 0,
          purchased: parseBoolean(pick(row, ['purchased', 'purchase', 'comprado', 'compra', 'buyer'])),
          interest: parseInterest(pick(row, ['interest', 'interes', 'interés']))
        };
      });

      for (let index = 0; index < inputs.length; index += 10) {
        const chunk = inputs.slice(index, index + 10);
        const results = await Promise.all(chunk.map(async (input) => {
          if (!input) return false;
          try {
            const result = await recordOperationalWebinarRegistration(input);
            if (input.purchased && assignee) {
              const draft: ParticipantDraft = {
                name: input.name,
                email: input.email,
                phone: input.phone,
                status: input.status,
                attendanceMinutes: String(input.attendanceMinutes),
                purchased: true,
                interest: input.interest
              };
              const registration = draftRegistration(result.registrationId, result.personId, selected.id, draft);
              await createWebinarWorkAction({
                registration,
                person: draftPerson(result.personId, draft),
                webinar: selected,
                assignee,
                type: 'task',
                kind: 'enrollment',
                priority: 'high'
              });
              enrollmentTasks += 1;
            }
            return true;
          } catch {
            return false;
          }
        }));
        imported += results.filter(Boolean).length;
        skipped += results.filter((value) => !value).length;
      }

      setMessage(language === 'es'
        ? `CSV procesado: ${imported} personas importadas${enrollmentTasks ? ` · ${enrollmentTasks} integraciones creadas` : ''}${skipped ? ` · ${skipped} omitidas` : ''}.`
        : `CSV processed: ${imported} people imported${enrollmentTasks ? ` · ${enrollmentTasks} enrollment tasks created` : ''}${skipped ? ` · ${skipped} skipped` : ''}.`);
    } catch {
      setMessage(language === 'es' ? 'No se pudo procesar el CSV.' : 'Could not process the CSV.');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const updateWebinarStatus = async (status: ExpertWebinarStatus) => {
    if (!selected) return;
    try { await updateOperationalWebinar(selected.id, { status }); } catch {}
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WEBINARS</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Gestiona el recorrido comercial del evento' : 'Manage the event commercial journey'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'El webinar ocurre en Zoom, Meet u otra plataforma. G-KAIS conserva quién participó, qué ocurrió y qué relación necesita continuidad.' : 'The webinar happens in Zoom, Meet or another platform. G-KAIS keeps who participated, what happened and which relationships need continuity.'}</p>
        </div>
        <button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Nuevo webinar' : 'New webinar'}</button>
      </div>

      {showCreate && <div className="mt-5 grid gap-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4 md:grid-cols-2 xl:grid-cols-3">
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE' : 'TITLE'}</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'FECHA Y HORA' : 'DATE & TIME'}</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PLATAFORMA' : 'PLATFORM'}</span><input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Zoom" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'ENLACE EXTERNO' : 'EXTERNAL LINK'}</span><input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'ORIGEN' : 'SOURCE'}</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Instagram / Meta Ads" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'OFERTA ASOCIADA' : 'RELATED OFFER'}</span><input value={offerLabel} onChange={(event) => setOfferLabel(event.target.value)} placeholder={language === 'es' ? 'Formación Escala' : 'Scale Program'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <div className="flex gap-2 md:col-span-2 xl:col-span-3"><button type="button" disabled={busy || !title.trim()} onClick={() => void createWebinar()} className="rounded-full bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Guardar webinar' : 'Save webinar'}</button><button type="button" onClick={() => setShowCreate(false)} className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/55">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div>
      </div>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/7 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'EVENTOS' : 'EVENTS'}</p></div>
        <div className="max-h-[700px] divide-y divide-black/5 overflow-y-auto">{webinars.map((webinar) => <button key={webinar.id} type="button" onClick={() => setSelectedId(webinar.id)} className={`w-full p-4 text-left ${selectedId === webinar.id ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}><div className="flex items-start gap-3"><Presentation className="mt-0.5 h-4 w-4 text-[#0A3F4D]" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{webinar.title}</p><p className="mt-1 text-xs text-black/40">{formatWebinarDate(webinar.startsAt, language)}</p><p className="mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-black/30">{webinar.platform || '—'} · {webinar.status}</p></div></div></button>)}{webinars.length === 0 && <div className="p-7 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay webinars registrados.' : 'No webinars registered yet.'}</div>}</div>
      </section>

      {selected ? <div className="space-y-5">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2"><h4 className="text-xl font-semibold">{selected.title}</h4><select value={selected.status} onChange={(event) => void updateWebinarStatus(event.target.value as ExpertWebinarStatus)} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold"><option value="draft">Draft</option><option value="scheduled">{language === 'es' ? 'Programado' : 'Scheduled'}</option><option value="completed">{language === 'es' ? 'Completado' : 'Completed'}</option><option value="cancelled">{language === 'es' ? 'Cancelado' : 'Cancelled'}</option></select></div>
              <p className="mt-2 text-sm text-black/45"><CalendarDays className="mr-1.5 inline h-4 w-4" />{formatWebinarDate(selected.startsAt, language)} · {selected.platform || '—'}</p>
              {selected.offerLabel && <p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Oferta: ' : 'Offer: '}{selected.offerLabel}</p>}
              {selected.externalUrl && <a href={selected.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir plataforma' : 'Open platform'}<ExternalLink className="h-3.5 w-3.5" /></a>}
            </div>
            <div className="flex flex-wrap gap-2">
              <input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} />
              <button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/60 disabled:opacity-40"><FileUp className="h-4 w-4" />{importing ? (language === 'es' ? 'Importando…' : 'Importing…') : 'Importar CSV'}</button>
              <button type="button" onClick={() => setShowParticipant((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Añadir persona' : 'Add person'}</button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/6 pt-4 sm:grid-cols-5">
            {[
              [language === 'es' ? 'Registrados' : 'Registered', metrics.registered],
              [language === 'es' ? 'Asistieron' : 'Attended', metrics.attended],
              ['No-show', metrics.noShow],
              [language === 'es' ? 'Compraron' : 'Purchased', metrics.purchased],
              [language === 'es' ? 'Acciones pendientes' : 'Pending actions', metrics.pendingActions]
            ].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
          </div>

          {showParticipant && <div className="mt-3 max-w-3xl rounded-xl border border-black/8 bg-[#FAFAF8] p-3">
            <div className="grid gap-2 md:grid-cols-4">
              <label className="md:col-span-2"><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE Y APELLIDOS' : 'FIRST AND LAST NAME'}</span><input value={participant.name} onChange={(event) => setParticipant((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">EMAIL</span><input value={participant.email} onChange={(event) => setParticipant((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">{language === 'es' ? 'TELÉFONO' : 'PHONE'}</span><input value={participant.phone} onChange={(event) => setParticipant((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">{language === 'es' ? 'ESTADO' : 'STATUS'}</span><select value={participant.status} onChange={(event) => setParticipant((current) => ({ ...current, status: event.target.value as WebinarAttendanceStatus }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs"><option value="registered">{language === 'es' ? 'Registrado' : 'Registered'}</option><option value="attended">{language === 'es' ? 'Asistió' : 'Attended'}</option><option value="no-show">No-show</option></select></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">{language === 'es' ? 'MINUTOS' : 'MINUTES'}</span><input type="number" min="0" value={participant.attendanceMinutes} onChange={(event) => setParticipant((current) => ({ ...current, attendanceMinutes: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-black/35">{language === 'es' ? 'INTERÉS' : 'INTEREST'}</span><select value={participant.interest} onChange={(event) => setParticipant((current) => ({ ...current, interest: event.target.value as WebinarInterest }))} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs"><option value="unknown">{language === 'es' ? 'Sin definir' : 'Unknown'}</option><option value="low">{language === 'es' ? 'Bajo' : 'Low'}</option><option value="medium">{language === 'es' ? 'Medio' : 'Medium'}</option><option value="high">{language === 'es' ? 'Alto' : 'High'}</option></select></label>
              <label className="flex items-end"><span className="flex h-[30px] w-full items-center gap-2 rounded-lg border border-black/10 bg-white px-2.5 text-xs"><input type="checkbox" checked={participant.purchased} onChange={(event) => { const checked = event.target.checked; setParticipant((current) => ({ ...current, purchased: checked })); if (checked) setActionType('task'); else if (actionType === 'task') setActionType('whatsapp'); }} />{language === 'es' ? 'Compró' : 'Purchased'}</span></label>
            </div>

            <div className="mt-2.5 grid gap-2 border-t border-black/8 pt-2.5 md:grid-cols-4">
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-[#0A3F4D]">{language === 'es' ? 'TIPO' : 'TYPE'}</span><select value={actionType} onChange={(event) => setActionType(event.target.value as WebinarWorkActionType)} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs"><option value="whatsapp">WhatsApp</option><option value="email">Email</option><option value="call">{language === 'es' ? 'Llamada' : 'Call'}</option><option value="meeting">{language === 'es' ? 'Reunión' : 'Meeting'}</option><option value="task">{language === 'es' ? 'Tarea interna' : 'Internal task'}</option></select></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-[#0A3F4D]">{language === 'es' ? 'RESPONSABLE' : 'OWNER'}</span><select value={actionAssigneeUid} onChange={(event) => setActionAssigneeUid(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs">{members.map((member) => <option key={member.uid} value={member.uid}>{memberLabel(member)}</option>)}</select></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-[#0A3F4D]">{language === 'es' ? 'FECHA' : 'DATE'}</span><input type="date" value={actionDate} onChange={(event) => setActionDate(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
              <label><span className="mb-0.5 block text-[8px] font-semibold uppercase text-[#0A3F4D]">{language === 'es' ? 'HORA' : 'TIME'}</span><input type="time" value={actionTime} onChange={(event) => setActionTime(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-2.5 py-1.5 text-xs" /></label>
            </div>

            <div className="mt-2.5 flex items-center justify-between gap-3">
              <p className="text-[9px] text-black/35">{language === 'es' ? 'Email o teléfono: al menos uno.' : 'Email or phone: at least one.'}</p>
              <div className="flex gap-2"><button type="button" onClick={() => { resetParticipantForm(); setShowParticipant(false); }} className="rounded-full border border-black/10 bg-white px-3 py-1.5 text-[10px] font-semibold text-black/55">{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button type="button" disabled={busy} onClick={() => void addParticipant()} className="rounded-full bg-[#0A3F4D] px-4 py-1.5 text-[10px] font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Registrar' : 'Register')}</button></div>
            </div>
          </div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="hidden grid-cols-[minmax(250px,1fr)_130px_110px_110px_120px_190px] gap-3 border-b border-black/7 bg-[#FAFAF8] px-4 py-2.5 lg:grid lg:items-center">
            <div className="flex items-center gap-2"><span className="shrink-0 text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Persona' : 'Person'}</span><label className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-black/25" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar nombre, email o teléfono…' : 'Search name, email or phone…'} className="w-full rounded-lg border border-black/10 bg-white py-1.5 pl-8 pr-2 text-[11px] font-normal normal-case tracking-normal" /></label></div>
            <span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Asistencia' : 'Attendance'}</span><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Minutos' : 'Minutes'}</span><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Interés' : 'Interest'}</span><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Compra' : 'Purchase'}</span><span className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Siguiente acción' : 'Next action'}</span>
          </div>
          <div className="border-b border-black/7 bg-[#FAFAF8] p-3 lg:hidden"><label className="relative block"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar nombre, email o teléfono…' : 'Search name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label></div>
          <div className="h-[500px] divide-y divide-black/5 overflow-y-auto">
            {filteredRegistrations.map((registration) => {
              const person = peopleById.get(registration.personId);
              const signal = webinarSignalLevel(registration);
              const needsAction = webinarNeedsWorkAction(registration);
              const isEnrollment = registration.purchased;
              return <div key={registration.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[minmax(250px,1fr)_130px_110px_110px_120px_190px] lg:items-center">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{person?.name || registration.personId}</p><p className="mt-1 truncate text-xs text-black/40">{person?.email || person?.phone || '—'}</p></div>
                <select value={registration.status} onChange={(event) => void updateRegistration(registration, { status: event.target.value as WebinarAttendanceStatus })} className="rounded-lg border border-black/8 bg-white px-2 py-2 text-xs"><option value="registered">{language === 'es' ? 'Registrado' : 'Registered'}</option><option value="attended">{language === 'es' ? 'Asistió' : 'Attended'}</option><option value="no-show">No-show</option></select>
                <input aria-label={language === 'es' ? 'Minutos de asistencia' : 'Attendance minutes'} type="number" min="0" value={registration.attendanceMinutes} onChange={(event) => void updateRegistration(registration, { attendanceMinutes: Number(event.target.value) || 0 })} className="w-full rounded-lg border border-black/8 bg-white px-2 py-2 text-xs" />
                <select value={registration.interest} onChange={(event) => void updateRegistration(registration, { interest: event.target.value as WebinarInterest })} className="rounded-lg border border-black/8 bg-white px-2 py-2 text-xs"><option value="unknown">—</option><option value="low">{interestLabel('low', language)}</option><option value="medium">{interestLabel('medium', language)}</option><option value="high">{interestLabel('high', language)}</option></select>
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={registration.purchased} onChange={(event) => void updateRegistration(registration, { purchased: event.target.checked })} />{registration.purchased ? (language === 'es' ? 'Compró' : 'Purchased') : (language === 'es' ? 'No compró' : 'No purchase')}</label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {registration.followUpStatus === 'completed' ? <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0A3F4D]/8 px-2.5 py-1.5 text-[10px] font-semibold text-[#0A3F4D]"><CheckCircle2 className="h-3.5 w-3.5" />{isEnrollment ? (language === 'es' ? 'Integración lista' : 'Enrollment done') : (language === 'es' ? 'Seguimiento listo' : 'Follow-up done')}</span>
                    : registration.followUpStatus === 'created' ? <span className="inline-flex items-center gap-1.5 rounded-full bg-black/5 px-2.5 py-1.5 text-[10px] font-semibold text-black/50"><Users className="h-3.5 w-3.5" />Trabajo prioritario · {isEnrollment ? (language === 'es' ? 'Integración' : 'Enrollment') : (language === 'es' ? 'Seguimiento' : 'Follow-up')}</span>
                      : needsAction ? <>
                        {signal === 'high' || isEnrollment ? <span className="rounded-full bg-[#111413] px-2.5 py-1.5 text-[10px] font-semibold text-white">{language === 'es' ? 'Prioridad alta' : 'High priority'}</span> : null}
                        <button type="button" onClick={() => void createLegacyAction(registration)} className="rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-[10px] font-semibold text-black/60">{isEnrollment ? (language === 'es' ? `Integrar a ${selected.offerLabel || 'programa'}` : 'Create enrollment') : (language === 'es' ? 'Crear acción' : 'Create action')}</button>
                      </> : <span className="text-[10px] text-black/30">{statusLabel(registration.status, language)}</span>}
                </div>
              </div>;
            })}
            {filteredRegistrations.length === 0 && <div className="grid h-full place-items-center p-8 text-sm text-black/35">{language === 'es' ? 'No hay participantes que coincidan.' : 'No matching participants.'}</div>}
          </div>
        </section>
      </div> : <section className="grid min-h-[340px] place-items-center rounded-2xl border border-black/10 bg-white p-8 text-center"><div><Presentation className="mx-auto h-8 w-8 text-black/20" /><p className="mt-3 text-sm font-semibold">{language === 'es' ? 'Crea o selecciona un webinar.' : 'Create or select a webinar.'}</p></div></section>}
    </div>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
