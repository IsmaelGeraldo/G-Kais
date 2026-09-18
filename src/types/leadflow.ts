export interface LeadRecord {
  id: string;
  lead: string;
  intention: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'Follow-up' | 'Booked' | 'Qualified' | 'Recovered' | 'New';
  nextAction: string;
  lastContact: string;
  assignedTo: string;
  timeline: { time: string; event: string }[];
  notes: string;
}

export interface WeeklyDataPoint {
  day: string;
  signals: number;
  recovered: number;
  rate: string;
}

export interface LeadFlowKpiItem {
  id: string;
  value: string;
  label: string;
  tag: string;
  filterTarget: string;
}
