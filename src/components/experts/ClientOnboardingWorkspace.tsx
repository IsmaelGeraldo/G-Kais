import React, { useEffect, useMemo, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { subscribeExpertPeople } from '../../services/expertsAcquisition';
import { hydrateExpertsClientMemory, persistExpertClientRecord } from '../../services/expertsClientMemory';
import { emitExpertsPersistenceStatus } from '../../services/expertsPersistenceStatus';
import { linkMentoringClientToPerson } from '../../services/expertsRelationshipFoundation';
import { scopedWorkspaceStorageKey } from '../../services/expertsWorkspaceStorage';
import {
  appendJournal,
  loadSessionClients,
  saveSessionClients,
  WORKSPACE_STATE_EVENT
} from './workspaceState';
import { ClientWorkspaceEnhanced } from './ClientWorkspaceEnhanced';

const CLIENT_STORAGE_KEY = 'gkais-experts-client-records-v2';

type Props = {
  language: Language;
  selectedId: string;
  onSelectedId: (id: string) => void;
  onStartSession: (id: string) => void;
  onOpenPriority: () => void;
};

type Draft = {
  name: string;
  company: string;
  businessType: string;
  email: string;
  phone: string;
  program: string;
  startDate: string;
  duration: string;
  primaryGoal: string;
  startingPoint: string;
  expectedOutcome: string;
  currentPhase: string;
  currentGap: string;
  planSummary: string;
  nextAction: string;
  nextSessionDate: string;
  nextSessionTime: string;
  blockers: string;
  commitments: string;
};

const EMPTY_DRAFT: Draft = {
  name: '', company: '', businessType: '', email: '', phone: '', program: '', startDate: '', duration: '',
  primaryGoal: '', startingPoint: '', expectedOutcome: '', currentPhase: 'Onboarding', currentGap: '',
  planSummary: '', nextAction: '', nextSessionDate: '', nextSessionTime: '', blockers: '', commitments: ''
};

function readClientRecords(): Array<Record<string, unknown> & { id: string }> {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(scopedWorkspaceStorageKey(CLIENT_STORAGE_KEY)) || '[]');
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === 'string') : [];
  } catch {
    return [];
  }
}

function splitLines(value: string): string[] {
  return value.split(/\n|,/).map((item) => item.trim()).filter(Boolean);
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase() || '').join('') || 'CL';
}

function createClientId(name: string): string {
  const slug = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'cliente';
  return `${slug}-${Date.now().toString(36)}`;
}

function normalizedPhone(value: unknown): string {
  return String(value || '').replace(/\D/g, '');
}

function currentTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

function structuredNextSession(date: string, time: string) {
  if (!date) {
    return {
      nextSession: '',
      nextSessionAt: null,
      nextSessionTimeZone: null,
      nextSessionSource: null
    };
  }
  const nextSession = `${date}${time ? ` · ${time}` : ''}`;
  const localDate = new Date(`${date}T${time || '12:00'}:00`);
  return {
    nextSession,
    nextSessionAt: Number.isFinite(localDate.getTime()) ? localDate.toISOString() : null,
    nextSessionTimeZone: currentTimeZone(),
    nextSessionSource: nextSession
  };
}

function Field({ label, value, onChange, type = 'text', placeholder = '', required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; required?: boolean }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">{label}{required ? ' *' : ''}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-black/30" /></label>;
}

function TextArea({ label, value, onChange, placeholder = '', required = false, rows = 3 }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; required?: boolean; rows?: number }) {
  return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45">{label}{required ? ' *' : ''}</span><textarea rows={rows} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full resize-none rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition focus:border-black/30" /></label>;
}

export function ClientOnboardingWorkspace({ language, selectedId, onSelectedId, onStartSession, onOpenPriority }: Props) {
  const requestedPersonId = new URLSearchParams(window.location.search).get('person') || '';
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [linkedPersonId, setLinkedPersonId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [recordsRevision, setRecordsRevision] = useState(0);

  useEffect(() => {
    const refresh = () => setRecordsRevision((value) => value + 1);
    window.addEventListener(WORKSPACE_STATE_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(WORKSPACE_STATE_EVENT, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  useEffect(() => {
    if (!requestedPersonId) return;
    let stop: (() => void) | undefined;
    let applied = false;
    void subscribeExpertPeople((people) => {
      if (applied) return;
      const person = people.find((item) => item.id === requestedPersonId);
      if (!person) return;
      applied = true;
      setLinkedPersonId(person.id);
      setDraft((current) => ({
        ...current,
        name: person.name,
        email: person.email,
        phone: person.phone,
        currentPhase: language === 'es' ? 'Onboarding mentoría 1:1' : '1:1 mentoring onboarding'
      }));
      setError('');
      setOpen(true);
    }).then((unsubscribe) => { stop = unsubscribe; }).catch(() => {});
    return () => stop?.();
  }, [language, requestedPersonId]);

  const hasClients = useMemo(() => readClientRecords().length > 0, [recordsRevision]);
  const requiredReady = useMemo(() => Boolean(draft.name.trim() && draft.program.trim() && draft.primaryGoal.trim() && draft.startingPoint.trim() && draft.expectedOutcome.trim() && draft.nextAction.trim()), [draft]);
  const update = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const close = () => { if (!saving) { setOpen(false); setError(''); } };

  const openBlankClient = () => {
    setLinkedPersonId('');
    setDraft(EMPTY_DRAFT);
    setError('');
    setOpen(true);
  };

  const createClient = async () => {
    if (!requiredReady || saving) return;
    setSaving(true);
    setError('');
    try {
      await hydrateExpertsClientMemory();
      const existing = readClientRecords();
      const normalizedEmail = draft.email.trim().toLowerCase();
      const phoneDigits = normalizedPhone(draft.phone);
      const duplicate = existing.find((item) => {
        const existingEmail = String(item.email || '').trim().toLowerCase();
        const existingPhone = normalizedPhone(item.phone);
        return Boolean((normalizedEmail && existingEmail === normalizedEmail) || (phoneDigits && existingPhone === phoneDigits));
      });
      if (duplicate) {
        if (linkedPersonId) await linkMentoringClientToPerson(duplicate.id, linkedPersonId);
        setOpen(false);
        setDraft(EMPTY_DRAFT);
        setLinkedPersonId('');
        onSelectedId(duplicate.id);
        return;
      }

      const id = createClientId(draft.name);
      const blockers = splitLines(draft.blockers);
      const commitments = splitLines(draft.commitments).map((label) => ({ label, status: 'pending' as const }));
      const nextSession = structuredNextSession(draft.nextSessionDate, draft.nextSessionTime);
      const record = {
        id,
        ...(linkedPersonId ? { personId: linkedPersonId } : {}),
        name: draft.name.trim(),
        initials: initials(draft.name),
        company: draft.company.trim(),
        businessType: draft.businessType.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        program: draft.program.trim(),
        startDate: draft.startDate,
        duration: draft.duration.trim(),
        progress: language === 'es' ? 'Inicio' : 'Start',
        status: 'active',
        lifecycleStage: 'onboarding',
        nextAction: draft.nextAction.trim(),
        primaryGoal: draft.primaryGoal.trim(),
        currentPhase: draft.currentPhase.trim() || 'Onboarding',
        ...nextSession,
        startingPoint: draft.startingPoint.trim(),
        expectedOutcome: draft.expectedOutcome.trim(),
        currentGap: draft.currentGap.trim(),
        planSummary: draft.planSummary.trim(),
        blockers,
        milestones: [],
        commitments,
        createdAt: new Date().toISOString()
      };

      window.localStorage.setItem(scopedWorkspaceStorageKey(CLIENT_STORAGE_KEY), JSON.stringify([record, ...existing.filter((item) => item.id !== id)]));
      emitExpertsPersistenceStatus('saving');
      await persistExpertClientRecord(record);
      if (linkedPersonId) await linkMentoringClientToPerson(id, linkedPersonId);
      emitExpertsPersistenceStatus('saved');

      const sessionClients = loadSessionClients();
      const sessionClient = {
        id,
        name: record.name,
        company: record.company,
        program: record.program,
        week: record.progress,
        goal: record.expectedOutcome,
        nextAction: record.nextAction,
        nextSession: record.nextSession,
        nextSessionAt: record.nextSessionAt,
        nextSessionTimeZone: record.nextSessionTimeZone,
        nextSessionSource: record.nextSessionSource,
        currentPhase: record.currentPhase,
        currentGap: record.currentGap,
        planSummary: record.planSummary,
        blockers: record.blockers,
        commitments: record.commitments.map((item, index) => ({ id: `${id}-commitment-${index}`, label: item.label, status: item.status }))
      };
      saveSessionClients([sessionClient, ...sessionClients.filter((item) => item.id !== id)]);
      appendJournal(id, 'onboarding', language === 'es' ? 'Cliente creado' : 'Client created', language === 'es' ? `Onboarding iniciado · ${record.program} · Objetivo: ${record.primaryGoal}` : `Onboarding started · ${record.program} · Goal: ${record.primaryGoal}`);
      window.dispatchEvent(new CustomEvent(WORKSPACE_STATE_EVENT));
      setDraft(EMPTY_DRAFT);
      setLinkedPersonId('');
      setOpen(false);
      onSelectedId(id);
    } catch (caught) {
      console.error('[G-KAIS CLIENT ONBOARDING ERROR]', caught);
      emitExpertsPersistenceStatus('error');
      setError(language === 'es' ? 'No se pudo crear el cliente. Revisa la sesión e inténtalo nuevamente.' : 'The client could not be created. Check the session and try again.');
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className="mb-4 flex justify-end"><button type="button" onClick={openBlankClient} className="inline-flex items-center gap-2 rounded-xl bg-[#111413] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-black"><Plus className="h-4 w-4" />{language === 'es' ? 'Nuevo cliente 1:1' : 'New 1:1 client'}</button></div>
    {hasClients
      ? <ClientWorkspaceEnhanced language={language} selectedId={selectedId} onSelectedId={onSelectedId} onStartSession={onStartSession} onOpenPriority={onOpenPriority} />
      : <div className="rounded-2xl border border-dashed border-black/12 bg-white px-6 py-14 text-center shadow-[0_10px_30px_rgba(10,10,10,0.025)]">
          <p className="text-lg font-semibold text-black/75">{language === 'es' ? 'Todavía no hay clientes 1:1 reales' : 'There are no real 1:1 clients yet'}</p>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-black/45">{language === 'es' ? 'Inicia una relación de mentoría desde una persona existente o crea un cliente nuevo.' : 'Start a mentoring relationship from an existing person or create a new client.'}</p>
          <button type="button" onClick={openBlankClient} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#111413] px-4 py-2.5 text-sm font-semibold text-white"><Plus className="h-4 w-4" />{language === 'es' ? 'Crear primer cliente' : 'Create first client'}</button>
        </div>}

    {open && <div className="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto bg-black/35 px-4 py-8 backdrop-blur-[2px] md:py-12">
      <div className="w-full max-w-4xl rounded-3xl border border-black/10 bg-[#FAFAF8] shadow-[0_30px_90px_rgba(0,0,0,0.22)]">
        <div className="flex items-start justify-between border-b border-black/8 px-5 py-5 md:px-7"><div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#0A3F4D]">G-KAIS · ONBOARDING 1:1</p><h3 className="mt-1 text-2xl font-semibold tracking-[-0.025em]">{linkedPersonId ? (language === 'es' ? 'Continuar relación como Cliente 1:1' : 'Continue relationship as 1:1 client') : (language === 'es' ? 'Nuevo cliente 1:1' : 'New 1:1 client')}</h3><p className="mt-1 max-w-2xl text-sm leading-6 text-black/50">{linkedPersonId ? (language === 'es' ? 'Nombre, email y teléfono vienen de la ficha existente. Completa únicamente el contexto específico de la mentoría.' : 'Name, email and phone come from the existing person record. Complete only the mentoring-specific context.') : (language === 'es' ? 'Crea la memoria inicial de la relación 1:1.' : 'Create the initial 1:1 relationship memory.')}</p></div><button type="button" onClick={close} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-black/10 bg-white text-black/55"><X className="h-4 w-4" /></button></div>

        <div className="space-y-7 px-5 py-6 md:px-7">
          <section><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? '1. Cliente y servicio' : '1. Client and service'}</p><div className="grid gap-4 md:grid-cols-2">
            <Field label={language === 'es' ? 'Nombre completo' : 'Full name'} value={draft.name} onChange={(value) => update('name', value)} required />
            <Field label={language === 'es' ? 'Empresa / negocio' : 'Company / business'} value={draft.company} onChange={(value) => update('company', value)} />
            <Field label={language === 'es' ? 'Tipo de negocio' : 'Business type'} value={draft.businessType} onChange={(value) => update('businessType', value)} />
            <Field label={language === 'es' ? 'Programa / servicio contratado' : 'Program / service'} value={draft.program} onChange={(value) => update('program', value)} required />
            <Field label="Email" type="email" value={draft.email} onChange={(value) => update('email', value)} />
            <Field label={language === 'es' ? 'Teléfono' : 'Phone'} value={draft.phone} onChange={(value) => update('phone', value)} />
            <Field label={language === 'es' ? 'Fecha de inicio' : 'Start date'} type="date" value={draft.startDate} onChange={(value) => update('startDate', value)} />
            <Field label={language === 'es' ? 'Duración' : 'Duration'} value={draft.duration} onChange={(value) => update('duration', value)} placeholder={language === 'es' ? 'Ej. 12 semanas' : 'E.g. 12 weeks'} />
          </div></section>

          <section><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? '2. Outcome Memory inicial' : '2. Initial Outcome Memory'}</p><div className="grid gap-4 md:grid-cols-2">
            <Field label={language === 'es' ? 'Objetivo principal' : 'Primary goal'} value={draft.primaryGoal} onChange={(value) => update('primaryGoal', value)} required />
            <Field label={language === 'es' ? 'Fase actual' : 'Current phase'} value={draft.currentPhase} onChange={(value) => update('currentPhase', value)} />
            <div className="md:col-span-2"><TextArea label={language === 'es' ? 'Situación inicial' : 'Starting point'} value={draft.startingPoint} onChange={(value) => update('startingPoint', value)} required /></div>
            <div className="md:col-span-2"><TextArea label={language === 'es' ? 'Resultado esperado' : 'Expected outcome'} value={draft.expectedOutcome} onChange={(value) => update('expectedOutcome', value)} required /></div>
            <div className="md:col-span-2"><TextArea label={language === 'es' ? 'Brecha actual' : 'Current gap'} value={draft.currentGap} onChange={(value) => update('currentGap', value)} /></div>
          </div></section>

          <section><p className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-black/40">{language === 'es' ? '3. Primer plan' : '3. First plan'}</p><div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2"><TextArea label={language === 'es' ? 'Plan inicial' : 'Initial plan'} value={draft.planSummary} onChange={(value) => update('planSummary', value)} /></div>
            <Field label={language === 'es' ? 'Próxima acción' : 'Next action'} value={draft.nextAction} onChange={(value) => update('nextAction', value)} required />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label={language === 'es' ? 'Fecha próxima sesión' : 'Next session date'} type="date" value={draft.nextSessionDate} onChange={(value) => update('nextSessionDate', value)} />
              <Field label={language === 'es' ? 'Hora próxima sesión' : 'Next session time'} type="time" value={draft.nextSessionTime} onChange={(value) => update('nextSessionTime', value)} />
            </div>
            <TextArea label={language === 'es' ? 'Bloqueos iniciales' : 'Initial blockers'} value={draft.blockers} onChange={(value) => update('blockers', value)} placeholder={language === 'es' ? 'Uno por línea' : 'One per line'} />
            <TextArea label={language === 'es' ? 'Primeros compromisos' : 'Initial commitments'} value={draft.commitments} onChange={(value) => update('commitments', value)} placeholder={language === 'es' ? 'Uno por línea' : 'One per line'} />
          </div></section>
          {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        </div>

        <div className="flex flex-col-reverse gap-3 border-t border-black/8 px-5 py-4 sm:flex-row sm:justify-end md:px-7"><button type="button" onClick={close} className="rounded-xl border border-black/10 bg-white px-4 py-2.5 text-sm font-semibold text-black/60">{language === 'es' ? 'Cancelar' : 'Cancel'}</button><button type="button" disabled={!requiredReady || saving} onClick={() => void createClient()} className="rounded-xl bg-[#111413] px-5 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-35">{saving ? (language === 'es' ? 'Creando…' : 'Creating…') : linkedPersonId ? (language === 'es' ? 'Iniciar Cliente 1:1' : 'Start 1:1 client') : (language === 'es' ? 'Crear cliente' : 'Create client')}</button></div>
      </div>
    </div>}
  </>;
}
