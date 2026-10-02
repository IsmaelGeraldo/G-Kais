import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, FileUp, Pencil, Play, Plus, Search, Trash2, UserPlus } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';
import { createBuyerAndEnroll, deleteCohortCascade, deleteFormationCascade } from '../../services/expertsFormationAdmin';
import {
  deleteEnrollmentRecord,
  deleteFormationPlanDay,
  ensureFormationClassPlan,
  saveFormationPlanClass,
  subscribeFormationPlan,
  type FormationPlanClass
} from '../../services/expertsFormationPlan';
import {
  saveCohortStructure,
  saveFormationStructure,
  subscribeCohortStructure,
  subscribeFormationStructure,
  type CohortStructure,
  type FormationStructure
} from '../../services/expertsFormationStructure';
import {
  createOperationalCohort,
  createOperationalFormation,
  enrollExpertPerson,
  subscribeExpertCohorts,
  subscribeExpertEnrollments,
  subscribeExpertFormations,
  updateOperationalCohort,
  updateOperationalFormation,
  type ExpertCohort,
  type ExpertEnrollment,
  type ExpertFormation
} from '../../services/expertsFormations';
import { FormationClassSessionMode } from './FormationClassSessionMode';

type CsvRow = Record<string, string>;
type NewBuyer = { name: string; email: string; phone: string; source: string };
const EMPTY_BUYER: NewBuyer = { name: '', email: '', phone: '', source: '' };
const EMPTY_FORMATION_STRUCTURE: FormationStructure = { learning: '', expectedOutcome: '', description: '' };
const WEEK_DAYS = [
  { value: 1, es: 'Lun', en: 'Mon' },
  { value: 2, es: 'Mar', en: 'Tue' },
  { value: 3, es: 'Mié', en: 'Wed' },
  { value: 4, es: 'Jue', en: 'Thu' },
  { value: 5, es: 'Vie', en: 'Fri' },
  { value: 6, es: 'Sáb', en: 'Sat' },
  { value: 0, es: 'Dom', en: 'Sun' }
] as const;

function dateOnly(value: string) { return value ? value.slice(0, 10) : ''; }
function splitLines(value: string) { return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean); }
function formatDate(value: string, language: Language) {
  const clean = dateOnly(value);
  if (!clean) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${clean}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium' }).format(date)
    : clean;
}
function classDates(startsAt: string, endsAt: string, classDays: number[]) {
  const start = dateOnly(startsAt); const end = dateOnly(endsAt);
  if (!start || !end || !classDays.length) return [];
  const cursor = new Date(`${start}T12:00:00`); const finish = new Date(`${end}T12:00:00`);
  if (!Number.isFinite(cursor.getTime()) || !Number.isFinite(finish.getTime()) || cursor > finish) return [];
  const wanted = new Set(classDays); const dates: string[] = [];
  for (let guard = 0; cursor <= finish && guard < 730; guard += 1, cursor.setDate(cursor.getDate() + 1)) {
    if (wanted.has(cursor.getDay())) dates.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`);
  }
  return dates;
}
function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean); if (lines.length < 2) return [];
  const headers = lines[0].split(/[,;\t]/).map((value) => value.trim().toLowerCase());
  return lines.slice(1).map((line) => { const values = line.split(/[,;\t]/); return Object.fromEntries(headers.map((key, index) => [key, (values[index] || '').trim()])); });
}
function pick(row: CsvRow, keys: string[]) { for (const key of keys) if (row[key]) return row[key]; return ''; }
function activeStyle(active: boolean): React.CSSProperties | undefined {
  return active ? { background: 'var(--gkais-internal-accent, #111413)', color: 'var(--gkais-internal-accent-text, #ffffff)' } : undefined;
}

export function FormationsWorkspace({ language }: { language: Language }) {
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [enrollments, setEnrollments] = useState<ExpertEnrollment[]>([]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState('');
  const [selectedCohortId, setSelectedCohortId] = useState('');
  const [tab, setTab] = useState<'students' | 'plan'>('students');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const [showFormation, setShowFormation] = useState(false);
  const [editingFormation, setEditingFormation] = useState(false);
  const [formationTitle, setFormationTitle] = useState('');
  const [formationLearning, setFormationLearning] = useState('');
  const [formationOutcome, setFormationOutcome] = useState('');
  const [formationStructure, setFormationStructure] = useState<FormationStructure>(EMPTY_FORMATION_STRUCTURE);

  const [showCohort, setShowCohort] = useState(false);
  const [editingCohort, setEditingCohort] = useState(false);
  const [cohortTitle, setCohortTitle] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [classesPerWeek, setClassesPerWeek] = useState(1);
  const [classDays, setClassDays] = useState<number[]>([]);
  const [cohortStructure, setCohortStructure] = useState<CohortStructure>({ classesPerWeek: 1, classDays: [] });

  const [showEnrollment, setShowEnrollment] = useState(false);
  const [enrollmentMode, setEnrollmentMode] = useState<'existing' | 'new'>('existing');
  const [personSearch, setPersonSearch] = useState('');
  const [personId, setPersonId] = useState('');
  const [newBuyer, setNewBuyer] = useState<NewBuyer>(EMPTY_BUYER);
  const [studentSearch, setStudentSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [plan, setPlan] = useState<FormationPlanClass[]>([]);
  const [editingClassId, setEditingClassId] = useState('');
  const [classNumber, setClassNumber] = useState('1');
  const [classTitle, setClassTitle] = useState('');
  const [classDate, setClassDate] = useState('');
  const [classItems, setClassItems] = useState('');
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionClassId, setSessionClassId] = useState('');

  useEffect(() => {
    let stopFormations: (() => void) | undefined; let stopCohorts: (() => void) | undefined; let stopEnrollments: (() => void) | undefined; let stopPeople: (() => void) | undefined;
    void subscribeExpertFormations((items) => { setFormations(items); setSelectedFormationId((current) => current || items.find((item) => item.status === 'active')?.id || items[0]?.id || ''); }).then((stop) => { stopFormations = stop; });
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; });
    void subscribeExpertEnrollments(setEnrollments).then((stop) => { stopEnrollments = stop; });
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; });
    return () => { stopFormations?.(); stopCohorts?.(); stopEnrollments?.(); stopPeople?.(); };
  }, []);

  const formation = formations.find((item) => item.id === selectedFormationId) || null;
  const formationCohorts = useMemo(() => cohorts.filter((item) => item.formationId === selectedFormationId), [cohorts, selectedFormationId]);
  const formationEnrollments = useMemo(() => enrollments.filter((item) => item.formationId === selectedFormationId), [enrollments, selectedFormationId]);
  useEffect(() => {
    if (!formationCohorts.some((item) => item.id === selectedCohortId)) setSelectedCohortId(formationCohorts.find((item) => item.status === 'active')?.id || formationCohorts[0]?.id || '');
  }, [formationCohorts, selectedCohortId]);
  const cohort = formationCohorts.find((item) => item.id === selectedCohortId) || null;
  const peopleById = useMemo(() => new Map(people.map((person) => [person.id, person])), [people]);
  const selectedEnrollments = useMemo(() => enrollments.filter((item) => item.cohortId === selectedCohortId), [enrollments, selectedCohortId]);
  const enrolledIds = useMemo(() => new Set(selectedEnrollments.map((item) => item.personId)), [selectedEnrollments]);
  const studentRows = useMemo(() => {
    const term = studentSearch.trim().toLowerCase();
    return selectedEnrollments.filter((enrollment) => { const person = peopleById.get(enrollment.personId); return !term || [person?.name || '', person?.email || '', person?.phone || ''].some((value) => value.toLowerCase().includes(term)); });
  }, [selectedEnrollments, peopleById, studentSearch]);
  const personMatches = useMemo(() => {
    const term = personSearch.trim().toLowerCase(); if (!term) return [];
    return people.filter((person) => !enrolledIds.has(person.id)).filter((person) => [person.name, person.email, person.phone].some((value) => value.toLowerCase().includes(term))).slice(0, 8);
  }, [people, enrolledIds, personSearch]);

  useEffect(() => {
    if (!selectedFormationId) { setFormationStructure(EMPTY_FORMATION_STRUCTURE); return; }
    let stop: (() => void) | undefined;
    void subscribeFormationStructure(selectedFormationId, setFormationStructure).then((unsubscribe) => { stop = unsubscribe; });
    return () => stop?.();
  }, [selectedFormationId]);
  useEffect(() => {
    if (!selectedCohortId) { setCohortStructure({ classesPerWeek: 1, classDays: [] }); setPlan([]); return; }
    let stopStructure: (() => void) | undefined; let stopPlan: (() => void) | undefined;
    void subscribeCohortStructure(selectedCohortId, setCohortStructure).then((unsubscribe) => { stopStructure = unsubscribe; });
    void subscribeFormationPlan(selectedCohortId, setPlan).then((unsubscribe) => { stopPlan = unsubscribe; });
    return () => { stopStructure?.(); stopPlan?.(); };
  }, [selectedCohortId]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(''), 5000); return () => window.clearTimeout(timer); }, [message]);

  const resetFormation = () => { setFormationTitle(''); setFormationLearning(''); setFormationOutcome(''); };
  const createFormation = async () => {
    if (!formationTitle.trim() || !formationLearning.trim() || !formationOutcome.trim()) { setMessage(language === 'es' ? 'Completa nombre, qué aprenderán y resultado esperado.' : 'Complete name, learning and expected outcome.'); return; }
    setBusy(true);
    try {
      const id = await createOperationalFormation({ title: formationTitle, status: 'active' });
      await saveFormationStructure({ formationId: id, formationTitle, learning: formationLearning, expectedOutcome: formationOutcome });
      setSelectedFormationId(id); resetFormation(); setShowFormation(false);
    } catch { setMessage(language === 'es' ? 'No se pudo crear la formación.' : 'Could not create formation.'); }
    finally { setBusy(false); }
  };
  const beginFormationEdit = () => {
    if (!formation) return; setFormationTitle(formation.title); setFormationLearning(formationStructure.learning || formationStructure.description); setFormationOutcome(formationStructure.expectedOutcome); setEditingFormation(true);
  };
  const saveFormation = async () => {
    if (!formation || !formationTitle.trim() || !formationLearning.trim() || !formationOutcome.trim()) return;
    setBusy(true);
    try { await Promise.all([updateOperationalFormation(formation.id, { title: formationTitle }), saveFormationStructure({ formationId: formation.id, formationTitle, learning: formationLearning, expectedOutcome: formationOutcome })]); setEditingFormation(false); setMessage(language === 'es' ? 'Formación actualizada.' : 'Formation updated.'); }
    catch { setMessage(language === 'es' ? 'No se pudo guardar la formación.' : 'Could not save formation.'); }
    finally { setBusy(false); }
  };
  const removeFormation = async () => {
    if (!formation) return;
    const cohortCount = formationCohorts.length; const studentCount = formationEnrollments.length;
    const confirmed = window.confirm(language === 'es'
      ? `Esta formación tiene ${cohortCount} cohorte(s) y ${studentCount} alumno(s) matriculado(s). Se eliminarán la formación, sus cohortes, matrículas y planes de clase. Las Personas y su historial se conservarán. ¿Deseas continuar?`
      : `This formation has ${cohortCount} cohort(s) and ${studentCount} enrolled student(s). The formation, cohorts, enrollments and class plans will be deleted. People and history remain. Continue?`);
    if (!confirmed) return;
    setBusy(true);
    try { await deleteFormationCascade(formation.id); setSelectedFormationId(''); setSelectedCohortId(''); setEditingFormation(false); setMessage(language === 'es' ? 'Formación eliminada.' : 'Formation deleted.'); }
    catch { setMessage(language === 'es' ? 'No se pudo eliminar la formación.' : 'Could not delete formation.'); }
    finally { setBusy(false); }
  };

  const resetCohort = () => { setCohortTitle(''); setStartsAt(''); setEndsAt(''); setClassesPerWeek(1); setClassDays([]); };
  const toggleDay = (day: number) => setClassDays((current) => current.includes(day) ? current.filter((item) => item !== day) : [...current, day]);
  const validateCohort = () => {
    if (!cohortTitle.trim() || !startsAt || !endsAt) return language === 'es' ? 'Completa nombre, inicio y término.' : 'Complete name, start and end.';
    if (new Date(`${dateOnly(startsAt)}T12:00:00`) > new Date(`${dateOnly(endsAt)}T12:00:00`)) return language === 'es' ? 'La fecha de término debe ser posterior al inicio.' : 'End date must be after start date.';
    if (classDays.length !== classesPerWeek) return language === 'es' ? `Selecciona exactamente ${classesPerWeek} día(s) de clase.` : `Select exactly ${classesPerWeek} class day(s).`;
    return '';
  };
  const createCohort = async () => {
    if (!formation) return; const error = validateCohort(); if (error) { setMessage(error); return; }
    setBusy(true);
    try {
      const id = await createOperationalCohort({ formationId: formation.id, title: cohortTitle, startsAt: dateOnly(startsAt), endsAt: dateOnly(endsAt), status: 'planned' });
      const dates = classDates(startsAt, endsAt, classDays);
      await Promise.all([
        saveCohortStructure({ formationId: formation.id, cohortId: id, cohortTitle, classesPerWeek, classDays }),
        ensureFormationClassPlan({ formationId: formation.id, cohortId: id, cohortTitle, dates })
      ]);
      setSelectedCohortId(id); resetCohort(); setShowCohort(false); setTab('plan'); setMessage(language === 'es' ? `${dates.length} clases creadas.` : `${dates.length} classes created.`);
    } catch { setMessage(language === 'es' ? 'No se pudo crear la cohorte.' : 'Could not create cohort.'); }
    finally { setBusy(false); }
  };
  const beginCohortEdit = () => { if (!cohort) return; setCohortTitle(cohort.title); setStartsAt(dateOnly(cohort.startsAt)); setEndsAt(dateOnly(cohort.endsAt)); setClassesPerWeek(cohortStructure.classesPerWeek || 1); setClassDays(cohortStructure.classDays); setEditingCohort(true); };
  const saveCohort = async () => {
    if (!formation || !cohort) return; const error = validateCohort(); if (error) { setMessage(error); return; }
    setBusy(true);
    try {
      const dates = classDates(startsAt, endsAt, classDays);
      await Promise.all([
        updateOperationalCohort(cohort.id, { title: cohortTitle, startsAt: dateOnly(startsAt), endsAt: dateOnly(endsAt) }),
        saveCohortStructure({ formationId: formation.id, cohortId: cohort.id, cohortTitle, classesPerWeek, classDays }),
        ensureFormationClassPlan({ formationId: formation.id, cohortId: cohort.id, cohortTitle, dates })
      ]);
      setEditingCohort(false); setMessage(language === 'es' ? 'Cohorte y calendario actualizados.' : 'Cohort and calendar updated.');
    } catch { setMessage(language === 'es' ? 'No se pudo guardar la cohorte.' : 'Could not save cohort.'); }
    finally { setBusy(false); }
  };
  const removeCohort = async () => {
    if (!cohort) return; const studentCount = selectedEnrollments.length;
    if (!window.confirm(language === 'es' ? `Esta cohorte tiene ${studentCount} alumno(s). Se eliminarán sus matrículas y plan de clases, conservando las Personas y su historial. ¿Deseas continuar?` : `This cohort has ${studentCount} student(s). Enrollments and class plan will be deleted while People and history remain. Continue?`)) return;
    setBusy(true);
    try { await deleteCohortCascade(cohort.id); setSelectedCohortId(''); setEditingCohort(false); setMessage(language === 'es' ? 'Cohorte eliminada.' : 'Cohort deleted.'); }
    catch { setMessage(language === 'es' ? 'No se pudo eliminar la cohorte.' : 'Could not delete cohort.'); }
    finally { setBusy(false); }
  };

  const enroll = async () => {
    if (!formation || !cohort) return; setBusy(true);
    try {
      if (enrollmentMode === 'existing' && personId) await enrollExpertPerson({ personId, formationId: formation.id, cohortId: cohort.id, status: 'active', progress: 0 });
      else if (enrollmentMode === 'new' && newBuyer.name.trim() && (newBuyer.email.trim() || newBuyer.phone.trim())) await createBuyerAndEnroll({ ...newBuyer, formationId: formation.id, cohortId: cohort.id });
      else return;
      setShowEnrollment(false); setPersonId(''); setPersonSearch(''); setNewBuyer(EMPTY_BUYER); setMessage(language === 'es' ? 'Persona integrada a la cohorte.' : 'Person enrolled.');
    } catch { setMessage(language === 'es' ? 'No se pudo integrar la persona.' : 'Could not enroll person.'); }
    finally { setBusy(false); }
  };
  const importCsv = async (file: File) => {
    if (!formation || !cohort) return; setImporting(true);
    try {
      const rows = parseCsv(await file.text()); let imported = 0;
      for (let index = 0; index < rows.length; index += 8) {
        const results = await Promise.all(rows.slice(index, index + 8).map(async (row) => {
          const email = pick(row, ['email', 'correo']); const phone = pick(row, ['phone', 'telefono', 'teléfono']); const name = pick(row, ['name', 'nombre']) || (email ? email.split('@')[0] : phone); const source = pick(row, ['source', 'origen', 'canal', 'plataforma']);
          if (!name || (!email && !phone)) return false;
          try { await createBuyerAndEnroll({ name, email, phone, source, formationId: formation.id, cohortId: cohort.id }); return true; } catch { return false; }
        })); imported += results.filter(Boolean).length;
      }
      setMessage(language === 'es' ? `${imported} alumnos importados.` : `${imported} students imported.`);
    } finally { setImporting(false); if (fileInput.current) fileInput.current.value = ''; }
  };
  const removeStudent = async (enrollment: ExpertEnrollment) => {
    if (!window.confirm(language === 'es' ? '¿Retirar a esta persona de la cohorte? Su Persona e historial se conservan.' : 'Remove this person from the cohort? Their Person and history remain.')) return;
    try { await deleteEnrollmentRecord(enrollment.id); } catch { setMessage(language === 'es' ? 'No se pudo retirar al alumno.' : 'Could not remove student.'); }
  };

  const resetClass = () => { setEditingClassId(''); setClassNumber(String((plan.at(-1)?.classNumber || 0) + 1)); setClassTitle(''); setClassDate(''); setClassItems(''); };
  const editClass = (item: FormationPlanClass) => { setEditingClassId(item.id); setClassNumber(String(item.classNumber)); setClassTitle(item.title); setClassDate(item.date); setClassItems(item.teachingItems.join('\n')); };
  const saveClass = async () => {
    if (!formation || !cohort || !classTitle.trim()) return; setBusy(true);
    try {
      const current = plan.find((item) => item.id === editingClassId);
      await saveFormationPlanClass({ id: editingClassId || undefined, formationId: formation.id, cohortId: cohort.id, cohortTitle: cohort.title, classNumber: Number(classNumber) || 1, title: classTitle, teachingItems: splitLines(classItems), date: classDate, mentorNotes: current?.mentorNotes, faq: current?.faq, closingNotes: current?.closingNotes, status: current?.status || 'pending' });
      resetClass(); setMessage(language === 'es' ? 'Plan de clase guardado.' : 'Class plan saved.');
    } finally { setBusy(false); }
  };
  const toggleClassComplete = async (item: FormationPlanClass) => {
    if (!formation || !cohort) return;
    await saveFormationPlanClass({ id: item.id, formationId: formation.id, cohortId: cohort.id, cohortTitle: cohort.title, classNumber: item.classNumber, title: item.title, teachingItems: item.teachingItems, date: item.date, mentorNotes: item.mentorNotes, faq: item.faq, closingNotes: item.closingNotes, status: item.status === 'done' ? 'pending' : 'done' });
  };

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'FORMACIONES' : 'FORMATIONS'}</p><h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Cohortes, alumnos y plan de clases' : 'Cohorts, students and class plan'}</h3><p className="mt-2 max-w-3xl text-sm text-black/50">{language === 'es' ? 'Planifica qué enseñar y usa Modo sesión para registrar lo que realmente ocurrió en cada clase.' : 'Plan what to teach and use Session Mode to capture what actually happened in each class.'}</p></div><button type="button" onClick={() => { resetFormation(); setShowFormation((value) => !value); }} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white"><Plus className="mr-1 inline h-4 w-4" />{language === 'es' ? 'Nueva formación' : 'New formation'}</button></div>
      {showFormation && <div className="mt-4 rounded-2xl bg-[#FAFAF8] p-4"><div className="grid gap-3 lg:grid-cols-3"><Field label={language === 'es' ? 'Nombre' : 'Name'}><input value={formationTitle} onChange={(event) => setFormationTitle(event.target.value)} placeholder={language === 'es' ? 'Ej. Programa Escala' : 'e.g. Scale Program'} className="h-[92px] w-full rounded-xl border border-black/10 bg-white px-3 py-3 text-sm" /></Field><Field label={language === 'es' ? 'Qué aprenderán' : 'What they will learn'}><textarea rows={3} value={formationLearning} onChange={(event) => setFormationLearning(event.target.value)} placeholder={language === 'es' ? 'Contenidos y capacidades que desarrollarán.' : 'Content and capabilities they will develop.'} className="h-[92px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm" /></Field><Field label={language === 'es' ? 'Resultado esperado' : 'Expected outcome'}><textarea rows={3} value={formationOutcome} onChange={(event) => setFormationOutcome(event.target.value)} placeholder={language === 'es' ? 'Qué deberían poder lograr al finalizar.' : 'What they should be able to achieve at the end.'} className="h-[92px] w-full resize-none rounded-xl border border-black/10 bg-white px-3 py-3 text-sm" /></Field></div><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void createFormation()} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Crear formación' : 'Create formation')}</button><button onClick={() => setShowFormation(false)} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div>}
    </section>

    <div className="grid items-start gap-5 xl:grid-cols-[280px_1fr]">
      <section className="self-start overflow-hidden rounded-2xl border border-black/10 bg-white"><div className="border-b border-black/7 p-4 text-xs font-semibold uppercase text-black/40">{language === 'es' ? 'FORMACIONES' : 'FORMATIONS'}</div><div className="max-h-[430px] overflow-y-auto">{formations.map((item) => <button key={item.id} type="button" onClick={() => setSelectedFormationId(item.id)} className={`w-full border-b border-black/5 p-4 text-left last:border-b-0 ${item.id === selectedFormationId ? 'bg-[#F7F7F5]' : ''}`}><p className="text-sm font-semibold">{item.title}</p><p className="mt-1 text-[10px] uppercase text-black/35">{item.status}</p></button>)}{!formations.length && <p className="p-5 text-sm text-black/35">{language === 'es' ? 'Aún no hay formaciones.' : 'No formations yet.'}</p>}</div></section>

      {formation && <div className="min-w-0 space-y-4">
        <section className="rounded-2xl border border-black/10 bg-white p-5">
          {!editingFormation ? <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="max-w-4xl"><h4 className="text-xl font-semibold">{formation.title}</h4><div className="mt-3 grid gap-3 md:grid-cols-2"><Info label={language === 'es' ? 'QUÉ APRENDERÁN' : 'WHAT THEY WILL LEARN'} value={formationStructure.learning || formationStructure.description || '—'} /><Info label={language === 'es' ? 'RESULTADO ESPERADO' : 'EXPECTED OUTCOME'} value={formationStructure.expectedOutcome || '—'} /></div></div><button onClick={beginFormationEdit} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Pencil className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button></div> : <div><div className="grid gap-3 lg:grid-cols-3"><Field label={language === 'es' ? 'Nombre' : 'Name'}><input value={formationTitle} onChange={(event) => setFormationTitle(event.target.value)} className="h-[92px] w-full rounded-xl border border-black/10 px-3 py-3 text-sm" /></Field><Field label={language === 'es' ? 'Qué aprenderán' : 'What they will learn'}><textarea value={formationLearning} onChange={(event) => setFormationLearning(event.target.value)} className="h-[92px] w-full resize-none rounded-xl border border-black/10 px-3 py-3 text-sm" /></Field><Field label={language === 'es' ? 'Resultado esperado' : 'Expected outcome'}><textarea value={formationOutcome} onChange={(event) => setFormationOutcome(event.target.value)} className="h-[92px] w-full resize-none rounded-xl border border-black/10 px-3 py-3 text-sm" /></Field></div><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void saveFormation()} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button onClick={() => setEditingFormation(false)} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button disabled={busy} onClick={() => void removeFormation()} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar formación' : 'Delete formation'}</button></div></div>}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-black/6 pt-4">{formationCohorts.map((item) => <button key={item.id} onClick={() => setSelectedCohortId(item.id)} className={`rounded-full border px-4 py-2 text-xs font-semibold ${item.id === selectedCohortId ? 'border-transparent' : 'border-black/10 bg-white text-black/55'}`} style={activeStyle(item.id === selectedCohortId)}>{item.title}</button>)}<button onClick={() => { resetCohort(); setShowCohort((value) => !value); }} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Cohorte' : 'Cohort'}</button></div>
          {showCohort && <div className="mt-3 rounded-xl bg-[#FAFAF8] p-4"><CohortFields language={language} title={cohortTitle} setTitle={setCohortTitle} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} classesPerWeek={classesPerWeek} setClassesPerWeek={setClassesPerWeek} classDays={classDays} toggleDay={toggleDay} /><div className="mt-3 flex gap-2"><button disabled={busy} onClick={() => void createCohort()} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{busy ? (language === 'es' ? 'Creando…' : 'Creating…') : (language === 'es' ? 'Crear cohorte y plan' : 'Create cohort and plan')}</button><button onClick={() => setShowCohort(false)} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button></div></div>}
        </section>

        {cohort && <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
          <div className="border-b border-black/7 p-4 md:p-5">
            {!editingCohort ? <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.13em] text-black/35">{language === 'es' ? 'COHORTE' : 'COHORT'}</p><h4 className="mt-1 text-lg font-semibold">{cohort.title}</h4><p className="mt-1 text-xs text-black/45">{formatDate(cohort.startsAt, language)} → {formatDate(cohort.endsAt, language)} · {cohortStructure.classesPerWeek} {language === 'es' ? 'clase(s)/semana' : 'class(es)/week'}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => { setSessionClassId(''); setSessionOpen(true); }} className="inline-flex items-center gap-1 rounded-full bg-[#0A3F4D] px-4 py-2 text-xs font-semibold text-white"><Play className="h-3.5 w-3.5" />{language === 'es' ? 'Modo sesión' : 'Session mode'}</button><button onClick={beginCohortEdit} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white"><Pencil className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Editar cohorte' : 'Edit cohort'}</button></div></div> : <div className="space-y-4"><CohortFields language={language} title={cohortTitle} setTitle={setCohortTitle} startsAt={startsAt} setStartsAt={setStartsAt} endsAt={endsAt} setEndsAt={setEndsAt} classesPerWeek={classesPerWeek} setClassesPerWeek={setClassesPerWeek} classDays={classDays} toggleDay={toggleDay} /><div className="rounded-xl bg-[#FAFAF8] p-3"><p className="text-xs font-semibold">{language === 'es' ? `Alumnos actuales (${selectedEnrollments.length})` : `Current students (${selectedEnrollments.length})`}</p><div className="mt-2 max-h-[180px] divide-y divide-black/5 overflow-y-auto">{selectedEnrollments.map((enrollment) => { const person = peopleById.get(enrollment.personId); return <div key={enrollment.id} className="flex items-center justify-between gap-3 py-2"><div><p className="text-xs font-semibold">{person?.name || enrollment.personId}</p><p className="text-[10px] text-black/40">{person?.email || person?.phone || '—'}</p></div><button onClick={() => void removeStudent(enrollment)} className="text-[10px] font-semibold text-[#8D332C]">{language === 'es' ? 'Retirar' : 'Remove'}</button></div>; })}</div></div><div className="flex flex-wrap gap-2"><button disabled={busy} onClick={() => void saveCohort()} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Guardar' : 'Save'}</button><button onClick={() => setEditingCohort(false)} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button disabled={busy} onClick={() => void removeCohort()} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar cohorte' : 'Delete cohort'}</button></div></div>}
          </div>
          <div className="flex gap-1 border-b border-black/7 bg-[#FAFAF8] p-2"><button onClick={() => setTab('students')} className="rounded-lg px-4 py-2 text-xs font-semibold" style={activeStyle(tab === 'students')}>{language === 'es' ? `Alumnos (${selectedEnrollments.length})` : `Students (${selectedEnrollments.length})`}</button><button onClick={() => setTab('plan')} className="rounded-lg px-4 py-2 text-xs font-semibold" style={activeStyle(tab === 'plan')}>{language === 'es' ? `Plan de clases (${plan.length})` : `Class plan (${plan.length})`}</button></div>
          {tab === 'students' ? <div className="p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><label className="relative block max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={studentSearch} onChange={(event) => setStudentSearch(event.target.value)} placeholder={language === 'es' ? 'Buscar alumno…' : 'Search student…'} className="w-full rounded-xl border border-black/10 py-2 pl-9 pr-3 text-xs" /></label><div className="flex flex-wrap gap-2"><input ref={fileInput} type="file" accept=".csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importCsv(file); }} /><button disabled={importing} onClick={() => fileInput.current?.click()} className="rounded-full border border-black/10 px-3 py-2 text-xs font-semibold"><FileUp className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Importar CSV' : 'Import CSV'}</button><button onClick={() => setShowEnrollment((value) => !value)} className="rounded-full bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><UserPlus className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Integrar persona' : 'Enroll person'}</button></div></div>{showEnrollment && <EnrollmentPanel language={language} mode={enrollmentMode} setMode={setEnrollmentMode} personSearch={personSearch} setPersonSearch={setPersonSearch} personMatches={personMatches} personId={personId} setPersonId={setPersonId} newBuyer={newBuyer} setNewBuyer={setNewBuyer} onEnroll={() => void enroll()} busy={busy} />}<div className="mt-3 max-h-[480px] divide-y divide-black/5 overflow-y-auto rounded-xl border border-black/7">{studentRows.map((enrollment) => { const person = peopleById.get(enrollment.personId); return <div key={enrollment.id} className="grid gap-3 p-4 md:grid-cols-[1fr_1fr_140px] md:items-center"><div><p className="text-sm font-semibold">{person?.name || enrollment.personId}</p><p className="mt-1 text-xs text-black/40">{person?.email || '—'}</p></div><p className="text-xs text-black/45">{person?.phone || '—'}</p><span className="text-xs text-black/40">{enrollment.joinedAt ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium' }).format(enrollment.joinedAt) : (language === 'es' ? 'Integrado' : 'Enrolled')}</span></div>; })}{!studentRows.length && <div className="p-8 text-center text-sm text-black/40">{language === 'es' ? 'Sin alumnos en esta cohorte.' : 'No students in this cohort.'}</div>}</div></div> : <ClassPlan language={language} formation={formation} cohort={cohort} plan={plan} editingClassId={editingClassId} editClass={editClass} resetClass={resetClass} classNumber={classNumber} setClassNumber={setClassNumber} classTitle={classTitle} setClassTitle={setClassTitle} classDate={classDate} setClassDate={setClassDate} classItems={classItems} setClassItems={setClassItems} saveClass={() => void saveClass()} toggleComplete={(item) => void toggleClassComplete(item)} removeClass={(id) => void deleteFormationPlanDay(id)} openSession={(id) => { setSessionClassId(id); setSessionOpen(true); }} busy={busy} />}
        </section>}
        {message && <p className="rounded-xl bg-[#F7F7F5] px-4 py-3 text-xs text-black/55">{message}</p>}
      </div>}
    </div>
    {formation && cohort && <FormationClassSessionMode open={sessionOpen} onClose={() => setSessionOpen(false)} language={language} formation={formation} cohort={cohort} plan={plan} initialClassId={sessionClassId} onMessage={setMessage} />}
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label><span className="mb-1.5 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-[#FAFAF8] p-3"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{label}</p><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-black/55">{value}</p></div>; }

function CohortFields({ language, title, setTitle, startsAt, setStartsAt, endsAt, setEndsAt, classesPerWeek, setClassesPerWeek, classDays, toggleDay }: { language: Language; title: string; setTitle: (value: string) => void; startsAt: string; setStartsAt: (value: string) => void; endsAt: string; setEndsAt: (value: string) => void; classesPerWeek: number; setClassesPerWeek: (value: number) => void; classDays: number[]; toggleDay: (value: number) => void; }) {
  return <div className="grid gap-3 lg:grid-cols-4"><Field label={language === 'es' ? 'Nombre cohorte' : 'Cohort name'}><input value={title} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><Field label={language === 'es' ? 'Fecha inicio' : 'Start date'}><input type="date" value={dateOnly(startsAt)} onChange={(event) => setStartsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><Field label={language === 'es' ? 'Fecha término' : 'End date'}><input type="date" value={dateOnly(endsAt)} onChange={(event) => setEndsAt(event.target.value)} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><Field label={language === 'es' ? 'Clases por semana' : 'Classes per week'}><input type="number" min="1" max="7" value={classesPerWeek} onChange={(event) => setClassesPerWeek(Math.max(1, Math.min(7, Number(event.target.value) || 1)))} className="w-full rounded-lg border border-black/10 bg-white px-3 py-2.5 text-sm" /></Field><div className="lg:col-span-4"><span className="mb-2 block text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'Días de clase' : 'Class days'}</span><div className="flex flex-wrap gap-2">{WEEK_DAYS.map((day) => { const active = classDays.includes(day.value); return <button key={day.value} type="button" onClick={() => toggleDay(day.value)} className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${active ? 'border-[#111413] bg-[#111413] text-white' : 'border-black/10 bg-white text-black/45'}`}>{day[language]}</button>; })}</div></div></div>;
}

function EnrollmentPanel({ language, mode, setMode, personSearch, setPersonSearch, personMatches, personId, setPersonId, newBuyer, setNewBuyer, onEnroll, busy }: { language: Language; mode: 'existing' | 'new'; setMode: (value: 'existing' | 'new') => void; personSearch: string; setPersonSearch: (value: string) => void; personMatches: ExpertPerson[]; personId: string; setPersonId: (value: string) => void; newBuyer: NewBuyer; setNewBuyer: React.Dispatch<React.SetStateAction<NewBuyer>>; onEnroll: () => void; busy: boolean; }) {
  return <div className="mt-3 rounded-xl bg-[#FAFAF8] p-4"><div className="inline-flex rounded-xl bg-white p-1"><button onClick={() => setMode('existing')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'existing' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Persona existente' : 'Existing person'}</button><button onClick={() => setMode('new')} className={`rounded-lg px-3 py-2 text-xs font-semibold ${mode === 'new' ? 'bg-[#111413] text-white' : 'text-black/45'}`}>{language === 'es' ? 'Comprador externo / nuevo' : 'External buyer / new'}</button></div>{mode === 'existing' ? <div className="mt-3 max-w-2xl"><label className="relative block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={personSearch} onChange={(event) => { setPersonSearch(event.target.value); setPersonId(''); }} placeholder={language === 'es' ? 'Buscar por nombre, email o teléfono…' : 'Search by name, email or phone…'} className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm" /></label>{personSearch && <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-black/8 bg-white">{personMatches.map((person) => <button key={person.id} onClick={() => { setPersonId(person.id); setPersonSearch(`${person.name} · ${person.email || person.phone}`); }} className={`block w-full border-b border-black/5 px-3 py-2 text-left last:border-b-0 ${personId === person.id ? 'bg-[#F0F0ED]' : ''}`}><p className="text-xs font-semibold">{person.name}</p><p className="mt-0.5 text-[10px] text-black/40">{person.email || '—'} · {person.phone || '—'}</p></button>)}{!personMatches.length && <p className="p-3 text-xs text-black/35">{language === 'es' ? 'Sin coincidencias.' : 'No matches.'}</p>}</div>}</div> : <div className="mt-3 grid gap-2 md:grid-cols-4"><input value={newBuyer.name} onChange={(event) => setNewBuyer((current) => ({ ...current, name: event.target.value }))} placeholder={language === 'es' ? 'Nombre' : 'Name'} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><input value={newBuyer.email} onChange={(event) => setNewBuyer((current) => ({ ...current, email: event.target.value }))} placeholder="Email" className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><input value={newBuyer.phone} onChange={(event) => setNewBuyer((current) => ({ ...current, phone: event.target.value }))} placeholder={language === 'es' ? 'Teléfono' : 'Phone'} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /><input value={newBuyer.source} onChange={(event) => setNewBuyer((current) => ({ ...current, source: event.target.value }))} placeholder={language === 'es' ? 'Fuente (Meta, referido...)' : 'Source'} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm" /></div>}<button disabled={busy || (mode === 'existing' ? !personId : !newBuyer.name.trim())} onClick={onEnroll} className="mt-3 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-35">{language === 'es' ? 'Integrar a cohorte' : 'Enroll in cohort'}</button></div>;
}

function ClassPlan({ language, formation, cohort, plan, editingClassId, editClass, resetClass, classNumber, setClassNumber, classTitle, setClassTitle, classDate, setClassDate, classItems, setClassItems, saveClass, toggleComplete, removeClass, openSession, busy }: { language: Language; formation: ExpertFormation; cohort: ExpertCohort; plan: FormationPlanClass[]; editingClassId: string; editClass: (item: FormationPlanClass) => void; resetClass: () => void; classNumber: string; setClassNumber: (value: string) => void; classTitle: string; setClassTitle: (value: string) => void; classDate: string; setClassDate: (value: string) => void; classItems: string; setClassItems: (value: string) => void; saveClass: () => void; toggleComplete: (item: FormationPlanClass) => void; removeClass: (id: string) => void; openSession: (id: string) => void; busy: boolean; }) {
  const [showNew, setShowNew] = useState(false);
  return <div className="p-4 md:p-5"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{language === 'es' ? 'Planificación por clase' : 'Class-by-class plan'}</p><p className="mt-1 text-xs text-black/40">{formation.title} · {cohort.title}</p></div><button onClick={() => { resetClass(); setShowNew(true); }} className="rounded-full bg-[#111413] px-3 py-2 text-xs font-semibold text-white"><Plus className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Añadir clase' : 'Add class'}</button></div>{showNew && !editingClassId && <ClassEditor language={language} classNumber={classNumber} setClassNumber={setClassNumber} classTitle={classTitle} setClassTitle={setClassTitle} classDate={classDate} setClassDate={setClassDate} classItems={classItems} setClassItems={setClassItems} onSave={() => { saveClass(); setShowNew(false); }} onCancel={() => { resetClass(); setShowNew(false); }} busy={busy} />}<div className="mt-4 max-h-[520px] space-y-3 overflow-y-auto pr-1">{plan.map((item) => <div key={item.id} className="rounded-xl border border-black/8 bg-[#FAFAF8] p-4">{editingClassId === item.id ? <ClassEditor language={language} classNumber={classNumber} setClassNumber={setClassNumber} classTitle={classTitle} setClassTitle={setClassTitle} classDate={classDate} setClassDate={setClassDate} classItems={classItems} setClassItems={setClassItems} onSave={saveClass} onCancel={resetClass} onDelete={() => removeClass(item.id)} busy={busy} /> : <><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${item.status === 'done' ? 'bg-[#17603D]/10 text-[#17603D]' : 'bg-black/5 text-black/45'}`}>{language === 'es' ? `CLASE ${item.classNumber}` : `CLASS ${item.classNumber}`}</span><p className="text-sm font-semibold">{item.title}</p></div><p className="mt-1 text-xs text-black/40">{formatDate(item.date, language)}</p></div><div className="flex flex-wrap gap-2"><button onClick={() => openSession(item.id)} className="rounded-full bg-[#0A3F4D] px-3 py-2 text-[10px] font-semibold text-white"><Play className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Sesión' : 'Session'}</button><button onClick={() => editClass(item)} className="rounded-full bg-[#111413] px-3 py-2 text-[10px] font-semibold text-white"><Pencil className="mr-1 inline h-3.5 w-3.5" />{language === 'es' ? 'Editar' : 'Edit'}</button></div></div><div className="mt-3 grid gap-3 lg:grid-cols-[1.1fr_0.9fr]"><div><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'QUÉ ENSEÑAR' : 'WHAT TO TEACH'}</p><ul className="mt-1 space-y-1 text-xs text-black/55">{item.teachingItems.length ? item.teachingItems.map((value, index) => <li key={`${value}-${index}`}>• {value}</li>) : <li className="text-black/30">{language === 'es' ? 'Pendiente de planificar' : 'Pending planning'}</li>}</ul></div><div><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'REGISTRO DE SESIÓN' : 'SESSION RECORD'}</p><p className="mt-1 line-clamp-3 whitespace-pre-wrap text-xs text-black/55">{item.mentorNotes || item.closingNotes || (language === 'es' ? 'Todavía sin registro en vivo.' : 'No live record yet.')}</p></div></div>{item.status === 'done' && <button onClick={() => toggleComplete(item)} className="mt-3 inline-flex items-center gap-1 text-[10px] font-semibold text-black/40"><CheckCircle2 className="h-3.5 w-3.5" />{language === 'es' ? 'Reabrir clase' : 'Reopen class'}</button>}</>}</div>)}{!plan.length && <p className="rounded-xl border border-dashed border-black/10 p-8 text-center text-sm text-black/35">{language === 'es' ? 'No hay clases planificadas.' : 'No planned classes.'}</p>}</div></div>;
}

function ClassEditor({ language, classNumber, setClassNumber, classTitle, setClassTitle, classDate, setClassDate, classItems, setClassItems, onSave, onCancel, onDelete, busy }: { language: Language; classNumber: string; setClassNumber: (value: string) => void; classTitle: string; setClassTitle: (value: string) => void; classDate: string; setClassDate: (value: string) => void; classItems: string; setClassItems: (value: string) => void; onSave: () => void; onCancel: () => void; onDelete?: () => void; busy: boolean; }) {
  return <div className="mt-3 rounded-xl border border-black/8 bg-white p-4"><p className="text-xs font-semibold">{language === 'es' ? 'Preparación de la clase' : 'Class preparation'}</p><p className="mt-1 text-[10px] text-black/40">{language === 'es' ? 'Aquí defines lo que harás. Lo que ocurra durante la clase se registra en Modo sesión.' : 'Define what you will do here. What happens during class is captured in Session Mode.'}</p><div className="mt-3 grid gap-3 md:grid-cols-[100px_1fr_170px]"><Field label={language === 'es' ? 'Clase' : 'Class'}><input type="number" min="1" value={classNumber} onChange={(event) => setClassNumber(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" /></Field><Field label={language === 'es' ? 'Objetivo / título' : 'Objective / title'}><input value={classTitle} onChange={(event) => setClassTitle(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" /></Field><Field label={language === 'es' ? 'Fecha' : 'Date'}><input type="date" value={classDate} onChange={(event) => setClassDate(event.target.value)} className="w-full rounded-lg border border-black/10 px-3 py-2 text-sm" /></Field></div><Field label={language === 'es' ? 'Qué enseñar / puntos a cubrir' : 'What to teach / points to cover'}><textarea rows={5} value={classItems} onChange={(event) => setClassItems(event.target.value)} placeholder={language === 'es' ? 'Un punto por línea…' : 'One point per line…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm" /></Field><div className="mt-3 flex flex-wrap gap-2"><button disabled={busy} onClick={onSave} className="rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white disabled:opacity-40">{language === 'es' ? 'Guardar preparación' : 'Save preparation'}</button><button onClick={onCancel} className="rounded-full border border-black/10 px-4 py-2 text-xs font-semibold">{language === 'es' ? 'Cancelar' : 'Cancel'}</button>{onDelete && <button onClick={onDelete} className="inline-flex items-center gap-1 rounded-full border border-[#A23A32]/15 px-4 py-2 text-xs font-semibold text-[#8D332C]"><Trash2 className="h-3.5 w-3.5" />{language === 'es' ? 'Eliminar clase' : 'Delete class'}</button>}</div></div>;
}
