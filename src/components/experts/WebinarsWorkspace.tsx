import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, Copy, FileUp, Pencil, Plus, Search, Trash2, X } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  createOperationalWebinar,
  recordOperationalWebinarRegistration,
  subscribeExpertPeople,
  subscribeExpertWebinars,
  updateOperationalWebinar,
  type ExpertPerson,
  type ExpertWebinar,
  type WebinarAttendanceStatus,
  type WebinarInterest,
  type WebinarRegistration
} from '../../services/expertsAcquisition';
import { persistExpertWorkTask } from '../../services/expertsTaskMemory';
import {
  deleteWebinarCascade,
  deleteWebinarRegistration,
  updateWebinarParticipantIdentity,
  updateWebinarRegistration
} from '../../services/expertsWebinarAdmin';
import { subscribeWebinarRegistrationsNewest } from '../../services/expertsWebinarRegistrationFeed';
import { createWebinarWorkAction, webinarWorkPriority } from '../../services/expertsWebinarActions';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';
import { loadTasks, saveTasks, type WorkTask } from './workspaceState';

type ParticipantDraft = { name: string; email: string; phone: string };
type CsvRow = Record<string, string>;
const EMPTY_PARTICIPANT: ParticipantDraft = { name: '', email: '', phone: '' };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const values = line.split(/[,;\t]/);
    return Object.fromEntries(headers.map((key, index) => [key, (values[index] || '').trim()]));
  });
}

function pick(row: CsvRow, names: string[]) {
  for (const name of names) if (row[name]) return row[name];
  return '';
}

function attendance(value: string): WebinarAttendanceStatus {
  const normalized = value.toLowerCase();
  if (['attended', 'asistio', 'asistió', 'presente', 'present'].includes(normalized)) return 'attended';
  if (['no-show', 'noshow', 'ausente', 'absent'].includes(normalized)) return 'no-show';
  return 'registered';
}

function interest(value: string): WebinarInterest {
  const normalized = value.toLowerCase();
  if (['high', 'alto', 'alta'].includes(normalized)) return 'high';
  if (['medium', 'medio', 'media'].includes(normalized)) return 'medium';
  if (['low', 'bajo', 'baja'].includes(normalized)) return 'low';
  return 'unknown';
}

function formatDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    : value;
}

function localDate() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function needsFollowUp(registration: WebinarRegistration) {
  return !registration.purchased &&
    (registration.status === 'attended' || registration.status === 'no-show') &&
    registration.followUpStatus !== 'created' &&
    registration.followUpStatus !== 'completed';
}

function publicRegistrationLink(workspaceId: string, webinarId: string) {
  if (!workspaceId || !webinarId || typeof window === 'undefined') return '';
  return `${window.location.origin}/register/webinar?workspace=${encodeURIComponent(workspaceId)}&webinar=${encodeURIComponent(webinarId)}`;
}

export function WebinarsWorkspace({ language }: { language: Language }) {
  const [webinars, setWebinars] = useState<ExpertWebinar[]>([]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [workspaceId, setWorkspaceId] = useState('');
  const [selectedId, setSelectedId] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showParticipant, setShowParticipant] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [platform, setPlatform] = useState('Zoom');
  const [offer, setOffer] = useState('');
  const [editWebinar, setEditWebinar] = useState(false);

  const [participant, setParticipant] = useState<ParticipantDraft>(EMPTY_PARTICIPANT);
  const [editParticipant, setEditParticipant] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantEmail, setParticipantEmail] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [participantStatus, setParticipantStatus] = useState<WebinarAttendanceStatus>('registered');
  const [participantMinutes, setParticipantMinutes] = useState('0');
  const [participantInterest, setParticipantInterest] = useState<WebinarInterest>('unknown');
  const [participantPurchased, setParticipantPurchased] = useState(false);

  useEffect(() => {
    let stopWebinars: (() => void) | undefined;
    let stopPeople: (() => void) | undefined;
    void subscribeExpertWebinars((items) => {
      setWebinars(items);
      setSelectedId((current) => current || items[0]?.id || '');
    }).then((stop) => { stopWebinars = stop; });
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
      setWorkspaceId(team.workspaceId);
    }).catch(() => {});
    return () => { stopWebinars?.(); stopPeople?.(); };
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setRegistrations([]);
      return;
    }
    let stop: (() => void) | undefined;
    void subscribeWebinarRegistrationsNewest(selectedId, setRegistrations).then((unsubscribe) => { stop = unsubscribe; });
    return () => stop?.();
  }, [selectedId]);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selected = webinars.find((item) => item.id === selectedId) || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const filtered = registrations.filter((registration) => {
    const term = search.trim().toLowerCase();
    const person = peopleById.get(registration.personId);
    return !term || [person?.name || '', person?.email || '', person?.phone || '']
      .some((value) => value.toLowerCase().includes(term));
  });
  const registrationLink = selected ? publicRegistrationLink(workspaceId, selected.id) : '';
  const currentAssignee = () => members.find((member) => member.uid === currentUid) || members[0];
  const metrics = {
    registered: registrations.length,
    attended: registrations.filter((item) => item.status === 'attended').length,
    noShow: registrations.filter((item) => item.status === 'no-show').length,
    purchased: registrations.filter((item) => item.purchased).length
  };

  const resetWebinarDraft = () => {
    setTitle('');
    setStartsAt('');
    setPlatform('Zoom');
    setOffer('');
  };

  const create = async () => {
    if (!title.trim() || !startsAt || !platform.trim()) {
      setMessage(language === 'es' ? 'Completa nombre, fecha/hora y plataforma.' : 'Complete name, date/time and platform.');
      return;
    }
    setBusy(true);
    try {
      const id = await createOperationalWebinar({
        title,
        startsAt,
        platform,
        source: '',
        externalUrl: '',
        offerLabel: offer,
        status: 'scheduled'
      });
      resetWebinarDraft();
      setSelectedId(id);
      setShowCreate(false);
      setMessage(language === 'es' ? 'Webinar creado. El link de inscripción quedó generado.' : 'Webinar created. Registration link generated.');
    } finally {
      setBusy(false);
    }
  };

  const ensureFollowUp = async (registration: WebinarRegistration, person: ExpertPerson) => {
    if (!selected || registration.purchased) return;
    const assignee = currentAssignee();
    if (!assignee) return;
    await createWebinarWorkAction({
      registration,
      person,
      webinar: selected,
      assignee,
      type: 'whatsapp',
      dueDate: localDate(),
      kind: 'follow-up',
      priority: webinarWorkPriority(registration)
    });
  };

  const addParticipant = async () => {
    if (!selected || !participant.name.trim() || (!participant.email.trim() && !participant.phone.trim())) return;
    setBusy(true);
    try {
      await recordOperationalWebinarRegistration({
        webinarId: selected.id,
        name: participant.name,
        email: participant.email,
        phone: participant.phone,
        status: 'registered'
      });
      setParticipant(EMPTY_PARTICIPANT);
      setShowParticipant(false);
    } finally {
      setBusy(false);
    }
  };

  const closeLegacyFollowUp = async (registration: WebinarRegistration) => {
    if (!registration.followUpTaskId) return;
    const tasks = loadTasks();
    const task = tasks.find((item) => item.id === registration.followUpTaskId);
    if (!task || task.status === 'done') return;
    const updated: WorkTask = {
      ...task,
      status: 'done',
      result: language === 'es' ? 'Compra confirmada; pasa a Compradores.' : 'Purchase confirmed; moved to Buyers.',
      completedAt: new Date().toISOString()
    };
    saveTasks(tasks.map((item) => item.id === updated.id ? updated : item));
    await persistExpertWorkTask(updated);
  };

  const beginParticipantEdit = (registration: WebinarRegistration) => {
    const person = peopleById.get(registration.personId);
    if (!person) return;
    setEditParticipant(registration.id);
    setParticipantName(person.name);
    setParticipantEmail(person.email);
    setParticipantPhone(person.phone);
    setParticipantStatus(registration.status);
    setParticipantMinutes(String(registration.attendanceMinutes || 0));
    setParticipantInterest(registration.interest);
    setParticipantPurchased(registration.purchased);
  };

  const saveParticipant = async (registration: WebinarRegistration) => {
    if (!participantName.trim() || (!participantEmail.trim() && !participantPhone.trim())) return;
    setBusy(true);
    try {
      await updateWebinarParticipantIdentity(registration.personId, {
        name: participantName,
        email: participantEmail,
        phone: participantPhone
      });
      await updateWebinarRegistration({
        registrationId: registration.id,
        personId: registration.personId,
        status: participantStatus,
        attendanceMinutes: Number(participantMinutes) || 0,
        interest: participantInterest,
        purchased: participantPurchased
      });
      if (participantPurchased && !registration.purchased) await closeLegacyFollowUp(registration);
      setEditParticipant('');
      setMessage(language === 'es' ? 'Participante actualizado.' : 'Participant updated.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'IDENTITY_CONFLICT'
        ? (language === 'es' ? 'Ese email o teléfono ya pertenece a otra persona.' : 'That email or phone belongs to another person.')
        : (language === 'es' ? 'No se pudo guardar el participante.' : 'Could not save participant.'));
    } finally {
      setBusy(false);
    }
  };

  const removeParticipant = async (registration: WebinarRegistration) => {
    if (!window.confirm(language === 'es'
      ? '¿Eliminar este participante del webinar? La Persona y su historial se conservan.'
      : 'Remove this participant from the webinar? The Person and history remain.')) return;
    try {
      await deleteWebinarRegistration(registration.id);
      setEditParticipant('');
      setMessage(language === 'es' ? 'Participante eliminado del webinar.' : 'Participant removed from webinar.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo eliminar el participante.' : 'Could not remove participant.');
    }
  };

  const closeAndDistribute = async () => {
    if (!selected) return;
    setBusy(true);
    let buyers = 0;
    let followUps = 0;
    try {
      for (const registration of registrations) {
        const person = peopleById.get(registration.personId);
        if (!person) continue;
        if (registration.purchased) {
          buyers += 1;
          continue;
        }
        let nextRegistration = registration;
        if (registration.status === 'registered') {
          await updateWebinarRegistration({
            registrationId: registration.id,
            personId: registration.personId,
            status: 'no-show',
            attendanceMinutes: 0,
            interest: registration.interest,
            purchased: false
          });
          nextRegistration = { ...registration, status: 'no-show' };
        }
        if (needsFollowUp(nextRegistration)) {
          await ensureFollowUp(nextRegistration, person);
          followUps += 1;
        }
      }
      await updateOperationalWebinar(selected.id, { status: 'completed' });
      setMessage(language === 'es'
        ? `Distribución lista: ${buyers} compradores · ${followUps} no compradores a Seguimiento.`
        : `Distribution ready: ${buyers} buyers · ${followUps} non-buyers to Follow-up.`);
    } catch {
      setMessage(language === 'es' ? 'No se pudo completar la distribución.' : 'Could not complete distribution.');
    } finally {
      setBusy(false);
    }
  };

  const importCsv = async (file: File) => {
    if (!selected) return;
    setImporting(true);
    try {
      const rows = parseCsv(await file.text());
      for (const row of rows) {
        const email = pick(row, ['email', 'correo']);
        const phone = pick(row, ['phone', 'telefono', 'teléfono']);
        const name = pick(row, ['name', 'nombre']) || (email ? email.split('@')[0] : phone);
        if (!name || (!email && !phone)) continue;
        await recordOperationalWebinarRegistration({
          webinarId: selected.id,
          name,
          email,
          phone,
          status: attendance(pick(row, ['status', 'attendance', 'asistencia'])),
          attendanceMinutes: Number(pick(row, ['minutes', 'minutos', 'duration'])) || 0,
          interest: interest(pick(row, ['interest', 'interes', 'interés']))
        });
      }
      setMessage(language === 'es'
        ? 'Asistencia importada. La compra sigue siendo una señal separada.'
        : 'Attendance imported. Purchase remains a separate signal.');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const beginWebinarEdit = () => {
    if (!selected) return;
    setTitle(selected.title);
    setStartsAt(selected.startsAt);
    setPlatform(selected.platform || 'Zoom');
    setOffer(selected.offerLabel);
    setEditWebinar(true);
  };

  const saveWebinar = async () => {
    if (!selected || !title.trim() || !startsAt || !platform.trim()) return;
    setBusy(true);
    try {
      await updateOperationalWebinar(selected.id, {
        title,
        startsAt,
        platform,
        offerLabel: offer
      });
      setEditWebinar(false);
      setMessage(language === 'es' ? 'Webinar actualizado.' : 'Webinar updated.');
    } finally {
      setBusy(false);
    }
  };

  const deleteWebinar = async () => {
    if (!selected || !window.confirm(language === 'es'
      ? '¿Eliminar webinar y sus inscripciones? Las Personas se conservan en Relaciones.'
      : 'Delete webinar and registrations? People remain in Relationships.')) return;
    await deleteWebinarCascade(selected.id);
    setSelectedId('');
    setEditWebinar(false);
  };

  const copyLink = async () => {
    if (!registrationLink) return;
    try {
      await navigator.clipboard.writeText(registrationLink);
      setMessage(language === 'es' ? 'Link de inscripción copiado.' : 'Registration link copied.');
    } catch {}
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WEBINARS</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Registro → asistencia → compra → distribución' : 'Registration → attendance → purchase → distribution'}</h3>
          <p className="mt-2 max-w-3xl text-sm text-black/50">{language === 'es'
            ? 'El Webinar registra personas primero. Asistencia y compra se resuelven después como señales separadas.'
            : 'The Webinar registers people first. Attendance and purchase are resolved later as separate signals.'}</p>
        </div>
        <button type="button" onClick={() => { resetWebinarDraft(); setShowCreate((value) => !value); setEditWebinar(false); }} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">
          <Plus className="mr-1 inline h-4 w-4" />{language === 'es' ? 'Nuevo webinar' : 'New webinar'}
        </button>
      </div>
      {showCreate && <WebinarEditor language={language} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} platform={platform} setPlatform={setPlatform} offer={offer} setOffer={setOffer} onSave={() => void create()} onCancel={() => setShowCreate(false)} busy={busy} />}
    </section>

    <div className="grid gap-5 xl:grid-cols-[300px_1fr]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/7 p-4 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'EVENTOS' : 'EVENTS'}</div>
        <div className="max-h-[760px] divide-y divide-black/5 overflow-y-auto">
          {webinars.map((webinar) => <button key={webinar.id} type="button" onClick={() => setSelectedId(webinar.id)} className={`w-full p-4 text-left ${webinar.id === selectedId ? 'bg-[#F7F7F5]' : ''}`}>
            <p className="text-sm font-semibold">{webinar.title}</p>
            <p className="mt-1 text-xs text-black/40">{formatDate(webinar.startsAt, language)}</p>
            <p className="mt-1 text-[10px] uppercase text-black/30">{webinar.platform || '—'} · {webinar.status}</p>
          </button>)}
        </div>
      </section>

      {selected && <div className="space-y-5">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          {editWebinar ? <WebinarEditor language={language} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} platform={platform} setPlatform={setPlatform} offer={offer} setOffer={setOffer} onSave={() => void saveWebinar()} onCancel={() => setEditWebinar(false)} onDelete={() => void deleteWebinar()} busy={busy} /> : <>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2"><h4 className="text-xl font-semibold">{selected.title}</h4><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold">{selected.status}</span></div>
                <p className="mt-2 text-sm text-black/45"><CalendarDays className="mr-1 inline h-4 w-4" />{formatDate(selected.startsAt, language)} · {selected.platform || '—'}</p>
                {selected.offerLabel && <p className="mt-1 text-xs text-black/45">{language === 'es' ? 'Oferta asociada' : 'Associated offer'}: <strong>{selected.offerLabel}</strong></p>}
              </div>
              <button type="button" onClick={beginWebinarEdit} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Pencil className="mr-1 inline h-4 w-4" />{language === 'es' ? 'Editar' : 'Edit'}</button>
            </div>
            <div className="mt-4 rounded-xl bg-[#F7F7F5] p-3">
              <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'LINK DE INSCRIPCIÓN' : 'REGISTRATION LINK'}</p>
              <div className="mt-2 flex gap-2"><input readOnly value={registrationLink} className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/55" /><button type="button" onClick={() => void copyLink()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><Copy className="h-3.5 w-3.5" />{language === 'es' ? 'Copiar' : 'Copy'}</button></div>
              <p className="mt-2 text-[10px] text-black/35">{language === 'es' ? 'Este es el enlace que se compartirá en RR.SS. La conexión del formulario público se habilitará en el bloque de integraciones.' : 'Share this link on social channels. The public form connection will be enabled in the integrations block.'}</p>
            </div>
          </>}
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Metric label={language === 'es' ? 'INSCRITOS' : 'REGISTERED'} value={metrics.registered} />
            <Metric label={language === 'es' ? 'ASISTIERON' : 'ATTENDED'} value={metrics.attended} />
            <Metric label="NO-SHOW" value={metrics.noShow} />
            <Metric label={language === 'es' ? 'COMPRARON' : 'PURCHASED'} value={metrics.purchased} />
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="flex flex-col gap-3 border-b border-black/7 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div><p className="text-sm font-semibold">{language === 'es' ? 'Personas inscritas' : 'Registered people'}</p><p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Compra, asistencia e interés se actualizan después del registro.' : 'Purchase, attendance and interest are updated after registration.'}</p></div>
            <div className="flex flex-wrap gap-2">
              <label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar…' : 'Search…'} className="w-[220px] rounded-xl border border-black/10 py-2 pl-9 pr-3 text-xs" /></label>
              <input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} />
              <button type="button" disabled={importing} onClick={() => fileInput.current?.click()} className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold"><FileUp className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Importar asistencia' : 'Import attendance'}</button>
              <button type="button" onClick={() => setShowParticipant((value) => !value)} className="rounded-full bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Añadir inscrito' : 'Add registrant'}</button>
              <button type="button" disabled={busy} onClick={() => void closeAndDistribute()} className="rounded-full border border-[#0A3F4D]/20 px-3 py-2 text-xs font-semibold text-[#0A3F4D]"><CheckCircle2 className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Cerrar y distribuir' : 'Close & distribute'}</button>
            </div>
          </div>

          {showParticipant && <div className="grid gap-2 border-b border-black/7 bg-[#FAFAF8] p-4 md:grid-cols-[1fr_1fr_1fr_auto]">
            <input value={participant.name} onChange={(event) => setParticipant((current) => ({ ...current, name: event.target.value }))} placeholder={language === 'es' ? 'Nombre' : 'Name'} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <input value={participant.email} onChange={(event) => setParticipant((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <input value={participant.phone} onChange={(event) => setParticipant((current) => ({ ...current, phone: event.target.value }))} placeholder={language === 'es' ? 'Teléfono' : 'Phone'} className="rounded-lg border border-black/10 px-3 py-2 text-sm" />
            <button type="button" disabled={busy} onClick={() => void addParticipant()} className="rounded-lg bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Añadir' : 'Add'}</button>
          </div>}

          <div className="divide-y divide-black/5">{filtered.map((registration) => {
            const person = peopleById.get(registration.personId);
            const editing = editParticipant === registration.id;
            return <div key={registration.id} className="p-4">
              {!editing ? <div className="grid gap-3 lg:grid-cols-[1fr_110px_100px_100px_auto] lg:items-center">
                <div><p className="text-sm font-semibold">{person?.name || registration.personId}</p><p className="mt-1 text-xs text-black/40">{person?.email || person?.phone || '—'}</p></div>
                <span className="text-xs text-black/50">{registration.status}</span>
                <span className="text-xs text-black/50">{registration.attendanceMinutes} min</span>
                <span className={`text-xs font-semibold ${registration.purchased ? 'text-[#17603D]' : 'text-black/35'}`}>{registration.purchased ? (language === 'es' ? 'Compró' : 'Purchased') : (language === 'es' ? 'Sin compra' : 'No purchase')}</span>
                <button type="button" onClick={() => beginParticipantEdit(registration)} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Pencil className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button>
              </div> : <div className="rounded-xl bg-[#FAFAF8] p-3">
                <div className="grid gap-2 md:grid-cols-3">
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={participantName} onChange={(event) => setParticipantName(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">Email</span><input value={participantEmail} onChange={(event) => setParticipantEmail(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Teléfono' : 'Phone'}</span><input value={participantPhone} onChange={(event) => setParticipantPhone(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Asistencia' : 'Attendance'}</span><select value={participantStatus} onChange={(event) => setParticipantStatus(event.target.value as WebinarAttendanceStatus)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="registered">{language === 'es' ? 'Inscrito' : 'Registered'}</option><option value="attended">{language === 'es' ? 'Asistió' : 'Attended'}</option><option value="no-show">No-show</option></select></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Tiempo en reunión (min)' : 'Meeting time (min)'}</span><input type="number" min="0" value={participantMinutes} onChange={(event) => setParticipantMinutes(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></label>
                  <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Interés' : 'Interest'}</span><select value={participantInterest} onChange={(event) => setParticipantInterest(event.target.value as WebinarInterest)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="unknown">{language === 'es' ? 'Sin determinar' : 'Unknown'}</option><option value="low">{language === 'es' ? 'Bajo' : 'Low'}</option><option value="medium">{language === 'es' ? 'Medio' : 'Medium'}</option><option value="high">{language === 'es' ? 'Alto' : 'High'}</option></select></label>
                </div>
                <label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={participantPurchased} onChange={(event) => setParticipantPurchased(event.target.checked)} />{language === 'es' ? 'Compra confirmada' : 'Purchase confirmed'}</label>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void saveParticipant(registration)} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button>
                  <button type="button" onClick={() => setEditParticipant('')} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button>
                  <button type="button" onClick={() => void removeParticipant(registration)} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar participante' : 'Remove participant'}</button>
                </div>
              </div>}
            </div>;
          })}
          {filtered.length === 0 && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'Sin personas inscritas.' : 'No registered people.'}</div>}
          </div>
        </section>
        {message && <p className="rounded-xl bg-[#F7F7F5] px-4 py-3 text-xs text-black/55">{message}</p>}
      </div>}
    </div>
  </div>;
}

function WebinarEditor({
  language,
  title,
  setTitle,
  startsAt,
  setStartsAt,
  platform,
  setPlatform,
  offer,
  setOffer,
  onSave,
  onCancel,
  onDelete,
  busy
}: {
  language: Language;
  title: string;
  setTitle: (value: string) => void;
  startsAt: string;
  setStartsAt: (value: string) => void;
  platform: string;
  setPlatform: (value: string) => void;
  offer: string;
  setOffer: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  busy: boolean;
}) {
  return <div className="mt-4 rounded-xl bg-[#FAFAF8] p-4">
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Nombre' : 'Name'}</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder={language === 'es' ? 'Nombre del webinar' : 'Webinar name'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Fecha y hora' : 'Date and time'}</span><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Plataforma' : 'Platform'}</span><select value={platform} onChange={(event) => setPlatform(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="Zoom">Zoom</option><option value="Google Meet">Google Meet</option><option value="YouTube Live">YouTube Live</option><option value="Microsoft Teams">Microsoft Teams</option><option value="Otra">{language === 'es' ? 'Otra' : 'Other'}</option></select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Oferta asociada' : 'Associated offer'}</span><input value={offer} onChange={(event) => setOffer(event.target.value)} placeholder={language === 'es' ? 'Ej. Programa Escala' : 'e.g. Scale Program'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
    </div>
    <div className="mt-3 rounded-lg border border-dashed border-black/10 bg-white px-3 py-2 text-xs text-black/45">{language === 'es' ? 'El link público de inscripción se genera automáticamente después de crear el webinar.' : 'The public registration link is generated automatically after creating the webinar.'}</div>
    <div className="mt-4 flex flex-wrap gap-2">
      <button type="button" disabled={busy} onClick={onSave} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar' : 'Save')}</button>
      <button type="button" onClick={onCancel} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button>
      {onDelete && <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar webinar' : 'Delete webinar'}</button>}
    </div>
  </div>;
}

function Metric({ label, value }: { label: string; value: number }) {
  return <div className="rounded-xl bg-[#FAFAF8] px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>;
}
