import React, { useEffect, useMemo, useState } from 'react';
import { Search, UserRound, Users } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople, type ExpertPerson } from '../../services/expertsAcquisition';

function stageLabel(stage: ExpertPerson['currentStage'], language: Language) {
  const es: Record<ExpertPerson['currentStage'], string> = {
    lead: 'Lead', webinar: 'Webinar', student: 'Alumno', alumni: 'Alumni', mentoring: 'Mentoría 1:1'
  };
  const en: Record<ExpertPerson['currentStage'], string> = {
    lead: 'Lead', webinar: 'Webinar', student: 'Student', alumni: 'Alumni', mentoring: '1:1 mentoring'
  };
  return (language === 'es' ? es : en)[stage];
}

function memoryText(person: ExpertPerson, language: Language): string {
  const memory = person.outcomeMemory || {};
  const status = typeof memory.lastWebinarStatus === 'string' ? memory.lastWebinarStatus : '';
  const purchased = memory.lastWebinarPurchased === true;
  const interest = typeof memory.lastWebinarInterest === 'string' ? memory.lastWebinarInterest : '';
  const followUp = typeof memory.webinarFollowUpStatus === 'string' ? memory.webinarFollowUpStatus : '';
  if (purchased) return language === 'es' ? 'Compró después del último webinar.' : 'Purchased after the last webinar.';
  if (followUp === 'created') return language === 'es' ? 'Seguimiento creado y pendiente.' : 'Follow-up created and pending.';
  if (followUp === 'completed') return language === 'es' ? 'Seguimiento completado.' : 'Follow-up completed.';
  if (status) return `${language === 'es' ? 'Último webinar' : 'Last webinar'}: ${status}${interest && interest !== 'unknown' ? ` · ${language === 'es' ? 'interés' : 'interest'} ${interest}` : ''}`;
  return language === 'es' ? 'Sin señales recientes registradas.' : 'No recent signals recorded.';
}

export function PeopleWorkspace({ language }: { language: Language }) {
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    void subscribeExpertPeople((next) => {
      setPeople(next);
      setLoading(false);
      setSelectedId((current) => current || next[0]?.id || '');
    }).then((stop) => { unsubscribe = stop; }).catch(() => setLoading(false));
    return () => unsubscribe?.();
  }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return people;
    return people.filter((person) => [person.name, person.email, person.phone, person.latestSource, person.currentStage]
      .some((value) => value.toLowerCase().includes(term)));
  }, [people, query]);

  const selected = people.find((person) => person.id === selectedId) || filtered[0] || null;
  const counts = useMemo(() => ({
    total: people.length,
    webinar: people.filter((person) => person.currentStage === 'webinar').length,
    student: people.filter((person) => person.currentStage === 'student' || person.currentStage === 'alumni').length,
    mentoring: people.filter((person) => person.currentStage === 'mentoring').length
  }), [people]);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-5 md:p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">PEOPLE</p>
          <h3 className="mt-2 text-2xl font-semibold">{language === 'es' ? 'Una persona, una sola historia' : 'One person, one continuous history'}</h3>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-black/50">{language === 'es' ? 'Aquí vive la identidad continua de cada relación. Lead, webinar, alumno y mentoría no crean personas distintas.' : 'This is the continuous identity layer. Lead, webinar, student and mentoring do not create separate people.'}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[['Total', counts.total], [language === 'es' ? 'Webinar' : 'Webinar', counts.webinar], [language === 'es' ? 'Alumnos' : 'Students', counts.student], [language === 'es' ? 'Mentoría' : 'Mentoring', counts.mentoring]].map(([label, value]) => <div key={String(label)} className="min-w-[90px] rounded-xl bg-[#F7F7F5] px-3 py-2.5"><p className="text-[9px] font-semibold uppercase tracking-[0.13em] text-black/35">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p></div>)}
        </div>
      </div>
    </section>

    <div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]">
      <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
        <div className="flex flex-col gap-3 border-b border-black/7 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><Users className="h-4 w-4 text-[#0A3F4D]" /><p className="text-sm font-semibold">{language === 'es' ? 'Personas del Workspace' : 'Workspace people'}</p></div>
          <label className="relative block sm:w-[280px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'es' ? 'Buscar nombre, email, etapa…' : 'Search name, email, stage…'} className="w-full rounded-xl border border-black/10 bg-[#FAFAF8] py-2.5 pl-9 pr-3 text-sm outline-none focus:border-black/20" /></label>
        </div>
        <div className="divide-y divide-black/5">
          {filtered.map((person) => <button key={person.id} type="button" onClick={() => setSelectedId(person.id)} className={`grid w-full gap-2 px-4 py-4 text-left transition md:grid-cols-[minmax(220px,1fr)_140px_180px] md:items-center ${selected?.id === person.id ? 'bg-[#F7F7F5]' : 'hover:bg-black/[0.015]'}`}>
            <div className="min-w-0"><p className="truncate text-sm font-semibold">{person.name}</p><p className="mt-1 truncate text-xs text-black/45">{person.email || person.phone || '—'}</p></div>
            <span className="w-fit rounded-full bg-[#0A3F4D]/8 px-2.5 py-1 text-[10px] font-semibold text-[#0A3F4D]">{stageLabel(person.currentStage, language)}</span>
            <p className="truncate text-xs text-black/45">{person.latestSource || person.firstSource || (language === 'es' ? 'Sin origen' : 'No source')}</p>
          </button>)}
          {!loading && filtered.length === 0 && <div className="p-10 text-center text-sm text-black/40">{language === 'es' ? 'No hay personas que coincidan con la búsqueda.' : 'No people match your search.'}</div>}
          {loading && <div className="p-10 text-center text-sm text-black/40">{language === 'es' ? 'Cargando personas…' : 'Loading people…'}</div>}
        </div>
      </section>

      <section className="rounded-2xl border border-black/10 bg-white p-5">
        {selected ? <>
          <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-full bg-[#111413] text-white"><UserRound className="h-5 w-5" /></div><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-black/40">{stageLabel(selected.currentStage, language)}</p></div></div>
          <div className="mt-5 space-y-4 border-t border-black/6 pt-4">
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">EMAIL</p><p className="mt-1 text-sm">{selected.email || '—'}</p></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'TELÉFONO' : 'PHONE'}</p><p className="mt-1 text-sm">{selected.phone || '—'}</p></div>
            <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-black/35">{language === 'es' ? 'ORIGEN RECIENTE' : 'LATEST SOURCE'}</p><p className="mt-1 text-sm">{selected.latestSource || selected.firstSource || '—'}</p></div>
            <div className="rounded-xl bg-[#F7F7F5] p-4"><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-[#0A3F4D]">OUTCOME MEMORY</p><p className="mt-2 text-sm leading-6 text-black/60">{memoryText(selected, language)}</p>{typeof selected.outcomeMemory.lastFollowUpResult === 'string' && selected.outcomeMemory.lastFollowUpResult && <p className="mt-2 text-xs leading-5 text-black/45">{language === 'es' ? 'Último resultado: ' : 'Latest result: '}{selected.outcomeMemory.lastFollowUpResult}</p>}</div>
          </div>
        </> : <div className="grid min-h-[260px] place-items-center text-sm text-black/35">{language === 'es' ? 'Selecciona una persona.' : 'Select a person.'}</div>}
      </section>
    </div>
  </div>;
}
