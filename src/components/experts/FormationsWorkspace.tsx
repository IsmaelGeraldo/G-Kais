import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  GraduationCap,
  Plus,
  Search,
  UsersRound
} from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
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

function dateLabel(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${value}T12:00:00`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
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
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

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

    return () => {
      stopFormations?.();
      stopCohorts?.();
      stopEnrollments?.();
      stopPeople?.();
    };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const selectedFormation = formations.find((item) => item.id === selectedFormationId) || null;
  const formationCohorts = useMemo(() => cohorts.filter((item) => item.formationId === selectedFormationId), [cohorts, selectedFormationId]);

  useEffect(() => {
    if (!selectedFormationId) {
      setSelectedCohortId('');
      return;
    }
    if (!formationCohorts.some((item) => item.id === selectedCohortId)) {
      setSelectedCohortId(formationCohorts.find((item) => item.status === 'active')?.id || formationCohorts[0]?.id || '');
    }
  }, [formationCohorts, selectedCohortId, selectedFormationId]);

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

  const attentionCount = enrollments.filter((item) => enrollmentAttention(item, language)).length;
  const metrics = {
    formations: formations.filter((item) => item.status === 'active').length,
    cohorts: cohorts.filter((item) => item.status === 'active').length,
    students: enrollments.filter((item) => item.status === 'active').length,
    attention: attentionCount
  };

  const createFormation = async () => {
    if (!formationTitle.trim()) return;
    setBusy(true);
    try {
      const id = await createOperationalFormation({ title: formationTitle, status: 'active' });
      setFormationTitle('');
      setShowFormationForm(false);
      setSelectedFormationId(id);
      setMessage(language === 'es' ? 'Formación creada.' : 'Formation created.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear la formación.' : 'Could not create formation.');
    } finally {
      setBusy(false);
    }
  };

  const createCohort = async () => {
    if (!selectedFormation || !cohortTitle.trim()) return;
    setBusy(true);
    try {
      const id = await createOperationalCohort({
        formationId: selectedFormation.id,
        title: cohortTitle,
        startsAt: cohortStartsAt,
        endsAt: cohortEndsAt,
        status: 'planned'
      });
      setCohortTitle('');
      setCohortStartsAt('');
      setCohortEndsAt('');
      setShowCohortForm(false);
      setSelectedCohortId(id);
      setMessage(language === 'es' ? 'Cohorte creada.' : 'Cohort created.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear la cohorte.' : 'Could not create cohort.');
    } finally {
      setBusy(false);
    }
  };

  const enrollPerson = async () => {
    if (!selectedFormation || !selectedCohort || !personId) return;
    setBusy(true);
    try {
      await enrollExpertPerson({ personId, formationId: selectedFormation.id, cohortId: selectedCohort.id, status: 'active', progress: 0 });
      setPersonId('');
      setShowEnrollmentForm(false);
      setMessage(language === 'es'
        ? 'Persona integrada a la cohorte sin crear un contacto duplicado.'
        : 'Person enrolled without creating a duplicate contact.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo integrar a la persona.' : 'Could not enroll person.');
    } finally {
      setBusy(false);
    }
  };

  const updateEnrollment = async (enrollment: ExpertEnrollment, patch: { status?: EnrollmentStatus; progress?: number }) => {
    try {
      await updateExpertEnrollment({ enrollment, ...patch });
    } catch {
      setMessage(language === 'es' ? 'No se pudo actualizar el alumno.' : 'Could not update student.');
    }
  };

  const sendAttentionToPriority = async (enrollment: ExpertEnrollment) => {
    const person = peopleById.get(enrollment.personId);
    if (!person || !selectedFormation || !selectedCohort) return;
    const assignee = members.find((member) => member.uid === currentUid) || members[0];
    if (!assignee) {
      setMessage(language === 'es' ? 'No hay un responsable disponible.' : 'No assignee available.');
      return;
    }
    try {
      await createEnrollmentAttentionTask({
        enrollment,
        personName: person.name,
        formationTitle: selectedFormation.title,
        cohortTitle: selectedCohort.title,
        assignee,
        language
      });
      setMessage(language === 'es' ? 'Seguimiento enviado a Trabajo prioritario.' : 'Follow-up sent to Priority Work.');
    } catch {
      setMessage(language === 'es' ? 'No se pudo crear el seguimiento.' : 'Could not create follow-up.');
    }
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'FORMACIONES' : 'FORMATIONS'}</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Del comprador al alumno, sin perder su historia' : 'From buyer to student without losing history'}</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-black/50">{language === 'es'
            ? 'Organiza programas, cohortes y alumnos. Cada matrícula usa la misma persona que ya existe en G-KAIS, conservando webinar, tareas, sesiones y relación previa.'
            : 'Organize programs, cohorts and students. Each enrollment uses the same person already in G-KAIS, preserving webinars, tasks, sessions and prior relationship.'}</p>
        </div>
        <button type="button" onClick={() => setShowFormationForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Nueva formación' : 'New formation'}</button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          [language === 'es' ? 'Formaciones activas' : 'Active formations', metrics.formations, BookOpenCheck],
          [language === 'es' ? 'Cohortes activas' : 'Active cohorts', metrics.cohorts, GraduationCap],
          [language === 'es' ? 'Alumnos activos' : 'Active students', metrics.students, UsersRound],
          [language === 'es' ? 'Necesitan atención' : 'Need attention', metrics.attention, AlertTriangle]
        ].map(([label, value, Icon]) => {
          const MetricIcon = Icon as React.ComponentType<{ className?: string }>;
          return <div key={String(label)} className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4"><div className="flex items-center justify-between"><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{String(label)}</p><MetricIcon className="h-4 w-4 text-[#0A3F4D]" /></div><p className="mt-2 text-2xl font-semibold">{Number(value)}</p></div>;
        })}
      </div>

      {showFormationForm && <div className="mt-4 flex flex-col gap-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4 sm:flex-row sm:items-end">
        <label className="flex-1"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE DE LA FORMACIÓN' : 'FORMATION NAME'}</span><input value={formationTitle} onChange={(event) => setFormationTitle(event.target.value)} placeholder={language === 'es' ? 'Ej. Mentoría Escala' : 'E.g. Scale Mentoring'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
        <button type="button" disabled={busy || !formationTitle.trim()} onClick={() => void createFormation()} className="rounded-full bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear' : 'Create'}</button>
      </div>}
    </section>

    <div className="grid gap-5 xl:grid-cols-[310px_minmax(0,1fr)]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="border-b border-black/7 p-4"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? 'PROGRAMAS' : 'PROGRAMS'}</p></div>
        <div className="max-h-[720px] divide-y divide-black/5 overflow-y-auto">{formations.map((formation) => <button key={formation.id} type="button" onClick={() => setSelectedFormationId(formation.id)} className={`w-full p-4 text-left ${formation.id === selectedFormationId ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}><div className="flex items-start gap-3"><BookOpenCheck className="mt-0.5 h-4 w-4 text-[#0A3F4D]" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{formation.title}</p><p className="mt-1 text-[10px] uppercase tracking-[0.08em] text-black/35">{statusLabel(formation.status, language)}</p></div></div></button>)}{formations.length === 0 && <div className="p-7 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay formaciones.' : 'No formations yet.'}</div>}</div>
      </section>

      {selectedFormation ? <div className="space-y-5">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'FORMACIÓN' : 'FORMATION'}</p><h4 className="mt-1 text-xl font-semibold">{selectedFormation.title}</h4></div>
            <select value={selectedFormation.status} onChange={(event) => void updateOperationalFormation(selectedFormation.id, { status: event.target.value as FormationStatus })} className="rounded-full border border-black/10 bg-white px-3 py-2 text-xs"><option value="draft">{statusLabel('draft', language)}</option><option value="active">{statusLabel('active', language)}</option><option value="archived">{statusLabel('archived', language)}</option></select>
          </div>

          <div className="mt-5 flex items-center justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'COHORTES' : 'COHORTS'}</p><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Cada edición conserva sus propios alumnos y fechas.' : 'Each edition keeps its own students and dates.'}</p></div><button type="button" onClick={() => setShowCohortForm((value) => !value)} className="inline-flex items-center gap-1.5 rounded-full border border-black/10 px-3 py-2 text-xs font-semibold"><Plus className="h-3.5 w-3.5" />{language === 'es' ? 'Cohorte' : 'Cohort'}</button></div>

          {showCohortForm && <div className="mt-4 grid gap-3 rounded-xl bg-[#FAFAF8] p-4 md:grid-cols-3"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'NOMBRE' : 'NAME'}</span><input value={cohortTitle} onChange={(event) => setCohortTitle(event.target.value)} placeholder={language === 'es' ? 'Octubre 2026' : 'October 2026'} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'INICIO' : 'START'}</span><input type="date" value={cohortStartsAt} onChange={(event) => setCohortStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TÉRMINO' : 'END'}</span><input type="date" value={cohortEndsAt} onChange={(event) => setCohortEndsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></label><div className="md:col-span-3"><button type="button" disabled={busy || !cohortTitle.trim()} onClick={() => void createCohort()} className="rounded-full bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear cohorte' : 'Create cohort'}</button></div></div>}

          <div className="mt-4 grid gap-2 md:grid-cols-2">{formationCohorts.map((cohort) => <button key={cohort.id} type="button" onClick={() => setSelectedCohortId(cohort.id)} className={`rounded-xl border p-3 text-left ${selectedCohortId === cohort.id ? 'border-[#0A3F4D]/25 bg-[#0A3F4D]/5' : 'border-black/8 bg-white'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{cohort.title}</p><p className="mt-1 text-xs text-black/40">{dateLabel(cohort.startsAt, language)} → {dateLabel(cohort.endsAt, language)}</p></div><span className="rounded-full bg-black/[0.04] px-2 py-1 text-[9px] font-semibold uppercase text-black/45">{statusLabel(cohort.status, language)}</span></div></button>)}{formationCohorts.length === 0 && <div className="rounded-xl border border-dashed border-black/10 p-6 text-center text-sm text-black/35 md:col-span-2">{language === 'es' ? 'Crea la primera cohorte para comenzar a integrar alumnos.' : 'Create the first cohort to start enrolling students.'}</div>}</div>
        </section>

        {selectedCohort && <section className="rounded-2xl border border-black/10 bg-white p-5">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><h4 className="text-lg font-semibold">{selectedCohort.title}</h4><select value={selectedCohort.status} onChange={(event) => void updateOperationalCohort(selectedCohort.id, { status: event.target.value as CohortStatus })} className="rounded-full border border-black/10 bg-white px-2.5 py-1.5 text-[10px]"><option value="planned">{statusLabel('planned', language)}</option><option value="active">{statusLabel('active', language)}</option><option value="completed">{statusLabel('completed', language)}</option><option value="cancelled">{statusLabel('cancelled', language)}</option></select></div><p className="mt-1 text-xs text-black/40">{selectedEnrollments.length} {language === 'es' ? 'personas matriculadas' : 'enrolled people'}</p></div><button type="button" onClick={() => setShowEnrollmentForm((value) => !value)} className="inline-flex items-center justify-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Integrar persona' : 'Enroll person'}</button></div>

          {showEnrollmentForm && <div className="mt-4 grid gap-3 rounded-xl border border-black/8 bg-[#FAFAF8] p-4 md:grid-cols-[1fr_auto]"><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'PERSONA EXISTENTE EN G-KAIS' : 'EXISTING PERSON IN G-KAIS'}</span><select value={personId} onChange={(event) => setPersonId(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Seleccionar persona' : 'Select person'}</option>{availablePeople.map((person) => <option key={person.id} value={person.id}>{person.name}{person.email ? ` · ${person.email}` : ''}</option>)}</select></label><button type="button" disabled={busy || !personId} onClick={() => void enrollPerson()} className="self-end rounded-full bg-[#0A3F4D] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Crear matrícula' : 'Create enrollment'}</button><p className="text-[10px] leading-4 text-black/35 md:col-span-2">{language === 'es' ? 'No se crea otro contacto: se conecta esta cohorte al mismo personId e historial.' : 'No new contact is created: this cohort is linked to the same personId and history.'}</p></div>}

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-black/8 bg-[#FAFAF8] px-3 py-2.5"><Search className="h-4 w-4 text-black/30" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar alumno…' : 'Search student…'} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>

          <div className="mt-4 space-y-2">{filteredEnrollments.map((enrollment) => {
            const person = peopleById.get(enrollment.personId);
            const signal = enrollmentAttention(enrollment, language);
            return <div key={enrollment.id} className="rounded-xl border border-black/8 p-4"><div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold">{person?.name || enrollment.personId}</p>{signal && <span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${signal.level === 'high' ? 'bg-[#A23A32]/9 text-[#8D332C]' : 'bg-[#A46F16]/10 text-[#82570F]'}`}>{signal.label}</span>}</div><p className="mt-1 text-xs text-black/38">{person?.email || person?.phone || '—'}</p>{signal && <p className="mt-2 text-xs text-black/50">{signal.reason}</p>}</div><div className="grid gap-2 sm:grid-cols-[150px_170px_auto] sm:items-center"><select value={enrollment.status} onChange={(event) => void updateEnrollment(enrollment, { status: event.target.value as EnrollmentStatus, progress: event.target.value === 'completed' ? 100 : enrollment.progress })} className="rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs"><option value="active">{statusLabel('active', language)}</option><option value="completed">{statusLabel('completed', language)}</option><option value="withdrawn">{statusLabel('withdrawn', language)}</option><option value="refunded">{statusLabel('refunded', language)}</option></select><label className="flex items-center gap-2 rounded-lg border border-black/10 px-2.5 py-2"><input type="number" min={0} max={100} value={enrollment.progress} onChange={(event) => void updateEnrollment(enrollment, { progress: Number(event.target.value) || 0 })} className="w-12 text-right text-xs outline-none" /><span className="text-xs text-black/35">%</span><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-black/8"><div className="h-full rounded-full bg-[#0A3F4D]" style={{ width: `${enrollment.progress}%` }} /></div></label>{signal ? <button type="button" onClick={() => void sendAttentionToPriority(enrollment)} className="rounded-full border border-black/10 px-3 py-2 text-[10px] font-semibold">{language === 'es' ? 'Enviar a Priority Work' : 'Send to Priority Work'}</button> : <div className="flex items-center gap-1 text-[10px] font-semibold text-[#2C766B]"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Sin señal crítica' : 'No critical signal'}</div>}</div></div></div>;
          })}{selectedEnrollments.length === 0 && <div className="rounded-xl border border-dashed border-black/10 p-7 text-center text-sm text-black/35">{language === 'es' ? 'Aún no hay alumnos en esta cohorte.' : 'No students in this cohort yet.'}</div>}</div>
        </section>}
      </div> : <section className="rounded-2xl border border-black/10 bg-white p-8 text-center text-sm text-black/40">{language === 'es' ? 'Crea una formación para comenzar.' : 'Create a formation to begin.'}</section>}
    </div>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
