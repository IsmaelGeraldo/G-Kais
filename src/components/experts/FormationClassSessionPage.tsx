import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ChevronRight, ClipboardCheck, MessageSquareText } from 'lucide-react';
import { useLanguage, type Language } from '../../i18n/LanguageContext';
import { saveFormationPlanClass, subscribeFormationPlan, type FormationPlanClass } from '../../services/expertsFormationPlan';
import { subscribeExpertCohorts, subscribeExpertFormations, type ExpertCohort, type ExpertFormation } from '../../services/expertsFormations';

type Phase = 'opening' | 'teaching' | 'closing';
const PHASES: Phase[] = ['opening', 'teaching', 'closing'];

function formatDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium' }).format(date)
    : value;
}
function lines(value: string) { return value.split(/\n+/).map((item) => item.trim()).filter(Boolean); }
function phaseItems(item: FormationPlanClass, phase: Phase) {
  if (phase === 'opening') return item.openingItems;
  if (phase === 'teaching') return item.teachingItems;
  return item.closingItems;
}

export function FormationClassSessionPage() {
  const { language } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const formationId = params.get('formation') || '';
  const cohortId = params.get('cohort') || '';
  const requestedClassId = params.get('class') || '';
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [plan, setPlan] = useState<FormationPlanClass[]>([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stopFormations: (() => void) | undefined; let stopCohorts: (() => void) | undefined; let stopPlan: (() => void) | undefined;
    void subscribeExpertFormations(setFormations).then((stop) => { stopFormations = stop; });
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; });
    if (cohortId) void subscribeFormationPlan(cohortId, setPlan).then((stop) => { stopPlan = stop; });
    return () => { stopFormations?.(); stopCohorts?.(); stopPlan?.(); };
  }, [cohortId]);

  const formation = formations.find((item) => item.id === formationId) || null;
  const cohort = cohorts.find((item) => item.id === cohortId) || null;

  const goBack = () => {
    const query = new URLSearchParams({ view: 'formations' });
    if (formationId) query.set('formation', formationId);
    if (cohortId) query.set('cohort', cohortId);
    window.history.replaceState({}, '', `/workspace/experts?${query.toString()}`);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  if (!formation || !cohort) {
    return <div className="grid min-h-screen place-items-center bg-[#F6F6F3] px-4 text-sm text-black/45">
      <div className="text-center"><p>{language === 'es' ? 'Cargando sesión de formación…' : 'Loading formation session…'}</p><button type="button" onClick={goBack} className="mt-4 rounded-full bg-[#111413] px-4 py-2 text-xs font-semibold text-white">{language === 'es' ? 'Volver a Formaciones' : 'Back to Formations'}</button></div>
    </div>;
  }

  return <FormationSessionWorkspace
    language={language}
    formation={formation}
    cohort={cohort}
    plan={plan}
    requestedClassId={requestedClassId}
    onBack={goBack}
    onMessage={setMessage}
    message={message}
  />;
}

function FormationSessionWorkspace({ language, formation, cohort, plan, requestedClassId, onBack, onMessage, message }: {
  language: Language;
  formation: ExpertFormation;
  cohort: ExpertCohort;
  plan: FormationPlanClass[];
  requestedClassId: string;
  onBack: () => void;
  onMessage: (value: string) => void;
  message: string;
}) {
  const suggested = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return plan.find((item) => item.id === requestedClassId)
      || plan.find((item) => item.status !== 'done' && item.date >= today)
      || plan.find((item) => item.status !== 'done')
      || plan.at(-1)
      || null;
  }, [plan, requestedClassId]);
  const [selectedId, setSelectedId] = useState(requestedClassId || '');
  const selected = plan.find((item) => item.id === selectedId) || suggested;
  const previous = selected
    ? [...plan].filter((item) => item.classNumber < selected.classNumber).sort((a, b) => b.classNumber - a.classNumber)[0] || null
    : null;
  const [phase, setPhase] = useState<Phase>('opening');
  const [covered, setCovered] = useState<Record<string, boolean>>({});
  const [liveNotes, setLiveNotes] = useState('');
  const [faq, setFaq] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [assignments, setAssignments] = useState('');
  const [assignmentReview, setAssignmentReview] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (selected && !selectedId) setSelectedId(selected.id);
  }, [selected?.id, selectedId]);

  useEffect(() => {
    if (!selected) return;
    setPhase('opening');
    setCovered({});
    setLiveNotes(selected.mentorNotes || '');
    setFaq(selected.faq || '');
    setClosingNotes(selected.closingNotes || '');
    setAssignments(selected.assignments.join('\n'));
    setAssignmentReview(selected.assignmentReview || '');
  }, [selected?.id]);

  const phaseCopy: Record<Phase, { title: string; subtitle: string; empty: string }> = language === 'es' ? {
    opening: { title: 'Inicio', subtitle: 'Conecta con la clase anterior, revisa tareas y prepara al grupo para el objetivo de hoy.', empty: 'No hay pasos de Inicio planificados.' },
    teaching: { title: 'Desarrollo', subtitle: 'Sigue el contenido paso a paso y registra ejemplos, dudas o señales relevantes.', empty: 'No hay contenido de Desarrollo planificado.' },
    closing: { title: 'Cierre', subtitle: 'Resuelve preguntas, resume aprendizajes y deja tareas o próximos pasos claros.', empty: 'No hay pasos de Cierre planificados.' }
  } : {
    opening: { title: 'Opening', subtitle: 'Connect with the previous class, review assignments and frame today’s objective.', empty: 'No Opening steps planned.' },
    teaching: { title: 'Teaching', subtitle: 'Follow the content step by step and capture examples, questions or relevant signals.', empty: 'No Teaching content planned.' },
    closing: { title: 'Closing', subtitle: 'Resolve questions, summarize learning and leave clear assignments or next steps.', empty: 'No Closing steps planned.' }
  };

  const nextPhase = () => {
    const index = PHASES.indexOf(phase);
    if (index < PHASES.length - 1) setPhase(PHASES[index + 1]);
  };

  const finish = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await saveFormationPlanClass({
        id: selected.id,
        formationId: formation.id,
        cohortId: cohort.id,
        cohortTitle: cohort.title,
        classNumber: selected.classNumber,
        title: selected.title,
        openingItems: selected.openingItems,
        teachingItems: selected.teachingItems,
        closingItems: selected.closingItems,
        date: selected.date,
        mentorNotes: liveNotes,
        faq,
        closingNotes,
        assignments: lines(assignments),
        assignmentReview,
        status: 'done'
      });
      onMessage(language === 'es' ? 'Clase cerrada. El registro quedará como contexto de la siguiente sesión.' : 'Class closed. Its record will become context for the next session.');
      window.setTimeout(onBack, 250);
    } catch (error) {
      onMessage(error instanceof Error ? error.message : (language === 'es' ? 'No se pudo cerrar la clase.' : 'Could not close class.'));
    } finally {
      setBusy(false);
    }
  };

  const items = selected ? phaseItems(selected, phase) : [];

  return <div className="min-h-screen bg-[#F6F6F3] text-[#111413]">
    <header className="sticky top-0 z-20 border-b border-black/8 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3"><button type="button" onClick={onBack} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white"><ArrowLeft className="h-4 w-4" /></button><div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'MODO SESIÓN · FORMACIÓN' : 'FORMATION SESSION MODE'}</p><h1 className="text-sm font-semibold">{formation.title} · {cohort.title}</h1></div></div>
        <select value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)} className="max-w-[420px] rounded-xl border border-black/10 bg-white px-3 py-2 text-xs">
          {plan.map((item) => <option key={item.id} value={item.id}>{language === 'es' ? `Clase ${item.classNumber}` : `Class ${item.classNumber}`} · {item.title} · {item.status === 'done' ? (language === 'es' ? 'impartida' : 'taught') : (language === 'es' ? 'pendiente' : 'pending')}</option>)}
        </select>
      </div>
    </header>

    <main className="mx-auto max-w-[1500px] p-4 md:p-8">
      {!selected ? <div className="rounded-3xl border border-dashed border-black/10 bg-white p-10 text-center text-sm text-black/40">{language === 'es' ? 'Esta cohorte todavía no tiene clases activas.' : 'This cohort has no active classes yet.'}</div> : <>
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? `CLASE ${selected.classNumber}` : `CLASS ${selected.classNumber}`} · {formatDate(selected.date, language)}</p><h2 className="mt-1 text-3xl font-semibold tracking-[-0.03em]">{selected.title}</h2></div><div className="flex gap-2">{PHASES.map((item, index) => <button key={item} type="button" onClick={() => setPhase(item)} className={`rounded-xl px-4 py-2.5 text-left text-xs font-semibold ${phase === item ? 'bg-[#111413] text-white' : 'border border-black/10 bg-white text-black/45'}`}><span className="mr-2 opacity-45">0{index + 1}</span>{phaseCopy[item].title}</button>)}</div></div>

        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <section className="min-h-[620px] rounded-3xl border border-black/8 bg-white p-5 md:p-6">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{phaseCopy[phase].title}</p><h3 className="mt-1 text-xl font-semibold">{phaseCopy[phase].subtitle}</h3></div>

            {phase === 'opening' && previous && <div className="mt-5 rounded-2xl border border-[#0A3F4D]/10 bg-[#0A3F4D]/[0.04] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'CONTEXTO DE LA CLASE ANTERIOR' : 'PREVIOUS CLASS CONTEXT'}</p><p className="mt-1 text-sm font-semibold">{language === 'es' ? `Clase ${previous.classNumber}` : `Class ${previous.classNumber}`} · {previous.title}</p>{previous.closingNotes && <ContextBlock label={language === 'es' ? 'Cierre anterior' : 'Previous closing'} value={previous.closingNotes} />}{previous.assignments.length > 0 && <div className="mt-3"><p className="text-[9px] font-semibold uppercase text-black/35">{language === 'es' ? 'TAREAS PARA REVISAR' : 'ASSIGNMENTS TO REVIEW'}</p><ul className="mt-1 space-y-1 text-xs text-black/60">{previous.assignments.map((item) => <li key={item}>• {item}</li>)}</ul></div>}{previous.faq && <ContextBlock label={language === 'es' ? 'Preguntas que aparecieron' : 'Questions raised'} value={previous.faq} />}</div>}

            <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'PASO A PASO PLANIFICADO' : 'PLANNED STEP BY STEP'}</p><div className="mt-2 space-y-2">{items.length ? items.map((item, index) => { const key = `${phase}-${index}`; return <label key={key} className="flex items-start gap-3 rounded-xl border border-black/7 bg-[#FAFAF8] p-3 text-sm"><input type="checkbox" checked={Boolean(covered[key])} onChange={(event) => setCovered((current) => ({ ...current, [key]: event.target.checked }))} className="mt-0.5" /><span className={covered[key] ? 'text-black/30 line-through' : 'text-black/65'}>{item}</span></label>; }) : <p className="rounded-xl border border-dashed border-black/10 p-4 text-sm text-black/35">{phaseCopy[phase].empty}</p>}</div></div>

            {phase === 'opening' && previous?.assignments.length ? <label className="mt-5 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Revisión de tareas anteriores' : 'Review previous assignments'}</span><textarea rows={5} value={assignmentReview} onChange={(event) => setAssignmentReview(event.target.value)} placeholder={language === 'es' ? '¿Qué se hizo, qué quedó pendiente y qué aprendieron?' : 'What was done, what remains pending and what did they learn?'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label> : null}

            {phase !== 'closing' && <div className="mt-5 flex justify-end"><button type="button" onClick={nextPhase} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white">{language === 'es' ? `Continuar a ${phaseCopy[PHASES[PHASES.indexOf(phase) + 1]].title}` : `Continue to ${phaseCopy[PHASES[PHASES.indexOf(phase) + 1]].title}`}<ChevronRight className="h-4 w-4" /></button></div>}
          </section>

          <section className="min-h-[620px] rounded-3xl border border-black/8 bg-white p-5 md:p-6">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'REGISTRO EN VIVO' : 'LIVE RECORD'}</p><h3 className="mt-1 text-xl font-semibold">{language === 'es' ? 'Memoria real de la clase' : 'Real class memory'}</h3><p className="mt-1 text-sm text-black/45">{language === 'es' ? 'Registra lo que realmente ocurrió. Esto será contexto para la próxima clase y para el Copiloto.' : 'Capture what actually happened. This becomes context for the next class and Copilot.'}</p></div>

            <label className="mt-5 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{phase === 'opening' ? (language === 'es' ? 'Notas del inicio' : 'Opening notes') : phase === 'teaching' ? (language === 'es' ? 'Notas del desarrollo' : 'Teaching notes') : (language === 'es' ? 'Notas generales de la clase' : 'General class notes')}</span><textarea rows={10} value={liveNotes} onChange={(event) => setLiveNotes(event.target.value)} placeholder={language === 'es' ? 'Ejemplos usados, señales del grupo, dificultades, decisiones…' : 'Examples used, group signals, difficulties, decisions…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label>

            <label className="mt-4 block"><span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35"><MessageSquareText className="h-3.5 w-3.5" />{language === 'es' ? 'Preguntas y respuestas útiles' : 'Useful questions and answers'}</span><textarea rows={5} value={faq} onChange={(event) => setFaq(event.target.value)} placeholder={language === 'es' ? 'Pregunta del alumno/grupo → respuesta utilizada…' : 'Student/group question → answer used…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label>

            {phase === 'closing' && <><label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Síntesis / acuerdos / qué quedó pendiente' : 'Summary / agreements / what remains open'}</span><textarea rows={5} value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder={language === 'es' ? 'Qué se llevan de la clase y qué debemos recordar la próxima vez…' : 'What they take away and what should be remembered next time…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label><label className="mt-4 block"><span className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35"><ClipboardCheck className="h-3.5 w-3.5" />{language === 'es' ? 'Tareas para la próxima clase' : 'Assignments for next class'}</span><textarea rows={4} value={assignments} onChange={(event) => setAssignments(event.target.value)} placeholder={language === 'es' ? 'Una tarea por línea…' : 'One assignment per line…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label></>}

            <div className="mt-6 border-t border-black/7 pt-5"><button type="button" disabled={busy || phase !== 'closing'} onClick={() => void finish()} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#111413] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-30"><CheckCircle2 className="h-4 w-4" />{busy ? (language === 'es' ? 'Guardando…' : 'Saving…') : (language === 'es' ? 'Guardar registro y cerrar clase' : 'Save record and close class')}</button>{phase !== 'closing' && <p className="mt-2 text-center text-[10px] text-black/35">{language === 'es' ? 'Completa el recorrido hasta Cierre para guardar y cerrar la clase.' : 'Complete the flow through Closing to save and close the class.'}</p>}</div>
          </section>
        </div>
        {message && <p className="mt-5 rounded-xl bg-white px-4 py-3 text-xs text-black/55">{message}</p>}
      </>}
    </main>
  </div>;
}

function ContextBlock({ label, value }: { label: string; value: string }) {
  return <div className="mt-3"><p className="text-[9px] font-semibold uppercase text-black/35">{label}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-black/60">{value}</p></div>;
}
