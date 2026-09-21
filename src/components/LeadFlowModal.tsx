import React, { useRef } from 'react';
import { X, ArrowRight, Activity, Shield, Layers } from 'lucide-react';
import { useModalAccessibility } from '../utils/useModal';
import { useLanguage } from '../i18n/LanguageContext';

interface LeadFlowModalProps {
  isOpen: boolean;
  on{tr('Cerrar', 'Close')}: () => void;
  onOpenAudit: () => void;
}

export const LeadFlowModal: React.FC<LeadFlowModalProps> = ({ isOpen, on{tr('Cerrar', 'Close')}, onOpenAudit }) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const modalRef = useRef<HTMLDivElement | null>(null);
  useModalAccessibility({ isOpen, on{tr('Cerrar', 'Close')}, containerRef: modalRef });

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={on{tr('Cerrar', 'Close')}}
      role="dialog"
      aria-modal="true"
      aria-labelledby="leadflow-modal-title"
    >
      <div 
        ref={modalRef}
        className="relative w-full max-w-3xl bg-[#F7F7F5] border border-[#0A0A0A] p-6 sm:p-10 shadow-2xl my-8 text-left max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={on{tr('Cerrar', 'Close')}}
          className="absolute top-6 right-6 p-2 text-[#777777] hover:text-[#0A0A0A] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
          aria-label="{tr('Cerrar ventana', '{tr('Cerrar', 'Close')} modal')}"
          id="close-leadflow-modal-btn"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-8 pr-8">
          <span className="font-mono-code text-[11px] uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-2">
            {tr('ESPECIFICACIÓN DEL SISTEMA', 'SYSTEM SPECIFICATION')}
          </span>
          <h3 id="leadflow-modal-title" className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#0A0A0A]">
            {tr('Arquitectura LeadFlow', 'LeadFlow Architecture')}
          </h3>
          <p className="text-base text-[#777777] mt-2 leading-relaxed">
            {tr('El sistema de recuperación de leads que reduce pérdidas de oportunidades entre el primer contacto y la conversación agendada.', 'The lead recovery system that eliminates opportunity leakage between first customer touch and booked conversation.')}
          </p>
        </div>

        <div className="space-y-6">
          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-2 flex items-center">
              <Layers className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              {tr('1. Captura omnicanal', '1. Omnichannel Ingestion Pipeline')}
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              Connects directly to your website forms, direct email inboxes, WhatsApp Business channels, and incoming webhooks. Ingests inquiries with continuous redundancy so no incoming customer request goes unregistered.
            </p>
          </div>

          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              {tr('2. Evaluación de intención y prioridad comercial', '2. Intent & Commercial Priority Evaluation')}
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              AI understands what the customer wants and how ready they are to act. Inquiries are scored against your business criteria and routed into clear tracks: immediate executive alert, direct quote preparation, or polite qualification follow-up.
            </p>
          </div>

          <div className="border border-[#0A0A0A]/15 bg-white p-5">
            <h4 className="font-mono-code text-xs uppercase tracking-wider text-[#0A0A0A] font-bold mb-2 flex items-center">
              <Shield className="w-4 h-4 mr-2 text-[#0A3F4D]" />
              {tr('3. Respuestas fundamentadas y seguimiento automático', '3. Grounded Responses & Automatic Follow-Up Cadence')}
            </h4>
            <p className="text-sm text-[#777777] leading-relaxed">
              Delivers answers grounded in your company documentation and pricing bounds. If a prospect goes silent, the system executes polite follow-up touches over days and weeks to keep opportunities moving forward without burning rep time.
            </p>
          </div>

          {/* Key System Attributes Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center pt-2">
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Ingestion Latency</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">Real-Time</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Pipeline Recovery</span>
              <span className="font-mono-code text-xs font-bold text-[#0A3F4D]">Illustrative Recovery KPI</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Data Privacy</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">Encrypted</span>
            </div>
            <div className="p-3 bg-white border border-[#0A0A0A]/10">
              <span className="font-mono-code text-[10px] text-[#777777] block">Compatibility</span>
              <span className="font-mono-code text-sm font-bold text-[#0A0A0A]">Universal API</span>
            </div>
          </div>
          <p className="font-mono-code text-[9px] text-[#777777] text-right">
            *Illustrative target metric based on automated follow-up simulations.
          </p>
        </div>

        <div className="mt-8 pt-6 border-t border-[#0A0A0A]/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <button
            onClick={() => {
              on{tr('Cerrar', 'Close')}();
              onOpenAudit();
            }}
            id="modal-request-audit-leadflow-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all"
          >
            <span>{tr('Solicitar auditoría para LeadFlow', 'Request System Audit for LeadFlow')}</span>
            <ArrowRight className="w-3.5 h-3.5 ml-2" />
          </button>

          <button
            onClick={on{tr('Cerrar', 'Close')}}
            className="text-xs font-mono-code text-[#777777] hover:text-[#0A0A0A] uppercase"
          >
            {tr('Cerrar', 'Close')} Overview
          </button>
        </div>
      </div>
    </div>
  );
};
