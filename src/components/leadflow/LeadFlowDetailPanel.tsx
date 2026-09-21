import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { ArrowRight, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { LeadRecord } from '../../types/leadflow';

interface LeadFlowDetailPanelProps {
  selectedLead: LeadRecord;
  onOpenAudit: () => void;
}

export const LeadFlowDetailPanel: React.FC<LeadFlowDetailPanelProps> = ({
  selectedLead,
  onOpenAudit
}) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <div className="lg:col-span-4 p-6 lg:p-7 bg-[#FAFAFA] flex flex-col justify-between border-t lg:border-t-0 border-[#E5E5E5]">
      <div>
        {/* Panel Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E5E5]">
          <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#6B6B6B] font-semibold">
            {tr('INSPECTOR DE LEAD', 'LEAD INSPECTOR')} // {selectedLead.id}
          </span>
          <span className="font-mono-code text-[9px] uppercase px-1.5 py-0.5 border border-[#E5E5E5] bg-white text-[#6B6B6B]">
            {tr('REGISTRO SIMULADO', 'SIMULATED RECORD')}
          </span>
        </div>

        {/* Lead Identity Summary */}
        <div className="mb-6">
          <h4 className="text-xl font-extrabold tracking-tight text-[#0A0A0A] mb-1">
            {selectedLead.lead}
          </h4>
          <p className="text-xs text-[#6B6B6B] font-mono-code">
            {tr('Intención', 'Intent')}: <span className="text-[#0A0A0A] font-semibold">{selectedLead.intention}</span>
          </p>
        </div>

        {/* Metadata Key-Value List */}
        <div className="space-y-2.5 mb-6 text-xs font-mono-code pb-6 border-b border-[#E5E5E5]">
          <div className="flex justify-between py-1 border-b border-[#E5E5E5]/60">
            <span className="text-[#6B6B6B]">{tr('ESTADO', 'STATUS')}</span>
            <span className="text-[#0A0A0A] font-semibold">{selectedLead.status}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E5E5]/60">
            <span className="text-[#6B6B6B]">{tr('PRIORIDAD', 'PRIORITY')}</span>
            <span className="text-[#0A0A0A] font-semibold">{selectedLead.priority}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E5E5]/60">
            <span className="text-[#6B6B6B]">{tr('PRÓXIMA ACCIÓN', 'NEXT ACTION')}</span>
            <span className="text-[#0A0A0A] font-semibold">{selectedLead.nextAction}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-[#E5E5E5]/60">
            <span className="text-[#6B6B6B]">{tr('ÚLTIMO CONTACTO', 'LAST TOUCH')}</span>
            <span className="text-[#0A0A0A] font-semibold">{selectedLead.lastContact}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#6B6B6B]">{tr('RESPONSABLE', 'OWNER')}</span>
            <span className="text-[#0A0A0A] font-semibold">{selectedLead.assignedTo}</span>
          </div>
        </div>

        {/* Timeline Log */}
        <div className="mb-6">
          <span className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B] font-bold block mb-3">
            {tr('LÍNEA DE TIEMPO // HISTORIAL', 'SYSTEM TIMELINE // AUDIT TRAIL')}
          </span>
          <div className="space-y-3 relative pl-3 border-l border-[#E5E5E5]">
            {selectedLead.timeline.map((entry, idx) => (
              <div key={idx} className="relative text-xs">
                <span className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-[#0A0A0A]" />
                <div className="font-mono-code text-[10px] text-[#6B6B6B]">
                  {entry.time}
                </div>
                <div className="text-[#0A0A0A] text-xs font-normal mt-0.5">
                  {entry.event}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Context Note */}
        <div className="p-3 bg-white border border-[#E5E5E5] rounded-xl text-xs text-[#6B6B6B] leading-relaxed mb-6">
          <strong className="text-[#0A0A0A] block mb-1 font-mono-code text-[10px] uppercase">
            {tr('Notas de contexto:', 'Context Notes:')}
          </strong>
          {selectedLead.notes}
        </div>
      </div>

      {/* Strategic Call to Action for Free Audit */}
      <div className="pt-4 border-t border-[#E5E5E5]">
        <div className="p-4 bg-white border border-[#E5E5E5] rounded-2xl mb-4">
          <h5 className="font-bold text-xs text-[#0A0A0A] tracking-tight uppercase font-mono-code mb-1">
            {tr('MIRA ESTO EN TU NEGOCIO', 'SEE THIS IN YOUR BUSINESS')}
          </h5>
          <p className="text-xs text-[#6B6B6B] leading-relaxed mb-3">
            {tr('Solicita una auditoría para identificar dónde se detienen tus consultas comerciales y cómo un sistema automatizado puede recuperarlas.', 'Request an audit to identify where your commercial inquiries are stalling and how an automated system can recover them.')}
          </p>
          <button
            type="button"
            onClick={onOpenAudit}
            id="leadflow-panel-audit-btn"
            className="w-full inline-flex items-center justify-center px-4 py-2.5 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs uppercase tracking-wider hover:bg-[#0A3F4D] transition-colors group"
          >
            <span>{tr('SOLICITAR AUDITORÍA GRATIS', 'REQUEST FREE AUDIT')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-2 transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
};
