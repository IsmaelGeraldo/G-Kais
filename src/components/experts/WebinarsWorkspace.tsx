import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, CheckCircle2, ChevronDown, Copy, FileUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
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
import { deleteWebinarCascade, deleteWebinarRegistration, updateWebinarParticipant } from '../../services/expertsWebinarAdmin';
import { subscribeWebinarRegistrationsNewest } from '../../services/expertsWebinarRegistrationFeed';
import { createWebinarWorkAction, webinarWorkPriority } from '../../services/expertsWebinarActions';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';
import { loadTasks, saveTasks, type WorkTask } from './workspaceState';

type ParticipantDraft = { name: string; email: string; phone: string };
type CsvRow = Record<string, string>;
const EMPTY_PARTICIPANT: ParticipantDraft = { name: '', email: '', phone: '' };

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => { const values = line.split(/[,;\t]/); return Object.fromEntries(headers.map((key, index) => [key, (values[index] || '').trim()])); });
}
function pick(row: CsvRow, names: string[]) { for (const name of names) if (row[name]) return row[name]; return ''; }
function attendance(value: string): WebinarAttendanceStatus {
  const normalized = value.toLowerCase(); if (['attended', 'asistio', 'asistió', 'presente', 'present'].includes(normalized)) return 'attended'; if (['no-show', 'noshow', 'ausente', 'absent'].includes(normalized)) return 'no-show'; return 'registered';
}
function interest(value: string): WebinarInterest {
  const normalized = value.toLowerCase(); if (['high', 'alto', 'alta'].includes(normalized)) return 'high'; if (['medium', 'medio', 'media'].includes(normalized)) return 'medium'; if (['low', 'bajo', 'baja'].includes(normalized)) return 'low'; return 'unknown';
}
function formatDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date'; const date = new Date(value);
  return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date) : value;
}
function localDate() { const date = new Date(); return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`; }
function needsFollowUp(registration: WebinarRegistration) { return !registration.purchased && (registration.status === 'attended' || registration.status === 'no-show') && registration.followUpStatus !== 'created' && registration.followUpStatus !== 'completed'; }
function appOrigin() {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  return typeof window !== 'undefined' ? window.location.origin : '';
}
function publicRegistrationLink(workspaceId: string, webinarId: string) {
  const origin = appOrigin(); if (!origin || !workspaceId || !webinarId) return '';
  return `${origin}/register/webinar?workspace=${encodeURIComponent(workspaceId)}&webinar=${encodeURIComponent(webinarId)}`;
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
  const [showLink, setShowLink] = useState(false);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState(''); const [startsAt, setStartsAt] = useState(''); const [platform, setPlatform] = useState('Zoom'); const [offer, setOffer] = useState(''); const [editWebinar, setEditWebinar] = useState(false);
  const [participant, setParticipant] = useState<ParticipantDraft>(EMPTY_PARTICIPANT);
  const [editParticipant, setEditParticipant] = useState(''); const [participantName, setParticipantName] = useState(''); const [participantEmail, setParticipantEmail] = useState(''); const [participantPhone, setParticipantPhone] = useState(''); const [participantStatus, setParticipantStatus] = useState<WebinarAttendanceStatus>('registered'); const [participantMinutes, setParticipantMinutes] = useState('0'); const [participantInterest, setParticipantInterest] = useState<WebinarInterest>('unknown'); const [participantPurchased, setParticipantPurchased] = useState(false);

  useEffect(() => {
    let stopWebinars: (() => void) | undefined; let stopPeople: (() => void) | undefined;
    void subscribeExpertWebinars((items) => { setWebinars(items); setSelectedId((current) => current && items.some((item) => item.id === current) ? current : items[0]?.id || ''); }).then((stop) => { stopWebinars = stop; });
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void loadExpertWorkspaceTeam().then((team) => { setMembers(team.members.filter((member) => member.status === 'active')); setCurrentUid(team.currentUid); setWorkspaceId(team.workspaceId); }).catch(() => {});
    return () => { stopWebinars?.(); stopPeople?.(); };
  }, []);
  useEffect(() => { if (!selectedId) { setRegistrations([]); return; } let stop: (() => void) | undefined; void subscribeWebinarRegistrationsNewest(selectedId, setRegistrations).then((unsubscribe) => { stop = unsubscribe; }); return () => stop?.(); }, [selectedId]);
  useEffect(() => { setShowLink(false); setEditParticipant(''); setEditWebinar(false); }, [selectedId]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 5000); return () => window.clearTimeout(timer); }, [message]);

  const selected = webinars.find((item) => item.id === selectedId) || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const filtered = registrations.filter((registration) => { const term = search.trim().toLowerCase(); const person = peopleById.get(registration.personId); return !term || [person?.name || '', person?.email || '', person?.phone || ''].some((value) => value.toLowerCase().includes(term)); });
  const registrationLink = selected ? publicRegistrationLink(workspaceId, selected.id) : '';
  const currentAssignee = () => members.find((member) => member.uid === currentUid) || members[0];
  const metrics = { registered: registrations.length, attended: registrations.filter((item) => item.status === 'attended').length, noShow: registrations.filter((item) => item.status === 'no-show').length, purchased: registrations.filter((item) => item.purchased).length };

  const resetWebinarDraft = () => { setTitle(''); setStartsAt(''); setPlatform('Zoom'); setOffer(''); };
  const create = async () => {
    if (!title.trim() || !startsAt || !platform.trim()) { setMessage(language === 'es' ? 'Completa nombre, fecha/hora y plataforma.' : 'Complete name, date/time and platform.'); return; }
    setBusy(true);
    try { const id = await createOperationalWebinar({ title, startsAt, platform, source: '', externalUrl: '', offerLabel: offer, status: 'scheduled' }); resetWebinarDraft(); setSelectedId(id); setShowCreate(false); setMessage(language === 'es' ? 'Webinar creado.' : 'Webinar created.'); }
    catch { setMessage(language === 'es' ? 'No se pudo crear el webinar.' : 'Could not create webinar.'); }
    finally { setBusy(false); }
  };
  const addParticipant = async () => {
    if (!selected || !participant.name.trim() || (!participant.email.trim() && !participant.phone.trim())) return; setBusy(true);
    try { await recordOperationalWebinarRegistration({ webinarId: selected.id, name: participant.name, email: participant.email, phone: participant.phone, status: 'registered' }); setParticipant(EMPTY_PARTICIPANT); setShowParticipant(false); setMessage(language === 'es' ? 'Persona inscrita.' : 'Registrant added.'); }
    catch { setMessage(language === 'es' ? 'No se pudo añadir la persona.' : 'Could not add person.'); }
    finally { setBusy(false); }
  };
  const closeLegacyFollowUp = async (registration: WebinarRegistration) => {
    if (!registration.followUpTaskId) return; const tasks = loadTasks(); const task = tasks.find((item) => item.id === registration.followUpTaskId); if (!task || task.status === 'done') return;
    const updated: WorkTask = { ...task, status: 'done', result: language === 'es' ? 'Compra confirmada; pasa a Compradores.' : 'Purchase confirmed; moved to Buyers.', completedAt: new Date().toISOString() };
    saveTasks(tasks.map((item) => item.id === updated.id ? updated : item)); await persistExpertWorkTask(updated);
  };
  const beginParticipantEdit = (registration: WebinarRegistration) => {
    const person = peopleById.get(registration.personId); if (!person) return;
    setEditParticipant(registration.id); setParticipantName(person.name); setParticipantEmail(person.email); setParticipantPhone(person.phone); setParticipantStatus(registration.status); setParticipantMinutes(String(registration.attendanceMinutes || 0)); setParticipantInterest(registration.interest); setParticipantPurchased(registration.purchased);
  };
  const saveParticipant = async (registration: WebinarRegistration) => {
    if (!participantName.trim() || (!participantEmail.trim() && !participantPhone.trim())) { setMessage(language === 'es' ? 'Nombre y email o teléfono son obligatorios.' : 'Name and email or phone are required.'); return; }
    setBusy(true);
    try {
      await updateWebinarParticipant({ registrationId: registration.id, personId: registration.personId, name: participantName, email: participantEmail, phone: participantPhone, status: participantStatus, attendanceMinutes: Number(participantMinutes) || 0, interest: participantInterest, purchased: participantPurchased });
      if (participantPurchased && !registration.purchased) await closeLegacyFollowUp(registration);
      setEditParticipant(''); setMessage(language === 'es' ? 'Participante actualizado.' : 'Participant updated.');
    } catch (error) { setMessage(error instanceof Error && error.message === 'IDENTITY_CONFLICT' ? (language === 'es' ? 'Ese email o teléfono ya pertenece a otra persona.' : 'That email or phone belongs to another person.') : (language === 'es' ? 'No se pudo guardar el participante.' : 'Could not save participant.')); }
    finally { setBusy(false); }
  };
  const removeParticipant = async (registration: WebinarRegistration) => {
    if (!window.confirm(language === 'es' ? '¿Eliminar este participante del webinar? La Persona y su historial se conservan.' : 'Remove this participant from the webinar? The Person and history remain.')) return;
    setBusy(true);
    try { await deleteWebinarRegistration(registration.id); setEditParticipant(''); setMessage(language === 'es' ? 'Participante eliminado del webinar.' : 'Participant removed.'); }
    catch { setMessage(language === 'es' ? 'No se pudo eliminar el participante.' : 'Could not remove participant.'); }
    finally { setBusy(false); }
  };

  const ensureFollowUp = async (registration: WebinarRegistration, person: ExpertPerson) => {
    if (!selected || registration.purchased) return; const assignee = currentAssignee(); if (!assignee) return;
    await createWebinarWorkAction({ registration, person, webinar: selected, assignee, type: 'whatsapp', dueDate: localDate(), kind: 'follow-up', priority: webinarWorkPriority(registration) });
  };
  const closeAndDistribute = async () => {
    if (!selected) return; setBusy(true); let buyers = 0; let followUps = 0;
    try {
      for (const registration of registrations) {
        const person = peopleById.get(registration.personId); if (!person) continue; if (registration.purchased) { buyers += 1; continue; }
        let next = registration;
        if (registration.status === 'registered') { await updateWebinarParticipant({ registrationId: registration.id, personId: registration.personId, name: person.name, email: person.email, phone: person.phone, status: 'no-show', attendanceMinutes: 0, interest: registration.interest, purchased: false }); next = { ...registration, status: 'no-show' }; }
        if (needsFollowUp(next)) { await ensureFollowUp(next, person); followUps += 1; }
      }
      await updateOperationalWebinar(selected.id, { status: 'completed' });
      setMessage(language === 'es' ? `Distribución lista: ${buyers} compradores · ${followUps} a Seguimiento.` : `Distribution ready: ${buyers} buyers · ${followUps} to Follow-up.`);
    } catch { setMessage(language === 'es' ? 'No se pudo completar la distribución.' : 'Could not complete distribution.'); }
    finally { setBusy(false); }
  };
  const importCsv = async (file: File) => {
    if (!selected) return; setImporting(true);
    try { const rows = parseCsv(await file.text()); for (const row of rows) { const email = pick(row, ['email', 'correo']); const phone = pick(row, ['phone', 'telefono', 'teléfono']); const name = pick(row, ['name', 'nombre']) || (email ? email.split('@')[0] : phone); if (!name || (!email && !phone)) continue; await recordOperationalWebinarRegistration({ webinarId: selected.id, name, email, phone, status: attendance(pick(row, ['status', 'attendance', 'asistencia'])), attendanceMinutes: Number(pick(row, ['minutes', 'minutos', 'duration'])) || 0, interest: interest(pick(row, ['interest', 'interes', 'interés'])) }); } setMessage(language === 'es' ? 'Asistencia importada.' : 'Attendance imported.'); }
    finally { setImporting(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const beginWebinarEdit = () => { if (!selected) return; setTitle(selected.title); setStartsAt(selected.startsAt); setPlatform(selected.platform || 'Zoom'); setOffer(selected.offerLabel); setEditWebinar(true); };
  const saveWebinar = async () => {
    if (!selected || !title.trim() || !startsAt || !platform.trim()) return; setBusy(true);
    try { await updateOperationalWebinar(selected.id, { title, startsAt, platform, offerLabel: offer }); setEditWebinar(false); setMessage(language === 'es' ? 'Webinar actualizado.' : 'Webinar updated.'); }
    catch { setMessage(language === 'es' ? 'No se pudo guardar el webinar.' : 'Could not save webinar.'); }
    finally { setBusy(false); }
  };
  const deleteWebinar = async () => {
    if (!selected || !window.confirm(language === 'es' ? `¿Eliminar “${selected.title}” y sus ${registrations.length} inscripción(es)? Las Personas y su historial se conservan.` : `Delete “${selected.title}” and its ${registrations.length} registration(s)? People and history remain.`)) return;
    setBusy(true);
    try { const deletedId = selected.id; await deleteWebinarCascade(deletedId); setEditWebinar(false); setSelectedId(''); setMessage(language === 'es' ? 'Webinar eliminado.' : 'Webinar deleted.'); }
    catch { setMessage(language === 'es' ? 'No se pudo eliminar el webinar.' : 'Could not delete webinar.'); }
    finally { setBusy(false); }
  };
  const copyLink = async () => { if (!registrationLink) return; try { await navigator.clipboard.writeText(registrationLink); setMessage(language === 'es' ? 'Link copiado.' : 'Link copied.'); } catch { setMessage(language === 'es' ? 'No se pudo copiar el link.' : 'Could not copy link.'); } };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">WEBINARS</p><h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Registro → asistencia → compra → distribución' : 'Registration → attendance → purchase → distribution'}</h3><p className="mt-2 max-w-3xl text-sm text-black/50">{language === 'es' ? 'Un solo espacio para el evento, sus métricas y las personas inscritas.' : 'One workspace for the event, metrics and registered people.'}</p></div><button onClick={() => { resetWebinarDraft(); setShowCreate((value) => !value); setEditWebinar(false); }} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />{language === 'es' ? 'Nuevo webinar' : 'New webinar'}</button></div>{showCreate && <WebinarEditor language={language} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} platform={platform} setPlatform={setPlatform} offer={offer} setOffer={setOffer} onSave={() => void create()} onCancel={() => setShowCreate(false)} busy={busy} />}</section>

    <div className="grid items-start gap-5 xl:grid-cols-[300px_1fr]">
      <section className="self-start overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/7 p-4 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'EVENTOS' : 'EVENTS'}</div><div className="max-h-[520px] divide-y divide-black/5 overflow-y-auto">{webinars.map((webinar) => <button key={webinar.id} onClick={() => setSelectedId(webinar.id)} className={`w-full p-4 text-left ${webinar.id === selectedId ? 'bg-[#F7F7F5]' : ''}`}><p className="text-sm font-semibold">{webinar.title}</p><p className="mt-1 text-xs text-black/40">{formatDate(webinar.startsAt, language)}</p><p className="mt-1 text-[10px] uppercase text-black/30">{webinar.platform || '—'} · {webinar.status}</p></button>)}{!webinars.length && <p className="p-5 text-sm text-black/35">{language === 'es' ? 'Aún no hay webinars.' : 'No webinars yet.'}</p>}</div></section>

      {selected && <section className="min-w-0 overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="p-5">{editWebinar ? <WebinarEditor language={language} title={title} setTitle={setTitle} startsAt={startsAt} setStartsAt={setStartsAt} platform={platform} setPlatform={setPlatform} offer={offer} setOffer={setOffer} onSave={() => void saveWebinar()} onCancel={() => setEditWebinar(false)} onDelete={() => void deleteWebinar()} busy={busy} /> : <><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-xl font-semibold">{selected.title}</h4><span className="rounded-full bg-black/5 px-2.5 py-1 text-[10px] font-semibold">{selected.status}</span></div><p className="mt-2 text-sm text-black/45"><CalendarDays className="mr-1 inline h-4 w-4" />{formatDate(selected.startsAt, language)} · {selected.platform || '—'}</p>{selected.offerLabel && <p className="mt-1 text-xs text-black/45">{language === 'es' ? 'Oferta asociada' : 'Associated offer'}: <strong>{selected.offerLabel}</strong></p>}</div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void closeAndDistribute()} className="inline-flex items-center gap-1 rounded-full border border-[#0A3F4D]/20 px-4 py-2.5 text-xs font-semibold text-[#0A3F4D] disabled:opacity-40"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Cerrar y distribuir' : 'Close & distribute'}</button><button onClick={beginWebinarEdit} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Pencil className="mr-1 inline h-4 w-4" />{language === 'es' ? 'Editar' : 'Edit'}</button></div></div><div className="mt-4 rounded-xl border border-black/7 bg-[#FAFAF8]"><button onClick={() => setShowLink((value) => !value)} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left"><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'Link de inscripción' : 'Registration link'}</span><span className="inline-flex items-center gap-1 text-[10px] font-semibold text-black/45">{showLink ? (language === 'es' ? 'Ocultar' : 'Hide') : (language === 'es' ? 'Desplegar' : 'Show')}<ChevronDown className={`h-3.5 w-3.5 transition ${showLink ? 'rotate-180' : ''}`} /></span></button>{showLink && <div className="border-t border-black/6 p-3"><div className="flex gap-2"><input readOnly value={registrationLink} className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-xs text-black/55" /><button onClick={() => void copyLink()} className="inline-flex items-center gap-1.5 rounded-lg bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><Copy className="h-3.5 w-3.5" />{language === 'es' ? 'Copiar' : 'Copy'}</button></div></div>}</div></>}</div>

        <div className="border-y border-black/7 bg-[#FAFAF8] p-3"><div className="grid gap-2 sm:grid-cols-4"><Metric label={language === 'es' ? 'INSCRITOS' : 'REGISTERED'} value={metrics.registered} /><Metric label={language === 'es' ? 'ASISTIERON' : 'ATTENDED'} value={metrics.attended} /><Metric label="NO-SHOW" value={metrics.noShow} /><Metric label={language === 'es' ? 'COMPRARON' : 'PURCHASED'} value={metrics.purchased} /></div></div>

        <div><div className="flex flex-col gap-3 border-b border-black/7 p-4 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-sm font-semibold">{language === 'es' ? 'Personas inscritas' : 'Registered people'}</p><p className="mt-1 text-xs text-black/40">{language === 'es' ? 'Edita asistencia, tiempo, interés y compra desde cada persona.' : 'Edit attendance, time, interest and purchase per person.'}</p></div><div className="flex flex-wrap gap-2"><label className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar…' : 'Search…'} className="w-[210px] rounded-xl border border-black/10 py-2 pl-9 pr-3 text-xs" /></label><input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} /><button disabled={importing} onClick={() => fileInput.current?.click()} className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold"><FileUp className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Importar asistencia' : 'Import attendance'}</button><button onClick={() => setShowParticipant((value) => !value)} className="rounded-full bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Añadir inscrito' : 'Add registrant'}</button></div></div>
          {showParticipant && <div className="grid gap-2 border-b border-black/7 bg-[#FAFAF8] p-4 md:grid-cols-[1fr_1fr_1fr_auto]"><input value={participant.name} onChange={(event) => setParticipant((current) => ({ ...current, name: event.target.value }))} placeholder={language === 'es' ? 'Nombre' : 'Name'} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input value={participant.email} onChange={(event) => setParticipant((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input value={participant.phone} onChange={(event) => setParticipant((current) => ({ ...current, phone: event.target.value }))} placeholder={language === 'es' ? 'Teléfono' : 'Phone'} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><button disabled={busy} onClick={() => void addParticipant()} className="rounded-lg bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Añadir' : 'Add'}</button></div>}
          <div className="max-h-[560px] divide-y divide-black/5 overflow-y-auto">{filtered.map((registration) => { const person = peopleById.get(registration.personId); const editing = editParticipant === registration.id; return <div key={registration.id} className="p-4">{!editing ? <div className="grid gap-3 lg:grid-cols-[1fr_110px_100px_100px_auto] lg:items-center"><div><p className="text-sm font-semibold">{person?.name || registration.personId}</p><p className="mt-1 text-xs text-black/40">{person?.email || person?.phone || '—'}</p></div><span className="text-xs text-black/50">{registration.status}</span><span className="text-xs text-black/50">{registration.attendanceMinutes} min</span><span className={`text-xs font-semibold ${registration.purchased ? 'text-[#17603D]' : 'text-black/35'}`}>{registration.purchased ? (language === 'es' ? 'Compró' : 'Purchased') : (language === 'es' ? 'Sin compra' : 'No purchase')}</span><button onClick={() => beginParticipantEdit(registration)} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Pencil className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button></div> : <ParticipantEditor language={language} name={participantName} setName={setParticipantName} email={participantEmail} setEmail={setParticipantEmail} phone={participantPhone} setPhone={setParticipantPhone} status={participantStatus} setStatus={setParticipantStatus} minutes={participantMinutes} setMinutes={setParticipantMinutes} interestValue={participantInterest} setInterest={setParticipantInterest} purchased={participantPurchased} setPurchased={setParticipantPurchased} busy={busy} onSave={() => void saveParticipant(registration)} onCancel={() => setEditParticipant('')} onDelete={() => void removeParticipant(registration)} />}</div>; })}{!filtered.length && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'Sin personas inscritas.' : 'No registered people.'}</div>}</div>
        </div>
        {message && <p className="border-t border-black/7 bg-[#F7F7F5] px-4 py-3 text-xs text-black/55">{message}</p>}
      </section>}
    </div>
  </div>;
}

function WebinarEditor({ language, title, setTitle, startsAt, setStartsAt, platform, setPlatform, offer, setOffer, onSave, onCancel, onDelete, busy }: { language: Language; title: string; setTitle: (value: string) => void; startsAt: string; setStartsAt: (value: string) => void; platform: string; setPlatform: (value: string) => void; offer: string; setOffer: (value: string) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void; busy: boolean; }) {
  return <div className="mt-4 rounded-xl bg-[#FAFAF8] p-4"><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4"><Field label={language === 'es' ? 'Nombre' : 'Name'}><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><Field label={language === 'es' ? 'Fecha y hora' : 'Date and time'}><input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><Field label={language === 'es' ? 'Plataforma' : 'Platform'}><select value={platform} onChange={(event) => setPlatform(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="Zoom">Zoom</option><option value="Google Meet">Google Meet</option><option value="YouTube Live">YouTube Live</option><option value="Microsoft Teams">Microsoft Teams</option><option value="Otra">{language === 'es' ? 'Otra' : 'Other'}</option></select></Field><Field label={language === 'es' ? 'Oferta asociada' : 'Associated offer'}><input value={offer} onChange={(event) => setOffer(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field></div><div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={onSave} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar' : 'Save')}</button><button onClick={onCancel} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button>{onDelete && <button disabled={busy} onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar webinar' : 'Delete webinar'}</button>}</div></div>;
}
function ParticipantEditor({ language, name, setName, email, setEmail, phone, setPhone, status, setStatus, minutes, setMinutes, interestValue, setInterest, purchased, setPurchased, busy, onSave, onCancel, onDelete }: { language: Language; name: string; setName: (value: string) => void; email: string; setEmail: (value: string) => void; phone: string; setPhone: (value: string) => void; status: WebinarAttendanceStatus; setStatus: (value: WebinarAttendanceStatus) => void; minutes: string; setMinutes: (value: string) => void; interestValue: WebinarInterest; setInterest: (value: WebinarInterest) => void; purchased: boolean; setPurchased: (value: boolean) => void; busy: boolean; onSave: () => void; onCancel: () => void; onDelete: () => void; }) {
  return <div className="rounded-xl bg-[#FAFAF8] p-3"><div className="grid gap-2 md:grid-cols-3"><Field label={language === 'es' ? 'Nombre' : 'Name'}><input value={name} onChange={(event) => setName(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></Field><Field label="Email"><input value={email} onChange={(event) => setEmail(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></Field><Field label={language === 'es' ? 'Teléfono' : 'Phone'}><input value={phone} onChange={(event) => setPhone(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></Field><Field label={language === 'es' ? 'Asistencia' : 'Attendance'}><select value={status} onChange={(event) => setStatus(event.target.value as WebinarAttendanceStatus)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="registered">{language === 'es' ? 'Inscrito' : 'Registered'}</option><option value="attended">{language === 'es' ? 'Asistió' : 'Attended'}</option><option value="no-show">No-show</option></select></Field><Field label={language === 'es' ? 'Tiempo en reunión (min)' : 'Meeting time (min)'}><input type="number" min="0" value={minutes} onChange={(event) => setMinutes(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs" /></Field><Field label={language === 'es' ? 'Interés' : 'Interest'}><select value={interestValue} onChange={(event) => setInterest(event.target.value as WebinarInterest)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs"><option value="unknown">{language === 'es' ? 'Sin determinar' : 'Unknown'}</option><option value="low">{language === 'es' ? 'Bajo' : 'Low'}</option><option value="medium">{language === 'es' ? 'Medio' : 'Medium'}</option><option value="high">{language === 'es' ? 'Alto' : 'High'}</option></select></Field></div><label className="mt-3 inline-flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={purchased} onChange={(event) => setPurchased(event.target.checked)} />{language === 'es' ? 'Compra confirmada' : 'Purchase confirmed'}</label><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={onSave} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Guardar' : 'Save'}</button><button onClick={onCancel} className="rounded-full border border-black/10 bg-white px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button disabled={busy} onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 bg-white px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar participante' : 'Remove participant'}</button></div></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{label}</span>{children}</label>; }
function Metric({ label, value }: { label: string; value: number }) { return <div className="rounded-xl bg-white px-3 py-2"><p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>; }
