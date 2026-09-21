import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { LeadRecord, WeeklyDataPoint } from '../types/leadflow';
import { DEMO_LEADS, DEMO_WEEKLY_DATA, DEMO_KPIS } from '../data/demo/leadflow';
import { LeadFlowHeader } from './leadflow/LeadFlowHeader';
import { LeadFlowKpis } from './leadflow/LeadFlowKpis';
import { LeadFlowChart } from './leadflow/LeadFlowChart';
import { LeadFlowFilters } from './leadflow/LeadFlowFilters';
import { LeadFlowTable } from './leadflow/LeadFlowTable';
import { LeadFlowDetailPanel } from './leadflow/LeadFlowDetailPanel';

interface LeadFlowSectionProps {
  onExplore?: () => void;
  onOpenAudit?: () => void;
}

export const LeadFlowSection: React.FC<LeadFlowSectionProps> = ({
  onExplore,
  onOpenAudit
}) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedLeadId, setSelectedLeadId] = useState<string>('lead-1');
  const [hoveredDay, setHoveredDay] = useState<WeeklyDataPoint>(DEMO_WEEKLY_DATA[2]);

  // Filter & Search Logic
  const filteredLeads = useMemo(() => {
    return DEMO_LEADS.filter((record) => {
      // Filter tab check
      const matchesTab = (() => {
        if (activeFilter === 'ALL') return true;
        if (activeFilter === 'HIGH') return record.priority === 'HIGH';
        if (activeFilter === 'FOLLOW-UP') return record.status === 'Follow-up';
        if (activeFilter === 'BOOKED') return record.status === 'Booked';
        if (activeFilter === 'RECOVERED') return record.status === 'Recovered';
        if (activeFilter === 'NEW') return record.status === 'New';
        return true;
      })();

      // Search query check
      const matchesSearch = searchQuery.trim() === '' || 
        record.lead.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.intention.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.status.toLowerCase().includes(searchQuery.toLowerCase()) ||
        record.notes.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesTab && matchesSearch;
    });
  }, [activeFilter, searchQuery]);

  // Selected lead reference
  const selectedLead = useMemo(() => {
    return DEMO_LEADS.find((l) => l.id === selectedLeadId) || filteredLeads[0] || DEMO_LEADS[0];
  }, [selectedLeadId, filteredLeads]);

  const handleKpiClick = (target: string) => {
    if (activeFilter === target) {
      setActiveFilter('ALL');
    } else {
      setActiveFilter(target);
    }
  };

  const handleResetFilter = () => {
    setActiveFilter('ALL');
    setSearchQuery('');
  };

  return (
    <section id="leadflow" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        {/* 1. Header & Architectural Connection */}
        <LeadFlowHeader />

        {/* 2. LeadFlow Clean Editorial Dashboard (Pure B2B Minimalist) */}
        <div className="border border-[#E5E5E5] bg-white shadow-sm overflow-hidden rounded-3xl" id="leadflow-dashboard-container">
          {/* Top Telemetry Header */}
          <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b border-[#E5E5E5] bg-white text-xs font-mono-code text-[#6B6B6B]">
            <div className="flex items-center space-x-3">
              <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
              <span className="text-[#0A0A0A] font-bold tracking-wider">
                {tr('LEADFLOW // DEMO DEL SISTEMA', 'LEADFLOW // SYSTEM DEMO')}
              </span>
              <span className="text-[#E5E5E5] hidden sm:inline">|</span>
              <span className="hidden sm:inline text-[#6B6B6B]">VERSION 2.4.0</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="px-2 py-0.5 border border-[#E5E5E5] rounded-full bg-[#F7F7F5] text-[10px] uppercase tracking-wider text-[#6B6B6B] font-medium">
                {tr('ENTORNO DEMO // DATOS SIMULADOS', 'DEMO ENVIRONMENT // SIMULATED DATA')}
              </span>
            </div>
          </div>

          {/* 3. 5 KPI Cards Row */}
          <LeadFlowKpis
            kpis={DEMO_KPIS}
            activeFilter={activeFilter}
            onKpiClick={handleKpiClick}
          />

          {/* 4. Weekly Recovery Trend Chart */}
          <LeadFlowChart
            data={DEMO_WEEKLY_DATA}
            hoveredDay={hoveredDay}
            onSelectDay={setHoveredDay}
          />

          {/* 5. Filters & Search Bar */}
          <LeadFlowFilters
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onClearSearch={() => setSearchQuery('')}
          />

          {/* 6. Main Content: Table + Side Inspector Panel */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#E5E5E5]">
            {/* Table Area (8 Cols) */}
            <div className="lg:col-span-8">
              <LeadFlowTable
                leads={filteredLeads}
                selectedLeadId={selectedLead.id}
                onSelectLead={(lead) => setSelectedLeadId(lead.id)}
                activeFilter={activeFilter}
                onResetFilter={handleResetFilter}
              />
            </div>

            {/* Selected Lead Inspector Panel (4 Cols) */}
            <LeadFlowDetailPanel
              selectedLead={selectedLead}
              onOpenAudit={onOpenAudit || (() => {})}
            />
          </div>

          {/* 7. Bottom Action Bar with Audit & Technical Spec options */}
          <div className="p-4 sm:p-6 bg-white border-t border-[#E5E5E5] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-xs font-mono-code text-[#6B6B6B]">
              <span>{tr('MOSTRANDO', 'SHOWING')} {filteredLeads.length} {tr('DE', 'OF')} {DEMO_LEADS.length} {tr('REGISTROS SIMULADOS', 'SIMULATED RECORDS')}</span>
              <span className="text-[#E5E5E5]">|</span>
              <button
                type="button"
                onClick={handleResetFilter}
                className="hover:text-[#0A0A0A] flex items-center space-x-1 underline"
              >
                <RefreshCw className="w-3 h-3" />
                <span>{tr('Restablecer vista', 'Reset View')}</span>
              </button>
            </div>

            <div className="flex items-center space-x-4">
              {onExplore && (
                <button
                  type="button"
                  onClick={onExplore}
                  id="leadflow-system-spec-btn"
                  className="px-4 py-2 border border-[#E5E5E5] rounded-xl text-xs font-mono-code text-[#0A0A0A] hover:bg-[#F7F7F5] transition-colors"
                >
                  {tr('VER ESPECIFICACIÓN', 'VIEW SYSTEM SPEC')}
                </button>
              )}
              {onOpenAudit && (
                <button
                  type="button"
                  onClick={onOpenAudit}
                  id="leadflow-bottom-audit-btn"
                  className="inline-flex items-center px-5 py-2 bg-[#0A0A0A] text-[#F7F7F5] text-xs font-semibold uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors"
                >
                  <span>{tr('SOLICITAR AUDITORÍA', 'REQUEST AUDIT')}</span>
                  <ArrowRight className="w-3.5 h-3.5 ml-2" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
