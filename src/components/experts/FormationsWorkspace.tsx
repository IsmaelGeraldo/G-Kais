import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, ChevronDown } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertCohorts, subscribeExpertFormations, type ExpertCohort, type ExpertFormation } from '../../services/expertsFormations';
import { saveCohortClassTime, subscribeCohortClassTimes } from '../../services/expertsCohortTime';
import { FormationsWorkspaceV2 } from './FormationsWorkspaceV2';

function CohortTimePanel({ language }: { language: Language }) {
  const [open, setOpen] = useState(false);
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [times, setTimes] = useState<Record<string, string>>({});
  const [cohortId, setCohortId] = useState('');
  const [time, setTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let a: (() => void) | undefined; let b: (() => void) | undefined; let c: (() => void) | undefined;
    void subscribeExpertFormations(setFormations).then((stop) => { a = stop; });
    void subscribeExpertCohorts(setCohorts).then((stop) => { b = stop; });
    void subscribeCohortClassTimes(setTimes).then((stop) => { c = stop; });
    return () => { a?.(); b?.(); c?.(); };
  }, []);

  useEffect(() => {
    if (!cohortId && cohorts.length) setCohortId(cohorts.find((item) => item.status === 'active')?.id || cohorts[0]?.id || '');
  }, [cohorts, cohortId]);
  useEffect(() => { setTime(cohortId ? times[cohortId] || '' : ''); }, [cohortId, times]);
  useEffect(() => { if (!saved) return; const timer = window.setTimeout(() => setSaved(false), 2200); return () => window.clearTimeout(timer); }, [saved]);

  const formationById = useMemo(() => new Map(formations.map((item) => [item.id, item])), [formations]);
  const save = async () => {
    if (!cohortId || !time) return;
    setSaving(true);
    try { await saveCohortClassTime({ cohortId, time }); setSaved(true); } finally { setSaving(false); }
  };

  if (!cohorts.length) return null;
  return <section className="mb-4 overflow-hidden rounded-2xl border border-black/10 bg-white">
    <button type="button" onClick={() => setOpen((value) => !value)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
      <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-[#0A3F4D]" /><div><p className="text-xs font-semibold">{language === 'es' ? 'Horario de cohortes' : 'Cohort schedule time'}</p><p className="mt-0.5 text-[10px] text-black/40">{language === 'es' ? 'Define la hora común de las clases de cada cohorte.' : 'Set the common class time for each cohort.'}</p></div></div>
      <ChevronDown className={`h-4 w-4 text-black/35 transition ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <div className="grid gap-3 border-t border-black/6 bg-[#FAFAF8] p-4 md:grid-cols-[1fr_160px_auto] md:items-end">
      <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Cohorte' : 'Cohort'}</span><select value={cohortId} onChange={(event) => setCohortId(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm">{cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{formationById.get(cohort.formationId)?.title || 'Formación'} · {cohort.title}</option>)}</select></label>
      <label><span className="mb-1 block text-[9px] font-semibold uppercase tracking-[0.12em] text-black/35">{language === 'es' ? 'Hora de clase' : 'Class time'}</span><input type="time" value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm" /></label>
      <button disabled={!cohortId || !time || saving} onClick={() => void save()} className="rounded-full bg-[#111413] px-4 py-2.5 text-xs font-semibold text-white disabled:opacity-35">{saved ? (language === 'es' ? 'Guardado' : 'Saved') : saving ? '…' : (language === 'es' ? 'Guardar hora' : 'Save time')}</button>
    </div>}
  </section>;
}

export function FormationsWorkspace({ language }: { language: Language }) {
  return <div className="gkais-formations-shell">
    <style>{`
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] { background:#111413 !important; color:#fff !important; }
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] p { color:inherit !important; }
      .gkais-formations-shell > div > p[class*="bg-[#F7F7F5]"],
      .gkais-formations-shell p[class*="bg-[#F7F7F5]"][class*="text-black/55"] { position:fixed; right:24px; top:88px; z-index:120; max-width:380px; background:#111413 !important; color:#fff !important; box-shadow:0 16px 44px rgba(0,0,0,.16); border-radius:14px; padding:12px 16px; }
    `}</style>
    <CohortTimePanel language={language} />
    <FormationsWorkspaceV2 language={language} />
  </div>;
}
