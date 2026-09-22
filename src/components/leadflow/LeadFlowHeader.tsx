import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';

export const LeadFlowHeader: React.FC = () => {
  const { language } = useLanguage();
  const es = language === 'es';

  return (
    <div className="mb-14 lg:mb-20">
      <div className="flex items-center gap-2.5 mb-4">
        <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
        <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold">
          {es ? 'LEADFLOW // OPERACIÓN COMERCIAL' : 'LEADFLOW // COMMERCIAL OPERATIONS'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-12 items-end">
        <div className="lg:col-span-7">
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.04em] leading-[1.02]">
            {es
              ? 'Del análisis al trabajo que toca hacer.'
              : 'From analysis to the work that needs to happen.'}
          </h2>
        </div>

        <div className="lg:col-span-5">
          <p className="text-lg text-[#707570] leading-relaxed">
            {es
              ? 'LeadFlow es la vista operativa de G-KAIS: concentra prioridades, nuevos leads, contexto, próximas acciones y AI Brief para que el equipo sepa dónde actuar.'
              : 'LeadFlow is the operating view of G-KAIS: it brings together priorities, new leads, context, next actions and AI Brief so the team knows where to act.'}
          </p>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 font-mono-code text-[9px] uppercase tracking-wider text-[#777]">
        <span className="rounded-full border border-[#D8D8D8] bg-white px-2.5 py-1">
          Priority Work
        </span>
        <span>→</span>
        <span className="rounded-full border border-[#D8D8D8] bg-white px-2.5 py-1">
          {es ? 'Ficha' : 'Record'}
        </span>
        <span>→</span>
        <span className="rounded-full border border-[#D8D8D8] bg-white px-2.5 py-1">
          {es ? 'Calificación' : 'Qualification'}
        </span>
        <span>→</span>
        <span className="rounded-full border border-[#D8D8D8] bg-white px-2.5 py-1">
          AI Brief
        </span>
        <span>→</span>
        <span className="rounded-full bg-[#0A0A0A] text-white px-2.5 py-1">
          {es ? 'Próxima acción' : 'Next action'}
        </span>
      </div>
    </div>
  );
};
