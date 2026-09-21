import React from 'react';
import { useLanguage } from '../../i18n/LanguageContext';
import { TrendingUp } from 'lucide-react';
import { WeeklyDataPoint } from '../../types/leadflow';

interface LeadFlowChartProps {
  data: WeeklyDataPoint[];
  hoveredDay: WeeklyDataPoint;
  onSelectDay: (day: WeeklyDataPoint) => void;
}

export const LeadFlowChart: React.FC<LeadFlowChartProps> = ({
  data,
  hoveredDay,
  onSelectDay
}) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <div className="p-6 lg:p-8 border-b border-[#E5E5E5] bg-white">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-6 border-b border-[#E5E5E5] gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <TrendingUp className="w-4 h-4 text-[#0A3F4D]" />
            <h3 className="font-bold text-sm tracking-tight text-[#0A0A0A] uppercase font-mono-code">
              {tr('CICLO DE RECUPERACIÓN DE OPORTUNIDADES', 'OPPORTUNITY RECOVERY CYCLE')}
            </h3>
            <span className="font-mono-code text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-[#F7F7F5] border border-[#E5E5E5] text-[#6B6B6B]">
              {tr('DATOS SIMULADOS', 'SIMULATED DATA')}
            </span>
          </div>
          <p className="text-xs text-[#6B6B6B]">
            {tr('Comparación semanal entre consultas entrantes y oportunidades recuperadas mediante seguimiento.', 'Weekly comparison of incoming inquiries versus autonomous follow-up recoveries.')}
          </p>
        </div>

        {/* Chart Series Legend */}
        <div className="flex items-center space-x-6 text-xs font-mono-code">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1 bg-[#D1D1D1]" />
            <span className="text-[#6B6B6B]">{tr('CONSULTAS ENTRANTES', 'INCOMING INQUIRIES')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-3 h-1 bg-[#0A0A0A]" />
            <span className="text-[#0A0A0A] font-semibold">{tr('OPORTUNIDADES RECUPERADAS', 'RECOVERED DEALS')}</span>
          </div>
        </div>
      </div>

      {/* Visualization Grid */}
      <div className="relative pt-4 pb-2">
        <div className="h-40 sm:h-48 w-full flex items-end justify-between gap-3 sm:gap-6 px-2" role="region" aria-label="Opportunity recovery weekly bar chart">
          {data.map((item) => {
            const isHovered = hoveredDay.day === item.day;
            const signalHeight = (item.signals / 35) * 100;
            const recoveryHeight = (item.recovered / 35) * 100;

            return (
              <button
                key={item.day}
                type="button"
                onClick={() => onSelectDay(item)}
                onMouseEnter={() => onSelectDay(item)}
                aria-label={`${item.day}: ${item.signals} incoming, ${item.recovered} recovered`}
                className="flex-1 flex flex-col items-center h-full justify-end cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
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
              </button>
            );
          })}
        </div>

        {/* Tooltip Inspector Bar */}
        <div className="mt-5 p-3.5 bg-[#F7F7F5] border border-[#E5E5E5] flex flex-wrap items-center justify-between text-xs font-mono-code gap-3">
          <div className="flex items-center space-x-3 text-[#6B6B6B]">
            <span className="text-[#0A0A0A] font-bold">{tr('DÍA', 'DAY')}: {hoveredDay.day}</span>
            <span className="text-[#E5E5E5]">|</span>
            <span>{tr('ENTRANTES', 'INCOMING')}: <strong className="text-[#0A0A0A]">{hoveredDay.signals}</strong></span>
            <span className="text-[#E5E5E5]">|</span>
            <span>{tr('RECUPERADAS', 'RECOVERED')}: <strong className="text-[#0A0A0A]">{hoveredDay.recovered}</strong></span>
          </div>
          <div className="text-[#6B6B6B]">
            {tr('TASA DE RECUPERACIÓN', 'RECOVERY RATE')}: <span className="font-bold text-[#0A0A0A]">{hoveredDay.rate}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
