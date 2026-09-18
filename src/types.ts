export interface SystemStep {
  id: string;
  name: string;
  sub: string;
  spec: string;
  latency: string;
  state: 'idle' | 'active' | 'complete';
}

export interface ProblemItem {
  number: string;
  title: string;
  description: string;
  metric: string;
}

export interface SolutionStage {
  step: string;
  title: string;
  detail: string;
  subtext: string;
}

export interface LeadRecord {
  id: string;
  company: string;
  source: string;
  value: string;
  status: 'NEW LEADS' | 'HIGH PRIORITY' | 'FOLLOW-UP' | 'BOOKED' | 'RECOVERED';
  inquiry: string;
  timeAgo: string;
  aiAction: string;
  confidence: number;
}

export interface ProductItem {
  id: string;
  name: string;
  tagline: string;
  description: string;
  metric: string;
  architecture: string[];
}
