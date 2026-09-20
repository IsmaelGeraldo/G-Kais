import React, { useEffect, useMemo, useRef, useState } from 'react';
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
  Bell,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  Loader2,
  LogOut,
  Mail,
  RefreshCw,
  Save,
  ShieldCheck,
  X
} from 'lucide-react';
import { firebaseAuth } from '../lib/firebase';
import {
  completeLeadAction,
  fetchAdminLeads,
  updateLeadOperations
} from '../services/adminLeads';
import type {
  AdminLead,
  FollowUpBucket,
  LeadOperationsUpdate,
  LeadStatus,
  TaskOutcome
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

const NEXT_ACTION_OPTIONS = [
  'Call',
  'Send WhatsApp',
  'Send email',
  'Send proposal',
  'Schedule meeting',
  'Confirm meeting',
  'Request information',
  'Follow up',
  'Close sale'
] as const;

const TASK_OUTCOME_OPTIONS: {
  value: TaskOutcome;
  label: string;
  description: string;
}[] = [
  {
    value: 'COMPLETED',
    label: 'Completed',
    description: 'Close the current task with no automatic next step.'
  },
  {
    value: 'NO_ANSWER',
    label: 'No answer',
    description: 'Create Follow up automatically for 24 hours from now.'
  },
  {
    value: 'INTERESTED',
    label: 'Interested',
    description: 'Move to Contacted and create Schedule meeting for 24 hours from now.'
  },
  {
    value: 'MEETING_BOOKED',
    label: 'Meeting booked',
    description: 'Move to Meeting and create Confirm meeting as the next action.'
  },
  {
    value: 'PROPOSAL_SENT',
    label: 'Proposal sent',
    description: 'Move to Follow-up and create a follow-up task for 48 hours from now.'
  },
  {
    value: 'SALE_CLOSED',
    label: 'Sale closed',
    description: 'Move the lead to Client and close the current task.'
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Not interested',
    description: 'Move the lead to Lost and close the current task.'
  }
];

function taskOutcomeLabel(value?: TaskOutcome): string {
  return (
    TASK_OUTCOME_OPTIONS.find((option) => option.value === value)?.label ||
    value ||
    ''
  );
}

function getWorkPriority(lead: AdminLead): {
  label: 'HIGH' | 'MEDIUM' | 'NORMAL';
  score: number;
} {
  const bucket = getFollowUpBucket(lead);

  if (bucket === 'OVERDUE') return { label: 'HIGH', score: 100 };
  if (bucket === 'TODAY') return { label: 'HIGH', score: 90 };
  if (
    lead.status !== 'PENDING_REVIEW' &&
    lead.status !== 'NEW' &&
    !lead.nextAction
  ) {
    return { label: 'HIGH', score: 80 };
  }
  if (lead.status === 'PENDING_REVIEW' || lead.status === 'NEW') {
    return { label: 'MEDIUM', score: 70 };
  }
  if (bucket === 'UPCOMING') return { label: 'MEDIUM', score: 50 };
  return { label: 'NORMAL', score: 20 };
}

function getFollowUpBucket(lead: AdminLead): FollowUpBucket {
  if (lead.status === 'LOST' || !lead.followUpAt) {
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

type AdminAlert = {
  id: string;
  leadId: string;
  level: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  createdAt: string;
};

function buildAdminAlerts(leads: AdminLead[]): AdminAlert[] {
  const alerts: AdminAlert[] = [];

  for (const lead of leads) {
    if (lead.status === 'LOST') continue;

    const bucket = getFollowUpBucket(lead);

    if (bucket === 'OVERDUE') {
      alerts.push({
        id: `overdue:${lead.id}:${lead.followUpAt || ''}`,
        leadId: lead.id,
        level: 'critical',
        title: `Overdue follow-up · ${lead.name}`,
        description: lead.nextAction || 'Follow-up is overdue.',
        createdAt: lead.followUpAt || lead.createdAt
      });
      continue;
    }

    if (bucket === 'TODAY') {
      alerts.push({
        id: `today:${lead.id}:${lead.followUpAt || ''}`,
        leadId: lead.id,
        level: 'warning',
        title: `Follow-up today · ${lead.name}`,
        description: lead.nextAction || 'Follow-up is due today.',
        createdAt: lead.followUpAt || lead.createdAt
      });
      continue;
    }

    if (
      !lead.nextAction &&
      (lead.status === 'CONTACTED' ||
        lead.status === 'FOLLOW_UP' ||
        lead.status === 'MEETING')
    ) {
      alerts.push({
        id: `missing-action:${lead.id}:${lead.updatedAt || lead.createdAt}`,
        leadId: lead.id,
        level: 'warning',
        title: `No next action · ${lead.name}`,
        description: 'This classified lead needs an explicit next action.',
        createdAt: lead.updatedAt || lead.createdAt
      });
      continue;
    }

    if (lead.status === 'PENDING_REVIEW' || lead.status === 'NEW') {
      alerts.push({
        id: `new:${lead.id}:${lead.createdAt}`,
        leadId: lead.id,
        level: 'info',
        title: `New lead · ${lead.name}`,
        description: lead.company || lead.email,
        createdAt: lead.createdAt
      });
    }
  }

  const rank = { critical: 0, warning: 1, info: 2 } as const;

  return alerts.sort((a, b) => {
    const levelDiff = rank[a.level] - rank[b.level];
    if (levelDiff !== 0) return levelDiff;
    return (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0);
  });
}

export const AdminPage: React.FC<{ onExitAdmin: () => void }> = ({ onExitAdmin }) => {
  const crmPanelRef = useRef<HTMLElement | null>(null);
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingActionId, setCompletingActionId] = useState<string | null>(null);
  const [taskCompletionLead, setTaskCompletionLead] = useState<AdminLead | null>(null);
  const [taskOutcome, setTaskOutcome] = useState<TaskOutcome>('COMPLETED');
  const [error, setError] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [queryText, setQueryText] = useState('');
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [readAlertIds, setReadAlertIds] = useState<string[]>(() => {
    try {
      const raw = window.localStorage.getItem('gkais-admin-read-alerts');
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string') : [];
    } catch {
      return [];
    }
  });
  const [browserAlertStatus, setBrowserAlertStatus] = useState<
    'idle' | 'enabled' | 'unsupported' | 'blocked'
  >('idle');
  const [emailTestStatus, setEmailTestStatus] = useState<
    'idle' | 'sending' | 'sent' | 'not_configured' | 'failed'
  >('idle');
  const [emailTestMessage, setEmailTestMessage] = useState<string>('');
  const [leadEmailStatus, setLeadEmailStatus] = useState<
    'idle' | 'sending' | 'sent' | 'failed'
  >('idle');
  const [leadEmailMessage, setLeadEmailMessage] = useState<string>('');
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
    setLeadEmailStatus('idle');
    setLeadEmailMessage('');
  }, [selectedLead?.id]);

  useEffect(() => {
    if (!selectedLead) return;

    window.requestAnimationFrame(() => {
      if (crmPanelRef.current) {
        crmPanelRef.current.scrollTop = 0;
      }
    });
  }, [selectedLead?.id]);

  const metrics = useMemo(() => {
    const overdueCount = leads.filter((lead) => getFollowUpBucket(lead) === 'OVERDUE').length;
    const todayCount = leads.filter((lead) => getFollowUpBucket(lead) === 'TODAY').length;
    const upcomingCount = leads.filter((lead) => getFollowUpBucket(lead) === 'UPCOMING').length;
    const clientCount = leads.filter((lead) => lead.status === 'CLIENT').length;

    const now = new Date();
    const tasksDoneToday = leads.reduce((count, lead) => {
      const completedToday = (lead.activityLog || []).filter((entry) => {
        const date = new Date(entry.at);
        if (Number.isNaN(date.getTime())) return false;

        const isToday =
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate();

        const isCompletion =
          Boolean(entry.result) || entry.nextAction.startsWith('Completed:');

        return isToday && isCompletion;
      }).length;

      return count + completedToday;
    }, 0);

    return {
      total: leads.length,
      overdueCount,
      todayCount,
      upcomingCount,
      clientCount,
      tasksDoneToday
    };
  }, [leads]);

  const newLeadInbox = useMemo(
    () =>
      leads
        .filter(
          (lead) =>
            lead.status === 'PENDING_REVIEW' || lead.status === 'NEW'
        )
        .sort(
          (a, b) =>
            (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0)
        )
        .slice(0, 6),
    [leads]
  );

  const priorityWork = useMemo(() => {
    const actionable = leads.filter((lead) => {
      return (
        lead.status !== 'LOST' &&
        lead.status !== 'PENDING_REVIEW' &&
        lead.status !== 'NEW'
      );
    });

    return [...actionable]
      .sort((a, b) => {
        const priorityDiff =
          getWorkPriority(b).score - getWorkPriority(a).score;
        if (priorityDiff !== 0) return priorityDiff;

        const aFollowUp = a.followUpAt
          ? Date.parse(a.followUpAt)
          : Number.POSITIVE_INFINITY;
        const bFollowUp = b.followUpAt
          ? Date.parse(b.followUpAt)
          : Number.POSITIVE_INFINITY;

        if (aFollowUp !== bFollowUp) return aFollowUp - bFollowUp;

        const aUpdated = Date.parse(a.updatedAt || a.createdAt) || 0;
        const bUpdated = Date.parse(b.updatedAt || b.createdAt) || 0;
        return bUpdated - aUpdated;
      })
      .slice(0, 6);
  }, [leads]);

  const adminAlerts = useMemo(() => buildAdminAlerts(leads), [leads]);
  const unreadAlerts = useMemo(
    () => adminAlerts.filter((alert) => !readAlertIds.includes(alert.id)),
    [adminAlerts, readAlertIds]
  );

  useEffect(() => {
    const activeIds = new Set(adminAlerts.map((alert) => alert.id));
    setReadAlertIds((current) => {
      const next = current.filter((id) => activeIds.has(id));
      if (next.length === current.length && next.every((id, index) => id === current[index])) {
        return current;
      }
      try {
        window.localStorage.setItem('gkais-admin-read-alerts', JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [adminAlerts]);

  useEffect(() => {
    if (
      typeof window === 'undefined' ||
      !('Notification' in window) ||
      Notification.permission !== 'granted' ||
      unreadAlerts.length === 0
    ) {
      return;
    }

    const latest = unreadAlerts[0];
    const notificationKey = `gkais-browser-alert:${latest.id}`;

    try {
      if (window.sessionStorage.getItem(notificationKey) === '1') return;
      new Notification(latest.title, {
        body: latest.description,
        tag: latest.id
      });
      window.sessionStorage.setItem(notificationKey, '1');
    } catch {
      // Embedded previews may block native notifications. In-app alerts remain available.
    }
  }, [unreadAlerts]);

  const persistReadAlerts = (ids: string[]) => {
    const unique = Array.from(new Set(ids)).slice(-200);
    setReadAlertIds(unique);
    try {
      window.localStorage.setItem('gkais-admin-read-alerts', JSON.stringify(unique));
    } catch {}
  };

  const markAlertRead = (alertId: string) => {
    persistReadAlerts([...readAlertIds, alertId]);
  };

  const markAllAlertsRead = () => {
    persistReadAlerts(adminAlerts.map((alert) => alert.id));
  };

  const openAlertLead = (alert: AdminAlert) => {
    markAlertRead(alert.id);
    setSelectedId(alert.leadId);
    setAlertsOpen(false);
  };

  const enableBrowserAlerts = async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      setBrowserAlertStatus('unsupported');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      setBrowserAlertStatus(permission === 'granted' ? 'enabled' : 'blocked');
    } catch {
      setBrowserAlertStatus('blocked');
    }
  };

  const sendEmailChannelTest = async () => {
    if (!user) return;

    setEmailTestStatus('sending');
    setEmailTestMessage('');

    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/admin/email/test', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.code === 'EMAIL_SENT') {
        setEmailTestStatus('sent');
        setEmailTestMessage('Test email sent successfully.');
        return;
      }

      if (response.ok && payload?.code === 'EMAIL_NOT_CONFIGURED') {
        setEmailTestStatus('not_configured');
        setEmailTestMessage('Email provider is not configured yet. No message was sent.');
        return;
      }

      setEmailTestStatus('failed');
      setEmailTestMessage(
        payload?.error || 'Email channel test failed.'
      );
    } catch (err: any) {
      setEmailTestStatus('failed');
      setEmailTestMessage(err?.message || 'Email channel test failed.');
    }
  };

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

  const sendSelectedLeadEmail = async () => {
    if (!selectedLead || !user) return;

    const bucket = getFollowUpBucket(selectedLead);
    const kind =
      bucket === 'OVERDUE'
        ? 'overdue_follow_up'
        : bucket === 'TODAY'
        ? 'follow_up_today'
        : 'new_lead';
    const level =
      bucket === 'OVERDUE'
        ? 'critical'
        : bucket === 'TODAY'
        ? 'warning'
        : 'info';

    setLeadEmailStatus('sending');
    setLeadEmailMessage('');

    try {
      const idToken = await user.getIdToken(true);
      const response = await fetch('/api/admin/email/lead-alert', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${idToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: selectedLead.id,
          leadName: selectedLead.name,
          company: selectedLead.company || '',
          email: selectedLead.email || '',
          nextAction: selectedLead.nextAction || '',
          followUpAt: selectedLead.followUpAt || '',
          level,
          kind
        })
      });

      const payload = await response.json().catch(() => null);

      if (response.ok && payload?.code === 'EMAIL_SENT') {
        setLeadEmailStatus('sent');
        setLeadEmailMessage('Operational alert email sent.');
        return;
      }

      setLeadEmailStatus('failed');
      setLeadEmailMessage(
        payload?.error || payload?.message || 'Could not send operational alert email.'
      );
    } catch (err: any) {
      setLeadEmailStatus('failed');
      setLeadEmailMessage(err?.message || 'Could not send operational alert email.');
    }
  };

  const reviewLeadInCrm = (leadId: string) => {
    setSelectedId(leadId);

    window.requestAnimationFrame(() => {
      if (crmPanelRef.current) {
        crmPanelRef.current.scrollTop = 0;
        crmPanelRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  };

  const openTaskCompletion = (lead: AdminLead) => {
    setTaskCompletionLead(lead);
    setTaskOutcome('COMPLETED');
  };

  const handleCompleteAction = async () => {
    const lead = taskCompletionLead;
    if (!lead || !user || completingActionId) return;

    setCompletingActionId(lead.id);
    setError(null);
    setSaveMessage(null);

    try {
      const completion = await completeLeadAction(
        lead,
        user.displayName || user.email || 'Admin',
        taskOutcome
      );

      setLeads((current) =>
        current.map((record) =>
          record.id === lead.id
            ? {
                ...record,
                status: completion.status,
                nextAction: completion.nextAction || undefined,
                followUpAt: completion.followUpAt || undefined,
                updatedAt: new Date().toISOString(),
                activityLog: [
                  ...(record.activityLog || []),
                  completion.activity
                ].slice(-20)
              }
            : record
        )
      );

      if (selectedId === lead.id) {
        setDraft((current) => ({
          ...current,
          status: completion.status,
          nextAction: completion.nextAction,
          followUpAt: completion.followUpAt
        }));
      }

      const nextStep = completion.nextAction
        ? ` Next: ${completion.nextAction}.`
        : '';

      setSaveMessage(
        `${taskOutcomeLabel(taskOutcome)} recorded for ${lead.name}.${nextStep}`
      );
      setTaskCompletionLead(null);
      setTaskOutcome('COMPLETED');
    } catch (err: any) {
      setError(err?.message || 'No se pudo completar la acción.');
    } finally {
      setCompletingActionId(null);
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
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center text-xs font-mono-code uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              Back to site
            </button>
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
            Acceso interno protegido por Firebase Authentication y Security Rules de administrador.
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
              <button
                type="button"
                onClick={onExitAdmin}
                className="text-2xl font-extrabold tracking-tight hover:text-[#0A3F4D] transition-colors"
              >
                G-KAIS
              </button>
              <span className="font-mono-code text-[9px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
                CRM // INTERNAL
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">Lead operations workspace</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAlertsOpen((current) => !current)}
              className="relative inline-flex items-center border border-[#E5E5E5] bg-white px-3 py-2 text-xs hover:bg-[#F7F7F5]"
              aria-label="Open alerts"
            >
              <Bell className="w-3.5 h-3.5 mr-2" />
              Alerts
              {unreadAlerts.length > 0 && (
                <span className="ml-2 min-w-5 h-5 px-1 inline-flex items-center justify-center bg-[#0A0A0A] text-white font-mono-code text-[9px]">
                  {unreadAlerts.length > 99 ? '99+' : unreadAlerts.length}
                </span>
              )}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold">{user.displayName || user.email}</p>
              <p className="font-mono-code text-[9px] text-[#6B6B6B]">Authenticated administrator</p>
            </div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center border border-[#E5E5E5] bg-white px-3 py-2 text-xs hover:bg-[#F7F7F5]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              Back to site
            </button>
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

      {alertsOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 flex justify-end" onClick={() => setAlertsOpen(false)}>
          <aside
            className="w-full max-w-md h-full bg-white border-l border-[#E5E5E5] shadow-xl flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                  Alert Center
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight mt-1">Operational alerts</h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {unreadAlerts.length} unread · {adminAlerts.length} active
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAlertsOpen(false)}
                className="p-2 border border-[#E5E5E5] hover:bg-[#F7F7F5]"
                aria-label="Close alerts"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 border-b border-[#E5E5E5] flex flex-wrap gap-2">
              <button
                type="button"
                onClick={markAllAlertsRead}
                disabled={adminAlerts.length === 0}
                className="px-3 py-2 border border-[#E5E5E5] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50"
              >
                Mark all read
              </button>
              <button
                type="button"
                onClick={enableBrowserAlerts}
                className="px-3 py-2 border border-[#0A0A0A] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
              >
                Enable browser alerts
              </button>
              <button
                type="button"
                onClick={sendEmailChannelTest}
                disabled={emailTestStatus === 'sending'}
                className="px-3 py-2 border border-[#0A3F4D] text-[#0A3F4D] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50"
              >
                {emailTestStatus === 'sending' ? 'Testing email…' : 'Test email channel'}
              </button>
            </div>

            {browserAlertStatus === 'blocked' && (
              <div className="mx-4 mt-4 border border-amber-200 bg-amber-50 p-3 text-[10px] text-amber-900">
                Browser notifications are blocked in this environment. The in-app Alert Center still works.
              </div>
            )}

            {browserAlertStatus === 'unsupported' && (
              <div className="mx-4 mt-4 border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-[10px] text-[#6B6B6B]">
                Native browser notifications are not supported here. The in-app Alert Center still works.
              </div>
            )}

            {emailTestStatus !== 'idle' && emailTestStatus !== 'sending' && emailTestMessage && (
              <div
                className={`mx-4 mt-4 border p-3 text-[10px] ${
                  emailTestStatus === 'sent'
                    ? 'border-[#0A3F4D]/30 bg-white text-[#0A3F4D]'
                    : emailTestStatus === 'not_configured'
                    ? 'border-amber-200 bg-amber-50 text-amber-900'
                    : 'border-red-200 bg-red-50 text-red-800'
                }`}
              >
                {emailTestMessage}
              </div>
            )}

            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5E5]">
              {adminAlerts.length === 0 ? (
                <div className="p-8 text-center">
                  <CheckCircle2 className="w-6 h-6 mx-auto text-[#0A3F4D]" />
                  <p className="mt-3 font-semibold">No active alerts</p>
                  <p className="mt-1 text-xs text-[#6B6B6B]">
                    There are no overdue, due-today or new lead alerts.
                  </p>
                </div>
              ) : (
                adminAlerts.map((alert) => {
                  const unread = !readAlertIds.includes(alert.id);
                  const levelClass =
                    alert.level === 'critical'
                      ? 'border-red-300 text-red-700 bg-red-50'
                      : alert.level === 'warning'
                      ? 'border-amber-300 text-amber-800 bg-amber-50'
                      : 'border-[#0A3F4D]/30 text-[#0A3F4D] bg-white';

                  return (
                    <button
                      key={alert.id}
                      type="button"
                      onClick={() => openAlertLead(alert)}
                      className="w-full p-4 text-left hover:bg-[#FAFAFA] transition-colors"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`font-mono-code text-[8px] px-1.5 py-0.5 border ${levelClass}`}>
                              {alert.level.toUpperCase()}
                            </span>
                            {unread && (
                              <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" aria-label="Unread" />
                            )}
                          </div>
                          <p className="text-sm font-bold">{alert.title}</p>
                          <p className="text-xs text-[#6B6B6B] mt-1">{alert.description}</p>
                          <p className="font-mono-code text-[9px] text-[#8A8A8A] mt-2">
                            {formatDate(alert.createdAt)}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 shrink-0 text-[#6B6B6B] mt-1" />
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </aside>
        </div>
      )}

      {taskCompletionLead && (
        <div
          className="fixed inset-0 z-[60] bg-black/30 flex items-center justify-center px-4"
          onClick={() => {
            if (!completingActionId) setTaskCompletionLead(null);
          }}
        >
          <section
            className="w-full max-w-lg bg-white border border-[#D8D8D8] shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] uppercase tracking-wider text-[#0A3F4D]">
                  Task Engine
                </p>
                <h2 className="text-xl font-extrabold tracking-tight mt-1">
                  Complete task
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {taskCompletionLead.name} · {taskCompletionLead.nextAction || 'Current action'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setTaskCompletionLead(null)}
                disabled={Boolean(completingActionId)}
                className="p-2 border border-[#E5E5E5] hover:bg-[#F7F7F5] disabled:opacity-50"
                aria-label="Close task result"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <label className="block">
                <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                  Result
                </span>
                <select
                  value={taskOutcome}
                  onChange={(event) =>
                    setTaskOutcome(event.target.value as TaskOutcome)
                  }
                  className="w-full border border-[#D8D8D8] bg-white px-3 py-3 text-sm focus:outline-none focus:border-[#0A3F4D]"
                >
                  {TASK_OUTCOME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 border border-[#E5E5E5] bg-[#FAFAFA] p-4">
                <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B]">
                  Automatic next step
                </p>
                <p className="text-sm mt-2 leading-relaxed">
                  {
                    TASK_OUTCOME_OPTIONS.find(
                      (option) => option.value === taskOutcome
                    )?.description
                  }
                </p>
              </div>

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaskCompletionLead(null)}
                  disabled={Boolean(completingActionId)}
                  className="flex-1 border border-[#D8D8D8] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCompleteAction}
                  disabled={Boolean(completingActionId)}
                  className="flex-1 inline-flex items-center justify-center bg-[#0A0A0A] text-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] disabled:opacity-50"
                >
                  {completingActionId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {completingActionId ? 'Saving' : 'Apply result'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

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

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 border border-[#E5E5E5] bg-white mb-6">
          {[
            ['TOTAL', metrics.total],
            ['OVERDUE', metrics.overdueCount],
            ['TODAY', metrics.todayCount],
            ['UPCOMING', metrics.upcomingCount],
            ['TASKS DONE', metrics.tasksDoneToday],
            ['CLIENTS', metrics.clientCount]
          ].map(([label, value]) => (
            <div key={String(label)} className="p-5 border-r border-b md:border-b-0 border-[#E5E5E5] last:border-r-0">
              <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">{label}</p>
              <p className="text-3xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="border border-[#E5E5E5] bg-white">
            <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                  New Leads
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Inbox for new and unreviewed opportunities.
                </p>
              </div>
              <span className="font-mono-code text-[10px] text-[#6B6B6B]">
                {newLeadInbox.length} visible
              </span>
            </div>

            {newLeadInbox.length > 0 ? (
              <div className="divide-y divide-[#E5E5E5]">
                {newLeadInbox.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => reviewLeadInCrm(lead.id)}
                    className="w-full px-4 sm:px-5 py-4 text-left hover:bg-[#FAFAFA] transition-colors flex items-center justify-between gap-4"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="font-mono-code text-[9px] px-2 py-1 border border-[#0A3F4D]/30 text-[#0A3F4D]">
                          NEW LEAD
                        </span>
                        <span className="font-bold text-sm truncate">{lead.name}</span>
                        {lead.company && (
                          <span className="text-xs text-[#6B6B6B] truncate">
                            {lead.company}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                        <span>Review and classify in CRM</span>
                        <span className="font-mono-code">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D]">
                      Review in CRM
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-[#0A3F4D]" />
                <p className="text-sm font-semibold">Inbox clear</p>
                <p className="text-xs text-[#6B6B6B] mt-1">No new leads waiting for review.</p>
              </div>
            )}
          </div>

          <div className="border border-[#E5E5E5] bg-white">
            <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                  Priority Work
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  Next-best-action queue ordered by operational urgency.
                </p>
              </div>
              <span className="font-mono-code text-[10px] text-[#6B6B6B]">
                {priorityWork.length} visible
              </span>
            </div>

            {priorityWork.length > 0 ? (
              <div className="divide-y divide-[#E5E5E5]">
                {priorityWork.map((lead) => {
                  const bucket = getFollowUpBucket(lead);
                  const queueLabel =
                    bucket === 'OVERDUE'
                      ? 'OVERDUE'
                      : bucket === 'TODAY'
                      ? 'TODAY'
                      : !lead.nextAction
                      ? 'ACTION NEEDED'
                      : bucket === 'UPCOMING'
                      ? 'UPCOMING'
                      : 'ACTION';

                  const queueClass =
                    bucket === 'OVERDUE'
                      ? 'border-red-300 text-red-700 bg-red-50'
                      : bucket === 'TODAY'
                      ? 'border-amber-300 text-amber-800 bg-amber-50'
                      : !lead.nextAction
                      ? 'border-amber-300 text-amber-800 bg-amber-50'
                      : bucket === 'UPCOMING'
                      ? 'border-slate-300 text-slate-700 bg-slate-50'
                      : 'border-[#0A3F4D]/30 text-[#0A3F4D] bg-white';

                  return (
                    <div key={lead.id} className="px-4 sm:px-5 py-4 hover:bg-[#FAFAFA] transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <button
                          type="button"
                          onClick={() => setSelectedId(lead.id)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`font-mono-code text-[9px] px-2 py-1 border ${queueClass}`}>
                              {queueLabel}
                            </span>
                            <span
                              className={`font-mono-code text-[8px] px-2 py-1 border ${
                                getWorkPriority(lead).label === 'HIGH'
                                  ? 'border-red-200 text-red-700'
                                  : getWorkPriority(lead).label === 'MEDIUM'
                                  ? 'border-amber-200 text-amber-800'
                                  : 'border-[#E5E5E5] text-[#777]'
                              }`}
                            >
                              {getWorkPriority(lead).label}
                            </span>
                            <span className="font-bold text-sm truncate">{lead.name}</span>
                            {lead.company && (
                              <span className="text-xs text-[#6B6B6B] truncate">
                                {lead.company}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                            <span>{lead.nextAction || 'Set the next action in CRM'}</span>
                            {lead.followUpAt && (
                              <span className="font-mono-code">{formatDate(lead.followUpAt)}</span>
                            )}
                            <span>Owner: {lead.assignedTo || 'Unassigned'}</span>
                          </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => openTaskCompletion(lead)}
                          disabled={completingActionId === lead.id}
                          className="shrink-0 inline-flex items-center border border-[#0A3F4D] px-2.5 py-2 text-[9px] font-mono-code uppercase tracking-wider text-[#0A3F4D] bg-white hover:bg-[#F7F7F5] disabled:opacity-50"
                          title="Complete current action"
                        >
                          {completingActionId === lead.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {completingActionId === lead.id ? 'Saving' : 'Complete'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-[#0A3F4D]" />
                <p className="text-sm font-semibold">Priority work clear</p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  No classified leads have an active task or scheduled follow-up.
                </p>
              </div>
            )}
          </div>
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

          <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[640px] xl:h-[760px]">
            <div className="xl:col-span-8 overflow-auto border-b xl:border-b-0 xl:border-r border-[#E5E5E5]">
              <table className="w-full min-w-[980px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono-code text-[10px] uppercase text-[#6B6B6B] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
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
                          {formatDate(lead.createdAt)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <aside
              ref={crmPanelRef}
              className="xl:col-span-4 bg-[#FAFAFA] p-5 sm:p-6 scroll-mt-6 xl:overflow-y-auto xl:h-full"
            >
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
                          Authenticated internal workspace
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
                        <select
                          value={draft.nextAction || ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              nextAction: event.target.value
                            }))
                          }
                          className="w-full border border-[#D8D8D8] bg-white px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        >
                          <option value="">Select next action</option>
                          {draft.nextAction &&
                            !NEXT_ACTION_OPTIONS.includes(
                              draft.nextAction as (typeof NEXT_ACTION_OPTIONS)[number]
                            ) && (
                              <option value={draft.nextAction}>
                                Existing: {draft.nextAction}
                              </option>
                            )}
                          {NEXT_ACTION_OPTIONS.map((action) => (
                            <option key={action} value={action}>
                              {action}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[10px] text-[#777]">
                          Use Internal notes for details, context or instructions.
                        </p>
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

                      <button
                        type="button"
                        onClick={sendSelectedLeadEmail}
                        disabled={leadEmailStatus === 'sending'}
                        className="w-full inline-flex items-center justify-center border border-[#0A3F4D] text-[#0A3F4D] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50 transition-colors"
                      >
                        {leadEmailStatus === 'sending' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-2" />
                        )}
                        {leadEmailStatus === 'sending' ? 'Sending alert…' : 'Send email alert'}
                      </button>

                      {leadEmailMessage && (
                        <div
                          className={`border p-3 text-[10px] ${
                            leadEmailStatus === 'sent'
                              ? 'border-[#0A3F4D]/30 text-[#0A3F4D] bg-white'
                              : 'border-red-200 text-red-800 bg-red-50'
                          }`}
                        >
                          {leadEmailMessage}
                        </div>
                      )}
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
                            {entry.result && (
                              <p className="text-[10px] font-mono-code uppercase tracking-wider text-[#0A3F4D] mt-1">
                                Result: {taskOutcomeLabel(entry.result)}
                              </p>
                            )}
                            {entry.nextAction && (
                              <p className="text-[11px] text-[#6B6B6B] mt-1">
                                {entry.nextAction.startsWith('Completed:')
                                  ? entry.nextAction
                                  : `Next: ${entry.nextAction}`}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-[#777]">No CRM changes recorded yet.</p>
                    )}
                  </div>

                  <div className="mt-5 border border-[#0A3F4D]/20 bg-white p-3 text-[10px] leading-relaxed text-[#0A3F4D]">
                    Internal workspace. Firestore CRM reads and operational updates are restricted to authenticated administrators.
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
