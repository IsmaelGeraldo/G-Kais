import React, { useState, useMemo } from 'react';
import { 
  ArrowRight, 
  Search, 
  X, 
  TrendingUp, 
  ChevronRight
} from 'lucide-react';

interface LeadFlowSectionProps {
  onExplore?: () => void;
  onOpenAudit?: () => void;
}

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

const DEMO_LEADS: LeadRecord[] = [
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
      { time: '10:42', event: 'Lead captured via Website Form' },
      { time: '10:44', event: 'AI classified: Enterprise pricing intent' },
      { time: '10:45', event: 'Sales team alerted via Slack' },
      { time: '11:20', event: 'Follow-up scheduled for 15:30' }
    ],
    notes: 'Prospect requested tier-2 enterprise tier pricing and SOC2 security verification documentation.'
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
      { time: '09:15', event: 'WhatsApp inquiry received' },
      { time: '09:16', event: 'AI validated budget & calendar match' },
      { time: '09:18', event: 'Meeting locked with Sales Director' },
      { time: '09:20', event: 'Pre-meeting dossier generated' }
    ],
    notes: 'Confirmed 30-min discovery call. High intent buyer scaling commercial pipeline from 20 to 100 reps.'
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
      { time: '08:00', event: 'Inbound email regarding CRM integration' },
      { time: '08:02', event: 'AI resolved standard integration questions' },
      { time: '10:15', event: 'Qualified as qualified mid-market prospect' },
      { time: '10:30', event: 'Technical review scheduled' }
    ],
    notes: 'Interested in HubSpot + WhatsApp automated synchronization with human approval gateways.'
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
      { time: 'Yesterday', event: 'Initial inquiry received via LinkedIn' },
      { time: 'Yesterday', event: 'First automated response dispatched' },
      { time: 'Today 09:00', event: 'No reply detected by cadence engine' },
      { time: 'Today 09:05', event: 'Cadence touchpoint 2 scheduled' }
    ],
    notes: 'Cadence loop active. Polite follow-up email scheduled with case study attachment.'
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
      { time: '3 days ago', event: 'Quote sent, proposal went silent' },
      { time: 'Yesterday', event: 'AI sentiment pulse detected stalled deal' },
      { time: 'Today 11:00', event: 'Autonomous personalized recovery dispatched' },
      { time: 'Today 11:35', event: 'Client responded positively; deal recovered' }
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
      { time: '07:30', event: 'Enterprise RFP submitted via portal' },
      { time: '07:35', event: 'Scope analyzed against capability rubric' },
      { time: '12:00', event: 'Executive briefing dossier dispatched' },
      { time: '14:00', event: 'Follow-up scheduled with VP of Architecture' }
    ],
    notes: 'Fortune 500 logistics provider looking to automate 10,000 monthly carrier check-ins.'
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
      { time: '12:12', event: 'Verified qualified company size (>50 staff)' },
      { time: '12:15', event: 'Slot reserved on executive demo calendar' }
    ],
    notes: 'Fintech CTO evaluating data privacy isolation and local residency compliance.'
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
      { time: 'Yesterday', event: 'AI triggered pilot restructuring cadence' },
      { time: 'Today 10:20', event: 'Client accepted phased pilot rollout' }
    ],
    notes: 'Overcame upfront fee friction with milestone-based proof-of-concept agreement.'
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
      { time: '13:00', event: 'Direct API webhook connection query' },
      { time: '13:02', event: 'Inbound payload sanitized and ingested' }
    ],
    notes: 'Evaluating REST API webhooks for legacy internal ERP data sync.'
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
      { time: 'Last week', event: 'Lead went dark following contract issue' },
      { time: 'Today 08:30', event: 'Automated executive re-engagement trigger' },
      { time: 'Today 09:40', event: 'Meeting rescheduled; deal back in active pipeline' }
    ],
    notes: 'High-value opportunity salvaged by deterministic reactivation logic.'
  }
];

// Weekly Trend Data for the Opportunity Recovery Chart
const WEEKLY_DATA = [
  { day: 'MON', signals: 18, recovered: 3, rate: '16.6%' },
  { day: 'TUE', signals: 24, recovered: 5, rate: '20.8%' },
  { day: 'WED', signals: 32, recovered: 7, rate: '21.8%' },
  { day: 'THU', signals: 28, recovered: 6, rate: '21.4%' },
  { day: 'FRI', signals: 22, recovered: 4, rate: '18.1%' },
  { day: 'SAT', signals: 12, recovered: 2, rate: '16.6%' },
  { day: 'SUN', signals: 10, recovered: 2, rate: '20.0%' }
];

export const LeadFlowSection: React.FC<LeadFlowSectionProps> = ({ onOpenAudit }) => {
  // Search query
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Active quick filter: 'ALL' | 'HIGH' | 'FOLLOW-UP' | 'BOOKED' | 'RECOVERED'
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  // Selected Lead for the Side Inspection Drawer
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(DEMO_LEADS[0]);

  // Active chart day hover/inspection
  const [hoveredDay, setHoveredDay] = useState<typeof WEEKLY_DATA[0]>(WEEKLY_DATA[2]);

  // Exact requested 5 KPI counts
  const kpis = useMemo(() => {
    return [
      { id: 'NEW LEADS', value: '128', label: 'NEW LEADS', filterTarget: 'NEW' },
      { id: 'HIGH PRIORITY', value: '24', label: 'HIGH PRIORITY', filterTarget: 'HIGH' },
      { id: 'FOLLOW-UPS TODAY', value: '17', label: 'FOLLOW-UPS TODAY', filterTarget: 'FOLLOW-UP' },
      { id: 'BOOKED', value: '8', label: 'BOOKED', filterTarget: 'BOOKED' },
      { id: 'RECOVERED', value: '4', label: 'RECOVERED', filterTarget: 'RECOVERED' }
    ];
  }, []);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return DEMO_LEADS.filter((lead) => {
      // 1. Text Search matching
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || (
        lead.lead.toLowerCase().includes(query) ||
        lead.intention.toLowerCase().includes(query) ||
        lead.status.toLowerCase().includes(query) ||
        lead.priority.toLowerCase().includes(query) ||
        lead.assignedTo.toLowerCase().includes(query)
      );

      // 2. Tab Filter matching
      let matchesFilter = true;
      if (activeFilter === 'HIGH') {
        matchesFilter = lead.priority === 'HIGH';
      } else if (activeFilter === 'FOLLOW-UP') {
        matchesFilter = lead.status === 'Follow-up';
      } else if (activeFilter === 'BOOKED') {
        matchesFilter = lead.status === 'Booked';
      } else if (activeFilter === 'RECOVERED') {
        matchesFilter = lead.status === 'Recovered';
      } else if (activeFilter === 'NEW') {
        matchesFilter = lead.status === 'New';
      }

      return matchesSearch && matchesFilter;
    });
  }, [searchQuery, activeFilter]);

  // Handle KPI Click (Interactive filtering)
  const handleKpiClick = (target: string) => {
    if (activeFilter === target) {
      setActiveFilter('ALL');
    } else {
      setActiveFilter(target);
    }
  };

  return (
    <section id="leadflow" className="py-24 md:py-36 lg:py-44 bg-[#F7F7F5] text-[#0A0A0A] border-b border-[#E5E5E5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* 1. CONCEPTUAL ARCHITECTURAL BRIDGE (G-KAIS ENGINE -> LEADFLOW) */}
        <div className="mb-16 lg:mb-20 pb-10 border-b border-[#E5E5E5]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center space-x-2.5 mb-2.5">
                <span className="w-2 h-2 rounded-full bg-[#0A0A0A]" />
                <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#6B6B6B] font-semibold">
                  G-KAIS ARCHITECTURE → LEADFLOW APPLICATION
                </span>
              </div>
              <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 text-xs sm:text-sm font-mono-code text-[#6B6B6B]">
                <span>G-KAIS ENGINE: <strong className="text-[#0A0A0A] font-semibold">"From signal to action."</strong></span>
                <span className="text-[#6B6B6B]/40">→</span>
                <span>LEADFLOW: <strong className="text-[#0A0A0A] font-semibold">"From action to recovery."</strong></span>
              </div>
            </div>

            {/* Step Sequence Breadcrumb */}
            <div className="flex flex-wrap items-center gap-1.5 font-mono-code text-[10px] sm:text-[11px] text-[#6B6B6B]">
              <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">SIGNAL</span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">ANALYZE</span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">DECIDE</span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">ACT</span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">FOLLOW-UP</span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span className="px-2.5 py-1 bg-[#0A0A0A] text-[#F7F7F5] font-semibold">RECOVER</span>
            </div>
          </div>
        </div>

        {/* 2. SECTION HEADER (LEADFLOW // LEAD RECOVERY SYSTEM) */}
        <div className="mb-14 lg:mb-18">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#6B6B6B] font-semibold block mb-3">
            LEAD RECOVERY SYSTEM
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight mb-4">
            LeadFlow
          </h2>
          <p className="text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight text-[#0A0A0A] max-w-4xl leading-snug mb-4">
            Recover the opportunities that fall through the cracks.
          </p>
          <p className="text-base text-[#6B6B6B] max-w-3xl leading-relaxed">
            LeadFlow operates as the production deployment of the G-KAIS Engine, continuously scanning unclosed inquiries, calculating intent, and executing polite, persistent follow-up cadences.
          </p>
        </div>

        {/* 3. THE CLEAN EDITORIAL SAAS DASHBOARD CONTAINER (WHITE + BLACK + GRAY) */}
        <div className="border border-[#E5E5E5] bg-white shadow-sm overflow-hidden">
          {/* Top SaaS Header / Telemetry Bar */}
          <div className="flex flex-wrap items-center justify-between px-6 py-3.5 border-b border-[#E5E5E5] bg-[#F7F7F5]">
            <div className="flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-[#0A0A0A]" />
              <span className="font-mono-code text-xs font-bold tracking-wider text-[#0A0A0A]">
                LEADFLOW // PRODUCTION DASHBOARD
              </span>
              <span className="text-[#E5E5E5]">|</span>
              <span className="text-xs text-[#6B6B6B] font-mono-code hidden sm:inline">
                TENANT: ENTERPRISE COMMERCIAL PIPELINE
              </span>
            </div>

            <div className="flex items-center space-x-4 text-xs font-mono-code text-[#6B6B6B] mt-2 sm:mt-0">
              <span className="text-[#0A0A0A] font-semibold">● ENGINE ACTIVE</span>
              <span className="text-[#E5E5E5]">|</span>
              <span>FILTER: <strong className="text-[#0A0A0A] font-bold">{activeFilter}</strong></span>
            </div>
          </div>

          {/* 4. KPI SECTION: EDITORIAL COMPOSITION (CLICKABLE TO FILTER TABLE) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[#E5E5E5] border-b border-[#E5E5E5] bg-white">
            {kpis.map((kpi) => {
              const isSelected = activeFilter === kpi.filterTarget;
              return (
                <button
                  key={kpi.id}
                  onClick={() => handleKpiClick(kpi.filterTarget)}
                  id={`leadflow-kpi-${kpi.id.toLowerCase().replace(/\s+/g, '-')}`}
                  className={`p-6 lg:p-7 text-left transition-all duration-150 relative focus:outline-none ${
                    isSelected
                      ? 'bg-[#F7F7F5]'
                      : 'hover:bg-[#FAFAFA]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-mono-code text-[10px] uppercase tracking-wider ${
                      isSelected ? 'text-[#0A0A0A] font-bold' : 'text-[#6B6B6B]'
                    }`}>
                      {kpi.label}
                    </span>
                  </div>
                  <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A]">
                    {kpi.value}
                  </div>
                  <span className="font-mono-code text-[9px] text-[#6B6B6B] block mt-1.5">
                    {isSelected ? 'CLICK TO RESET' : 'CLICK TO FILTER'}
                  </span>

                  {/* Active bottom black line */}
                  {isSelected && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* 5. OPPORTUNITY RECOVERY WEEKLY CHART (EDITORIAL ENTERPRISE STYLE) */}
          <div className="p-6 lg:p-8 border-b border-[#E5E5E5] bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#E5E5E5] gap-4">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-[#0A0A0A]" />
                  <h3 className="font-bold text-sm tracking-tight text-[#0A0A0A] uppercase font-mono-code">
                    OPPORTUNITY RECOVERY
                  </h3>
                </div>
                <p className="text-xs text-[#6B6B6B]">
                  Daily comparison of incoming commercial signals versus automated pipeline recoveries.
                </p>
              </div>

              {/* Chart Series Legend (Black & Gray) */}
              <div className="flex items-center space-x-6 text-xs font-mono-code">
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-1 bg-[#D1D1D1]" />
                  <span className="text-[#6B6B6B]">INCOMING SIGNALS</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="w-3 h-1 bg-[#0A0A0A]" />
                  <span className="text-[#0A0A0A] font-semibold">AUTOMATED RECOVERIES</span>
                </div>
              </div>
            </div>

            {/* Technical Minimalist Visualization */}
            <div className="relative pt-4 pb-2">
              <div className="h-40 sm:h-48 w-full flex items-end justify-between gap-3 sm:gap-6 px-2">
                {WEEKLY_DATA.map((item) => {
                  const isHovered = hoveredDay.day === item.day;
                  // Scaling: max signals 35
                  const signalHeight = (item.signals / 35) * 100;
                  const recoveryHeight = (item.recovered / 35) * 100;

                  return (
                    <div
                      key={item.day}
                      onClick={() => setHoveredDay(item)}
                      onMouseEnter={() => setHoveredDay(item)}
                      className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group"
                    >
                      {/* Dual Bars container */}
                      <div className="w-full flex items-end justify-center space-x-1.5 sm:space-x-2 h-full pb-2">
                        {/* Signals Bar (Gray) */}
                        <div
                          style={{ height: `${signalHeight}%` }}
                          className={`w-3 sm:w-5 transition-all duration-200 ${
                            isHovered ? 'bg-[#9E9E9E]' : 'bg-[#E5E5E5] group-hover:bg-[#CCCCCC]'
                          }`}
                        />
                        {/* Recoveries Bar (Black) */}
                        <div
                          style={{ height: `${recoveryHeight}%` }}
                          className={`w-3 sm:w-5 transition-all duration-200 ${
                            isHovered ? 'bg-[#0A0A0A]' : 'bg-[#0A0A0A]/85 group-hover:bg-[#0A0A0A]'
                          }`}
                        />
                      </div>

                      {/* Day Label */}
                      <span className={`font-mono-code text-[11px] pt-2.5 border-t border-[#E5E5E5] w-full text-center transition-colors ${
                        isHovered ? 'text-[#0A0A0A] font-bold' : 'text-[#6B6B6B]'
                      }`}>
                        {item.day}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Tooltip Inspector Bar */}
              <div className="mt-5 p-3.5 bg-[#F7F7F5] border border-[#E5E5E5] flex flex-wrap items-center justify-between text-xs font-mono-code gap-3">
                <div className="flex items-center space-x-3 text-[#6B6B6B]">
                  <span className="text-[#0A0A0A] font-bold">DAY: {hoveredDay.day}</span>
                  <span className="text-[#E5E5E5]">|</span>
                  <span>INCOMING SIGNALS: <strong className="text-[#0A0A0A]">{hoveredDay.signals}</strong></span>
                  <span className="text-[#E5E5E5]">|</span>
                  <span>RECOVERED OPPORTUNITIES: <strong className="text-[#0A0A0A]">{hoveredDay.recovered}</strong></span>
                </div>
                <div className="text-[#6B6B6B]">
                  RECOVERY RATE: <span className="font-bold text-[#0A0A0A]">{hoveredDay.rate}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 6. EDITORIAL SEARCH & QUICK FILTERS TOOLBAR */}
          <div className="p-4 sm:p-6 border-b border-[#E5E5E5] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            {/* Quick Filters Editorial Tabs */}
            <div className="flex flex-wrap items-center gap-1 sm:gap-2">
              {['ALL', 'HIGH', 'FOLLOW-UP', 'BOOKED', 'RECOVERED'].map((filterName) => {
                const isActive = activeFilter === filterName;
                return (
                  <button
                    key={filterName}
                    onClick={() => setActiveFilter(filterName)}
                    id={`leadflow-filter-${filterName.toLowerCase()}`}
                    className={`px-3 py-1.5 font-mono-code text-xs font-semibold uppercase tracking-wider transition-all duration-150 relative ${
                      isActive
                        ? 'text-[#0A0A0A] border-b-2 border-[#0A0A0A]'
                        : 'text-[#6B6B6B] hover:text-[#0A0A0A]'
                    }`}
                  >
                    {filterName}
                  </button>
                );
              })}
            </div>

            {/* Clean Minimalist Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search leads..."
                id="leadflow-search-input"
                className="w-full pl-10 pr-8 py-2 bg-white border border-[#E5E5E5] text-[#0A0A0A] placeholder-[#6B6B6B] text-xs font-mono-code focus:outline-none focus:border-[#0A0A0A] transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0A0A0A]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* 7. LEADFLOW DATA TABLE & SIDE PANEL (WHITE + BLACK + GRAY) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E5] bg-white">
            {/* Left/Main Column: The Table */}
            <div className={`${selectedLead ? 'lg:col-span-7 xl:col-span-8' : 'lg:col-span-12'} overflow-x-auto`}>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E5E5] bg-[#F7F7F5] font-mono-code text-[11px] text-[#6B6B6B] uppercase tracking-wider">
                    <th className="py-3.5 px-4 font-semibold">LEAD</th>
                    <th className="py-3.5 px-3 font-semibold">INTENTION</th>
                    <th className="py-3.5 px-3 font-semibold">PRIORITY</th>
                    <th className="py-3.5 px-3 font-semibold">STATUS</th>
                    <th className="py-3.5 px-4 font-semibold text-right">NEXT ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E5E5] font-sans">
                  {filteredLeads.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-[#6B6B6B] font-mono-code">
                        No leads matching current filters or search query.
                      </td>
                    </tr>
                  ) : (
                    filteredLeads.map((record) => {
                      const isSelected = selectedLead?.id === record.id;
                      return (
                        <tr
                          key={record.id}
                          onClick={() => setSelectedLead(record)}
                          id={`leadflow-row-${record.id}`}
                          className={`cursor-pointer transition-colors duration-150 ${
                            isSelected
                              ? 'bg-[#F7F7F5] border-l-2 border-l-[#0A0A0A]'
                              : 'hover:bg-[#FAFAFA]'
                          }`}
                        >
                          {/* LEAD */}
                          <td className="py-4 px-4 font-bold text-[#0A0A0A] text-sm">
                            <div className="flex items-center space-x-2">
                              <span>{record.lead}</span>
                              {isSelected && (
                                <ChevronRight className="w-3.5 h-3.5 text-[#0A0A0A]" />
                              )}
                            </div>
                          </td>

                          {/* INTENTION */}
                          <td className="py-4 px-3 text-[#0A0A0A]/90">
                            {record.intention}
                          </td>

                          {/* PRIORITY (Clean Monochromatic) */}
                          <td className="py-4 px-3 font-mono-code">
                            <span className={`inline-block px-2 py-0.5 text-[10px] font-bold border ${
                              record.priority === 'HIGH'
                                ? 'border-[#0A0A0A] text-[#0A0A0A] bg-[#0A0A0A]/5'
                                : record.priority === 'MEDIUM'
                                ? 'border-[#E5E5E5] text-[#6B6B6B]'
                                : 'border-[#E5E5E5] text-[#A0A0A0]'
                            }`}>
                              {record.priority}
                            </span>
                          </td>

                          {/* STATUS */}
                          <td className="py-4 px-3">
                            <div className="flex items-center space-x-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                record.status === 'Booked'
                                  ? 'bg-[#0A0A0A]'
                                  : record.status === 'Recovered'
                                  ? 'bg-[#0A0A0A]'
                                  : record.status === 'Follow-up'
                                  ? 'bg-[#6B6B6B]'
                                  : 'bg-[#A0A0A0]'
                              }`} />
                              <span className="font-medium text-[#0A0A0A]">
                                {record.status}
                              </span>
                            </div>
                          </td>

                          {/* NEXT ACTION */}
                          <td className="py-4 px-4 font-mono-code text-right text-xs text-[#0A0A0A] font-medium">
                            {record.nextAction}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              {/* Table Footer Telemetry */}
              <div className="p-4 border-t border-[#E5E5E5] bg-[#F7F7F5] flex items-center justify-between text-xs font-mono-code text-[#6B6B6B]">
                <span>SHOWING {filteredLeads.length} OF {DEMO_LEADS.length} COMMERCIAL RECORDS</span>
                <span className="text-[#0A0A0A] font-semibold">AUTONOMOUS CADENCE: LIVE</span>
              </div>
            </div>

            {/* Right Column: Lead Selection Side Panel (White Surface) */}
            {selectedLead && (
              <div className="lg:col-span-5 xl:col-span-4 p-6 bg-white flex flex-col justify-between">
                <div>
                  {/* Panel Top Bar */}
                  <div className="flex items-center justify-between pb-4 border-b border-[#E5E5E5] mb-6">
                    <span className="font-mono-code text-[11px] text-[#0A0A0A] uppercase tracking-wider font-bold">
                      RECORD INSPECTION // {selectedLead.id.toUpperCase()}
                    </span>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="text-[#6B6B6B] hover:text-[#0A0A0A] p-1"
                      title="Close panel"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Lead Attributes */}
                  <div className="space-y-4 font-mono-code text-xs">
                    <div>
                      <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                        LEAD
                      </span>
                      <div className="text-lg font-bold font-sans text-[#0A0A0A]">
                        {selectedLead.lead}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          INTENTION
                        </span>
                        <div className="text-[#0A0A0A] font-medium">
                          {selectedLead.intention}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          PRIORITY
                        </span>
                        <span className="text-[#0A0A0A] font-bold">
                          {selectedLead.priority}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          STATUS
                        </span>
                        <div className="text-[#0A0A0A]">
                          {selectedLead.status}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          LAST CONTACT
                        </span>
                        <div className="text-[#6B6B6B]">
                          {selectedLead.lastContact}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          NEXT ACTION
                        </span>
                        <div className="text-[#0A0A0A] font-bold">
                          {selectedLead.nextAction}
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#6B6B6B] uppercase block mb-1">
                          ASSIGNED TO
                        </span>
                        <div className="text-[#0A0A0A]">
                          {selectedLead.assignedTo}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Activity Timeline */}
                  <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
                    <span className="font-mono-code text-[11px] text-[#6B6B6B] uppercase tracking-wider block mb-4">
                      ACTIVITY TIMELINE
                    </span>

                    <div className="space-y-3 font-mono-code text-xs">
                      {selectedLead.timeline.map((event, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <span className="text-[#0A0A0A] shrink-0 font-bold">
                            {event.time}
                          </span>
                          <span className="text-[#6B6B6B] leading-snug">
                            {event.event}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Bottom Action for Lead (Clean Black Editorial Button) */}
                <div className="mt-8 pt-6 border-t border-[#E5E5E5]">
                  <button
                    onClick={onOpenAudit}
                    id="leadflow-trigger-audit-btn"
                    className="w-full py-3 px-4 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs uppercase tracking-wider hover:bg-[#262626] transition-colors flex items-center justify-center space-x-2"
                  >
                    <span>AUDIT THIS PIPELINE CADENCE</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
