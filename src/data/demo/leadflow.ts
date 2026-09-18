import { LeadRecord, WeeklyDataPoint, LeadFlowKpiItem } from '../../types/leadflow';

export const DEMO_LEADS: LeadRecord[] = [
  {
    id: 'lead-1',
    lead: 'Maria Lopez',
    intention: 'Request pricing',
    priority: 'HIGH',
    status: 'Follow-up',
    nextAction: 'Today 15:30',
    lastContact: '2h ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '10:42', event: 'Inbound inquiry captured via Website Form' },
      { time: '10:44', event: 'AI analyzed: High commercial interest' },
      { time: '10:45', event: 'Sales team notified for executive touch' },
      { time: '11:20', event: 'Automated follow-up scheduled for 15:30' }
    ],
    notes: 'Prospect requested tier-2 enterprise tier pricing and architecture overview.'
  },
  {
    id: 'lead-2',
    lead: 'Carlos Ramirez',
    intention: 'Booking request',
    priority: 'HIGH',
    status: 'Booked',
    nextAction: 'Tomorrow 10:00',
    lastContact: '1h ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '09:15', event: 'Inbound message via WhatsApp Business' },
      { time: '09:16', event: 'AI verified availability and booking preference' },
      { time: '09:18', event: 'Meeting locked with Sales Director' },
      { time: '09:20', event: 'Pre-meeting preparation briefing delivered' }
    ],
    notes: 'Confirmed 30-min discovery session. High intent buyer scaling commercial pipeline from 20 to 100 reps.'
  },
  {
    id: 'lead-3',
    lead: 'Andrea Soto',
    intention: 'General inquiry',
    priority: 'MEDIUM',
    status: 'Qualified',
    nextAction: 'Today 17:00',
    lastContact: '3h ago',
    assignedTo: 'Support',
    timeline: [
      { time: '08:00', event: 'Inbound email regarding CRM sync' },
      { time: '08:02', event: 'AI provided standard architecture answer' },
      { time: '10:15', event: 'Qualified as mid-market opportunity' },
      { time: '10:30', event: 'Technical review scheduled' }
    ],
    notes: 'Interested in CRM + messaging synchronization with human approval gateways.'
  },
  {
    id: 'lead-4',
    lead: 'Javier Perez',
    intention: 'No response',
    priority: 'LOW',
    status: 'Follow-up',
    nextAction: 'Tomorrow',
    lastContact: '1d ago',
    assignedTo: 'Sales',
    timeline: [
      { time: 'Yesterday', event: 'Inquiry received via direct channel' },
      { time: 'Yesterday', event: 'First response dispatched' },
      { time: 'Today 09:00', event: 'Follow-up interval triggered' },
      { time: 'Today 09:05', event: 'Value-add follow-up scheduled' }
    ],
    notes: 'Follow-up cadence active. Polite follow-up email scheduled with case context.'
  },
  {
    id: 'lead-5',
    lead: 'Lucia Torres',
    intention: 'Request quote',
    priority: 'HIGH',
    status: 'Recovered',
    nextAction: 'Completed',
    lastContact: '45m ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '3 days ago', event: 'Quote sent; proposal went silent' },
      { time: 'Yesterday', event: 'System detected stalled negotiation' },
      { time: 'Today 11:00', event: 'Personalized recovery message sent' },
      { time: 'Today 11:35', event: 'Client responded positively; opportunity recovered' }
    ],
    notes: 'Recovered after 72 hours of silence. Client accepted revised proposal terms.'
  },
  {
    id: 'lead-6',
    lead: 'Marcus Vance',
    intention: 'Enterprise RFP',
    priority: 'HIGH',
    status: 'Follow-up',
    nextAction: 'Today 18:00',
    lastContact: '4h ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '07:30', event: 'Enterprise RFP submitted via intake form' },
      { time: '07:35', event: 'Scope analyzed against criteria rubric' },
      { time: '12:00', event: 'Executive briefing dossier dispatched' },
      { time: '14:00', event: 'Follow-up scheduled with VP of Architecture' }
    ],
    notes: 'Logistics provider looking to automate high-volume carrier check-ins.'
  },
  {
    id: 'lead-7',
    lead: 'Elena Rostova',
    intention: 'Demo evaluation',
    priority: 'HIGH',
    status: 'Booked',
    nextAction: 'Friday 11:30',
    lastContact: '30m ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '12:10', event: 'Requested private architecture demo' },
      { time: '12:12', event: 'Verified company size and fit' },
      { time: '12:15', event: 'Slot reserved on executive demo calendar' }
    ],
    notes: 'Fintech CTO evaluating data privacy and internal control workflows.'
  },
  {
    id: 'lead-8',
    lead: 'David Miller',
    intention: 'Budget objection',
    priority: 'MEDIUM',
    status: 'Recovered',
    nextAction: 'Completed',
    lastContact: '1h ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '2 days ago', event: 'Client cited Q4 budget freeze' },
      { time: 'Yesterday', event: 'System triggered pilot restructuring follow-up' },
      { time: 'Today 10:20', event: 'Client agreed to phased rollout' }
    ],
    notes: 'Resolved upfront barrier with phased proof-of-concept agreement.'
  },
  {
    id: 'lead-9',
    lead: 'Sofia Chen',
    intention: 'API inquiry',
    priority: 'LOW',
    status: 'New',
    nextAction: 'Today 16:15',
    lastContact: '10m ago',
    assignedTo: 'Sales',
    timeline: [
      { time: '13:00', event: 'Webhook documentation query' },
      { time: '13:02', event: 'Inbound payload classified as developer inquiry' }
    ],
    notes: 'Evaluating API webhooks for internal ERP synchronization.'
  },
  {
    id: 'lead-10',
    lead: 'Mateo Morales',
    intention: 'Follow-up lapsed',
    priority: 'HIGH',
    status: 'Recovered',
    nextAction: 'Completed',
    lastContact: '20m ago',
    assignedTo: 'Sales',
    timeline: [
      { time: 'Last week', event: 'Lead went dark following proposal' },
      { time: 'Today 08:30', event: 'Automated executive re-engagement trigger' },
      { time: 'Today 09:40', event: 'Meeting rescheduled; deal back in active pipeline' }
    ],
    notes: 'High-value opportunity re-engaged through timely follow-up cadence.'
  }
];

export const DEMO_WEEKLY_DATA: WeeklyDataPoint[] = [
  { day: 'MON', signals: 18, recovered: 3, rate: '16.6%' },
  { day: 'TUE', signals: 24, recovered: 5, rate: '20.8%' },
  { day: 'WED', signals: 32, recovered: 7, rate: '21.8%' },
  { day: 'THU', signals: 28, recovered: 6, rate: '21.4%' },
  { day: 'FRI', signals: 22, recovered: 4, rate: '18.1%' },
  { day: 'SAT', signals: 12, recovered: 2, rate: '16.6%' },
  { day: 'SUN', signals: 10, recovered: 2, rate: '20.0%' }
];

export const DEMO_KPIS: LeadFlowKpiItem[] = [
  { id: 'NEW LEADS', value: '128', label: 'NEW LEADS', tag: 'SIMULATED DATA', filterTarget: 'NEW' },
  { id: 'HIGH PRIORITY', value: '24', label: 'HIGH PRIORITY', tag: 'SIMULATED DATA', filterTarget: 'HIGH' },
  { id: 'FOLLOW-UPS TODAY', value: '17', label: 'FOLLOW-UPS TODAY', tag: 'SIMULATED DATA', filterTarget: 'FOLLOW-UP' },
  { id: 'BOOKED', value: '8', label: 'BOOKED', tag: 'SIMULATED DATA', filterTarget: 'BOOKED' },
  { id: 'RECOVERED', value: '4', label: 'RECOVERED', tag: 'SIMULATED DATA', filterTarget: 'RECOVERED' }
];
