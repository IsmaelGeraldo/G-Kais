import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { LeadRecord } from '../../types/leadflow';
import { LeadFlowRow } from './LeadFlowRow';

interface LeadFlowTableProps {
  leads: LeadRecord[];
  selectedLeadId: string;
  onSelectLead: (lead: LeadRecord) => void;
  activeFilter: string;
  onResetFilter: () => void;
}

export const LeadFlowTable: React.FC<LeadFlowTableProps> = ({
  leads,
  selectedLeadId,
  onSelectLead,
  activeFilter,
  onResetFilter
}) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs border-collapse" role="table" aria-label="Commercial leads table">
        <thead>
          <tr className="border-b border-[#E5E5E5] font-mono-code text-[11px] text-[#6B6B6B] bg-[#FAFAFA]">
            <th scope="col" className="py-3 px-4 font-semibold uppercase">Lead</th>
            <th scope="col" className="py-3 px-3 font-semibold uppercase">{tr('Intención', 'Intention')}</th>
            <th scope="col" className="py-3 px-3 font-semibold uppercase">{tr('Prioridad', 'Priority')}</th>
            <th scope="col" className="py-3 px-3 font-semibold uppercase">{tr('Estado', 'Status')}</th>
            <th scope="col" className="py-3 px-4 font-semibold uppercase text-right">{tr('Próxima acción', 'Next Action')}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E5E5]">
          {leads.length > 0 ? (
            leads.map((record) => (
              <LeadFlowRow
                key={record.id}
                record={record}
                isSelected={record.id === selectedLeadId}
                onSelect={onSelectLead}
              />
            ))
          ) : (
            <tr>
              <td colSpan={5} className="py-12 text-center text-[#6B6B6B]">
                <p className="font-mono-code text-xs mb-2">{tr('Ningún lead coincide con los criterios seleccionados', 'No leads match the selected criteria')} ({activeFilter}).</p>
                <button
                  type="button"
                  onClick={onResetFilter}
                  className="font-mono-code text-xs underline text-[#0A0A0A] hover:text-[#0A3F4D]"
                >
                  {tr('Restablecer todos los filtros', 'Reset all filters')}
                </button>
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};
