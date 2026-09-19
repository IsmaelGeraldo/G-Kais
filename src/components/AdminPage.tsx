import React, { useEffect, useMemo, useState } from 'react';
import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import type { User } from 'firebase/auth';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  LogOut,
  RefreshCw,
  Save,
  ShieldCheck
} from 'lucide-react';
import { firebaseAuth } from '../lib/firebase';
import {
  fetchAdminLeads,
  updateLeadOperations
} from '../services/adminLeads';
import type {
  AdminLead,
  FollowUpBucket,
  LeadOperationsUpdate,
  LeadStatus
} from '../types/admin';

const STATUS_OPTIONS: { value: LeadStatus; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Pending review' },
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'FOLLOW_UP', label: 'Follow-up' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'CLIENT', label: 'Client' },
  { value: 'LOST', label: 'Lost' }
];

function getFollowUpBucket(lead: AdminLead): FollowUpBucket {
  if (lead.status === 'CLIENT' || lead.status === 'LOST' || !lead.followUpAt) {
    return 'UNSCHEDULED';
  }

  const followUp = new Date(lead.followUpAt);
  if (Number.isNaN(followUp.getTime())) return 'UNSCHEDULED';

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  if (followUp < now) return 'OVERDUE';
  if (followUp < tomorrowStart) return 'TODAY';
  return 'UPCOMING';
}

function followUpLabel(bucket: FollowUpBucket): string {
  if (bucket === 'OVERDUE') return 'Overdue';
  if (bucket === 'TODAY') return 'Today';
  if (bucket === 'UPCOMING') return 'Upcoming';
  return 'Unscheduled';
}

function isFutureCreatedAt(value: string): boolean {
  const time = Date.parse(value);
  return Number.isFinite(time) && time > Date.now() + 5 * 60 * 1000;
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
}

function toDatetimeLocal(value?: string): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString();
}

function makeDraft(lead: AdminLead | null): LeadOperationsUpdate {
  return {
    status: lead?.status || 'PENDING_REVIEW',
    assignedTo: lead?.assignedTo || '',
    nextAction: lead?.nextAction || '',
    followUpAt: lead?.followUpAt || '',
    internalNotes: lead?.internalNotes || ''
  };
}

export const AdminPage: React.FC = () => {
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LeadStatus>('ALL');
  const [followUpFilter, setFollowUpFilter] = useState<'ALL' | FollowUpBucket>('ALL');
  const [draft, setDraft] = useState<LeadOperationsUpdate>(
    makeDraft(null)
  );

  useEffect(() => {
    return onAuthStateChanged(firebaseAuth, (nextUser) => {
      setUser(nextUser);
      setAuthLoading(false);
    });
  }, []);

  const loadLeads = async () => {
    setDataLoading(true);
    setError(null);
    try {
      const records = await fetchAdminLeads();
      setLeads(records);
      setSelectedId((current) =>
        current && records.some((record) => record.id === current)
          ? current
          : records[0]?.id || null
      );
    } catch (err: any) {
      setError(err?.message || 'No se pudieron cargar los leads.');
    } finally {
      setDataLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadLeads();
    } else {
      setLeads([]);
      setSelectedId(null);
    }
  }, [user]);

  const filteredLeads = useMemo(() => {
    const needle = queryText.trim().toLowerCase();

    return leads.filter((lead) => {
      const matchesStatus =
        statusFilter === 'ALL' || lead.status === statusFilter;

      const matchesFollowUp =
        followUpFilter === 'ALL' || getFollowUpBucket(lead) === followUpFilter;

      const matchesSearch =
        !needle ||
        [
          lead.name,
          lead.company,
          lead.email,
          lead.contactChannel,
          lead.inquiryNotes,
          lead.message,
          lead.source,
          lead.status,
          lead.assignedTo,
          lead.nextAction,
          lead.internalNotes
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));

      return matchesStatus && matchesFollowUp && matchesSearch;
    });
  }, [leads, queryText, statusFilter, followUpFilter]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedId) ||
    filteredLeads[0] ||
    null;

  useEffect(() => {
    setDraft(makeDraft(selectedLead));
    setSaveMessage(null);
  }, [selectedLead?.id]);

  const metrics = useMemo(() => {
    const overdueCount = leads.filter((lead) => getFollowUpBucket(lead) === 'OVERDUE').length;
    const todayCount = leads.filter((lead) => getFollowUpBucket(lead) === 'TODAY').length;
    const upcomingCount = leads.filter((lead) => getFollowUpBucket(lead) === 'UPCOMING').length;
    const clientCount = leads.filter((lead) => lead.status === 'CLIENT').length;

    return {
      total: leads.length,
      overdueCount,
      todayCount,
      upcomingCount,
      clientCount
    };
  }, [leads]);

  const actionQueue = useMemo(() => {
    const actionable = leads.filter((lead) => {
      if (lead.status === 'CLIENT' || lead.status === 'LOST') return false;

      const bucket = getFollowUpBucket(lead);
      return (
        bucket === 'OVERDUE' ||
        bucket === 'TODAY' ||
        lead.status === 'PENDING_REVIEW' ||
        lead.status === 'NEW'
      );
    });

    const priority = (lead: AdminLead) => {
      const bucket = getFollowUpBucket(lead);
      if (bucket === 'OVERDUE') return 0;
      if (bucket === 'TODAY') return 1;
      if (lead.status === 'PENDING_REVIEW' || lead.status === 'NEW') return 2;
      return 3;
    };

    return [...actionable]
      .sort((a, b) => {
        const priorityDiff = priority(a) - priority(b);
        if (priorityDiff !== 0) return priorityDiff;

        const aFollowUp = a.followUpAt ? Date.parse(a.followUpAt) : Number.POSITIVE_INFINITY;
        const bFollowUp = b.followUpAt ? Date.parse(b.followUpAt) : Number.POSITIVE_INFINITY;
        if (aFollowUp !== bFollowUp) return aFollowUp - bFollowUp;

        return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
      })
      .slice(0, 8);
  }, [leads]);

  const handleGoogleSignIn = async () => {
    setError(null);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(firebaseAuth, provider);
    } catch (err: any) {
      setError(err?.message || 'No se pudo iniciar sesión con Google.');
    }
  };

  const handleSave = async () => {
    if (!selectedLead || !user) return;

    setSaving(true);
    setError(null);
    setSaveMessage(null);

    try {
      const normalizedUpdate: LeadOperationsUpdate = {
        status: draft.status,
        assignedTo: draft.assignedTo || '',
        nextAction: draft.nextAction || '',
        followUpAt: draft.followUpAt || '',
        internalNotes: draft.internalNotes || ''
      };

      const activity = await updateLeadOperations(
        selectedLead,
        normalizedUpdate,
        user.displayName || user.email || 'Admin'
      );

      setLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                ...normalizedUpdate,
                updatedAt: new Date().toISOString(),
                activityLog: [...(lead.activityLog || []), activity].slice(-20)
              }
            : lead
        )
      );

      setSaveMessage('CRM changes saved in Firestore.');
    } catch (err: any) {
      setError(err?.message || 'No se pudieron guardar los cambios.');
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#0A0A0A]" />
      </main>
    );
  }

  if (!user) {
    return (
      <main className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A] flex items-center justify-center px-6">
        <section className="w-full max-w-lg border border-[#0A0A0A]/15 bg-white p-8 sm:p-10">
          <div className="flex items-center justify-between mb-10">
            <a href="/" className="inline-flex items-center text-xs font-mono-code uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A]">
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              G-KAIS
            </a>
            <span className="font-mono-code text-[10px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
              INTERNAL
            </span>
          </div>

          <ShieldCheck className="w-8 h-8 mb-5" />
          <p className="font-mono-code text-[11px] uppercase tracking-[0.22em] text-[#0A3F4D] font-semibold mb-2">
            PRIVATE OPERATIONS
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            G-KAIS Admin
          </h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-8">
            Acceso interno para revisar y gestionar oportunidades registradas en Firestore.
          </p>

          {error && (
            <div className="mb-5 border border-red-200 bg-red-50 text-red-800 p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-[#0A0A0A] text-white px-5 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
          >
            Sign in with Google
          </button>

          <p className="mt-4 text-[10px] leading-relaxed font-mono-code text-[#8A8A8A]">
            Preview interno. No publicar hasta desplegar las Security Rules de administrador.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A]">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <a href="/" className="text-2xl font-extrabold tracking-tight">G-KAIS</a>
              <span className="font-mono-code text-[9px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
                CRM // PREVIEW
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">Lead operations workspace</p>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold">{user.displayName || user.email}</p>
              <p className="font-mono-code text-[9px] text-[#6B6B6B]">Authenticated admin preview</p>
            </div>
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="inline-flex items-center border border-[#E5E5E5] bg-white px-3 py-2 text-xs hover:bg-[#F7F7F5]"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1600px] mx-auto px-5 sm:px-8 py-8">
        <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="font-mono-code text-[10px] uppercase tracking-[0.2em] text-[#0A3F4D] font-bold mb-2">
              LIVE FIRESTORE CRM
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              Opportunities pipeline
            </h1>
          </div>

          <button
            type="button"
            onClick={loadLeads}
            disabled={dataLoading}
            className="inline-flex items-center justify-center border border-[#0A0A0A] px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-white hover:bg-[#F0F0EE] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 text-red-800 p-3 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {saveMessage && (
          <div className="mb-6 border border-[#0A3F4D]/20 bg-white text-[#0A3F4D] p-3 text-xs flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            <span>{saveMessage}</span>
          </div>
        )}

        <section className="grid grid-cols-2 md:grid-cols-5 border border-[#E5E5E5] bg-white mb-6">
          {[
            ['TOTAL', metrics.total],
            ['OVERDUE', metrics.overdueCount],
            ['TODAY', metrics.todayCount],
            ['UPCOMING', metrics.upcomingCount],
            ['CLIENTS', metrics.clientCount]
          ].map(([label, value]) => (
            <div key={String(label)} className="p-5 border-r border-b md:border-b-0 border-[#E5E5E5] last:border-r-0">
              <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">{label}</p>
              <p className="text-3xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        <section className="border border-[#E5E5E5] bg-white mb-6">
          <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                Action Queue
              </p>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Priority work: overdue follow-ups, today's follow-ups and unreviewed leads.
              </p>
            </div>
            <span className="font-mono-code text-[10px] text-[#6B6B6B]">
              {actionQueue.length} items
            </span>
          </div>

          {actionQueue.length > 0 ? (
            <div className="divide-y divide-[#E5E5E5]">
              {actionQueue.map((lead) => {
                const bucket = getFollowUpBucket(lead);
                const isNew = lead.status === 'PENDING_REVIEW' || lead.status === 'NEW';
                const queueLabel =
                  bucket === 'OVERDUE'
                    ? 'OVERDUE'
                    : bucket === 'TODAY'
                    ? 'TODAY'
                    : isNew
                    ? 'NEW LEAD'
                    : 'ACTION';

                const queueClass =
                  bucket === 'OVERDUE'
                    ? 'border-red-300 text-red-700 bg-red-50'
                    : bucket === 'TODAY'
                    ? 'border-amber-300 text-amber-800 bg-amber-50'
                    : 'border-[#0A3F4D]/30 text-[#0A3F4D] bg-white';

                return (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => setSelectedId(lead.id)}
                    className="w-full px-4 sm:px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`font-mono-code text-[9px] px-2 py-1 border ${queueClass}`}>
                          {queueLabel}
                        </span>
                        <span className="font-bold text-sm text-[#0A0A0A] truncate">
                          {lead.name}
                        </span>
                        {lead.company && (
                          <span className="text-xs text-[#6B6B6B] truncate">
                            {lead.company}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                        <span>
                          {lead.nextAction || (isNew ? 'Review new inquiry' : 'No next action set')}
                        </span>
                        {lead.followUpAt && (
                          <span className="font-mono-code">
                            {formatDate(lead.followUpAt)}
                          </span>
                        )}
                        <span>
                          Owner: {lead.assignedTo || 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    <ChevronRight className="w-4 h-4 shrink-0 text-[#6B6B6B]" />
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="px-5 py-8 text-center">
              <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-[#0A3F4D]" />
              <p className="text-sm font-semibold">Action queue clear</p>
              <p className="text-xs text-[#6B6B6B] mt-1">
                No overdue, due-today or unreviewed leads.
              </p>
            </div>
          )}
        </section>

        <section className="border border-[#E5E5E5] bg-white">
          <div className="p-4 border-b border-[#E5E5E5] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">Lead pipeline</p>
              <p className="text-xs text-[#6B6B6B]">{filteredLeads.length} records visible</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value as 'ALL' | LeadStatus)
                }
                className="border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              >
                <option value="ALL">All statuses</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <select
                value={followUpFilter}
                onChange={(event) =>
                  setFollowUpFilter(event.target.value as 'ALL' | FollowUpBucket)
                }
                className="border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              >
                <option value="ALL">All follow-ups</option>
                <option value="OVERDUE">Overdue</option>
                <option value="TODAY">Today</option>
                <option value="UPCOMING">Upcoming</option>
                <option value="UNSCHEDULED">Unscheduled</option>
              </select>

              <input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder="Search name, company, owner, action..."
                className="w-full sm:w-80 border border-[#E5E5E5] bg-[#FAFAFA] px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[640px]">
            <div className="xl:col-span-8 overflow-x-auto border-b xl:border-b-0 xl:border-r border-[#E5E5E5]">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono-code text-[10px] uppercase text-[#6B6B6B]">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-3 py-3">Source</th>
                    <th className="px-3 py-3">Status</th>
                    <th className="px-3 py-3">Owner</th>
                    <th className="px-3 py-3">Next action</th>
                    <th className="px-3 py-3">Follow-up</th>
                    <th className="px-4 py-3 text-right">Created</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E5E5]">
                  {dataLoading && leads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-16 text-center text-[#6B6B6B]">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        onClick={() => setSelectedId(lead.id)}
                        className={`cursor-pointer hover:bg-[#FAFAFA] ${selectedLead?.id === lead.id ? 'bg-[#F7F7F5]' : ''}`}
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-sm">{lead.name}</p>
                          <p className="text-[10px] text-[#6B6B6B] mt-1">
                            {lead.company || lead.email}
                          </p>
                        </td>
                        <td className="px-3 py-4">
                          <span className="font-mono-code text-[9px] border border-[#E5E5E5] px-2 py-1">
                            {lead.source}
                          </span>
                        </td>
                        <td className="px-3 py-4 font-medium">
                          {STATUS_OPTIONS.find((option) => option.value === lead.status)?.label || lead.status}
                        </td>
                        <td className="px-3 py-4">{lead.assignedTo || '—'}</td>
                        <td className="px-3 py-4 max-w-[220px] truncate">
                          {lead.nextAction || '—'}
                        </td>
                        <td className="px-3 py-4">
                          <span className={`font-mono-code text-[9px] px-2 py-1 border ${
                            getFollowUpBucket(lead) === 'OVERDUE'
                              ? 'border-red-300 text-red-700 bg-red-50'
                              : getFollowUpBucket(lead) === 'TODAY'
                              ? 'border-amber-300 text-amber-800 bg-amber-50'
                              : getFollowUpBucket(lead) === 'UPCOMING'
                              ? 'border-[#0A3F4D]/30 text-[#0A3F4D] bg-white'
                              : 'border-[#E5E5E5] text-[#777] bg-white'
                          }`}>
                            {followUpLabel(getFollowUpBucket(lead))}
                          </span>
                          {lead.followUpAt && (
                            <div className="mt-1 text-[9px] text-[#777] font-mono-code">
                              {formatDate(lead.followUpAt)}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right font-mono-code text-[10px]">
                          <div>{formatDate(lead.createdAt)}</div>
                          {isFutureCreatedAt(lead.createdAt) && (
                            <span className="inline-block mt-1 px-1.5 py-0.5 border border-amber-300 bg-amber-50 text-amber-800 text-[8px] uppercase tracking-wider">
                              Future test date
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <aside className="xl:col-span-4 bg-[#FAFAFA] p-5 sm:p-6">
              {selectedLead ? (
                <div>
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E5E5]">
                    <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                      CRM RECORD // {selectedLead.source}
                    </span>
                    <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                      {selectedLead.id}
                    </span>
                  </div>

                  <h2 className="text-2xl font-extrabold tracking-tight">{selectedLead.name}</h2>
                  <p className="text-sm text-[#6B6B6B] mt-1">{selectedLead.company || 'Direct contact'}</p>

                  <div className="mt-6 space-y-3 text-xs font-mono-code">
                    {[
                      ['EMAIL', selectedLead.email],
                      ['CHANNEL', selectedLead.contactChannel || '—'],
                      ['CREATED', formatDate(selectedLead.createdAt)],
                      ['UPDATED', selectedLead.updatedAt ? formatDate(selectedLead.updatedAt) : '—']
                    ].map(([label, value]) => (
                      <div key={String(label)} className="flex justify-between gap-4 border-b border-[#E5E5E5] pb-2">
                        <span className="text-[#6B6B6B]">{label}</span>
                        <span className="text-right font-semibold break-all">{value}</span>
                      </div>
                    ))}
                  </div>

                  {selectedLead.website && (
                    <a
                      href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-5 inline-flex items-center text-xs underline text-[#0A3F4D]"
                    >
                      Open website <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}

                  <div className="mt-6 border border-[#E5E5E5] bg-white p-4">
                    <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] font-bold mb-2">
                      Intake context
                    </p>
                    <p className="text-sm leading-relaxed">
                      {selectedLead.inquiryNotes || selectedLead.message || 'No additional notes.'}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#D8D8D8] pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                          CRM controls
                        </p>
                        <p className="text-[10px] text-[#777] mt-1">
                          Authenticated internal preview
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          Status
                        </span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              status: event.target.value as LeadStatus
                            }))
                          }
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          Responsible
                        </span>
                        <input
                          value={draft.assignedTo || ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              assignedTo: event.target.value
                            }))
                          }
                          maxLength={100}
                          placeholder="e.g. Ismael"
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          Next action
                        </span>
                        <input
                          value={draft.nextAction || ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              nextAction: event.target.value
                            }))
                          }
                          maxLength={240}
                          placeholder="Call, send proposal, confirm meeting..."
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          Follow-up date
                        </span>
                        <input
                          type="datetime-local"
                          value={toDatetimeLocal(draft.followUpAt)}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              followUpAt: fromDatetimeLocal(event.target.value)
                            }))
                          }
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          Internal notes
                        </span>
                        <textarea
                          value={draft.internalNotes || ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              internalNotes: event.target.value
                            }))
                          }
                          maxLength={3000}
                          rows={5}
                          placeholder="Private commercial context, objections, next steps..."
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center bg-[#0A0A0A] text-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] disabled:opacity-50 transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Save CRM changes
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 border-t border-[#D8D8D8] pt-6">
                    <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider mb-4">
                      Activity history
                    </p>

                    {selectedLead.activityLog && selectedLead.activityLog.length > 0 ? (
                      <div className="space-y-3">
                        {[...selectedLead.activityLog].reverse().map((entry, index) => (
                          <div
                            key={`${entry.at}-${index}`}
                            className="border-l-2 border-[#0A3F4D] pl-3 py-1"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                                {formatDate(entry.at)}
                              </span>
                              <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                                {entry.actor}
                              </span>
                            </div>
                            <p className="text-xs mt-1">
                              {entry.fromStatus} → {entry.toStatus}
                            </p>
                            {entry.nextAction && (
                              <p className="text-[11px] text-[#6B6B6B] mt-1">
                                Next: {entry.nextAction}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#777]">No CRM changes recorded yet.</p>
                    )}
                  </div>

                  <div className="mt-5 border border-amber-200 bg-amber-50 p-3 text-[10px] leading-relaxed text-amber-900">
                    Development environment only. Do not publish while the currently deployed Firestore rules remain permissive.
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center text-center text-xs text-[#6B6B6B]">
                  Select a lead to inspect.
                </div>
              )}
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
};
