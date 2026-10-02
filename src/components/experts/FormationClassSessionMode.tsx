import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronRight, Save, X } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { saveFormationPlanClass, type FormationPlanClass } from '../../services/expertsFormationPlan';
import type { ExpertCohort, ExpertFormation } from '../../services/expertsFormations';

type Phase = 'opening' | 'teaching' | 'closing';

function formatDate(value: string, language: Language) {
  if (!value) return language === 'es' ? 'Sin fecha' : 'No date';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat(language === 'es' ? 'es-CL' : 'en-US', { dateStyle: 'medium' }).format(date)
    : value;
}

export function FormationClassSessionMode({
  open,
  onClose,
  language,
  formation,
  cohort,
  plan,
  initialClassId,
  onMessage
}: {
  open: boolean;
  onClose: () => void;
  language: Language;
  formation: ExpertFormation;
  cohort: ExpertCohort;
  plan: FormationPlanClass[];
  initialClassId?: string;
  onMessage: (message: string) => void;
}) {
  const suggested = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    return plan.find((item) => item.status !== 'done' && item.date >= today)
      || plan.find((item) => item.status !== 'done')
      || plan[0];
  }, [plan]);
  const [selectedId, setSelectedId] = useState(initialClassId || suggested?.id || '');
  const [phase, setPhase] = useState<Phase>('opening');
  const [liveNotes, setLiveNotes] = useState('');
  const [faq, setFaq] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [covered, setCovered] = useState<Record<number, boolean>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedId(initialClassId || suggested?.id || '');
  }, [open, initialClassId, suggested?.id]);

  const selected = plan.find((item) => item.id === selectedId) || suggested || null;

  useEffect(() => {
    if (!selected) return;
    setPhase('opening');
    setLiveNotes(selected.mentorNotes || '');
    setFaq(selected.faq || '');
    setClosingNotes(selected.closingNotes || '');
    setCovered({});
  }, [selected?.id]);

  if (!open) return null;

  const persist = async (finish: boolean) => {
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
        teachingItems: selected.teachingItems,
        date: selected.date,
        mentorNotes: liveNotes,
        faq,
        closingNotes,
        status: finish ? 'done' : selected.status
      });
      onMessage(finish
        ? (language === 'es' ? 'Clase cerrada y registro guardado.' : 'Class closed and record saved.')
        : (language === 'es' ? 'Registro de clase guardado.' : 'Class record saved.'));
      if (finish) onClose();
    } finally {
      setBusy(false);
    }
  };

  const phaseCopy: Record<Phase, { title: string; body: string }> = language === 'es' ? {
    opening: { title: 'Inicio', body: 'Alinea el objetivo, conecta con la clase anterior y confirma qué necesita comprender el grupo hoy.' },
    teaching: { title: 'Desarrollo', body: 'Avanza por los puntos planificados, marca lo cubierto y registra ejemplos, dudas o señales relevantes.' },
    closing: { title: 'Cierre', body: 'Resume lo aprendido, resuelve preguntas abiertas y deja acuerdos o siguiente paso antes de terminar.' }
  } : {
    opening: { title: 'Opening', body: 'Align the objective, connect with the prior class and confirm what the group needs to understand today.' },
    teaching: { title: 'Teaching', body: 'Work through the planned points, mark coverage and capture examples, questions or relevant signals.' },
    closing: { title: 'Closing', body: 'Summarize learning, resolve open questions and leave agreements or the next step before ending.' }
  };

  return <div className="fixed inset-0 z-[90] bg-black/45 p-3 backdrop-blur-sm md:p-6">
    <div className="mx-auto flex h-full max-w-[1500px] flex-col overflow-hidden rounded-3xl bg-[#F6F6F3] shadow-2xl">
      <header className="flex flex-col gap-3 border-b border-black/8 bg-white px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'MODO SESIÓN · FORMACIÓN' : 'FORMATION SESSION MODE'}</p>
          <h3 className="mt-1 text-xl font-semibold">{formation.title} · {cohort.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          <select value={selected?.id || ''} onChange={(event) => setSelectedId(event.target.value)} className="max-w-[320px] rounded-xl border border-black/10 bg-white px-3 py-2 text-xs">
            {plan.map((item) => <option key={item.id} value={item.id}>{language === 'es' ? `Clase ${item.classNumber}` : `Class ${item.classNumber}`} · {item.title}</option>)}
          </select>
          <button type="button" onClick={onClose} className="grid h-9 w-9 place-items-center rounded-full border border-black/10 bg-white"><X className="h-4 w-4" /></button>
        </div>
      </header>

      {!selected ? <div className="grid flex-1 place-items-center p-8 text-sm text-black/45">{language === 'es' ? 'Esta cohorte todavía no tiene clases planificadas.' : 'This cohort has no planned classes yet.'}</div> : <div className="grid min-h-0 flex-1 gap-4 p-4 xl:grid-cols-[0.92fr_1.08fr]">
        <section className="min-h-0 overflow-y-auto rounded-2xl border border-black/8 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? `CLASE ${selected.classNumber}` : `CLASS ${selected.classNumber}`}</p><h4 className="mt-1 text-2xl font-semibold">{selected.title}</h4><p className="mt-1 text-xs text-black/45">{formatDate(selected.date, language)}</p></div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${selected.status === 'done' ? 'bg-[#17603D]/10 text-[#17603D]' : 'bg-black/5 text-black/45'}`}>{selected.status === 'done' ? (language === 'es' ? 'Impartida' : 'Taught') : (language === 'es' ? 'Pendiente' : 'Pending')}</span>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">{(['opening', 'teaching', 'closing'] as Phase[]).map((item, index) => <button key={item} type="button" onClick={() => setPhase(item)} className={`rounded-xl border px-3 py-3 text-left ${phase === item ? 'border-transparent bg-[#111413] text-white' : 'border-black/8 bg-[#FAFAF8]'}`}><span className="text-[9px] font-semibold uppercase opacity-55">0{index + 1}</span><p className="mt-1 text-sm font-semibold">{phaseCopy[item].title}</p></button>)}</div>
          <div className="mt-4 rounded-2xl bg-[#FAFAF8] p-4"><p className="text-sm font-semibold">{phaseCopy[phase].title}</p><p className="mt-2 text-sm leading-6 text-black/55">{phaseCopy[phase].body}</p></div>

          <div className="mt-5"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'CONTENIDO PLANIFICADO' : 'PLANNED CONTENT'}</p><div className="mt-2 space-y-2">{selected.teachingItems.length ? selected.teachingItems.map((item, index) => <label key={`${item}-${index}`} className="flex items-start gap-3 rounded-xl border border-black/7 p-3 text-sm"><input type="checkbox" checked={Boolean(covered[index])} onChange={(event) => setCovered((current) => ({ ...current, [index]: event.target.checked }))} className="mt-0.5" /><span className={covered[index] ? 'text-black/35 line-through' : 'text-black/65'}>{item}</span></label>) : <p className="rounded-xl border border-dashed border-black/10 p-4 text-sm text-black/35">{language === 'es' ? 'Esta clase todavía no tiene contenido definido. Completa Editar clase antes de iniciar.' : 'This class has no content yet. Complete Edit class before starting.'}</p>}</div></div>
        </section>

        <section className="min-h-0 overflow-y-auto rounded-2xl border border-black/8 bg-white p-5">
          <div><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">{language === 'es' ? 'REGISTRO EN VIVO' : 'LIVE RECORD'}</p><h4 className="mt-1 text-lg font-semibold">{language === 'es' ? 'Qué ocurrió en la clase' : 'What happened in class'}</h4></div>
          <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Notas en vivo / ejemplos / señales' : 'Live notes / examples / signals'}</span><textarea rows={9} value={liveNotes} onChange={(event) => setLiveNotes(event.target.value)} placeholder={language === 'es' ? 'Registra lo que ocurre mientras impartes la clase…' : 'Capture what happens while you teach…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label>
          <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Preguntas y respuestas útiles' : 'Useful questions and answers'}</span><textarea rows={5} value={faq} onChange={(event) => setFaq(event.target.value)} placeholder={language === 'es' ? 'Pregunta del grupo → respuesta utilizada…' : 'Group question → answer used…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label>
          <label className="mt-4 block"><span className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Cierre / acuerdos / siguiente paso' : 'Closing / agreements / next step'}</span><textarea rows={4} value={closingNotes} onChange={(event) => setClosingNotes(event.target.value)} placeholder={language === 'es' ? 'Qué se llevan, qué queda pendiente y qué deben hacer después…' : 'What they take away, what remains open and what happens next…'} className="w-full rounded-xl border border-black/10 px-3 py-3 text-sm leading-6" /></label>
          <div className="mt-5 flex flex-wrap justify-end gap-2"><button type="button" disabled={busy} onClick={() => void persist(false)} className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-white px-4 py-2.5 text-xs font-semibold disabled:opacity-40"><Save className="h-4 w-4" />{language === 'es' ? 'Guardar registro' : 'Save record'}</button><button type="button" disabled={busy} onClick={() => void persist(true)} className="inline-flex items-center gap-2 rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-40"><CheckCircle2 className="h-4 w-4" />{language === 'es' ? 'Cerrar clase' : 'Close class'}<ChevronRight className="h-3.5 w-3.5" /></button></div>
        </section>
      </div>}
    </div>
  </div>;
}
