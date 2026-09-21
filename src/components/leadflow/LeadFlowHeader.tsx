import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const LeadFlowHeader: React.FC = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <div>
      {/* 1. Architectural Bridge (G-KAIS Engine -> LeadFlow System) */}
      <div className="mb-16 lg:mb-20 pb-10 border-b border-[#E5E5E5]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center space-x-2.5 mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
              <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#6B6B6B] font-semibold">
                {tr('ARQUITECTURA G-KAIS → APLICACIÓN LEADFLOW', 'G-KAIS ARCHITECTURE → LEADFLOW APPLICATION')}
              </span>
            </div>
            <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 text-xs sm:text-sm font-mono-code text-[#6B6B6B]">
              <span>{tr('MOTOR G-KAIS:', 'G-KAIS ENGINE:')} <strong className="text-[#0A0A0A] font-semibold">{tr('"De la señal a la acción."', '"From signal to action."')}</strong></span>
              <span className="text-[#6B6B6B]/40">→</span>
              <span>LEADFLOW: <strong className="text-[#0A0A0A] font-semibold">{tr('"De la acción a la recuperación."', '"From action to recovery."')}</strong></span>
            </div>
          </div>

          {/* Sequential Lifecycle Breadcrumb */}
          <div className="flex flex-wrap items-center gap-1.5 font-mono-code text-[10px] sm:text-[11px] text-[#6B6B6B]">
            <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">{tr('SEÑAL', 'SIGNAL')}</span>
            <span className="text-[#6B6B6B]/40">→</span>
            <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">{tr('ANALIZAR', 'ANALYZE')}</span>
            <span className="text-[#6B6B6B]/40">→</span>
            <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">{tr('DECIDIR', 'DECIDE')}</span>
            <span className="text-[#6B6B6B]/40">→</span>
            <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">{tr('ACTUAR', 'ACT')}</span>
            <span className="text-[#6B6B6B]/40">→</span>
            <span className="px-2.5 py-1 bg-white border border-[#E5E5E5] text-[#0A0A0A]">{tr('SEGUIMIENTO', 'FOLLOW-UP')}</span>
            <span className="text-[#6B6B6B]/40">→</span>
            <span className="px-2.5 py-1 bg-[#0A0A0A] text-[#F7F7F5] font-semibold">{tr('RECUPERAR', 'RECOVER')}</span>
          </div>
        </div>
      </div>

      {/* 2. Section Title and Purpose */}
      <div className="mb-14 lg:mb-18">
        <div className="flex items-center space-x-3 mb-3">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold">
            {tr('SISTEMA DE RECUPERACIÓN DE LEADS', 'LEAD RECOVERY SYSTEM')}
          </span>
          <span className="font-mono-code text-[10px] uppercase tracking-wider px-2 py-0.5 bg-white border border-[#E5E5E5] text-[#6B6B6B]">
            {tr('PRIMER PRODUCTO COMERCIAL', 'FIRST COMMERCIAL PRODUCT')}
          </span>
        </div>
        <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight mb-4">
          LeadFlow
        </h2>
        <p className="text-xl sm:text-2xl lg:text-3xl font-medium tracking-tight text-[#0A0A0A] max-w-4xl leading-snug mb-4">
          {tr('Recupera las oportunidades que se pierden en el camino.', 'Recover the opportunities that fall through the cracks.')}
        </p>
        <p className="text-base text-[#6B6B6B] max-w-3xl leading-relaxed">
          {tr('LeadFlow es el sistema de recuperación de leads impulsado por G-KAIS. Captura consultas no atendidas, califica intención y ejecuta seguimientos persistentes para que ninguna oportunidad comercial quede olvidada.', 'LeadFlow is the lead recovery system powered by the G-KAIS engine. It captures unanswered inquiries across all channels, qualifies prospect intent, and executes polite, persistent follow-up cadences so no revenue opportunity is left behind.')}
        </p>
      </div>
    </div>
  );
};
