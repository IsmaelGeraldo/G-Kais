import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';
import {
  ArrowDown,
  CalendarCheck2,
  MessageSquareText,
  Radar,
  Route,
  UserCheck
} from 'lucide-react';

const FLOW_EVENTS = [
  {
    time: '19:42',
    label: 'OPPORTUNITY RECEIVED',
    detail: 'A new inquiry arrives from a connected channel.',
    icon: Radar
  },
  {
    time: '19:42',
    label: 'CAPTURED & ORGANIZED',
    detail: 'G-KAIS creates the record and keeps the context in one place.',
    icon: Route
  },
  {
    time: '19:43',
    label: 'PRIORITY IDENTIFIED',
    detail: 'Rules and AI-assisted analysis help determine what needs attention first.',
    icon: UserCheck
  },
  {
    time: '19:45',
    label: 'NEXT ACTION CREATED',
    detail: 'The team sees the next task, owner and follow-up timing.',
    icon: MessageSquareText
  },
  {
    time: 'NEXT STEP',
    label: 'FOLLOW-UP CONTINUES',
    detail: 'If the opportunity does not advance, the workflow keeps it from being forgotten.',
    icon: ArrowDown
  },
  {
    time: 'OUTCOME',
    label: 'MEETING / SALE / RECOVERY',
    detail: 'The result is recorded so the next action can be decided from real context.',
    icon: CalendarCheck2
  }
];

export const OpportunityRecoverySection: React.FC = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  return (
    <section className="py-24 md:py-32 border-b border-[#0A0A0A]/10 bg-white">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16">
          <div className="lg:col-span-5">
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-5">
              {tr('FLUJO DE EJEMPLO', 'EXAMPLE WORKFLOW')}
            </span>
            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] leading-[1.05]">
              {tr('Desde la consulta hasta la próxima acción.', 'From inquiry to next action.')}
            </h2>
            <p className="mt-6 text-lg text-[#777777] leading-relaxed max-w-xl">
              {tr(
                'G-KAIS transforma actividad comercial dispersa en un flujo visible: captura la oportunidad, entiende qué necesita, asigna el próximo paso y mantiene el seguimiento hasta obtener un resultado claro.',
                'G-KAIS is designed to turn scattered commercial activity into a visible operating flow: capture the opportunity, understand what it needs, assign the next step and keep following up until there is a clear outcome.'
              )}
            </p>

            <div className="mt-8 border border-[#E5E5E5] bg-[#F7F7F5] p-4">
              <p className="font-mono-code text-[10px] uppercase tracking-wider text-[#6B6B6B]">
                {tr('IMPORTANTE', 'IMPORTANT')}
              </p>
              <p className="text-sm mt-2 leading-relaxed text-[#0A0A0A]">
                {tr(
                  'Este es un flujo ilustrativo. Los canales, automatizaciones y pasos de aprobación se configuran para cada negocio.',
                  'This is an illustrative workflow. The exact channels, automations and approval steps are configured for each business.'
                )}
              </p>
            </div>
          </div>

          <div className="lg:col-span-7 border border-[#E5E5E5] bg-[#F7F7F5]">
            <div className="px-5 py-4 border-b border-[#E5E5E5] flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#0A3F4D]" />
                <span className="font-mono-code text-[10px] font-bold uppercase tracking-wider">
                  {tr('Línea de tiempo de la oportunidad', 'Opportunity Timeline')}
                </span>
              </div>
              <span className="font-mono-code text-[9px] uppercase tracking-wider text-[#6B6B6B]">
                {tr('Ilustrativo', 'Illustrative')}
              </span>
            </div>

            <div className="divide-y divide-[#E5E5E5]">
              {FLOW_EVENTS.map((event, index) => {
                const Icon = event.icon;
                return (
                  <div
                    key={language === 'es'
                          ? index === 0 ? 'OPORTUNIDAD RECIBIDA'
                            : index === 1 ? 'CAPTURADA Y ORGANIZADA'
                            : index === 2 ? 'PRIORIDAD IDENTIFICADA'
                            : index === 3 ? 'PRÓXIMA ACCIÓN CREADA'
                            : index === 4 ? 'EL SEGUIMIENTO CONTINÚA'
                            : 'REUNIÓN / VENTA / RECUPERACIÓN'
                          : event.label}
                    className="grid grid-cols-[72px_36px_1fr] sm:grid-cols-[96px_44px_1fr] gap-3 px-4 sm:px-5 py-5 bg-white"
                  >
                    <span className="font-mono-code text-[10px] text-[#6B6B6B] pt-1">
                      {event.time}
                    </span>
                    <div className="relative flex justify-center">
                      <div className="w-8 h-8 border border-[#D8D8D8] bg-[#F7F7F5] flex items-center justify-center">
                        <Icon className="w-4 h-4 text-[#0A3F4D]" />
                      </div>
                      {index < FLOW_EVENTS.length - 1 && (
                        <div className="absolute top-8 bottom-[-20px] w-px bg-[#D8D8D8]" />
                      )}
                    </div>
                    <div>
                      <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                        {event.label}
                      </p>
                      <p className="text-sm text-[#0A0A0A] mt-1 leading-relaxed">
                        {language === 'es'
                          ? index === 0 ? 'Una nueva consulta llega desde un canal conectado.'
                            : index === 1 ? 'G-KAIS crea el registro y mantiene todo el contexto en un solo lugar.'
                            : index === 2 ? 'Reglas y análisis asistido por IA ayudan a determinar qué requiere atención primero.'
                            : index === 3 ? 'El equipo ve la próxima tarea, responsable y momento de seguimiento.'
                            : index === 4 ? 'Si la oportunidad no avanza, el flujo evita que sea olvidada.'
                            : 'El resultado queda registrado para decidir la próxima acción con contexto real.'
                          : event.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
