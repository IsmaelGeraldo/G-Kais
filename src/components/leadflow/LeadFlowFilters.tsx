import React from 'react';
import { Search, X } from 'lucide-react';

interface LeadFlowFiltersProps {
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
}

const FILTER_OPTIONS = ['ALL', 'HIGH', 'FOLLOW-UP', 'BOOKED', 'RECOVERED', 'NEW'];

export const LeadFlowFilters: React.FC<LeadFlowFiltersProps> = ({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  onClearSearch
}) => {
  return (
    <div className="p-4 sm:p-6 border-b border-[#E5E5E5] bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Quick Filters Editorial Tabs */}
      <div className="flex flex-wrap items-center gap-1 sm:gap-2" role="tablist" aria-label="Lead status filters">
        {FILTER_OPTIONS.map((filterName) => {
          const isActive = activeFilter === filterName;
          return (
            <button
              key={filterName}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => onFilterChange(filterName)}
              id={`leadflow-filter-${filterName.toLowerCase()}`}
              className={`px-3 py-1.5 font-mono-code text-xs font-semibold uppercase tracking-wider transition-all duration-150 relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D] ${
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
        <Search className="w-4 h-4 text-[#6B6B6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search leads, channels, status..."
          id="leadflow-search-input"
          aria-label="Search leads"
          className="w-full pl-10 pr-8 py-2 bg-white border border-[#E5E5E5] text-[#0A0A0A] placeholder-[#6B6B6B] text-xs font-mono-code focus:outline-none focus:border-[#0A0A0A] focus:ring-1 focus:ring-[#0A0A0A] transition-colors"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={onClearSearch}
            aria-label="Clear search query"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#6B6B6B] hover:text-[#0A0A0A] p-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
