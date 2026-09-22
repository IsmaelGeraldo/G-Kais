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
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../i18n/LanguageContext';
import {
  addLeadNote,
  completeLeadAction,
  fetchAdminLeads,
  rescheduleLeadAction,
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
  'Review application',
  'Prepare sales call',
  'Send onboarding',
  'Client check-in',
  'Renewal follow-up',
  'Follow up',
  'Close sale'
] as const;

const QUICK_PLAYBOOKS: {
  id: string;
  label: string;
  labelEs: string;
  description: string;
  descriptionEs: string;
  category: 'CORE' | 'EXPERT_BUSINESS';
  status: LeadStatus;
  nextAction: (typeof NEXT_ACTION_OPTIONS)[number];
  hoursFromNow: number;
}[] = [
  {
    id: 'new-lead-contact',
    label: 'New lead contact',
    labelEs: 'Contacto de nuevo lead',
    description: 'Contact the lead quickly and keep it in active follow-up.',
    descriptionEs: 'Contacta al lead rápidamente y mantenlo dentro de un seguimiento activo.',
    category: 'CORE',
    status: 'NEW',
    nextAction: 'Call',
    hoursFromNow: 2
  },
  {
    id: 'whatsapp-follow-up',
    label: 'WhatsApp follow-up',
    labelEs: 'Seguimiento por WhatsApp',
    description: 'Continue a conversation with a short follow-up window.',
    descriptionEs: 'Continúa la conversación con una ventana corta de seguimiento.',
    category: 'CORE',
    status: 'FOLLOW_UP',
    nextAction: 'Send WhatsApp',
    hoursFromNow: 24
  },
  {
    id: 'proposal-follow-up',
    label: 'Proposal follow-up',
    labelEs: 'Seguimiento de propuesta',
    description: 'Schedule a commercial follow-up after a proposal has been sent.',
    descriptionEs: 'Programa el seguimiento comercial después de enviar una propuesta.',
    category: 'CORE',
    status: 'FOLLOW_UP',
    nextAction: 'Follow up',
    hoursFromNow: 48
  },
  {
    id: 'meeting-confirmation',
    label: 'Meeting confirmation',
    labelEs: 'Confirmación de reunión',
    description: 'Move the lead to Meeting and confirm the appointment.',
    descriptionEs: 'Mueve el lead a Reunión y confirma la cita.',
    category: 'CORE',
    status: 'MEETING',
    nextAction: 'Confirm meeting',
    hoursFromNow: 24
  },
  {
    id: 'client-care',
    label: 'Client follow-up',
    labelEs: 'Seguimiento de cliente',
    description: 'Keep an existing client active with a scheduled follow-up.',
    descriptionEs: 'Mantén al cliente activo con un seguimiento programado.',
    category: 'CORE',
    status: 'CLIENT',
    nextAction: 'Follow up',
    hoursFromNow: 168
  },
  {
    id: 'expert-new-inquiry',
    label: 'Expert business · New inquiry',
    labelEs: 'Expertos · Nueva consulta',
    description: 'Turn a new social or WhatsApp inquiry into an owned next action within two hours.',
    descriptionEs: 'Convierte una nueva consulta de redes o WhatsApp en una próxima acción asignable dentro de dos horas.',
    category: 'EXPERT_BUSINESS',
    status: 'NEW',
    nextAction: 'Send WhatsApp',
    hoursFromNow: 2
  },
  {
    id: 'expert-qualification',
    label: 'Expert business · Qualification',
    labelEs: 'Expertos · Calificación',
    description: 'Move an engaged prospect into qualification and prepare the path to a sales call.',
    descriptionEs: 'Pasa un prospecto con interés a calificación y prepara el camino hacia una llamada comercial.',
    category: 'EXPERT_BUSINESS',
    status: 'CONTACTED',
    nextAction: 'Review application',
    hoursFromNow: 24
  },
  {
    id: 'expert-sales-call',
    label: 'Expert business · Sales call',
    labelEs: 'Expertos · Llamada comercial',
    description: 'Prepare a qualified opportunity before the scheduled sales or strategy call.',
    descriptionEs: 'Prepara una oportunidad calificada antes de la llamada comercial o estratégica.',
    category: 'EXPERT_BUSINESS',
    status: 'MEETING',
    nextAction: 'Prepare sales call',
    hoursFromNow: 24
  },
  {
    id: 'expert-client-onboarding',
    label: 'Expert business · Client onboarding',
    labelEs: 'Expertos · Onboarding de cliente',
    description: 'Start the post-sale journey with a clear onboarding action instead of ending at Closed Won.',
    descriptionEs: 'Inicia el recorrido posterior a la venta con una acción clara de onboarding en lugar de terminar al cerrar la venta.',
    category: 'EXPERT_BUSINESS',
    status: 'CLIENT',
    nextAction: 'Send onboarding',
    hoursFromNow: 24
  },
  {
    id: 'expert-client-checkin',
    label: 'Expert business · Client check-in',
    labelEs: 'Expertos · Seguimiento de cliente',
    description: 'Schedule the next client-success touchpoint so active clients never disappear after onboarding.',
    descriptionEs: 'Programa el próximo punto de contacto para que los clientes activos no desaparezcan después del onboarding.',
    category: 'EXPERT_BUSINESS',
    status: 'CLIENT',
    nextAction: 'Client check-in',
    hoursFromNow: 168
  },
  {
    id: 'expert-renewal',
    label: 'Expert business · Renewal',
    labelEs: 'Expertos · Renovación',
    description: 'Create a renewal conversation before the client reaches the end of the current program.',
    descriptionEs: 'Crea una conversación de renovación antes de que el cliente llegue al final de su programa actual.',
    category: 'EXPERT_BUSINESS',
    status: 'CLIENT',
    nextAction: 'Renewal follow-up',
    hoursFromNow: 168
  }
];

function dateHoursFromNow(hours: number): string {
  const date = new Date();
  date.setHours(date.getHours() + hours);
  return date.toISOString();
}

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
    description: 'Move the lead to Client and start onboarding as the next action.'
  },
  {
    value: 'NOT_INTERESTED',
    label: 'Not interested',
    description: 'Move the lead to Lost and close the current task.'
  }
];

function taskOutcomeLabel(value: TaskOutcome | undefined, language: 'es' | 'en'): string {
  const labels: Record<TaskOutcome, { es: string; en: string }> = {
    COMPLETED: { es: 'Completado', en: 'Completed' },
    NO_ANSWER: { es: 'Sin respuesta', en: 'No answer' },
    INTERESTED: { es: 'Interesado', en: 'Interested' },
    MEETING_BOOKED: { es: 'Reunión agendada', en: 'Meeting booked' },
    PROPOSAL_SENT: { es: 'Propuesta enviada', en: 'Proposal sent' },
    SALE_CLOSED: { es: 'Venta cerrada', en: 'Sale closed' },
    NOT_INTERESTED: { es: 'No interesado', en: 'Not interested' }
  };
  return value ? labels[value][language] : '';
}

function statusLabel(status: LeadStatus, language: 'es' | 'en'): string {
  const labels: Record<LeadStatus, { es: string; en: string }> = {
    PENDING_REVIEW: { es: 'Pendiente de revisión', en: 'Pending review' },
    NEW: { es: 'Nuevo', en: 'New' },
    CONTACTED: { es: 'Contactado', en: 'Contacted' },
    FOLLOW_UP: { es: 'Seguimiento', en: 'Follow-up' },
    MEETING: { es: 'Reunión', en: 'Meeting' },
    CLIENT: { es: 'Cliente', en: 'Client' },
    LOST: { es: 'Perdido', en: 'Lost' }
  };
  return labels[status][language];
}

function nextActionLabel(action: string | undefined, language: 'es' | 'en'): string {
  if (!action) return '';
  const labels: Record<string, { es: string; en: string }> = {
    'Call': { es: 'Llamar', en: 'Call' },
    'Send WhatsApp': { es: 'Enviar WhatsApp', en: 'Send WhatsApp' },
    'Send email': { es: 'Enviar email', en: 'Send email' },
    'Send proposal': { es: 'Enviar propuesta', en: 'Send proposal' },
    'Schedule meeting': { es: 'Agendar reunión', en: 'Schedule meeting' },
    'Confirm meeting': { es: 'Confirmar reunión', en: 'Confirm meeting' },
    'Request information': { es: 'Solicitar información', en: 'Request information' },
    'Review application': { es: 'Revisar aplicación', en: 'Review application' },
    'Prepare sales call': { es: 'Preparar llamada comercial', en: 'Prepare sales call' },
    'Send onboarding': { es: 'Enviar onboarding', en: 'Send onboarding' },
    'Client check-in': { es: 'Seguimiento de cliente', en: 'Client check-in' },
    'Renewal follow-up': { es: 'Seguimiento de renovación', en: 'Renewal follow-up' },
    'Follow up': { es: 'Hacer seguimiento', en: 'Follow up' },
    'Close sale': { es: 'Cerrar venta', en: 'Close sale' }
  };
  return labels[action]?.[language] || action;
}

function priorityLabel(label: 'HIGH' | 'MEDIUM' | 'NORMAL', language: 'es' | 'en'): string {
  if (language === 'en') return label;
  if (label === 'HIGH') return 'ALTA';
  if (label === 'MEDIUM') return 'MEDIA';
  return 'NORMAL';
}

function taskOutcomeDescription(value: TaskOutcome, language: 'es' | 'en'): string {
  const descriptions: Record<TaskOutcome, { es: string; en: string }> = {
    COMPLETED: {
      es: 'Cierra la tarea actual sin crear un próximo paso automático.',
      en: 'Close the current task with no automatic next step.'
    },
    NO_ANSWER: {
      es: 'Crea automáticamente un seguimiento para dentro de 24 horas.',
      en: 'Create Follow up automatically for 24 hours from now.'
    },
    INTERESTED: {
      es: 'Mueve el lead a Contactado y crea Agendar reunión para dentro de 24 horas.',
      en: 'Move to Contacted and create Schedule meeting for 24 hours from now.'
    },
    MEETING_BOOKED: {
      es: 'Mueve el lead a Reunión y crea Confirmar reunión como próxima acción.',
      en: 'Move to Meeting and create Confirm meeting as the next action.'
    },
    PROPOSAL_SENT: {
      es: 'Mueve el lead a Seguimiento y crea una tarea para dentro de 48 horas.',
      en: 'Move to Follow-up and create a follow-up task for 48 hours from now.'
    },
    SALE_CLOSED: {
      es: 'Mueve el lead a Cliente e inicia automáticamente el onboarding como próxima acción.',
      en: 'Move the lead to Client and automatically start onboarding as the next action.'
    },
    NOT_INTERESTED: {
      es: 'Mueve el lead a Perdido y cierra la tarea actual.',
      en: 'Move the lead to Lost and close the current task.'
    }
  };
  return descriptions[value][language];
}

type ClientJourneyStage = 'ONBOARDING' | 'ACTIVE' | 'RENEWAL' | 'ATTENTION';

function getClientJourneyStage(lead: AdminLead): ClientJourneyStage | null {
  if (lead.status !== 'CLIENT') return null;

  const bucket = getFollowUpBucket(lead);
  if (bucket === 'OVERDUE' || !lead.nextAction) return 'ATTENTION';
  if (lead.nextAction === 'Send onboarding') return 'ONBOARDING';
  if (lead.nextAction === 'Renewal follow-up') return 'RENEWAL';
  if (lead.nextAction === 'Client check-in' || lead.nextAction === 'Follow up') {
    return 'ACTIVE';
  }

  return 'ACTIVE';
}

function clientJourneyLabel(stage: ClientJourneyStage, language: 'es' | 'en'): string {
  const labels: Record<ClientJourneyStage, { es: string; en: string }> = {
    ONBOARDING: { es: 'Onboarding', en: 'Onboarding' },
    ACTIVE: { es: 'Cliente activo', en: 'Active client' },
    RENEWAL: { es: 'Renovación', en: 'Renewal' },
    ATTENTION: { es: 'Requiere atención', en: 'Needs attention' }
  };

  return labels[stage][language];
}

type WorkPriority = {
  label: 'HIGH' | 'MEDIUM' | 'NORMAL';
  score: number;
};

function hoursSince(value?: string): number | null {
  if (!value) return null;
  const timestamp = Date.parse(value);
  if (Number.isNaN(timestamp)) return null;
  return Math.max(0, (Date.now() - timestamp) / 3_600_000);
}

function getWorkPriority(lead: AdminLead): WorkPriority {
  if (lead.status === 'LOST') {
    return { label: 'NORMAL', score: 0 };
  }

  const bucket = getFollowUpBucket(lead);
  const activeStage =
    lead.status === 'CONTACTED' ||
    lead.status === 'FOLLOW_UP' ||
    lead.status === 'MEETING' ||
    lead.status === 'CLIENT';

  const followUpTimestamp = lead.followUpAt ? Date.parse(lead.followUpAt) : Number.NaN;
  const hasPastDueAction =
    Boolean(lead.nextAction) &&
    Number.isFinite(followUpTimestamp) &&
    followUpTimestamp < Date.now();

  // Absolute operational rules. These must never be downgraded by ownership,
  // stage changes or score recalculation while the task is still incomplete.
  if (hasPastDueAction || bucket === 'OVERDUE') {
    return { label: 'HIGH', score: 100 };
  }

  if (bucket === 'TODAY') {
    return { label: 'HIGH', score: 90 };
  }

  if (activeStage && !lead.nextAction) {
    return { label: 'HIGH', score: 85 };
  }

  let score = 0;

  if (bucket === 'UPCOMING') score += 15;

  if (!lead.assignedTo) {
    score += 15;
  }

  if (lead.status === 'MEETING') score += 18;
  if (lead.status === 'FOLLOW_UP') score += 14;
  if (lead.status === 'CONTACTED') score += 12;
  if (lead.status === 'CLIENT') score += 8;
  if (lead.status === 'PENDING_REVIEW' || lead.status === 'NEW') {
    score += 10;
  }

  const highProgressActions = new Set([
    'Close sale',
    'Prepare sales call',
    'Send proposal',
    'Schedule meeting',
    'Review application',
    'Renewal follow-up',
    'Confirm meeting',
    'Send onboarding'
  ]);

  if (lead.nextAction) {
    score += highProgressActions.has(lead.nextAction) ? 12 : 6;
  }

  const recentHours = hoursSince(lead.updatedAt || lead.createdAt);
  if (recentHours !== null && recentHours <= 24) {
    score += 8;
  } else if (recentHours !== null && recentHours <= 72) {
    score += 5;
  } else if (recentHours !== null && recentHours <= 168) {
    score += 2;
  }

  const recentOutcome = [...(lead.activityLog || [])]
    .reverse()
    .find((entry) => {
      const age = hoursSince(entry.at);
      return Boolean(entry.result) && age !== null && age <= 168;
    });

  if (recentOutcome?.result === 'MEETING_BOOKED') score += 14;
  if (recentOutcome?.result === 'PROPOSAL_SENT') score += 12;
  if (recentOutcome?.result === 'INTERESTED') score += 10;
  if (recentOutcome?.result === 'NO_ANSWER') score += 4;

  const cappedScore = Math.min(100, score);
  const label =
    cappedScore >= 60 ? 'HIGH' : cappedScore >= 30 ? 'MEDIUM' : 'NORMAL';

  return { label, score: cappedScore };
}

function suggestedNextAction(status: LeadStatus): string | undefined {
  switch (status) {
    case 'PENDING_REVIEW':
    case 'NEW':
      return 'Call';
    case 'CONTACTED':
    case 'FOLLOW_UP':
      return 'Follow up';
    case 'MEETING':
      return 'Confirm meeting';
    default:
      return undefined;
  }
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

function followUpLabel(bucket: FollowUpBucket, language: 'es' | 'en'): string {
  if (bucket === 'OVERDUE') return language === 'es' ? 'Vencido' : 'Overdue';
  if (bucket === 'TODAY') return language === 'es' ? 'Hoy' : 'Today';
  if (bucket === 'UPCOMING') return language === 'es' ? 'Próximo' : 'Upcoming';
  return language === 'es' ? 'Sin programar' : 'Unscheduled';
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  const locale =
    typeof document !== 'undefined' && document.documentElement.lang === 'en'
      ? 'en-US'
      : 'es-CL';
  return new Intl.DateTimeFormat(locale, {
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
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const crmPanelRef = useRef<HTMLElement | null>(null);
  const pipelineSectionRef = useRef<HTMLElement | null>(null);
  const [user, setUser] = useState<User | null>(firebaseAuth.currentUser);
  const [authLoading, setAuthLoading] = useState(true);
  const [leads, setLeads] = useState<AdminLead[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [completingActionId, setCompletingActionId] = useState<string | null>(null);
  const [reschedulingActionId, setReschedulingActionId] = useState<string | null>(null);
  const [rescheduleHours, setRescheduleHours] = useState<number | null>(null);
  const [taskCompletionLead, setTaskCompletionLead] = useState<AdminLead | null>(null);
  const [taskOutcome, setTaskOutcome] = useState<TaskOutcome>('COMPLETED');
  const [taskModalError, setTaskModalError] = useState<string | null>(null);
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
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'NORMAL'>('ALL');
  const [needsActionOnly, setNeedsActionOnly] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [crmPanelOpen, setCrmPanelOpen] = useState(false);
  const [leadDetailOpen, setLeadDetailOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [noteMessage, setNoteMessage] = useState<string | null>(null);
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
          lead.internalNotes,
          (lead.leadNotes || [])
            .map((note) => `${note.title} ${note.body} ${note.author}`)
            .join(' ')
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(needle));

      const matchesNeedsAction =
        !needsActionOnly ||
        (
          !lead.nextAction &&
          (
            lead.status === 'CONTACTED' ||
            lead.status === 'FOLLOW_UP' ||
            lead.status === 'MEETING'
          )
        );

      const matchesPriority =
        priorityFilter === 'ALL' ||
        getWorkPriority(lead).label === priorityFilter;

      return (
        matchesStatus &&
        matchesFollowUp &&
        matchesSearch &&
        matchesNeedsAction &&
        matchesPriority
      );
    });
  }, [
    leads,
    queryText,
    statusFilter,
    followUpFilter,
    priorityFilter,
    needsActionOnly
  ]);

  const selectedLead =
    leads.find((lead) => lead.id === selectedId) ||
    filteredLeads[0] ||
    null;

  useEffect(() => {
    setDraft(makeDraft(selectedLead));
    setSaveMessage(null);
    setLeadEmailStatus('idle');
    setLeadEmailMessage('');
    setNoteTitle('');
    setNoteBody('');
    setNoteMessage(null);
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

    const outcomesToday = {
      noAnswer: 0,
      interested: 0,
      meetings: 0,
      proposals: 0,
      sales: 0
    };

    for (const lead of leads) {
      for (const entry of lead.activityLog || []) {
        if (!entry.result) continue;

        const date = new Date(entry.at);
        if (Number.isNaN(date.getTime())) continue;

        const isToday =
          date.getFullYear() === now.getFullYear() &&
          date.getMonth() === now.getMonth() &&
          date.getDate() === now.getDate();

        if (!isToday) continue;

        if (entry.result === 'NO_ANSWER') outcomesToday.noAnswer += 1;
        if (entry.result === 'INTERESTED') outcomesToday.interested += 1;
        if (entry.result === 'MEETING_BOOKED') outcomesToday.meetings += 1;
        if (entry.result === 'PROPOSAL_SENT') outcomesToday.proposals += 1;
        if (entry.result === 'SALE_CLOSED') outcomesToday.sales += 1;
      }
    }

    const needsActionCount = leads.filter(
      (lead) =>
        !lead.nextAction &&
        (lead.status === 'CONTACTED' ||
          lead.status === 'FOLLOW_UP' ||
          lead.status === 'MEETING')
    ).length;

    const stageCounts = STATUS_OPTIONS.reduce<Record<LeadStatus, number>>(
      (counts, option) => {
        counts[option.value] = leads.filter(
          (lead) => lead.status === option.value
        ).length;
        return counts;
      },
      {
        PENDING_REVIEW: 0,
        NEW: 0,
        CONTACTED: 0,
        FOLLOW_UP: 0,
        MEETING: 0,
        CLIENT: 0,
        LOST: 0
      }
    );

    return {
      total: leads.length,
      overdueCount,
      todayCount,
      upcomingCount,
      clientCount,
      tasksDoneToday,
      outcomesToday,
      needsActionCount,
      stageCounts
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
      if (lead.status === 'LOST') return false;

      const bucket = getFollowUpBucket(lead);
      const isNewLead =
        lead.status === 'PENDING_REVIEW' || lead.status === 'NEW';

      if (isNewLead) {
        return bucket === 'OVERDUE' || bucket === 'TODAY';
      }

      return true;
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

  const visiblePriorityWork = focusMode
    ? priorityWork.slice(0, 1)
    : priorityWork;

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
    setStatusFilter('ALL');
    setFollowUpFilter('ALL');
    setPriorityFilter('ALL');
    setNeedsActionOnly(false);
    setQueryText('');
    setCrmPanelOpen(false);

    window.requestAnimationFrame(() => {
      pipelineSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

      window.requestAnimationFrame(() => {
        document
          .getElementById(`pipeline-lead-${leadId}`)
          ?.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
      });
    });
  };

  const openLeadFullRecord = (lead: AdminLead) => {
    setSelectedId(lead.id);
    setDraft(makeDraft(lead));
    setSaveMessage(null);
    setLeadDetailOpen(true);
  };

  const openTaskCompletion = (lead: AdminLead) => {
    setTaskCompletionLead(lead);
    setTaskOutcome('COMPLETED');
    setRescheduleHours(null);
    setTaskModalError(null);
  };

  const handleRescheduleAction = async () => {
    const lead = taskCompletionLead;
    if (
      !lead ||
      !user ||
      rescheduleHours === null ||
      reschedulingActionId ||
      completingActionId
    ) {
      return;
    }

    setReschedulingActionId(lead.id);
    setError(null);
    setTaskModalError(null);
    setSaveMessage(null);

    try {
      const completion = await rescheduleLeadAction(
        lead,
        user.displayName || user.email || 'Admin',
        rescheduleHours
      );

      setLeads((current) =>
        current.map((record) =>
          record.id === lead.id
            ? {
                ...record,
                nextAction: completion.nextAction,
                followUpAt: completion.followUpAt,
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
          nextAction: completion.nextAction,
          followUpAt: completion.followUpAt
        }));
      }

      setSaveMessage(
        `${lead.name} rescheduled for ${formatDate(completion.followUpAt)}.`
      );
      setTaskCompletionLead(null); setRescheduleHours(null);
    } catch (err: any) {
      const message = err?.message || 'No se pudo reprogramar la acción.';
      setTaskModalError(message);
      setError(message);
    } finally {
      setReschedulingActionId(null);
    }
  };

  const handleCompleteAction = async () => {
    const lead = taskCompletionLead;
    if (!lead || !user || completingActionId) return;

    setCompletingActionId(lead.id);
    setError(null);
    setTaskModalError(null);
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
        `${taskOutcomeLabel(taskOutcome, language)} recorded for ${lead.name}.${nextStep}`
      );
      setTaskCompletionLead(null); setRescheduleHours(null);
      setTaskOutcome('COMPLETED');
      setRescheduleHours(null);
    } catch (err: any) {
      const message = err?.message || 'No se pudo completar la acción.';
      setTaskModalError(message);
      setError(message);
    } finally {
      setCompletingActionId(null);
    }
  };

  const filterPipelineByStage = (status: LeadStatus) => {
    setNeedsActionOnly(false);
    setPriorityFilter('ALL');
    setStatusFilter(status);

    window.requestAnimationFrame(() => {
      pipelineSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  };

  const showNeedsAction = () => {
    setStatusFilter('ALL');
    setFollowUpFilter('ALL');
    setPriorityFilter('ALL');
    setNeedsActionOnly(true);

    window.requestAnimationFrame(() => {
      pipelineSectionRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  };

  const applyQuickPlaybook = (playbookId: string) => {
    const playbook = QUICK_PLAYBOOKS.find((item) => item.id === playbookId);
    if (!playbook) return;

    setDraft((current) => ({
      ...current,
      status: playbook.status,
      nextAction: playbook.nextAction,
      followUpAt: dateHoursFromNow(playbook.hoursFromNow)
    }));

    setSaveMessage(
      tr(
        `Playbook "${playbook.labelEs}" cargado. Revisa los campos y guarda los cambios CRM.`,
        `Playbook "${playbook.label}" loaded. Review the fields and save CRM changes.`
      )
    );
  };

  const handleAddLeadNote = async () => {
    if (!selectedLead || !user || savingNote) return;

    const title = noteTitle.trim();
    const body = noteBody.trim();

    if (!title || !body) {
      setNoteMessage(
        tr(
          'Agrega un nombre y contenido antes de guardar la nota.',
          'Add a title and content before saving the note.'
        )
      );
      return;
    }

    setSavingNote(true);
    setError(null);
    setNoteMessage(null);

    try {
      const note = await addLeadNote(
        selectedLead,
        title,
        body,
        user.displayName || user.email || 'Admin'
      );

      setLeads((current) =>
        current.map((lead) =>
          lead.id === selectedLead.id
            ? {
                ...lead,
                leadNotes: [...(lead.leadNotes || []), note].slice(-50),
                updatedAt: new Date().toISOString()
              }
            : lead
        )
      );

      setNoteTitle('');
      setNoteBody('');
      setNoteMessage(
        tr('Nota agregada al historial.', 'Note added to history.')
      );
    } catch (err: any) {
      const message = err?.message || tr('No se pudo guardar la nota.', 'Could not save the note.');
      setNoteMessage(message);
      setError(message);
    } finally {
      setSavingNote(false);
    }
  };

  const prepareClientJourney = (playbookId: string) => {
    applyQuickPlaybook(playbookId);
    setLeadDetailOpen(false);
    setCrmPanelOpen(true);
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
        <section className="w-full max-w-lg border border-[#0A0A0A]/15 bg-white rounded-3xl p-8 sm:p-10">
          <div className="flex items-center justify-between mb-10">
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center text-xs font-mono-code uppercase tracking-wider text-[#6B6B6B] hover:text-[#0A0A0A]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              {tr('Volver al sitio', 'Back to site')}
            </button>
            <div className="flex items-center gap-2">
              <LanguageSelector compact />
              <span className="font-mono-code text-[10px] border border-[#E5E5E5] px-2 py-1 text-[#6B6B6B]">
                {tr('INTERNO', 'INTERNAL')}
              </span>
            </div>
          </div>

          <ShieldCheck className="w-8 h-8 mb-5" />
          <p className="font-mono-code text-[11px] uppercase tracking-[0.22em] text-[#0A3F4D] font-semibold mb-2">
            {tr('OPERACIONES PRIVADAS', 'PRIVATE OPERATIONS')}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight mb-3">
            G-KAIS Admin
          </h1>
          <p className="text-sm text-[#6B6B6B] leading-relaxed mb-8">
            {tr('Acceso interno para revisar y gestionar oportunidades registradas en Firestore.', 'Internal access to review and manage opportunities registered in Firestore.')}
          </p>

          {error && (
            <div className="mb-5 border border-red-200 bg-red-50 rounded-xl text-red-800 p-3 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-[#0A0A0A] text-white rounded-xl px-5 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
          >
            {tr('Ingresar con Google', 'Sign in with Google')}
          </button>

          <p className="mt-4 text-[10px] leading-relaxed font-mono-code text-[#8A8A8A]">
            {tr('Acceso interno protegido por Firebase Authentication y reglas de seguridad de administrador.', 'Internal access protected by Firebase Authentication and administrator security rules.')}
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#F7F7F5] text-[#0A0A0A]">
      <header className="border-b border-[#E5E5E5] bg-white">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-4 flex flex-wrap items-center justify-between gap-4">
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
                {tr('CRM // INTERNO', 'CRM // INTERNAL')}
              </span>
            </div>
            <p className="text-xs text-[#6B6B6B] mt-1">{tr('Espacio de operaciones comerciales', 'Lead operations workspace')}</p>
          </div>

          <div className="flex items-center gap-3">
            <LanguageSelector compact />
            <button
              type="button"
              onClick={() => setAlertsOpen((current) => !current)}
              className="relative inline-flex items-center border border-[#E5E5E5] bg-white rounded-xl px-3 py-2 text-xs hover:bg-[#F7F7F5]"
              aria-label="Open alerts"
            >
              <Bell className="w-3.5 h-3.5 mr-2" />
              {tr('Alertas', 'Alerts')}
              {unreadAlerts.length > 0 && (
                <span className="ml-2 min-w-5 h-5 px-1 inline-flex items-center justify-center bg-[#0A0A0A] text-white font-mono-code text-[9px]">
                  {unreadAlerts.length > 99 ? '99+' : unreadAlerts.length}
                </span>
              )}
            </button>
            <div className="hidden md:block text-right">
              <p className="text-xs font-semibold">{user.displayName || user.email}</p>
              <p className="font-mono-code text-[9px] text-[#6B6B6B]">{tr('Administrador autenticado', 'Authenticated administrator')}</p>
            </div>
            <button
              type="button"
              onClick={onExitAdmin}
              className="inline-flex items-center border border-[#E5E5E5] bg-white rounded-xl px-3 py-2 text-xs hover:bg-[#F7F7F5]"
            >
              <ArrowLeft className="w-3.5 h-3.5 mr-2" />
              {tr('Volver al sitio', 'Back to site')}
            </button>
            <button
              type="button"
              onClick={() => signOut(firebaseAuth)}
              className="inline-flex items-center border border-[#E5E5E5] bg-white rounded-xl px-3 py-2 text-xs hover:bg-[#F7F7F5]"
            >
              <LogOut className="w-3.5 h-3.5 mr-2" />
              {tr('Cerrar sesión', 'Sign out')}
            </button>
          </div>
        </div>
      </header>

      {alertsOpen && (
        <div className="fixed inset-0 z-50 bg-black/20 flex justify-end" onClick={() => setAlertsOpen(false)}>
          <aside
            className="w-full max-w-md h-full bg-white border-l border-[#E5E5E5] shadow-xl flex flex-col rounded-l-3xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                  {tr('Centro de alertas', 'Alert Center')}
                </p>
                <h2 className="text-2xl font-extrabold tracking-tight mt-1">{tr('Alertas operativas', 'Operational alerts')}</h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {unreadAlerts.length} {tr('sin leer', 'unread')} · {adminAlerts.length} {tr('activas', 'active')}
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
                {tr('Marcar todo leído', 'Mark all read')}
              </button>
              <button
                type="button"
                onClick={enableBrowserAlerts}
                className="px-3 py-2 border border-[#0A0A0A] text-[10px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
              >
                {tr('Activar alertas del navegador', 'Enable browser alerts')}
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
                {tr('Las notificaciones del navegador están bloqueadas en este entorno. El Centro de alertas interno sigue funcionando.', 'Browser notifications are blocked in this environment. The in-app Alert Center still works.')}
              </div>
            )}

            {browserAlertStatus === 'unsupported' && (
              <div className="mx-4 mt-4 border border-[#E5E5E5] bg-[#FAFAFA] p-3 text-[10px] text-[#6B6B6B]">
                {tr('Las notificaciones nativas del navegador no están disponibles aquí. El Centro de alertas interno sigue funcionando.', 'Native browser notifications are not supported here. The in-app Alert Center still works.')}
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
                    {tr('No hay seguimientos vencidos, para hoy ni nuevos leads pendientes.', 'There are no overdue, due-today or new lead alerts.')}
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
            if (!completingActionId && !reschedulingActionId) setTaskCompletionLead(null); setRescheduleHours(null);
          }}
        >
          <section
            className="w-full max-w-lg bg-white border border-[#D8D8D8] rounded-3xl shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="p-5 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] uppercase tracking-wider text-[#0A3F4D]">
                  {tr('Motor de Tareas', 'Task Engine')}
                </p>
                <h2 className="text-xl font-extrabold tracking-tight mt-1">
                  {tr('Completar tarea', 'Complete task')}
                </h2>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {taskCompletionLead.name} · {taskCompletionLead.nextAction || 'Current action'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTaskCompletionLead(null); setRescheduleHours(null);
                  setTaskModalError(null);
                }}
                disabled={Boolean(completingActionId || reschedulingActionId)}
                className="p-2 border border-[#E5E5E5] hover:bg-[#F7F7F5] disabled:opacity-50"
                aria-label="Close task result"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              <label className="block">
                <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                  {tr('Resultado', 'Result')}
                </span>
                <select
                  value={taskOutcome}
                  onChange={(event) =>
                    setTaskOutcome(event.target.value as TaskOutcome)
                  }
                  className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-3 text-sm focus:outline-none focus:border-[#0A3F4D]"
                >
                  {TASK_OUTCOME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {taskOutcomeLabel(option.value, language)}
                    </option>
                  ))}
                </select>
              </label>

              <div className="mt-4 border border-[#E5E5E5] bg-[#FAFAFA] p-4">
                <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B]">
                  {tr('Próximo paso automático', 'Automatic next step')}
                </p>
                <p className="text-sm mt-2 leading-relaxed">
                  {taskOutcomeDescription(taskOutcome, language)}
                </p>
              </div>

              <div className="mt-4">
                <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">
                  {tr('Reprogramar en su lugar', 'Reschedule instead')}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    [tr('+2 HORAS', '+2 HOURS'), 2],
                    [tr('MAÑANA', 'TOMORROW'), 24],
                    [tr('+2 DÍAS', '+2 DAYS'), 48]
                  ].map(([label, hours]) => {
                    const value = Number(hours);
                    const selected = rescheduleHours === value;

                    return (
                      <button
                        key={String(label)}
                        type="button"
                        onClick={() => setRescheduleHours(value)}
                        disabled={Boolean(completingActionId || reschedulingActionId)}
                        className={`border px-2 py-2.5 text-[9px] font-mono-code uppercase tracking-wider disabled:opacity-50 ${
                          selected
                            ? 'border-[#0A3F4D] bg-[#0A3F4D] text-white'
                            : 'border-[#D8D8D8] bg-white hover:border-[#0A3F4D] hover:text-[#0A3F4D]'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={handleRescheduleAction}
                  disabled={
                    rescheduleHours === null ||
                    Boolean(completingActionId || reschedulingActionId)
                  }
                  className="mt-2 w-full inline-flex items-center justify-center border border-[#0A3F4D] text-[#0A3F4D] bg-white rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-40"
                >
                  {reschedulingActionId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  {reschedulingActionId ? 'Rescheduling' : 'Reschedule task'}
                </button>
              </div>

              {taskModalError && (
                <div className="mt-4 border border-red-200 bg-red-50 rounded-xl p-3 text-xs text-red-800">
                  {taskModalError}
                </div>
              )}

              <div className="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setTaskCompletionLead(null)}
                  disabled={Boolean(completingActionId || reschedulingActionId)}
                  className="flex-1 border border-[#D8D8D8] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50"
                >
                  {tr('Cancelar', 'Cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCompleteAction}
                  disabled={Boolean(completingActionId || reschedulingActionId)}
                  className="flex-1 inline-flex items-center justify-center bg-[#0A0A0A] text-white rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] disabled:opacity-50"
                >
                  {completingActionId ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                  )}
                  {completingActionId ? tr('Guardando', 'Saving') : tr('Aplicar resultado', 'Apply result')}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
          <div>
            <p className="font-mono-code text-[10px] uppercase tracking-[0.2em] text-[#0A3F4D] font-bold mb-2">
              LIVE FIRESTORE CRM
            </p>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
              {tr('Pipeline de oportunidades', 'Opportunities pipeline')}
            </h1>
          </div>

          <button
            type="button"
            onClick={loadLeads}
            disabled={dataLoading}
            className="inline-flex items-center justify-center border border-[#0A0A0A] rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider bg-white hover:bg-[#F0F0EE] disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-2 ${dataLoading ? 'animate-spin' : ''}`} />
            {tr('Actualizar', 'Refresh')}
          </button>
        </div>

        {error && (
          <div className="mb-6 border border-red-200 bg-red-50 rounded-xl text-red-800 p-3 text-xs flex items-start gap-2">
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

        <section className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden mb-6">
          {[
            [tr('TOTAL', 'TOTAL'), metrics.total],
            [tr('VENCIDOS', 'OVERDUE'), metrics.overdueCount],
            [tr('HOY', 'TODAY'), metrics.todayCount],
            [tr('PRÓXIMOS', 'UPCOMING'), metrics.upcomingCount],
            [tr('TAREAS HECHAS', 'TASKS DONE'), metrics.tasksDoneToday],
            [tr('CLIENTES', 'CLIENTS'), metrics.clientCount]
          ].map(([label, value]) => (
            <div key={String(label)} className="p-5 border-r border-b md:border-b-0 border-[#E5E5E5] last:border-r-0">
              <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">{label}</p>
              <p className="text-3xl font-extrabold">{value}</p>
            </div>
          ))}
        </section>

        <section className="border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden mb-6">
          <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                Today&apos;s Results
              </p>
              <p className="text-xs text-[#6B6B6B] mt-1">
                Outcome signals recorded by the Task Engine today.
              </p>
            </div>
            <button
              type="button"
              onClick={showNeedsAction}
              disabled={metrics.needsActionCount === 0}
              className="font-mono-code text-[10px] text-[#0A3F4D] underline disabled:no-underline disabled:text-[#A0A0A0]"
            >
              {metrics.needsActionCount} need next action
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5">
            {[
              ['NO ANSWER', metrics.outcomesToday.noAnswer],
              ['INTERESTED', metrics.outcomesToday.interested],
              ['MEETINGS', metrics.outcomesToday.meetings],
              ['PROPOSALS', metrics.outcomesToday.proposals],
              ['SALES CLOSED', metrics.outcomesToday.sales]
            ].map(([label, value]) => (
              <div
                key={String(label)}
                className="px-4 sm:px-5 py-4 border-r border-b md:border-b-0 border-[#E5E5E5] last:border-r-0"
              >
                <p className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                  {label}
                </p>
                <p className="text-xl font-extrabold mt-1">{value}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden mb-6">
          <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                Pipeline by Stage
              </p>
              <p className="text-xs text-[#6B6B6B] mt-1">
                See where opportunities are accumulating and jump directly to that stage.
              </p>
            </div>
            {statusFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('ALL');
                  setNeedsActionOnly(false);
                }}
                className="font-mono-code text-[9px] uppercase tracking-wider underline text-[#6B6B6B] hover:text-[#0A0A0A]"
              >
                {tr('Limpiar filtro de etapa', 'Clear stage filter')}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[820px]">
              {STATUS_OPTIONS.map((option) => {
                const active = statusFilter === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => filterPipelineByStage(option.value)}
                    className={`px-4 py-4 text-left border-r last:border-r-0 border-[#E5E5E5] transition-colors ${
                      active ? 'bg-[#0A0A0A] text-white' : 'bg-white hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <p
                      className={`font-mono-code text-[8px] uppercase tracking-wider ${
                        active ? 'text-white/60' : 'text-[#777]'
                      }`}
                    >
                      {statusLabel(option.value, language)}
                    </p>
                    <p className="text-2xl font-extrabold mt-1">
                      {metrics.stageCounts[option.value]}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-2 gap-6 mb-6">
          <div className="border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                  {tr('Nuevos Leads', 'New Leads')}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {tr('Bandeja de entrada para oportunidades nuevas y sin revisar.', 'Inbox for new and unreviewed opportunities.')}
                </p>
              </div>
              <span className="font-mono-code text-[10px] text-[#6B6B6B]">
                {newLeadInbox.length} {tr('visibles', 'visible')}
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
                          {tr('NUEVO LEAD', 'NEW LEAD')}
                        </span>
                        <span className="font-bold text-sm truncate">{lead.name}</span>
                        {lead.company && (
                          <span className="text-xs text-[#6B6B6B] truncate">
                            {lead.company}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                        <span>{tr('Revisar y clasificar en CRM', 'Review and classify in CRM')}</span>
                        <span className="font-mono-code">{formatDate(lead.createdAt)}</span>
                      </div>
                    </div>
                    <span className="shrink-0 inline-flex items-center gap-1.5 font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D]">
                      {tr('Ir al CRM', 'Go to CRM')}
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-[#0A3F4D]" />
                <p className="text-sm font-semibold">{tr('Bandeja al día', 'Inbox clear')}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">{tr('No hay nuevos leads esperando revisión.', 'No new leads waiting for review.')}</p>
              </div>
            )}
          </div>

          <div className="border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden">
            <div className="px-4 sm:px-5 py-4 border-b border-[#E5E5E5] flex items-start justify-between gap-4">
              <div>
                <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                  {tr('Trabajo Prioritario', 'Priority Work')}
                </p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {focusMode
                    ? tr(
                        'Una tarea a la vez. Completa o reprograma para avanzar a la siguiente.',
                        'One task at a time. Complete or reschedule it to advance to the next.'
                      )
                    : tr(
                        'Ordenado por urgencia operativa y próxima acción.',
                        'Ordered by operational urgency and next action.'
                      )}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono-code text-[10px] text-[#6B6B6B]">
                  {focusMode
                    ? `${Math.min(priorityWork.length, 1)} of ${priorityWork.length}`
                    : `${priorityWork.length} visible`}
                </span>
                <button
                  type="button"
                  onClick={() => setFocusMode((current) => !current)}
                  className={`border px-2.5 py-1.5 text-[9px] font-mono-code uppercase tracking-wider transition-colors ${
                    focusMode
                      ? 'border-[#0A3F4D] bg-[#0A3F4D] text-white'
                      : 'border-[#D8D8D8] bg-white text-[#6B6B6B] hover:text-[#0A0A0A]'
                  }`}
                >
                  {focusMode ? 'Focus on' : 'Focus mode'}
                </button>
              </div>
            </div>

            {priorityWork.length > 0 ? (
              <div className="divide-y divide-[#E5E5E5]">
                {visiblePriorityWork.map((lead) => {
                  const bucket = getFollowUpBucket(lead);
                  const opportunityScore = getWorkPriority(lead);
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
                          onClick={() => openLeadFullRecord(lead)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className={`font-mono-code text-[9px] px-2 py-1 border ${queueClass}`}>
                              {queueLabel}
                            </span>
                            <span
                              className={`font-mono-code text-[8px] px-2 py-1 border ${
                                opportunityScore.label === 'HIGH'
                                  ? 'border-red-200 text-red-700'
                                  : opportunityScore.label === 'MEDIUM'
                                  ? 'border-amber-200 text-amber-800'
                                  : 'border-[#E5E5E5] text-[#777]'
                              }`}
                            >
                              {priorityLabel(opportunityScore.label, language)}
                            </span>
                            <span className="font-bold text-sm truncate">{lead.name}</span>
                            {lead.company && (
                              <span className="text-xs text-[#6B6B6B] truncate">
                                {lead.company}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B6B6B]">
                            <span>{lead.nextAction ? nextActionLabel(lead.nextAction, language) : tr('Define la próxima acción en CRM', 'Set the next action in CRM')}</span>
                            {lead.followUpAt && (
                              <span className="font-mono-code">{formatDate(lead.followUpAt)}</span>
                            )}
                            <span>{tr('Responsable', 'Owner')}: {lead.assignedTo || tr('Sin asignar', 'Unassigned')}</span>
                            <span className="font-mono-code text-[9px] text-[#0A3F4D]">
                              {tr('Abrir ficha completa', 'Open full record')} →
                            </span>
                          </div>

                        </button>

                        <button
                          type="button"
                          onClick={() => openTaskCompletion(lead)}
                          disabled={completingActionId === lead.id}
                          className="shrink-0 inline-flex items-center border border-[#0A3F4D] rounded-xl px-2.5 py-2 text-[9px] font-mono-code uppercase tracking-wider text-[#0A3F4D] bg-white hover:bg-[#F7F7F5] disabled:opacity-50"
                          title="Complete current action"
                        >
                          {completingActionId === lead.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                          )}
                          {completingActionId === lead.id ? tr('Guardando', 'Saving') : tr('Completar', 'Complete')}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-5 py-8 text-center">
                <CheckCircle2 className="w-5 h-5 mx-auto mb-2 text-[#0A3F4D]" />
                <p className="text-sm font-semibold">{tr('Trabajo prioritario al día', 'Priority work clear')}</p>
                <p className="text-xs text-[#6B6B6B] mt-1">
                  {tr('No hay leads clasificados con tareas activas o seguimientos programados.', 'No classified leads have an active task or scheduled follow-up.')}
                </p>
              </div>
            )}
          </div>
        </section>

        <section
          ref={pipelineSectionRef}
          className="border border-[#E5E5E5] bg-white rounded-2xl overflow-hidden scroll-mt-6"
        >
          <div className="p-4 border-b border-[#E5E5E5] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
            <div>
              <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">Lead pipeline</p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-[#6B6B6B]">{filteredLeads.length} records visible</p>
                {needsActionOnly && (
                  <button
                    type="button"
                    onClick={() => setNeedsActionOnly(false)}
                    className="font-mono-code text-[8px] uppercase tracking-wider border border-amber-300 bg-amber-50 text-amber-800 px-2 py-1"
                  >
                    Needs action ×
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setNeedsActionOnly(false);
                  setStatusFilter(event.target.value as 'ALL' | LeadStatus);
                }}
                className="border border-[#E5E5E5] bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              >
                <option value="ALL">{tr('Todos los estados', 'All statuses')}</option>
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {statusLabel(option.value, language)}
                  </option>
                ))}
              </select>

              <select
                value={followUpFilter}
                onChange={(event) => {
                  setNeedsActionOnly(false);
                  setFollowUpFilter(event.target.value as 'ALL' | FollowUpBucket);
                }}
                className="border border-[#E5E5E5] bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              >
                <option value="ALL">{tr('Todos los seguimientos', 'All follow-ups')}</option>
                <option value="OVERDUE">{tr('Vencidos', 'Overdue')}</option>
                <option value="TODAY">{tr('Hoy', 'Today')}</option>
                <option value="UPCOMING">{tr('Próximos', 'Upcoming')}</option>
                <option value="UNSCHEDULED">{tr('Sin programar', 'Unscheduled')}</option>
              </select>

              <select
                value={priorityFilter}
                onChange={(event) => {
                  setNeedsActionOnly(false);
                  setPriorityFilter(
                    event.target.value as 'ALL' | 'HIGH' | 'MEDIUM' | 'NORMAL'
                  );
                }}
                className="border border-[#E5E5E5] bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              >
                <option value="ALL">{tr('Todas las prioridades', 'All priorities')}</option>
                <option value="HIGH">{tr('Prioridad alta', 'High priority')}</option>
                <option value="MEDIUM">{tr('Prioridad media', 'Medium priority')}</option>
                <option value="NORMAL">{tr('Prioridad normal', 'Normal priority')}</option>
              </select>

              <input
                value={queryText}
                onChange={(event) => setQueryText(event.target.value)}
                placeholder={tr('Buscar nombre, empresa, responsable, acción...', 'Search name, company, owner, action...')}
                className="w-full sm:w-80 border border-[#E5E5E5] bg-[#FAFAFA] rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-[#0A3F4D]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-12 min-h-[640px] xl:h-[760px]">
            <div className={`${crmPanelOpen ? 'xl:col-span-8 xl:border-r' : 'xl:col-span-12'} overflow-auto border-b xl:border-b-0 border-[#E5E5E5]`}>
              <table className="w-full min-w-[1180px] text-left text-xs">
                <thead className="sticky top-0 z-10 bg-[#FAFAFA] border-b border-[#E5E5E5] font-mono-code text-[10px] uppercase text-[#6B6B6B] shadow-[0_1px_0_rgba(0,0,0,0.06)]">
                  <tr>
                    <th className="px-4 py-3">Lead</th>
                    <th className="px-3 py-3">{tr('Origen', 'Source')}</th>
                    <th className="px-3 py-3">{tr('Estado', 'Status')}</th>
                    <th className="px-3 py-3">{tr('Prioridad', 'Priority')}</th>
                    <th className="px-3 py-3">{tr('Responsable', 'Owner')}</th>
                    <th className="px-3 py-3">{tr('Próxima acción', 'Next action')}</th>
                    <th className="px-3 py-3">{tr('Seguimiento', 'Follow-up')}</th>
                    <th className="px-4 py-3 text-right">{tr('Creado', 'Created')}</th>
                    <th className="px-4 py-3 text-right">{tr('Acciones', 'Actions')}</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[#E5E5E5]">
                  {dataLoading && leads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center">
                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                      </td>
                    </tr>
                  ) : filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-16 text-center text-[#6B6B6B]">
                        No records found.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((lead) => (
                      <tr
                        key={lead.id}
                        id={`pipeline-lead-${lead.id}`}
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
                          {statusLabel(lead.status, language)}
                        </td>
                        <td className="px-3 py-4">
                          <span
                            className={`font-mono-code text-[8px] px-2 py-1 border ${
                              getWorkPriority(lead).label === 'HIGH'
                                ? 'border-red-200 text-red-700 bg-red-50'
                                : getWorkPriority(lead).label === 'MEDIUM'
                                ? 'border-amber-200 text-amber-800 bg-amber-50'
                                : 'border-[#E5E5E5] text-[#777] bg-white'
                            }`}
                          >
                            {priorityLabel(getWorkPriority(lead).label, language)}
                          </span>
                        </td>
                        <td className="px-3 py-4">{lead.assignedTo || '—'}</td>
                        <td className="px-3 py-4 max-w-[220px] truncate">
                          {lead.nextAction ? nextActionLabel(lead.nextAction, language) : '—'}
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
                            {followUpLabel(getFollowUpBucket(lead), language)}
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
                        <td className="px-4 py-4">
                          {selectedLead?.id === lead.id ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setCrmPanelOpen(true);
                                }}
                                className="inline-flex items-center justify-center rounded-lg border border-[#D8D8D8] bg-white px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
                              >
                                {tr('Editar CRM', 'Edit CRM')}
                              </button>
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  openLeadFullRecord(lead);
                                }}
                                className="inline-flex items-center justify-center rounded-lg bg-[#0A0A0A] px-2.5 py-2 text-[9px] font-semibold uppercase tracking-wider text-white hover:bg-[#0A3F4D]"
                              >
                                {tr('Ficha completa', 'Full record')}
                              </button>
                            </div>
                          ) : (
                            <span className="block text-right text-[#B0B0B0]">—</span>
                          )}
                        </td>
                      </tr>

                    ))
                  )}
                </tbody>
              </table>
            </div>

            {crmPanelOpen && (
            <aside
              ref={crmPanelRef}
              className="xl:col-span-4 bg-[#FAFAFA] p-5 sm:p-6 scroll-mt-6 xl:overflow-y-auto xl:h-full"
            >
              {selectedLead ? (
                <div>
                  <div className="flex items-center justify-between pb-4 mb-5 border-b border-[#E5E5E5] gap-4">
                    <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                      {tr('REGISTRO CRM', 'CRM RECORD')} // {selectedLead.source}
                    </span>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-mono-code text-[8px] px-2 py-1 border ${
                          getWorkPriority(selectedLead).label === 'HIGH'
                            ? 'border-red-200 text-red-700'
                            : getWorkPriority(selectedLead).label === 'MEDIUM'
                            ? 'border-amber-200 text-amber-800'
                            : 'border-[#E5E5E5] text-[#777]'
                        }`}
                      >
                        {priorityLabel(getWorkPriority(selectedLead).label, language)} {tr('PRIORIDAD', 'PRIORITY')}
                      </span>
                      <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                        {selectedLead.id}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCrmPanelOpen(false)}
                        className="p-1.5 rounded-lg border border-[#E5E5E5] bg-white hover:bg-[#F7F7F5]"
                        aria-label={tr('Ocultar registro CRM', 'Hide CRM record')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
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
                      {tr('Abrir sitio web', 'Open website')} <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  )}

                  <div className="mt-6 border border-[#E5E5E5] bg-white rounded-2xl p-4">
                    <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] font-bold mb-2">
                      {tr('Contexto de ingreso', 'Intake context')}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {selectedLead.inquiryNotes || selectedLead.message || 'No additional notes.'}
                    </p>
                  </div>

                  <div className="mt-6 border-t border-[#D8D8D8] pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <p className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                          {tr('Controles CRM', 'CRM controls')}
                        </p>
                        <p className="text-[10px] text-[#777] mt-1">
                          Authenticated internal workspace
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="border border-[#D8D8D8] bg-white rounded-2xl p-3">
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div>
                            <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B]">
                              {tr('Playbooks rápidos', 'Quick playbooks')}
                            </p>
                            <p className="text-[10px] text-[#777] mt-1">
                              {tr(
                                'Carga un recorrido operativo probado y revísalo antes de guardar.',
                                'Load a proven operating path, then review before saving.'
                              )}
                            </p>
                          </div>
                        </div>
                        <select
                          defaultValue=""
                          onChange={(event) => {
                            if (event.target.value) {
                              applyQuickPlaybook(event.target.value);
                              event.currentTarget.value = '';
                            }
                          }}
                          className="w-full border border-[#D8D8D8] bg-[#FAFAFA] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        >
                          <option value="">{tr('Elige un playbook…', 'Choose a playbook…')}</option>
                          <optgroup label={tr('Operación comercial', 'Core sales operations')}>
                            {QUICK_PLAYBOOKS.filter((playbook) => playbook.category === 'CORE').map((playbook) => (
                              <option key={playbook.id} value={playbook.id}>
                                {language === 'es' ? playbook.labelEs : playbook.label}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label={tr('Expert Businesses', 'Expert Businesses')}>
                            {QUICK_PLAYBOOKS.filter((playbook) => playbook.category === 'EXPERT_BUSINESS').map((playbook) => (
                              <option key={playbook.id} value={playbook.id}>
                                {language === 'es' ? playbook.labelEs : playbook.label}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <div className="mt-3 border-t border-[#E5E5E5] pt-3">
                          <p className="font-mono-code text-[8px] uppercase tracking-wider text-[#0A3F4D] mb-2">
                            {tr('Nuevo · Expert Businesses', 'New · Expert Businesses')}
                          </p>
                          <div className="space-y-2">
                            {QUICK_PLAYBOOKS.filter((playbook) => playbook.category === 'EXPERT_BUSINESS')
                              .slice(0, 4)
                              .map((playbook) => (
                                <p key={playbook.id} className="text-[9px] leading-relaxed text-[#777]">
                                  <span className="font-semibold text-[#0A0A0A]">
                                    {language === 'es' ? playbook.labelEs : playbook.label}:
                                  </span>{' '}
                                  {language === 'es' ? playbook.descriptionEs : playbook.description}
                                </p>
                              ))}
                          </div>
                          <p className="mt-2 text-[9px] text-[#8A8A8A]">
                            {tr(
                              'Pensados para coaches, mentores, consultores, agencias, comunidades y ofertas high-ticket.',
                              'Designed for coaches, mentors, consultants, agencies, communities and high-ticket offers.'
                            )}
                          </p>
                        </div>
                      </div>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          {tr('Estado', 'Status')}
                        </span>
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              status: event.target.value as LeadStatus
                            }))
                          }
                          className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        >
                          {STATUS_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {statusLabel(option.value, language)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          {tr('Responsable', 'Responsible')}
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
                          placeholder={tr('ej. Ismael', 'e.g. Ismael')}
                          className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          {tr('Próxima acción', 'Next action')}
                        </span>
                        <select
                          value={draft.nextAction || ''}
                          onChange={(event) =>
                            setDraft((current) => ({
                              ...current,
                              nextAction: event.target.value
                            }))
                          }
                          className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        >
                          <option value="">{tr('Selecciona próxima acción', 'Select next action')}</option>
                          {draft.nextAction &&
                            !NEXT_ACTION_OPTIONS.includes(
                              draft.nextAction as (typeof NEXT_ACTION_OPTIONS)[number]
                            ) && (
                              <option value={draft.nextAction}>
                                {tr('Existente', 'Existing')}: {draft.nextAction}
                              </option>
                            )}
                          {NEXT_ACTION_OPTIONS.map((action) => (
                            <option key={action} value={action}>
                              {nextActionLabel(action, language)}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[10px] text-[#777]">
                          {tr('Usa Notas internas para detalles, contexto o instrucciones.', 'Use Internal notes for details, context or instructions.')}
                        </p>
                        {suggestedNextAction(draft.status) &&
                          draft.nextAction !== suggestedNextAction(draft.status) && (
                            <button
                              type="button"
                              onClick={() =>
                                setDraft((current) => ({
                                  ...current,
                                  nextAction:
                                    suggestedNextAction(current.status) ||
                                    current.nextAction
                                }))
                              }
                              className="mt-2 inline-flex items-center border border-[#0A3F4D]/30 bg-white px-2.5 py-1.5 text-[9px] font-mono-code uppercase tracking-wider text-[#0A3F4D] hover:bg-[#F7F7F5]"
                            >
                              {tr('Usar sugerencia', 'Use suggestion')} · {nextActionLabel(suggestedNextAction(draft.status), language)}
                            </button>
                          )}
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          {tr('Fecha de seguimiento', 'Follow-up date')}
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
                          className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <label className="block">
                        <span className="font-mono-code text-[9px] uppercase text-[#6B6B6B] block mb-1.5">
                          {tr('Notas internas', 'Internal notes')}
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
                          placeholder={tr('Contexto comercial privado, objeciones, próximos pasos...', 'Private commercial context, objections, next steps...')}
                          className="w-full border border-[#D8D8D8] bg-white rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-y focus:outline-none focus:border-[#0A3F4D]"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full inline-flex items-center justify-center bg-[#0A0A0A] text-white rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] disabled:opacity-50 transition-colors"
                      >
                        {saving ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        {tr('Guardar cambios CRM', 'Save CRM changes')}
                      </button>

                      <button
                        type="button"
                        onClick={sendSelectedLeadEmail}
                        disabled={leadEmailStatus === 'sending'}
                        className="w-full inline-flex items-center justify-center border border-[#0A3F4D] text-[#0A3F4D] bg-white rounded-xl px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#F7F7F5] disabled:opacity-50 transition-colors"
                      >
                        {leadEmailStatus === 'sending' ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Mail className="w-4 h-4 mr-2" />
                        )}
                        {leadEmailStatus === 'sending' ? tr('Enviando alerta…', 'Sending alert…') : tr('Enviar alerta por email', 'Send email alert')}
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
                    <button
                      type="button"
                      onClick={() => setLeadDetailOpen(true)}
                      className="w-full inline-flex items-center justify-between rounded-xl border border-[#D8D8D8] bg-white px-4 py-3 text-xs font-semibold hover:bg-[#F7F7F5]"
                    >
                      <span>{tr('Ver historial y ficha completa', 'View history and full record')}</span>
                      <ChevronRight className="w-4 h-4 text-[#0A3F4D]" />
                    </button>
                  </div>

                  <div className="mt-5 border border-[#0A3F4D]/20 bg-white rounded-xl p-3 text-[10px] leading-relaxed text-[#0A3F4D]">
                    {tr('Espacio interno. Las lecturas y actualizaciones operativas del CRM en Firestore están restringidas a administradores autenticados.', 'Internal workspace. Firestore CRM reads and operational updates are restricted to authenticated administrators.')}
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center text-center text-xs text-[#6B6B6B]">
                  {tr('Selecciona un lead para revisar.', 'Select a lead to inspect.')}
                </div>
              )}
            </aside>
            )}

          </div>
        </section>

        {leadDetailOpen && selectedLead && (
          <div
            className="fixed inset-0 z-[70] bg-black/35 backdrop-blur-[2px] p-3 sm:p-6 flex items-center justify-center"
            onClick={() => setLeadDetailOpen(false)}
          >
            <section
              className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-3xl border border-[#D8D8D8] bg-[#F7F7F5] shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#E5E5E5] bg-[#F7F7F5]/95 backdrop-blur px-5 sm:px-7 py-5 rounded-t-3xl">
                <div>
                  <p className="font-mono-code text-[9px] uppercase tracking-[0.2em] text-[#0A3F4D] font-bold">
                    {tr('Ficha completa del lead', 'Full lead record')}
                  </p>
                  <h2 className="mt-1 text-2xl sm:text-3xl font-extrabold tracking-tight">{selectedLead.name}</h2>
                  <p className="text-sm text-[#6B6B6B] mt-1">{selectedLead.company || selectedLead.email}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setLeadDetailOpen(false)}
                  className="p-2 rounded-xl border border-[#D8D8D8] bg-white hover:bg-[#F0F0EE]"
                  aria-label={tr('Cerrar ficha', 'Close record')}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-5 space-y-5">
                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-4">
                      {tr('Información', 'Information')}
                    </p>
                    <div className="space-y-3 text-xs">
                      {[
                        [tr('Email', 'Email'), selectedLead.email],
                        [tr('Canal', 'Channel'), selectedLead.contactChannel || '—'],
                        [tr('Origen', 'Source'), selectedLead.source],
                        [tr('Estado', 'Status'), statusLabel(selectedLead.status, language)],
                        [tr('Responsable', 'Owner'), selectedLead.assignedTo || tr('Sin asignar', 'Unassigned')],
                        [tr('Próxima acción', 'Next action'), selectedLead.nextAction ? nextActionLabel(selectedLead.nextAction, language) : '—'],
                        [tr('Seguimiento', 'Follow-up'), selectedLead.followUpAt ? formatDate(selectedLead.followUpAt) : '—'],
                        [tr('Creado', 'Created'), formatDate(selectedLead.createdAt)]
                      ].map(([label, value]) => (
                        <div key={String(label)} className="flex justify-between gap-4 border-b border-[#EFEFEF] pb-2 last:border-0 last:pb-0">
                          <span className="text-[#6B6B6B]">{label}</span>
                          <span className="text-right font-semibold break-all">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-2">
                      {tr('Contexto de ingreso', 'Intake context')}
                    </p>
                    <p className="text-sm leading-relaxed">
                      {selectedLead.inquiryNotes || selectedLead.message || tr('Sin contexto adicional.', 'No additional context.')}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                          {tr('Customer Journey', 'Customer Journey')}
                        </p>
                        <p className="text-[10px] text-[#777] mt-1">
                          {selectedLead.status === 'CLIENT'
                            ? tr(
                                'La venta no termina el recorrido. Define qué debe ocurrir después con este cliente.',
                                'The sale does not end the journey. Define what should happen next for this client.'
                              )
                            : tr(
                                'Se activa cuando la oportunidad se convierte en cliente.',
                                'Activates when the opportunity becomes a client.'
                              )}
                        </p>
                      </div>

                      {selectedLead.status === 'CLIENT' && getClientJourneyStage(selectedLead) && (
                        <span
                          className={`font-mono-code text-[8px] px-2.5 py-1 rounded-full border ${
                            getClientJourneyStage(selectedLead) === 'ATTENTION'
                              ? 'border-red-200 bg-red-50 text-red-700'
                              : 'border-[#0A3F4D]/25 bg-[#F4F8F8] text-[#0A3F4D]'
                          }`}
                        >
                          {clientJourneyLabel(getClientJourneyStage(selectedLead)!, language)}
                        </span>
                      )}
                    </div>

                    {selectedLead.status === 'CLIENT' ? (
                      <>
                        <div className="grid grid-cols-3 gap-2 mb-4">
                          {[
                            ['ONBOARDING', tr('Onboarding', 'Onboarding')],
                            ['ACTIVE', tr('Activo', 'Active')],
                            ['RENEWAL', tr('Renovación', 'Renewal')]
                          ].map(([stage, label]) => {
                            const current = getClientJourneyStage(selectedLead);
                            const active =
                              current === stage ||
                              (current === 'ATTENTION' &&
                                ((stage === 'ONBOARDING' && selectedLead.nextAction === 'Send onboarding') ||
                                  (stage === 'RENEWAL' && selectedLead.nextAction === 'Renewal follow-up') ||
                                  stage === 'ACTIVE'));

                            return (
                              <div
                                key={stage}
                                className={`rounded-xl border px-3 py-3 text-center ${
                                  active
                                    ? 'border-[#0A3F4D] bg-[#F4F8F8] text-[#0A3F4D]'
                                    : 'border-[#E5E5E5] bg-[#FAFAFA] text-[#8A8A8A]'
                                }`}
                              >
                                <p className="font-mono-code text-[8px] uppercase tracking-wider">
                                  {label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
                          <div className="flex justify-between gap-4 text-[11px]">
                            <span className="text-[#777]">{tr('Próxima acción', 'Next action')}</span>
                            <strong className="text-right">
                              {selectedLead.nextAction
                                ? nextActionLabel(selectedLead.nextAction, language)
                                : tr('Sin próxima acción', 'No next action')}
                            </strong>
                          </div>
                          <div className="flex justify-between gap-4 text-[11px] mt-2">
                            <span className="text-[#777]">{tr('Seguimiento', 'Follow-up')}</span>
                            <strong className="text-right">
                              {selectedLead.followUpAt
                                ? formatDate(selectedLead.followUpAt)
                                : tr('Sin programar', 'Unscheduled')}
                            </strong>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3">
                          <button
                            type="button"
                            onClick={() => prepareClientJourney('expert-client-onboarding')}
                            className="rounded-xl border border-[#D8D8D8] bg-white px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
                          >
                            {tr('Onboarding', 'Onboarding')}
                          </button>
                          <button
                            type="button"
                            onClick={() => prepareClientJourney('expert-client-checkin')}
                            className="rounded-xl border border-[#D8D8D8] bg-white px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
                          >
                            {tr('Seguimiento', 'Check-in')}
                          </button>
                          <button
                            type="button"
                            onClick={() => prepareClientJourney('expert-renewal')}
                            className="rounded-xl border border-[#D8D8D8] bg-white px-3 py-2.5 text-[9px] font-semibold uppercase tracking-wider hover:bg-[#F7F7F5]"
                          >
                            {tr('Renovación', 'Renewal')}
                          </button>
                        </div>
                        <p className="text-[9px] text-[#8A8A8A] mt-2">
                          {tr(
                            'Elige una etapa para preparar la próxima acción; podrás revisarla antes de guardar en CRM.',
                            'Choose a stage to prepare the next action; you can review it before saving in CRM.'
                          )}
                        </p>
                      </>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#D8D8D8] bg-[#FAFAFA] p-4 text-xs text-[#777]">
                        {tr(
                          'Cuando registres una Venta cerrada, G-KAIS moverá la oportunidad a Cliente e iniciará Onboarding automáticamente.',
                          'When you record a Sale closed, G-KAIS will move the opportunity to Client and automatically start Onboarding.'
                        )}
                      </div>
                    )}
                  </div>

                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5">
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                          {tr('Bitácora del lead', 'Lead notes timeline')}
                        </p>
                        <p className="text-[10px] text-[#777] mt-1">
                          {tr(
                            'Agrega una nota nueva sin sobrescribir lo hablado anteriormente.',
                            'Add a new note without overwriting previous context.'
                          )}
                        </p>
                      </div>
                      <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                        {(selectedLead.leadNotes || []).length}/50
                      </span>
                    </div>

                    <input
                      value={noteTitle}
                      onChange={(event) => setNoteTitle(event.target.value)}
                      maxLength={120}
                      placeholder={tr(
                        'Nombre de la nota · Ej.: Llamada inicial',
                        'Note title · e.g. Initial call'
                      )}
                      className="w-full rounded-xl border border-[#D8D8D8] bg-[#FAFAFA] px-3 py-2.5 text-sm focus:outline-none focus:border-[#0A3F4D]"
                    />

                    <textarea
                      value={noteBody}
                      onChange={(event) => setNoteBody(event.target.value)}
                      maxLength={3000}
                      rows={5}
                      placeholder={tr(
                        'Último acuerdo, objeciones, necesidades, instrucciones para el siguiente responsable...',
                        'Latest agreement, objections, needs, instructions for the next owner...'
                      )}
                      className="mt-3 w-full rounded-xl border border-[#D8D8D8] bg-[#FAFAFA] px-3 py-3 text-sm leading-relaxed resize-y focus:outline-none focus:border-[#0A3F4D]"
                    />

                    <button
                      type="button"
                      onClick={handleAddLeadNote}
                      disabled={savingNote || !noteTitle.trim() || !noteBody.trim()}
                      className="mt-3 w-full inline-flex items-center justify-center rounded-xl bg-[#0A3F4D] text-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#08333E] disabled:opacity-40"
                    >
                      {savingNote ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4 mr-2" />
                      )}
                      {tr('Agregar nota', 'Add note')}
                    </button>

                    {noteMessage && (
                      <p className="mt-2 text-[10px] font-mono-code text-[#0A3F4D]">
                        {noteMessage}
                      </p>
                    )}

                    <div className="mt-5 border-t border-[#E5E5E5] pt-4">
                      <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B] mb-3">
                        {tr('Notas registradas', 'Saved notes')}
                      </p>

                      {selectedLead.leadNotes && selectedLead.leadNotes.length > 0 ? (
                        <div className="space-y-3">
                          {[...selectedLead.leadNotes].reverse().map((note) => (
                            <article
                              key={note.id}
                              className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5"
                            >
                              <div className="flex flex-wrap items-start justify-between gap-2">
                                <div>
                                  <h4 className="text-sm font-bold">{note.title}</h4>
                                  <p className="font-mono-code text-[9px] text-[#777] mt-1">
                                    {note.author}
                                  </p>
                                </div>
                                <time className="font-mono-code text-[9px] text-[#777]">
                                  {formatDate(note.createdAt)}
                                </time>
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap mt-3">
                                {note.body}
                              </p>
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-[#777]">
                          {tr(
                            'Aún no hay notas registradas para este lead.',
                            'No notes have been recorded for this lead yet.'
                          )}
                        </p>
                      )}

                      {selectedLead.internalNotes && (
                        <div className="mt-4 rounded-xl border border-dashed border-[#D8D8D8] bg-white p-3">
                          <p className="font-mono-code text-[8px] uppercase tracking-wider text-[#777]">
                            {tr('Nota interna anterior', 'Previous internal note')}
                          </p>
                          <p className="text-xs leading-relaxed whitespace-pre-wrap mt-2 text-[#5F5F5F]">
                            {selectedLead.internalNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLeadDetailOpen(false);
                      setCrmPanelOpen(true);
                    }}
                    className="w-full rounded-xl bg-[#0A0A0A] text-white px-4 py-3 text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D]"
                  >
                    {tr('Editar registro CRM', 'Edit CRM record')}
                  </button>
                </div>

                <div className="lg:col-span-7">
                  <div className="rounded-2xl border border-[#E5E5E5] bg-white p-5 sm:p-6">
                    <div className="flex items-center justify-between gap-4 mb-5">
                      <div>
                        <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                          {tr('Historial de actividad', 'Activity history')}
                        </p>
                        <p className="text-xs text-[#777] mt-1">
                          {tr('Cambios, resultados y próximas acciones del lead.', 'Lead changes, outcomes and next actions.')}
                        </p>
                      </div>
                      <span className="font-mono-code text-[9px] text-[#6B6B6B]">
                        {(selectedLead.activityLog || []).length} {tr('eventos', 'events')}
                      </span>
                    </div>

                    {selectedLead.activityLog && selectedLead.activityLog.length > 0 ? (
                      <div className="space-y-4">
                        {[...selectedLead.activityLog].reverse().map((entry, index) => (
                          <div key={`${entry.at}-${index}`} className="relative pl-5">
                            <span className="absolute left-0 top-1.5 w-2.5 h-2.5 rounded-full bg-[#0A3F4D]" />
                            {index < selectedLead.activityLog!.length - 1 && (
                              <span className="absolute left-[4px] top-4 bottom-[-18px] w-px bg-[#D8D8D8]" />
                            )}
                            <div className="rounded-xl border border-[#E5E5E5] bg-[#FAFAFA] p-3.5">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <span className="font-mono-code text-[9px] text-[#6B6B6B]">{formatDate(entry.at)}</span>
                                <span className="font-mono-code text-[9px] text-[#6B6B6B]">{entry.actor}</span>
                              </div>
                              <p className="text-xs font-semibold mt-2">
                                {statusLabel(entry.fromStatus, language)} → {statusLabel(entry.toStatus, language)}
                              </p>
                              {entry.result && (
                                <p className="text-[10px] font-mono-code uppercase tracking-wider text-[#0A3F4D] mt-1.5">
                                  {tr('Resultado', 'Result')}: {taskOutcomeLabel(entry.result, language)}
                                </p>
                              )}
                              {entry.nextAction && (
                                <p className="text-[11px] text-[#6B6B6B] mt-1.5">{entry.nextAction}</p>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-12 text-center text-xs text-[#777]">
                        {tr('Aún no hay actividad registrada para este lead.', 'No activity has been recorded for this lead yet.')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};
