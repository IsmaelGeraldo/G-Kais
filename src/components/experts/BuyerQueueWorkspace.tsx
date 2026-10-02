import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, GraduationCap, Search, ShoppingBag, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import {
  subscribeExpertPeople,
  subscribeExpertWebinars,
  type ExpertPerson,
  type ExpertWebinar,
  type WebinarRegistration
} from '../../services/expertsAcquisition';
import {
  enrollExpertPerson,
  subscribeExpertCohorts,
  subscribeExpertFormations,
  type ExpertCohort,
  type ExpertFormation
} from '../../services/expertsFormations';
import { createPersonWorkAction } from '../../services/expertsPeopleOperations';
import { persistExpertWorkTask } from '../../services/expertsTaskMemory';
import { subscribeAllWebinarRegistrationsNewest } from '../../services/expertsWebinarRegistrationFeed';
import { markWebinarWorkActionCompleted } from '../../services/expertsWebinarActions';
import { loadExpertWorkspaceTeam, type WorkspaceMember } from '../../services/expertsWorkspaceCore';
import { loadTasks, saveTasks, type WorkTask } from './workspaceState';

function localDate() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function memberLabel(member?: WorkspaceMember) {
  return member?.displayName || member?.email || member?.uid || '';
}

export function BuyerQueueWorkspace({ language }: { language: Language }) {
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [people, setPeople] = useState<ExpertPerson[]>([]);
  const [webinars, setWebinars] = useState<ExpertWebinar[]>([]);
  const [formations, setFormations] = useState<ExpertFormation[]>([]);
  const [cohorts, setCohorts] = useState<ExpertCohort[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [currentUid, setCurrentUid] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [webinarFilter, setWebinarFilter] = useState('');
  const [formationId, setFormationId] = useState('');
  const [cohortId, setCohortId] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let stopRegistrations: (() => void) | undefined;
    let stopPeople: (() => void) | undefined;
    let stopWebinars: (() => void) | undefined;
    let stopFormations: (() => void) | undefined;
    let stopCohorts: (() => void) | undefined;
    void subscribeAllWebinarRegistrationsNewest(setRegistrations).then((stop) => { stopRegistrations = stop; }).catch(() => {});
    void subscribeExpertPeople(setPeople).then((stop) => { stopPeople = stop; }).catch(() => {});
    void subscribeExpertWebinars(setWebinars).then((stop) => { stopWebinars = stop; }).catch(() => {});
    void subscribeExpertFormations(setFormations).then((stop) => { stopFormations = stop; }).catch(() => {});
    void subscribeExpertCohorts(setCohorts).then((stop) => { stopCohorts = stop; }).catch(() => {});
    void loadExpertWorkspaceTeam().then((team) => {
      setMembers(team.members.filter((member) => member.status === 'active'));
      setCurrentUid(team.currentUid);
    }).catch(() => {});
    return () => { stopRegistrations?.(); stopPeople?.(); stopWebinars?.(); stopFormations?.(); stopCohorts?.(); };
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  const peopleById = useMemo(() => new Map(people.map((item) => [item.id, item])), [people]);
  const webinarsById = useMemo(() => new Map(webinars.map((item) => [item.id, item])), [webinars]);
  const pendingBuyers = useMemo(() => registrations.filter((item) => item.purchased && item.followUpStatus !== 'completed'), [registrations]);
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return pendingBuyers.filter((item) => {
      const person = peopleById.get(item.personId);
      const webinar = webinarsById.get(item.webinarId);
      if (webinarFilter && item.webinarId !== webinarFilter) return false;
      if (!term) return true;
      return [person?.name || '', person?.email || '', person?.phone || '', webinar?.title || '', webinar?.offerLabel || '']
        .some((value) => value.toLowerCase().includes(term));
    });
  }, [pendingBuyers, peopleById, webinarsById, webinarFilter, search]);

  const activeFormations = useMemo(() => formations.filter((item) => item.status === 'active'), [formations]);
  const availableCohorts = useMemo(() => cohorts.filter((item) => item.formationId === formationId && (item.status === 'active' || item.status === 'planned')), [cohorts, formationId]);
  const selected = useMemo(() => filtered.filter((item) => selectedIds.has(item.id)), [filtered, selectedIds]);
  const selectedFormation = formations.find((item) => item.id === formationId);
  const selectedCohort = cohorts.find((item) => item.id === cohortId);

  useEffect(() => {
    if (!formationId || !activeFormations.some((item) => item.id === formationId)) setFormationId(activeFormations[0]?.id || '');
  }, [activeFormations, formationId]);

  useEffect(() => {
    if (!availableCohorts.some((item) => item.id === cohortId)) setCohortId(availableCohorts.find((item) => item.status === 'active')?.id || availableCohorts[0]?.id || '');
  }, [availableCohorts, cohortId]);

  const toggle = (id: string) => setSelectedIds((current) => {
    const next = new Set(current);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const toggleAll = () => {
    const allSelected = filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id));
    setSelectedIds((current) => {
      const next = new Set(current);
      filtered.forEach((item) => { if (allSelected) next.delete(item.id); else next.add(item.id); });
      return next;
    });
  };

  const completeLegacyTask = async (registration: WebinarRegistration, result: string) => {
    if (!registration.followUpTaskId) return;
    const tasks = loadTasks();
    const task = tasks.find((item) => item.id === registration.followUpTaskId);
    if (!task) return;
    const updated: WorkTask = { ...task, status: 'done', result, completedAt: new Date().toISOString() };
    saveTasks(tasks.map((item) => item.id === updated.id ? updated : item));
    await persistExpertWorkTask(updated);
  };

  const integrateSelected = async () => {
    if (!formationId || !cohortId || selected.length === 0) {
      setMessage(language === 'es' ? 'Selecciona compradores, formación y cohorte.' : 'Select buyers, formation and cohort.');
      return;
    }
    const assignee = members.find((member) => member.uid === currentUid) || members[0];
    if (!assignee) return;
    setBusy(true);
    let success = 0;
    let failed = 0;
    for (const registration of selected) {
      const person = peopleById.get(registration.personId);
      if (!person) { failed += 1; continue; }
      try {
        await enrollExpertPerson({ personId: person.id, formationId, cohortId, status: 'active', progress: 0 });
        const result = language === 'es'
          ? `Integrado en ${selectedFormation?.title || 'formación'} · ${selectedCohort?.title || 'cohorte'}.`
          : `Enrolled in ${selectedFormation?.title || 'program'} · ${selectedCohort?.title || 'cohort'}.`;
        await markWebinarWorkActionCompleted({ registrationId: registration.id, personId: person.id, result, kind: 'enrollment', taskId: registration.followUpTaskId });
        await completeLegacyTask(registration, result);
        await createPersonWorkAction({
          person,
          assignee,
          title: language === 'es' ? `Confirmar acceso y onboarding · ${selectedFormation?.title || 'Formación'}` : `Confirm access and onboarding · ${selectedFormation?.title || 'Program'}`,
          type: 'task',
          dueDate: localDate(),
          note: language === 'es' ? `Nueva matrícula en ${selectedCohort?.title || 'cohorte'}. Confirmar acceso, bienvenida y próximos pasos.` : `New enrollment in ${selectedCohort?.title || 'cohort'}. Confirm access, welcome and next steps.`
        });
        success += 1;
      } catch {
        failed += 1;
      }
    }
    setSelectedIds(new Set());
    setBusy(false);
    setMessage(language === 'es'
      ? `${success} comprador${success === 1 ? '' : 'es'} integrado${success === 1 ? '' : 's'}${failed ? ` · ${failed} con error` : ''}.`
      : `${success} buyer${success === 1 ? '' : 's'} enrolled${failed ? ` · ${failed} failed` : ''}.`);
  };

  const webinarOptions = useMemo(() => webinars.filter((webinar) => pendingBuyers.some((item) => item.webinarId === webinar.id)), [pendingBuyers, webinars]);

  return <div className="space-y-4">
    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="flex items-center gap-2"><ShoppingBag className="h-4 w-4 text-[#17603D]" /><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#17603D]">{language === 'es' ? 'COMPRADORES' : 'BUYERS'}</p></div><h3 className="mt-2 text-xl font-semibold">{language === 'es' ? 'Integra compras confirmadas en bloque' : 'Bulk-enroll confirmed buyers'}</h3><p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es' ? 'Una compra detectada no necesita convertirse en 40 tareas manuales. Selecciona el grupo, Formación y Cohorte una vez, y G-Kais crea las matrículas y el trabajo de onboarding.' : 'A detected purchase should not become 40 manual enrollment tasks. Select the group, program and cohort once; G-Kais creates enrollments and onboarding work.'}</p></div>
        <div className="rounded-xl bg-[#111413] px-4 py-3 text-white"><p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-white/55">{language === 'es' ? 'PENDIENTES DE INTEGRAR' : 'PENDING ENROLLMENT'}</p><p className="mt-1 text-2xl font-semibold">{pendingBuyers.length}</p></div>
      </div>

      <div className="mt-4 grid gap-2 border-t border-black/5 pt-4 lg:grid-cols-[minmax(170px,0.8fr)_minmax(180px,1fr)_minmax(180px,1fr)_minmax(220px,1.2fr)]">
        <select value={webinarFilter} onChange={(e) => setWebinarFilter(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Todos los webinars' : 'All webinars'}</option>{webinarOptions.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select value={formationId} onChange={(e) => setFormationId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Formación activa' : 'Active program'}</option>{activeFormations.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <select value={cohortId} onChange={(e) => setCohortId(e.target.value)} className="rounded-xl border border-black/10 bg-white px-3 py-2.5 text-sm"><option value="">{language === 'es' ? 'Grupo / cohorte' : 'Group / cohort'}</option>{availableCohorts.map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select>
        <button type="button" disabled={busy || selected.length === 0 || !formationId || !cohortId} onClick={() => void integrateSelected()} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#111413] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-35"><GraduationCap className="h-4 w-4" />{busy ? (language === 'es' ? 'Integrando…' : 'Enrolling…') : (language === 'es' ? `Integrar ${selected.length} a formación` : `Enroll ${selected.length} buyers`)}</button>
      </div>
    </section>

    <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-black/7 bg-[#FAFAF8] p-4 md:flex-row md:items-center md:justify-between"><label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={filtered.length > 0 && filtered.every((item) => selectedIds.has(item.id))} onChange={toggleAll} />{language === 'es' ? 'Seleccionar visibles' : 'Select visible'}</label><label className="relative block md:w-[360px]"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black/30" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={language === 'es' ? 'Buscar comprador…' : 'Search buyer…'} className="w-full rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-sm" /></label></div>
      <div className="max-h-[650px] divide-y divide-black/5 overflow-y-auto">{filtered.map((registration) => {
        const person = peopleById.get(registration.personId);
        const webinar = webinarsById.get(registration.webinarId);
        const checked = selectedIds.has(registration.id);
        return <label key={registration.id} className={`grid cursor-pointer gap-3 p-4 md:grid-cols-[28px_minmax(220px,1fr)_minmax(180px,0.8fr)_130px] md:items-center ${checked ? 'bg-[#F7F7F5]' : ''}`}><input type="checkbox" checked={checked} onChange={() => toggle(registration.id)} /><div><p className="text-sm font-semibold">{person?.name || registration.personId}</p><p className="mt-1 text-xs text-black/40">{person?.email || person?.phone || '—'}</p></div><div><p className="text-xs font-semibold">{webinar?.offerLabel || webinar?.title || registration.webinarId}</p><p className="mt-1 text-[10px] text-black/35">{webinar?.title || 'Webinar'}</p></div><div className="flex items-center gap-1.5 text-xs font-semibold text-[#17603D]"><CheckCircle2 className="h-4 w-4" />{language === 'es' ? 'Compra confirmada' : 'Purchase confirmed'}</div></label>;
      })}{filtered.length === 0 && <div className="grid min-h-[220px] place-items-center p-8 text-center"><div><UsersRound className="mx-auto h-6 w-6 text-black/20" /><p className="mt-2 text-sm text-black/40">{language === 'es' ? 'No hay compradores pendientes de integrar.' : 'No buyers are pending enrollment.'}</p></div></div>}</div>
    </section>

    {message && <div className="fixed bottom-5 right-5 z-50 max-w-sm rounded-xl bg-[#111413] px-4 py-3 text-xs font-medium text-white shadow-xl">{message}</div>}
  </div>;
}
