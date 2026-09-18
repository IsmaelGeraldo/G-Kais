import React from 'react';
import { LeadFlowKpiItem } from '../../types/leadflow';

interface LeadFlowKpisProps {
  kpis: LeadFlowKpiItem[];
  activeFilter: string;
  onKpiClick: (filterTarget: string) => void;
}

export const LeadFlowKpis: React.FC<LeadFlowKpisProps> = ({
  kpis,
  activeFilter,
  onKpiClick
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-y sm:divide-y-0 divide-[#E5E5E5] border-b border-[#E5E5E5] bg-white">
      {kpis.map((kpi) => {
        const isSelected = activeFilter === kpi.filterTarget;
        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onKpiClick(kpi.filterTarget)}
            id={`leadflow-kpi-${kpi.id.toLowerCase().replace(/\s+/g, '-')}`}
            aria-pressed={isSelected}
            className={`p-6 lg:p-7 text-left transition-all duration-150 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D] ${
              isSelected ? 'bg-[#F7F7F5]' : 'hover:bg-[#FAFAFA]'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className={`font-mono-code text-[10px] uppercase tracking-wider ${
                isSelected ? 'text-[#0A0A0A] font-bold' : 'text-[#6B6B6B]'
              }`}>
                {kpi.label}
              </span>
              <span className="font-mono-code text-[8px] tracking-wider text-[#6B6B6B]/70 uppercase hidden xl:inline">
                {kpi.tag}
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A]">
              {kpi.value}
            </div>
            <span className="font-mono-code text-[9px] text-[#6B6B6B] block mt-1.5">
              {isSelected ? 'CLICK TO RESET' : 'CLICK TO FILTER'}
            </span>

            {/* Active bottom line */}
            {isSelected && (
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#0A0A0A]" />
            )}
          </button>
        );
      })}
    </div>
  );
};
