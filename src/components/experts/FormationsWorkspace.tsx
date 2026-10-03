import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { saveDashboardCohortTime, subscribeDashboardCohortTimes, type DashboardCohortTime } from '../../services/expertsDashboardLive';
import { subscribeExpertCohorts, type ExpertCohort } from '../../services/expertsFormations';
import { FormationsWorkspaceV2 } from './FormationsWorkspaceV2';

function CohortTimePanel({ language }: { language: Language }) {
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [times, setTimes] = useState<DashboardCohortTime[]>([]);
  const [open, setOpen] = useState(false);
  const [cohortId, setCohortId] = useState('');
  const [time, setTime] = useState('');
  const [saved, setSaved] = useState(false);
  useEffect(() => { let a:(()=>void)|undefined,b:(()=>void)|undefined; void subscribeExpertCohorts(setCohorts).then(x=>a=x); void subscribeDashboardCohortTimes(setTimes).then(x=>b=x); return()=>{a?.();b?.();}; }, []);
  const active = cohorts.filter(c => c.status === 'active' || c.status === 'planned');
  useEffect(() => { if (!cohortId && active[0]) setCohortId(active[0].id); }, [active, cohortId]);
  useEffect(() => { setTime(times.find(item => item.cohortId === cohortId)?.time || ''); setSaved(false); }, [cohortId, times]);
  const current = active.find(c => c.id === cohortId);
  if (!active.length) return null;
  return <section className="rounded-2xl border border-black/10 bg-white px-4 py-3">
    <button type="button" onClick={() => setOpen(v=>!v)} className="flex w-full items-center justify-between text-left"><div><p className="text-xs font-semibold">{language==='es'?'Horario habitual de cohortes':'Cohort default times'}</p><p className="mt-1 text-[10px] text-black/40">{language==='es'?'Opcional. El Dashboard usa esta hora para ordenar las próximas clases.':'Optional. Dashboard uses this time to order upcoming classes.'}</p></div><span className="text-xs text-black/35">{open?'−':'+'}</span></button>
    {open && <div className="mt-3 flex flex-col gap-2 border-t border-black/6 pt-3 md:flex-row md:items-end"><label className="flex-1"><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language==='es'?'Cohorte':'Cohort'}</span><select value={cohortId} onChange={e=>setCohortId(e.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm">{active.map(c=><option key={c.id} value={c.id}>{c.title}</option>)}</select></label><label><span className="mb-1 block text-[9px] font-semibold uppercase text-black/35">{language==='es'?'Hora':'Time'}</span><input type="time" value={time} onChange={e=>{setTime(e.target.value);setSaved(false);}} className="rounded-xl border border-black/10 bg-white px-3 py-2 text-sm" /></label><button type="button" disabled={!current} onClick={()=>{if(!current)return; void saveDashboardCohortTime(current.id,current.formationId,time).then(()=>{setSaved(true);window.setTimeout(()=>setSaved(false),2600);});}} className="rounded-xl bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{saved?(language==='es'?'Guardado':'Saved'):(language==='es'?'Guardar hora':'Save time')}</button></div>}
    {saved && <p className="gkais-action-toast">{language === 'es' ? 'Horario de cohorte guardado.' : 'Cohort time saved.'}</p>}
  </section>;
}

export function FormationsWorkspace({ language }: { language: Language }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (deepLinkHandled.current || new URLSearchParams(window.location.search).get('tab') !== 'plan') return;
    let frame = 0;
    let attempts = 0;
    const activatePlan = () => {
      attempts += 1;
      const buttons = Array.from(shellRef.current?.querySelectorAll('button') || []);
      const target = buttons.find((button) => /^(Plan de clases|Class plan)\s*\(/i.test((button.textContent || '').trim()));
      if (target) {
        deepLinkHandled.current = true;
        target.click();
        return;
      }
      if (attempts < 20) frame = window.requestAnimationFrame(activatePlan);
    };
    frame = window.requestAnimationFrame(activatePlan);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div ref={shellRef} className="gkais-formations-shell">
    <style>{`
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] { background:#111413 !important; color:#fff !important; }
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] p { color:inherit !important; }
      .gkais-formations-shell > div > p[class*="bg-[#F7F7F5]"],
      .gkais-formations-shell p[class*="bg-[#F7F7F5]"][class*="text-black/55"] { position:fixed; right:24px; bottom:24px; top:auto; z-index:160; max-width:380px; background:#111413 !important; color:#fff !important; box-shadow:0 16px 44px rgba(0,0,0,.20); border-radius:14px; padding:12px 16px; }
    `}</style>
    <div className="mb-4"><CohortTimePanel language={language} /></div>
    <FormationsWorkspaceV2 language={language} />
  </div>;
}