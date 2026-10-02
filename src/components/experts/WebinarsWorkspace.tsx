import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CalendarDays,
  ExternalLink,
  FileUp,
  Plus,
  Presentation,
  Search,
  ShoppingBag,
  Users
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  createOperationalWebinar,
  recordOperationalWebinarRegistration,
  subscribeExpertPeople,
  subscribeExpertWebinars,
  updateOperationalWebinar,
  type ExpertPerson,
  type ExpertWebinar,
  type ExpertWebinarStatus,
  type WebinarAttendanceStatus,
  type WebinarInterest,
  type WebinarRegistration
} from '../../services/expertsAcquisition';
import { subscribeWebinarRegistrationsNewest } from '../../services/expertsWebinarRegistrationFeed';
import {
  createWebinarWorkAction,
  webinarNeedsWorkAction,
  webinarWorkActionKind,
  webinarWorkPriority,
  type WebinarWorkActionType
} from '../../services/expertsWebinarActions';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type ParticipantDraft = { name: string; email: string; phone: string };
type CsvRow = Record<string, string>;
const EMPTY_PARTICIPANT: ParticipantDraft = { name: '', email: '', phone: '' };

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
      row.push(field.trim()); field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field.trim()); field = '';
      if (row.some(Boolean)) rows.push(row);
      row = [];
    } else field += char;
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
    const wanted = name.replace(/[ _-]/g, '').toLowerCase();
    const found = Object.entries(row).find(([key]) => key.replace(/[ _-]/g, '').toLowerCase() === wanted);
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

function formatWebinarDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
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

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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

  useEffect(() => {
    let stopWebinars: (() => void) | undefined;
    let stopPeople: (() => void) | undefined;
    void subscribeExpertWebinars((next) => {
      setWebinars(next);
      setSelectedId((current) => current || next[0]?.id || '');
    }).then((stop) => { stopWebinars = stop; }).catch(() => {});
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; }).catch(() => {});
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
    }).catch(() => {});
    return () => { stopWebinars?.(); stopPeople?.(); };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  useEffect(() => {
    if (!selectedId) { setRegistrations([]); return; }
    let stop: (() => void) | undefined;
    void subscribeWebinarRegistrationsNewest(selectedId, setRegistrations)
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
      return [person?.name || '', person?.email || '', person?.phone || ''].some((value) => value.toLowerCase().includes(term));
    });
  }, [registrations, peopleById, search]);

  const metrics = useMemo(() => ({
    registered: registrations.length,
    attended: registrations.filter((item) => item.status === 'attended').length,
    noShow: registrations.filter((item) => item.status === 'no-show').length,
    purchased: registrations.filter((item) => item.purchased).length,
    pendingActions: registrations.filter(webinarNeedsWorkAction).length
  }), [registrations]);

  const selectedAssignee = () => members.find((member) => member.uid === currentUid) || members[0];

  const createWebinar = async () => {
    if (!title.trim()) return;
    setBusy(true);
    try {
      const id = await createOperationalWebinar({ title, startsAt, platform, externalUrl, source, offerLabel, status: 'scheduled' });
      setTitle(''); setStartsAt(''); setExternalUrl(''); setSource(''); setOfferLabel('');
      setSelectedId(id); setShowCreate(false);
      setMessage(language === 'es' ? 'Webinar creado.' : 'Webinar created.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear el webinar.' : 'Could not create webinar.');
    } finally { setBusy(false); }
  };

  const ensureWorkAction = async (registration: WebinarRegistration, person: ExpertPerson, options?: { type?: WebinarWorkActionType; dueDate?: string; dueTime?: string }) => {
    if (!selected) return;
    const assignee = selectedAssignee();
    if (!assignee) return;
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
  };

  const addParticipant = async () => {
    if (!selected) return;
    if (!participant.name.trim() || (!participant.email.trim() && !participant.phone.trim())) {
      setMessage(language === 'es' ? 'Ingresa nombre y al menos email o teléfono.' : 'Enter a name and at least an email or phone.');
      return;
    }
    setBusy(true);
    try {
      await recordOperationalWebinarRegistration({ webinarId: selected.id, name: participant.name, email: participant.email, phone: participant.phone, status: 'registered' });
      setParticipant(EMPTY_PARTICIPANT);
      setShowParticipant(false);
      setMessage(language === 'es' ? 'Persona registrada para asistir. La compra se detecta como un evento separado.' : 'Person registered to attend. Purchase is detected as a separate event.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'IDENTITY_CONFLICT'
        ? (language === 'es' ? 'Existe un conflicto de identidad por email/teléfono.' : 'There is an email/phone identity conflict.')
        : (language === 'es' ? 'No se pudo registrar la persona.' : 'Could not register person.'));
    } finally { setBusy(false); }
  };

  const updateRegistration = async (registration: WebinarRegistration, patch: { status?: WebinarAttendanceStatus; attendanceMinutes?: number; interest?: WebinarInterest }) => {
    if (!selected) return;
    const person = peopleById.get(registration.personId);
    if (!person) return;
    const next: WebinarRegistration = { ...registration, ...patch };
    try {
      await recordOperationalWebinarRegistration({
        webinarId: selected.id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        status: next.status,
        attendanceMinutes: next.attendanceMinutes,
        interest: next.interest
      });
      if (!next.purchased && (next.status === 'attended' || next.status === 'no-show') && next.followUpStatus !== 'created' && next.followUpStatus !== 'completed') {
        await ensureWorkAction(next, person, { type: 'whatsapp', dueDate: localDate() });
      }
    } catch {
      setMessage(language === 'es' ? 'No se pudo actualizar la asistencia.' : 'Could not update attendance.');
    }
  };

  const registerPurchase = async (registration: WebinarRegistration) => {
    if (!selected || registration.purchased) return;
    const person = peopleById.get(registration.personId);
    if (!person) return;
    setBusy(true);
    try {
      await recordOperationalWebinarRegistration({
        webinarId: selected.id,
        name: person.name,
        email: person.email,
        phone: person.phone,
        status: registration.status,
        attendanceMinutes: registration.attendanceMinutes,
        interest: registration.interest,
        purchased: true
      });
      const purchased: WebinarRegistration = { ...registration, purchased: true, followUpStatus: 'not-needed' };
      await ensureWorkAction(purchased, person, { type: 'task', dueDate: localDate() });
      setMessage(language === 'es' ? 'Compra registrada como evento separado · integración enviada a Trabajo prioritario.' : 'Purchase recorded as a separate event · enrollment sent to Priority Work.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo registrar la compra.' : 'Could not record purchase.');
    } finally { setBusy(false); }
  };

  const importCsv = async (file: File) => {
    if (!selected) return;
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      let imported = 0;
      let skipped = 0;
      let followUps = 0;
      for (const row of rows) {
        const email = pick(row, ['email', 'correo', 'e-mail']);
        const phone = pick(row, ['phone', 'telefono', 'teléfono', 'mobile', 'celular']);
        const rawName = pick(row, ['name', 'nombre', 'full name', 'fullname', 'attendee name']);
        const name = rawName || (email ? email.split('@')[0] : phone);
        if (!name || (!email && !phone)) { skipped += 1; continue; }
        const status = parseAttendance(pick(row, ['status', 'attendance', 'asistencia', 'attendance status']));
        const minutesRaw = pick(row, ['attendance minutes', 'attendanceminutes', 'minutes', 'minutos', 'duration', 'duracion', 'duración']);
        const attendanceMinutes = Number(minutesRaw.replace(/[^0-9.]/g, '')) || 0;
        const interest = parseInterest(pick(row, ['interest', 'interes', 'interés']));
        try {
          const result = await recordOperationalWebinarRegistration({ webinarId: selected.id, name, email, phone, status, attendanceMinutes, interest });
          imported += 1;
          if (status === 'attended' || status === 'no-show') {
            const person: ExpertPerson = { id: result.personId, name, email, phone, firstSource: 'webinar', latestSource: 'webinar', currentStage: 'webinar', outcomeMemory: {} };
            const registration: WebinarRegistration = { id: result.registrationId, personId: result.personId, webinarId: selected.id, status, attendanceMinutes, purchased: false, interest, followUpStatus: 'needed' };
            await ensureWorkAction(registration, person, { type: 'whatsapp', dueDate: localDate() });
            followUps += 1;
          }
        } catch { skipped += 1; }
      }
      setMessage(language === 'es'
        ? `CSV procesado: ${imported} registros${followUps ? ` · ${followUps} seguimientos creados` : ''}${skipped ? ` · ${skipped} omitidos` : ''}. Las compras no se importan desde esta lista.`
        : `CSV processed: ${imported} registrations${followUps ? ` · ${followUps} follow-ups created` : ''}${skipped ? ` · ${skipped} skipped` : ''}. Purchases are not imported from this attendee list.`);
    } catch {
      setMessage(language === 'es' ? 'No se pudo procesar el CSV.' : 'Could not process CSV.');
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
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WEBINARS</p><h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Registro, asistencia y compra son eventos distintos' : 'Registration, attendance and purchase are separate events'}</h3><p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">{language === 'es' ? 'Aquí administras quién se registró y qué ocurrió en el evento. Una compra posterior no se declara al inscribir a la persona: llega como una señal independiente y activa su integración.' : 'Manage who registered and what happened at the event. A later purchase is not declared at registration: it arrives as a separate signal and triggers enrollment.'}</p></div><button type="button" onClick={() => setShowCreate((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Nuevo webinar' : 'New webinar'}</button></div>

      {showCreate && <div className="mt-5 grid gap-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4 md:grid-cols-2 xl:grid-cols-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE' : 'TITLE'}</span><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'FECHA Y HORA' : 'DATE & TIME'}</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PLATAFORMA' : 'PLATFORM'}</span><input value={platform} onChange={(event) => setPlatform(event.target.value)} placeholder="Zoom" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'ENLACE DEL EVENTO' : 'EVENT LINK'}</span><input value={externalUrl} onChange={(event) => setExternalUrl(event.target.value)} placeholder="https://…" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'ORIGEN / CAMPAÑA' : 'SOURCE / CAMPAIGN'}</span><input value={source} onChange={(event) => setSource(event.target.value)} placeholder="Instagram / Meta Ads" className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'OFERTA ASOCIADA' : 'RELATED OFFER'}</span><input value={offerLabel} onChange={(event) => setOfferLabel(event.target.value)} placeholder={language === 'es' ? 'Formación Escala' : 'Scale Program'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><div className="flex gap-2 md:col-span-2 xl:col-span-3"><button type="button" disabled={busy || !title.trim()} onClick={() => void createWebinar()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Guardar webinar' : 'Save webinar'}</button><button type="button" onClick={() => setShowCreate(false)} className="rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/55">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/7 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'EVENTOS' : 'EVENTS'}</p></div><div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{webinars.map((webinar) => <button key={webinar.id} type="button" onClick={() => setSelectedId(webinar.id)} className={`w-full p-4 text-left ${selectedId === webinar.id ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}><div className="flex items-start gap-3"><Presentation className="mt-0.5 h-4 w-4 text-[#0A3F4D]" /><div className="min-w-0"><p className="truncate text-sm font-semibold">{webinar.title}</p><p className="mt-1 text-xs text-black/40">{formatWebinarDate(webinar.startsAt, language)}</p><p className="mt-1 truncate text-[10px] uppercase tracking-[0.08em] text-black/30">{webinar.platform || '—'} · {webinar.status}</p></div></div></button>)}{webinars.length === 0 && <div className="p-7 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay webinars.' : 'No webinars yet.'}</div>}</div></section>

      {selected ? <div className="space-y-5">
        <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-xl font-semibold">{selected.title}</h4><select value={selected.status} onChange={(event) => void updateWebinarStatus(event.target.value as ExpertWebinarStatus)} className="rounded-full border border-black/10 bg-white px-2.5 py-1 text-[10px] font-semibold"><option value="draft">Draft</option><option value="scheduled">{language === 'es' ? 'Programado' : 'Scheduled'}</option><option value="completed">{language === 'es' ? 'Completado' : 'Completed'}</option><option value="cancelled">{language === 'es' ? 'Cancelado' : 'Cancelled'}</option></select></div><p className="mt-2 text-sm text-black/45"><CalendarDays className="mr-1.5 inline h-4 w-4" />{formatWebinarDate(selected.startsAt, language)} · {selected.platform || '—'}</p>{selected.offerLabel && <p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Oferta: ' : 'Offer: '}{selected.offerLabel}</p>}{selected.externalUrl && <a href={selected.externalUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#0A3F4D]">{language === 'es' ? 'Abrir plataforma' : 'Open platform'}<ExternalLink className="h-3.5 w-3.5" /></a>}</div><div className="flex flex-wrap gap-2"><input ref={fileInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} /><button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold text-black/60 disabled:opacity-40"><FileUp className="h-4 w-4" />{importing ? (language === 'es' ? 'Importando…' : 'Importing…') : 'Importar CSV'}</button><button type="button" onClick={() => setShowParticipant((value) => !value)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Añadir inscrito' : 'Add registrant'}</button></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2 border-t border-black/6 pt-4 sm:grid-cols-5">{[[language === 'es' ? 'Registrados' : 'Registered', metrics.registered],[language === 'es' ? 'Asistieron' : 'Attended', metrics.attended],['No-show', metrics.noShow],[language === 'es' ? 'Compras detectadas' : 'Purchases detected', metrics.purchased],[language === 'es' ? 'Acciones pendientes' : 'Pending actions', metrics.pendingActions]].map(([label, value]) => <div key={String(label)} className="rounded-xl bg-[#F7F7F5] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}</div>
          {showParticipant && <div className="mt-4 rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="grid gap-3 md:grid-cols-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE Y APELLIDOS' : 'FULL NAME'}</span><input value={participant.name} onChange={(event) => setParticipant((current) => ({ ...current, name: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">EMAIL</span><input value={participant.email} onChange={(event) => setParticipant((current) => ({ ...current, email: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TELÉFONO' : 'PHONE'}</span><input value={participant.phone} onChange={(event) => setParticipant((current) => ({ ...current, phone: event.target.value }))} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-[10px] leading-4 text-black/40">{language === 'es' ? 'Solo registra intención de asistir. Compra, asistencia e interés se actualizan después como eventos distintos.' : 'This only records intent to attend. Purchase, attendance and interest are updated later as separate events.'}</p><button type="button" disabled={busy} onClick={() => void addParticipant()} className="shrink-0 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Registrar' : 'Register'}</button></div></div>}
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="flex flex-col gap-3 border-b border-black/7 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{language === 'es' ? 'Personas inscritas' : 'Registered people'}</p></div><label className="relative block sm:w-[330px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar persona…' : 'Search person…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2 pl-9 pr-3 text-sm" /></label></div><div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{filteredRegistrations.map((registration) => { const person = peopleById.get(registration.personId); if (!person) return null; return <div key={registration.id} className="p-4"><div className="grid gap-3 xl:grid-cols-[minmax(220px,1fr)_150px_130px_120px_150px_auto] xl:items-center"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{person.name}</p>{registration.purchased && <span className="rounded-full bg-[#1E7A4D]/10 px-2 py-0.5 text-[9px] font-semibold text-[#17603D]">{language === 'es' ? 'COMPRA DETECTADA' : 'PURCHASE DETECTED'}</span>}</div><p className="mt-1 truncate text-xs text-black/40">{person.email || person.phone || '—'}</p></div><select value={registration.status} onChange={(event) => void updateRegistration(registration, { status: event.target.value as WebinarAttendanceStatus })} className="rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs"><option value="registered">{statusLabel('registered', language)}</option><option value="attended">{statusLabel('attended', language)}</option><option value="no-show">No-show</option></select><label className="flex items-center gap-2"><input type="number" min={0} max={10000} value={registration.attendanceMinutes} onChange={(event) => void updateRegistration(registration, { attendanceMinutes: Number(event.target.value) || 0 })} className="w-20 rounded-lg border border-black/10 bg-white px-2 py-2 text-xs" /><span className="text-[10px] text-black/35">min</span></label><select value={registration.interest} onChange={(event) => void updateRegistration(registration, { interest: event.target.value as WebinarInterest })} className="rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs"><option value="unknown">{interestLabel('unknown', language)}</option><option value="low">{interestLabel('low', language)}</option><option value="medium">{interestLabel('medium', language)}</option><option value="high">{interestLabel('high', language)}</option></select><div className="text-xs text-black/45">{registration.followUpStatus === 'created' ? (language === 'es' ? 'En Priority Work' : 'In Priority Work') : registration.followUpStatus === 'completed' ? (language === 'es' ? 'Gestionado' : 'Handled') : registration.purchased ? (language === 'es' ? 'Integración pendiente/creada' : 'Enrollment pending/created') : '—'}</div><div className="flex flex-wrap justify-end gap-2">{!registration.purchased && <button type="button" disabled={busy} onClick={() => void registerPurchase(registration)} className="inline-flex items-center gap-1.5 rounded-full border border-[#1E7A4D]/15 bg-white px-3 py-2 text-[10px] font-semibold text-[#17603D]"><ShoppingBag className="h-3.5 w-3.5" />{language === 'es' ? 'Registrar compra*' : 'Record purchase*'}</button>}{webinarNeedsWorkAction(registration) && !registration.purchased && <button type="button" onClick={() => void ensureWorkAction(registration, person, { type: 'whatsapp', dueDate: localDate() })} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white">{language === 'es' ? 'Enviar a Priority' : 'Send to Priority'}</button>}</div></div>{!registration.purchased && <p className="mt-2 text-[9px] leading-4 text-black/30">* {language === 'es' ? 'Fallback manual para pruebas. En producción este evento vendrá del webhook de la pasarela de pago.' : 'Manual fallback for testing. In production this event will come from the payment provider webhook.'}</p>}</div>; })}{filteredRegistrations.length === 0 && <div className="p-9 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay personas registradas en este webinar.' : 'No one is registered for this webinar yet.'}</div>}</div></section>
      </div> : <div className="rounded-2xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-black/35">{language === 'es' ? 'Selecciona o crea un webinar.' : 'Select or create a webinar.'}</div>}
    </div>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
