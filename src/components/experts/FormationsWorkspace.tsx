import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  FileUp,
  GraduationCap,
  Pencil,
  Plus,
  Search,
  Trash2,
  UsersRound,
  X
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { createBuyerAndEnroll, deleteEmptyCohort, deleteEmptyFormation } from '../../services/expertsFormationAdmin';
import {
  createEnrollmentAttentionTask,
  createOperationalCohort,
  createOperationalFormation,
  enrollmentAttention,
  enrollExpertPerson,
  subscribeExpertCohorts,
  subscribeExpertEnrollments,
  subscribeExpertFormations,
  updateExpertEnrollment,
  updateOperationalCohort,
  updateOperationalFormation,
  type CohortStatus,
  type EnrollmentStatus,
  type ExpertCohort,
  type ExpertEnrollment,
  type ExpertFormation,
  type FormationStatus
} from '../../services/expertsFormations';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';

type Props = { language: Language };
type CsvRow = Record<string, string>;

type ExternalBuyerDraft = {
  name: string;
  email: string;
  phone: string;
  source: string;
};

const EMPTY_BUYER: ExternalBuyerDraft = { name: '', email: '', phone: '', source: '' };

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function dateTimeLabel(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(value.includes('T') ? value : `${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', {
    dateStyle: 'medium',
    ...(value.includes('T') ? { timeStyle: 'short' as const } : {})
  }).format(date);
}

function statusLabel(status: FormationStatus | CohortStatus | EnrollmentStatus, language: Language) {
  const es: Record<string, string> = {
    draft: 'Borrador', active: 'Activo', archived: 'Archivado', planned: 'Planificada',
    completed: 'Completado', cancelled: 'Cancelada', withdrawn: 'Retirado', refunded: 'Reembolsado'
  };
  const en: Record<string, string> = {
    draft: 'Draft', active: 'Active', archived: 'Archived', planned: 'Planned',
    completed: 'Completed', cancelled: 'Cancelled', withdrawn: 'Withdrawn', refunded: 'Refunded'
  };
  return (language === 'es' ? es : en)[status] || status;
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

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
  const headers = rows[0].map((item) => normalize(item));
  return rows.slice(1).map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
}

function pick(row: CsvRow, keys: string[]) {
  for (const key of keys) {
    const wanted = normalize(key).replace(/[ _-]/g, '');
    const found = Object.entries(row).find(([candidate]) => normalize(candidate).replace(/[ _-]/g, '') === wanted);
    if (found?.[1]) return found[1].trim();
  }
  return '';
}

export function FormationsWorkspace({ language }: Props) {
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [showFormationForm, setShowFormationForm] = useState(false);
  const [showCohortForm, setShowCohortForm] = useState(false);
  const [showEnrollmentForm, setShowEnrollmentForm] = useState(false);
  const [formationTitle, setFormationTitle] = useState('');
  const [cohortTitle, setCohortTitle] = useState('');
  const [cohortStartsAt, setCohortStartsAt] = useState('');
  const [cohortEndsAt, setCohortEndsAt] = useState('');
  const [personId, setPersonId] = useState('');
  const [externalBuyer, setExternalBuyer] = useState<ExternalBuyerDraft>(EMPTY_BUYER);
  const [editingFormation, setEditingFormation] = useState(false);
  const [editingFormationTitle, setEditingFormationTitle] = useState('');
  const [editingCohort, setEditingCohort] = useState(false);
  const [editingCohortTitle, setEditingCohortTitle] = useState('');
  const [editingCohortStartsAt, setEditingCohortStartsAt] = useState('');
  const [editingCohortEndsAt, setEditingCohortEndsAt] = useState('');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [importing, setImporting] = useState(false);
  const csvInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    let stopFormations: (() => void) | undefined;
    let stopCohorts: (() => void) | undefined;
    let stopEnrollments: (() => void) | undefined;
    let stopPeople: (() => void) | undefined;
    void subscribeExpertFormations((items) => {
      setFormations(items);
      setSelectedFormationId((current) => current || items.find((item) => item.status === 'active')?.id || items[0]?.id || '');
    }).then((stop) => { stopFormations = stop; });
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; });
    void subscribeExpertEnrollments(setEnrollments).then((stop) => { stopEnrollments = stop; });
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
    }).catch(() => {});
    return () => { stopFormations?.(); stopCohorts?.(); stopEnrollments?.(); stopPeople?.(); };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selectedFormation = formations.find((item) => item.id === selectedFormationId) || null;
  const formationCohorts = useMemo(() => cohorts.filter((item) => item.formationId === selectedFormationId), [cohorts, selectedFormationId]);

  useEffect(() => {
    if (!selectedFormationId) { setSelectedCohortId(''); return; }
    if (!formationCohorts.some((item) => item.id === selectedCohortId)) {
      setSelectedCohortId(formationCohorts.find((item) => item.status === 'active')?.id || formationCohorts[0]?.id || '');
    }
  }, [formationCohorts, selectedCohortId, selectedFormationId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const requestedPerson = params.get('person') || '';
    const requestedCohort = params.get('cohort') || '';
    const requestedFormation = params.get('formation') || '';
    const requestedOffer = params.get('offer') || '';
    if (requestedFormation && formations.some((item) => item.id === requestedFormation)) setSelectedFormationId(requestedFormation);
    else if (requestedOffer) {
      const match = formations.find((item) => normalize(item.title) === normalize(requestedOffer));
      if (match) setSelectedFormationId(match.id);
    }
    if (requestedCohort && cohorts.some((item) => item.id === requestedCohort)) setSelectedCohortId(requestedCohort);
    if (requestedPerson && people.some((item) => item.id === requestedPerson)) {
      setPersonId(requestedPerson);
      setShowEnrollmentForm(true);
    }
  }, [cohorts, formations, people]);

  const selectedCohort = formationCohorts.find((item) => item.id === selectedCohortId) || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selectedEnrollments = useMemo(() => enrollments.filter((item) => item.cohortId === selectedCohortId), [enrollments, selectedCohortId]);
  const enrolledPersonIds = useMemo(() => new Set(selectedEnrollments.map((item) => item.personId)), [selectedEnrollments]);
  const availablePeople = useMemo(() => people.filter((person) => !enrolledPersonIds.has(person.id)), [people, enrolledPersonIds]);
  const filteredEnrollments = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return selectedEnrollments;
    return selectedEnrollments.filter((enrollment) => {
      const person = peopleById.get(enrollment.personId);
      return [person?.name || '', person?.email || '', person?.phone || ''].some((value) => value.toLowerCase().includes(term));
    });
  }, [peopleById, search, selectedEnrollments]);

  const metrics = {
    formations: formations.filter((item) => item.status === 'active').length,
    cohorts: cohorts.filter((item) => item.status === 'active').length,
    students: enrollments.filter((item) => item.status === 'active').length,
    attention: enrollments.filter((item) => enrollmentAttention(item, language)).length
  };

  const createFormation = async () => {
    if (!formationTitle.trim()) return;
    setBusy(true);
    try {
      const id = await createOperationalFormation({ title: formationTitle, status: 'active' });
      setFormationTitle(''); setShowFormationForm(false); setSelectedFormationId(id);
      setMessage(language === 'es' ? 'Formación creada.' : 'Formation created.');
    } catch { setMessage(language === 'es' ? 'No se pudo crear la formación.' : 'Could not create formation.'); }
    finally { setBusy(false); }
  };

  const saveFormationEdit = async () => {
    if (!selectedFormation || !editingFormationTitle.trim()) return;
    setBusy(true);
    try {
      await updateOperationalFormation(selectedFormation.id, { title: editingFormationTitle });
      setEditingFormation(false);
      setMessage(language === 'es' ? 'Formación actualizada.' : 'Formation updated.');
    } catch { setMessage(language === 'es' ? 'No se pudo actualizar la formación.' : 'Could not update formation.'); }
    finally { setBusy(false); }
  };

  const removeFormation = async () => {
    if (!selectedFormation) return;
    if (!window.confirm(language === 'es' ? `¿Eliminar "${selectedFormation.title}"? Solo se eliminará si no tiene matrículas.` : `Delete "${selectedFormation.title}"? It will only be deleted if it has no enrollments.`)) return;
    setBusy(true);
    try {
      await deleteEmptyFormation(selectedFormation.id);
      setSelectedFormationId('');
      setMessage(language === 'es' ? 'Formación eliminada.' : 'Formation deleted.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'FORMATION_HAS_ENROLLMENTS'
        ? (language === 'es' ? 'No se puede eliminar porque tiene alumnos. Archívala para conservar el historial.' : 'Cannot delete a formation with students. Archive it to preserve history.')
        : (language === 'es' ? 'No se pudo eliminar la formación.' : 'Could not delete formation.'));
    } finally { setBusy(false); }
  };

  const createCohort = async () => {
    if (!selectedFormation || !cohortTitle.trim()) return;
    setBusy(true);
    try {
      const id = await createOperationalCohort({ formationId: selectedFormation.id, title: cohortTitle, startsAt: cohortStartsAt, endsAt: cohortEndsAt, status: 'planned' });
      setCohortTitle(''); setCohortStartsAt(''); setCohortEndsAt(''); setShowCohortForm(false); setSelectedCohortId(id);
      setMessage(language === 'es' ? 'Cohorte creada.' : 'Cohort created.');
    } catch { setMessage(language === 'es' ? 'No se pudo crear la cohorte.' : 'Could not create cohort.'); }
    finally { setBusy(false); }
  };

  const beginCohortEdit = () => {
    if (!selectedCohort) return;
    setEditingCohortTitle(selectedCohort.title);
    setEditingCohortStartsAt(selectedCohort.startsAt);
    setEditingCohortEndsAt(selectedCohort.endsAt);
    setEditingCohort(true);
  };

  const saveCohortEdit = async () => {
    if (!selectedCohort || !editingCohortTitle.trim()) return;
    setBusy(true);
    try {
      await updateOperationalCohort(selectedCohort.id, { title: editingCohortTitle, startsAt: editingCohortStartsAt, endsAt: editingCohortEndsAt });
      setEditingCohort(false);
      setMessage(language === 'es' ? 'Cohorte actualizada.' : 'Cohort updated.');
    } catch { setMessage(language === 'es' ? 'No se pudo actualizar la cohorte.' : 'Could not update cohort.'); }
    finally { setBusy(false); }
  };

  const removeCohort = async () => {
    if (!selectedCohort) return;
    if (!window.confirm(language === 'es' ? `¿Eliminar la cohorte "${selectedCohort.title}"?` : `Delete cohort "${selectedCohort.title}"?`)) return;
    setBusy(true);
    try {
      await deleteEmptyCohort(selectedCohort.id);
      setSelectedCohortId('');
      setMessage(language === 'es' ? 'Cohorte eliminada.' : 'Cohort deleted.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'COHORT_HAS_ENROLLMENTS'
        ? (language === 'es' ? 'No se puede eliminar porque tiene alumnos. Cancélala o complétala para conservar el historial.' : 'Cannot delete a cohort with students. Cancel or complete it to preserve history.')
        : (language === 'es' ? 'No se pudo eliminar la cohorte.' : 'Could not delete cohort.'));
    } finally { setBusy(false); }
  };

  const enrollExistingPerson = async () => {
    if (!selectedFormation || !selectedCohort || !personId) return;
    setBusy(true);
    try {
      await enrollExpertPerson({ personId, formationId: selectedFormation.id, cohortId: selectedCohort.id, status: 'active', progress: 0 });
      setPersonId(''); setShowEnrollmentForm(false);
      setMessage(language === 'es' ? 'Persona integrada a la cohorte.' : 'Person enrolled in cohort.');
    } catch { setMessage(language === 'es' ? 'No se pudo integrar a la persona.' : 'Could not enroll person.'); }
    finally { setBusy(false); }
  };

  const enrollExternalBuyer = async () => {
    if (!selectedFormation || !selectedCohort || !externalBuyer.name.trim() || (!externalBuyer.email.trim() && !externalBuyer.phone.trim())) return;
    setBusy(true);
    try {
      await createBuyerAndEnroll({ ...externalBuyer, formationId: selectedFormation.id, cohortId: selectedCohort.id });
      setExternalBuyer(EMPTY_BUYER); setShowEnrollmentForm(false);
      setMessage(language === 'es' ? 'Comprador creado/identificado e integrado sin duplicar la persona.' : 'Buyer resolved and enrolled without duplicating the person.');
    } catch (error) {
      setMessage(error instanceof Error && error.message === 'IDENTITY_CONFLICT'
        ? (language === 'es' ? 'Existe un conflicto de identidad por email/teléfono. Revísalo antes de matricular.' : 'Identity conflict found. Review it before enrolling.')
        : (language === 'es' ? 'No se pudo integrar al comprador.' : 'Could not enroll buyer.'));
    } finally { setBusy(false); }
  };

  const importCsv = async (file: File) => {
    if (!selectedFormation || !selectedCohort) return;
    setImporting(true);
    let imported = 0;
    let skipped = 0;
    try {
      const rows = parseCsv(await file.text());
      for (const row of rows) {
        const email = pick(row, ['email', 'correo', 'e-mail']);
        const phone = pick(row, ['phone', 'telefono', 'teléfono', 'celular', 'mobile']);
        const name = pick(row, ['name', 'nombre', 'full name', 'fullname', 'nombre completo']) || (email ? email.split('@')[0] : phone);
        const source = pick(row, ['source', 'origen', 'channel', 'canal', 'plataforma']) || 'formation-csv';
        const progressValue = Number(pick(row, ['progress', 'progreso', 'avance']).replace(/[^0-9.]/g, '')) || 0;
        if (!name || (!email && !phone)) { skipped += 1; continue; }
        try {
          await createBuyerAndEnroll({ name, email, phone, source, formationId: selectedFormation.id, cohortId: selectedCohort.id, progress: progressValue });
          imported += 1;
        } catch { skipped += 1; }
      }
      setMessage(language === 'es'
        ? `CSV procesado: ${imported} personas integradas${skipped ? ` · ${skipped} omitidas` : ''}.`
        : `CSV processed: ${imported} people enrolled${skipped ? ` · ${skipped} skipped` : ''}.`);
    } catch { setMessage(language === 'es' ? 'No se pudo procesar el CSV.' : 'Could not process CSV.'); }
    finally { setImporting(false); if (csvInput.current) csvInput.current.value = ''; }
  };

  const updateEnrollment = async (enrollment: ExpertEnrollment, patch: { status?: EnrollmentStatus; progress?: number }) => {
    try { await updateExpertEnrollment({ enrollment, ...patch }); }
    catch { setMessage(language === 'es' ? 'No se pudo actualizar el alumno.' : 'Could not update student.'); }
  };

  const sendAttentionToPriority = async (enrollment: ExpertEnrollment) => {
    const person = peopleById.get(enrollment.personId);
    if (!person || !selectedFormation || !selectedCohort) return;
    const assignee = members.find((member) => member.uid === currentUid) || members[0];
    if (!assignee) return;
    try {
      await createEnrollmentAttentionTask({ enrollment, personName: person.name, formationTitle: selectedFormation.title, cohortTitle: selectedCohort.title, assignee, language });
      setMessage(language === 'es' ? 'Seguimiento enviado a Trabajo prioritario.' : 'Follow-up sent to Priority Work.');
    } catch { setMessage(language === 'es' ? 'No se pudo crear el seguimiento.' : 'Could not create follow-up.'); }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'FORMACIONES' : 'FORMATIONS'}</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Del comprador al alumno, sin importar dónde compró' : 'From buyer to student, regardless of where they purchased'}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">{language === 'es' ? 'Integra compras provenientes de webinars, publicidad, llamadas, referidos o CSV usando siempre la misma identidad de la persona.' : 'Enroll purchases from webinars, ads, calls, referrals or CSV while keeping one person identity.'}</p>
        </div>
        <button type="button" onClick={() => setShowFormationForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Nueva formación' : 'New formation'}</button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{[
        [language === 'es' ? 'Formaciones activas' : 'Active formations', metrics.formations, BookOpenCheck],
        [language === 'es' ? 'Cohortes activas' : 'Active cohorts', metrics.cohorts, GraduationCap],
        [language === 'es' ? 'Alumnos activos' : 'Active students', metrics.students, UsersRound],
        [language === 'es' ? 'Necesitan atención' : 'Need attention', metrics.attention, AlertTriangle]
      ].map(([label, value, Icon]) => { const MetricIcon = Icon as React.ComponentType<{ className?: string }>; return <div key={String(label)} className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{String(label)}</p><MetricIcon className="h-4 w-4 text-[#0A3F4D]" /></div><p className="mt-2 text-2xl font-semibold">{Number(value)}</p></div>; })}</div>
      {showFormationForm && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4 sm:flex-row sm:items-end"><label className="flex-1"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE DE LA FORMACIÓN' : 'FORMATION NAME'}</span><input value={formationTitle} onChange={(event) => setFormationTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><button type="button" disabled={busy || !formationTitle.trim()} onClick={() => void createFormation()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear' : 'Create'}</button></div>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/7 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'PROGRAMAS' : 'PROGRAMS'}</p></div><div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{formations.map((formation) => <button key={formation.id} type="button" onClick={() => { setSelectedFormationId(formation.id); setEditingFormation(false); }} className={`w-full p-4 text-left ${formation.id === selectedFormationId ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}><div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 h-4 w-4 text-[#0A3F4D]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{formation.title}</p><p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-black/35">{statusLabel(formation.status, language)}</p></div></div></button>)}{formations.length === 0 && <div className="p-7 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay formaciones.' : 'No formations yet.'}</div>}</div></section>

      {selectedFormation ? <div className="space-y-5">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div className="min-w-0 flex-1"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'FORMACIÓN' : 'FORMATION'}</p>{editingFormation ? <div className="mt-2 flex max-w-xl gap-2"><input value={editingFormationTitle} onChange={(event) => setEditingFormationTitle(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/10 px-3 py-2 text-sm" /><button onClick={() => void saveFormationEdit()} className="rounded-full bg-[#111413] px-3 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button onClick={() => setEditingFormation(false)} className="grid h-9 w-9 place-items-center rounded-full border border-black/10"><X className="h-4 w-4" /></button></div> : <h4 className="mt-1 text-xl font-semibold">{selectedFormation.title}</h4>}</div>
            <div className="flex flex-wrap gap-2"><select value={selectedFormation.status} onChange={(event) => void updateOperationalFormation(selectedFormation.id, { status: event.target.value as FormationStatus })} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs"><option value="draft">{statusLabel('draft', language)}</option><option value="active">{statusLabel('active', language)}</option><option value="archived">{statusLabel('archived', language)}</option></select><button type="button" onClick={() => { setEditingFormationTitle(selectedFormation.title); setEditingFormation(true); }} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button><button type="button" onClick={() => void removeFormation()} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/20 px-3 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Delete'}</button></div>
          </div>

          <div className="mt-5 flex items-center justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'COHORTES' : 'COHORTS'}</p><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Cada grupo conserva alumnos, fechas y progreso.' : 'Each group keeps students, dates and progress.'}</p></div><button type="button" onClick={() => setShowCohortForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full bg-[#111413] px-3.5 py-2 text-xs font-semibold text-white"><Plus className="h-3.5 w-3.5" />{language === 'es' ? 'Cohorte' : 'Cohort'}</button></div>

          {showCohortForm && <div className="mt-4 grid gap-3 rounded-xl bg-[#FAFAF8] p-4 md:grid-cols-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE' : 'NAME'}</span><input value={cohortTitle} onChange={(event) => setCohortTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'INICIO' : 'START'}</span><input type="datetime-local" value={cohortStartsAt} onChange={(event) => setCohortStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TÉRMINO' : 'END'}</span><input type="datetime-local" value={cohortEndsAt} onChange={(event) => setCohortEndsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><div className="md:col-span-3"><button type="button" disabled={busy || !cohortTitle.trim()} onClick={() => void createCohort()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear cohorte' : 'Create cohort'}</button></div></div>}

          <div className="mt-4 grid gap-2 md:grid-cols-2">{formationCohorts.map((cohort) => <button key={cohort.id} type="button" onClick={() => { setSelectedCohortId(cohort.id); setEditingCohort(false); }} className={`rounded-xl border p-3 text-left ${selectedCohortId === cohort.id ? 'border-black/25 bg-black/[0.035]' : 'border-black/8 bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{cohort.title}</p><p className="mt-1 text-xs text-black/40">{dateTimeLabel(cohort.startsAt, language)} → {dateTimeLabel(cohort.endsAt, language)}</p></div><span className="rounded-full bg-black/[0.04] px-2 py-1 text-[9px] font-semibold uppercase text-black/45">{statusLabel(cohort.status, language)}</span></div></button>)}{formationCohorts.length === 0 && <div className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-black/35 md:col-span-2">{language === 'es' ? 'Crea la primera cohorte para comenzar.' : 'Create the first cohort to begin.'}</div>}</div>
        </section>

        {selectedCohort && <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div className="min-w-0 flex-1">{editingCohort ? <div className="grid gap-2 md:grid-cols-3"><input value={editingCohortTitle} onChange={(event) => setEditingCohortTitle(event.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input type="datetime-local" value={editingCohortStartsAt} onChange={(event) => setEditingCohortStartsAt(event.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><input type="datetime-local" value={editingCohortEndsAt} onChange={(event) => setEditingCohortEndsAt(event.target.value)} className="rounded-lg border border-black/10 px-3 py-2 text-sm" /><div className="flex gap-2 md:col-span-3"><button onClick={() => void saveCohortEdit()} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar cambios' : 'Save changes'}</button><button onClick={() => setEditingCohort(false)} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div> : <><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-semibold">{selectedCohort.title}</h4><select value={selectedCohort.status} onChange={(event) => void updateOperationalCohort(selectedCohort.id, { status: event.target.value as CohortStatus })} className="rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-[10px]"><option value="planned">{statusLabel('planned', language)}</option><option value="active">{statusLabel('active', language)}</option><option value="completed">{statusLabel('completed', language)}</option><option value="cancelled">{statusLabel('cancelled', language)}</option></select></div><p className="mt-1 text-xs text-black/40">{dateTimeLabel(selectedCohort.startsAt, language)} → {dateTimeLabel(selectedCohort.endsAt, language)} · {selectedEnrollments.length} {language === 'es' ? 'matriculados' : 'enrolled'}</p></>}</div>
            <div className="flex flex-wrap gap-2"><input ref={csvInput} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} /><button type="button" disabled={importing} onClick={() => csvInput.current?.click()} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-xs font-semibold"><FileUp className="h-3.5 w-3.5" />{importing ? (language === 'es' ? 'Importando…' : 'Importing…') : 'Importar CSV'}</button><button type="button" onClick={beginCohortEdit} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3.5 py-2 text-xs font-semibold"><Pencil className="h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button><button type="button" onClick={() => void removeCohort()} className="inline-flex items-center gap-1.5 rounded-full border border-[#A23A32]/20 px-3.5 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar' : 'Delete'}</button><button type="button" onClick={() => setShowEnrollmentForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Integrar persona' : 'Enroll person'}</button></div></div>

          {showEnrollmentForm && <div className="mt-4 space-y-4 rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/40">{language === 'es' ? 'PERSONA QUE YA EXISTE EN G-KAIS' : 'EXISTING G-KAIS PERSON'}</p><div className="mt-2 flex flex-col gap-2 md:flex-row"><select value={personId} onChange={(event) => setPersonId(event.target.value)} className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar persona' : 'Select person'}</option>{availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select><button type="button" disabled={busy || !personId} onClick={() => void enrollExistingPerson()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear matrícula' : 'Create enrollment'}</button></div></div><div className="border-t border-black/8 pt-4"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#0A3F4D]">{language === 'es' ? 'COMPRADOR DE OTRA FUENTE / PERSONA NUEVA' : 'BUYER FROM ANOTHER SOURCE / NEW PERSON'}</p><div className="mt-2 grid gap-2 md:grid-cols-2 xl:grid-cols-4"><input value={externalBuyer.name} onChange={(event) => setExternalBuyer((current) => ({ ...current, name: event.target.value }))} placeholder={language === 'es' ? 'Nombre y apellidos' : 'Full name'} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input value={externalBuyer.email} onChange={(event) => setExternalBuyer((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input value={externalBuyer.phone} onChange={(event) => setExternalBuyer((current) => ({ ...current, phone: event.target.value }))} placeholder={language === 'es' ? 'Teléfono' : 'Phone'} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /><input value={externalBuyer.source} onChange={(event) => setExternalBuyer((current) => ({ ...current, source: event.target.value }))} placeholder={language === 'es' ? 'Origen: Meta Ads / referido / llamada…' : 'Source: Meta Ads / referral / call…'} className="rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></div><div className="mt-2 flex items-center justify-between gap-3"><p className="text-[10px] text-black/35">{language === 'es' ? 'Email o teléfono: al menos uno. G-Kais reutiliza la identidad si ya existe.' : 'Email or phone: at least one. G-Kais reuses the identity if it already exists.'}</p><button type="button" disabled={busy || !externalBuyer.name.trim() || (!externalBuyer.email.trim() && !externalBuyer.phone.trim())} onClick={() => void enrollExternalBuyer()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear e integrar' : 'Create & enroll'}</button></div></div></div>}

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-black/8 bg-[#FAFAF8] px-3 py-2.5"><Search className="h-4 w-4 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar alumno…' : 'Search student…'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>

          <div className="mt-4 space-y-2">{filteredEnrollments.map((enrollment) => { const person = peopleById.get(enrollment.personId); const signal = enrollmentAttention(enrollment, language); return <div key={enrollment.id} className="rounded-xl border border-black/8 p-4"><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-semibold">{person?.name || enrollment.personId}</p>{signal && <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${signal.level === 'high' ? 'bg-[#A23A32]/9 text-[#8D332C]' : 'bg-[#A46F16]/10 text-[#82570F]'}`}>{signal.label}</span>}{enrollment.status === 'completed' && <CheckCircle2 className="h-4 w-4 text-[#1E7A4D]" />}</div><p className="mt-1 text-xs text-black/40">{person?.email || person?.phone || '—'}</p>{signal && <p className="mt-1 text-xs text-black/45">{signal.reason}</p>}</div><div className="flex flex-wrap items-center gap-2"><label className="flex items-center gap-2 rounded-lg border border-black/8 px-3 py-2 text-xs"><span className="text-black/40">{language === 'es' ? 'Progreso' : 'Progress'}</span><input type="number" min="0" max="100" value={enrollment.progress} onChange={(event) => void updateEnrollment(enrollment, { progress: Number(event.target.value) || 0 })} className="w-14 bg-transparent font-semibold outline-none" />%</label><select value={enrollment.status} onChange={(event) => void updateEnrollment(enrollment, { status: event.target.value as EnrollmentStatus })} className="rounded-lg border border-black/8 bg-white px-3 py-2 text-xs"><option value="active">{statusLabel('active', language)}</option><option value="completed">{statusLabel('completed', language)}</option><option value="withdrawn">{statusLabel('withdrawn', language)}</option><option value="refunded">{statusLabel('refunded', language)}</option></select>{signal && <button type="button" onClick={() => void sendAttentionToPriority(enrollment)} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white">{language === 'es' ? 'Enviar a Trabajo prioritario' : 'Send to Priority Work'}</button>}</div></div></div>; })}{filteredEnrollments.length === 0 && <div className="rounded-xl border border-dashed border-black/10 p-8 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay alumnos en esta cohorte.' : 'No students in this cohort yet.'}</div>}</div>
        </section>}
      </div> : <section className="rounded-2xl border border-black/10 bg-white p-10 text-center text-sm text-black/35">{language === 'es' ? 'Crea una formación para comenzar.' : 'Create a formation to begin.'}</section>}
    </div>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
