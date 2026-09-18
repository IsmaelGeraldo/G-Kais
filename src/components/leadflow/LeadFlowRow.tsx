import React from 'react';
import { ChevronRight } from 'lucide-react';
import { LeadRecord } from '../../types/leadflow';

interface LeadFlowRowProps {
  record: LeadRecord;
  isSelected: boolean;
  onSelect: (record: LeadRecord) => void;
}

export const LeadFlowRow: React.FC<LeadFlowRowProps> = ({
  record,
  isSelected,
  onSelect
}) => {
  return (
    <tr
      onClick={() => onSelect(record)}
      id={`leadflow-row-${record.id}`}
      tabIndex={0}
      role="row"
      aria-selected={isSelected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(record);
        }
      }}
      className={`cursor-pointer transition-colors duration-150 focus-visible:outline-none focus-visible:bg-[#F0F0EE] ${
        isSelected
          ? 'bg-[#F7F7F5] border-l-2 border-l-[#0A0A0A]'
          : 'hover:bg-[#FAFAFA]'
      }`}
    >
      {/* LEAD NAME */}
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

      {/* PRIORITY */}
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
              ? 'bg-[#0A3F4D]'
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
};
