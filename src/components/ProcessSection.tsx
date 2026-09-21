import React, { useState } from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface ProcessStep {
  num: string;
  name: string;
  summary: string;
  detail: string;
  deliverable: string;
}

const PROCESS_STEPS: ProcessStep[] = [
  {
    num: '01',
    name: 'DISCOVER',
    summary: 'Find where opportunities are being lost.',
    detail: 'We audit your current commercial pipeline, response latencies, channel fragmentation, and follow-up leakage to pinpoint the exact drop-off points.',
    deliverable: 'Diagnostic friction report & opportunity map'
  },
  {
    num: '02',
    name: 'DESIGN',
    summary: 'Map the process and define the system.',
    detail: 'We engineer deterministic decision logic, intent scoring thresholds, brand voice guidelines, and human-in-the-loop escalation boundaries.',
    deliverable: 'Complete system architecture & governance blueprint'
  },
  {
    num: '03',
    name: 'BUILD',
    summary: 'Connect tools, automation and AI.',
    detail: 'We integrate your CRM, communication channels, calendar infrastructure, and knowledge base with customized AI automation agents.',
    deliverable: 'Fully integrated, live commercial system'
  },
  {
    num: '04',
    name: 'OPTIMIZE',
    summary: 'Measure results and improve the workflow.',
    detail: 'We monitor conversion rates, response velocity, and pipeline recovery metrics in real time, refining prompts and cadence rules continuously.',
    deliverable: 'Performance dashboard & continuous calibration'
  }
];

export const ProcessSection: React.FC = () => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);
  const [activeStep, setActiveStep] = useState<string>('01');

  return (
    <section id="process" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
            {tr('METODOLOGÍA DE IMPLEMENTACIÓN', 'IMPLEMENTATION METHODOLOGY')}
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight max-w-4xl">
            {tr('De la oportunidad al sistema operativo comercial.', 'From opportunity to operating system.')}
          </h2>
        </div>

        {/* 4 Steps Minimalist Architectural Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-8 border-t border-[#0A0A0A]/15 pt-12">
          {PROCESS_STEPS.map((step) => {
            const isActive = activeStep === step.num;

            return (
              <div
                key={step.num}
                onClick={() => setActiveStep(step.num)}
                id={`process-step-${step.num}`}
                className={`p-6 sm:p-8 border transition-all duration-200 cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'border-[#0A0A0A] bg-white shadow-sm'
                    : 'border-[#0A0A0A]/10 bg-[#F7F7F5] hover:border-[#0A0A0A]/30 hover:bg-white/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-8">
                    <span className="font-mono-code text-4xl sm:text-5xl font-light tracking-tight text-[#0A0A0A]">
                      {step.num}
                    </span>
                    <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-[#0A3F4D]' : 'bg-[#0A0A0A]/20'}`} />
                  </div>

                  <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#0A0A0A] mb-3">
                    {language === 'es'
                      ? step.num === '01' ? 'DESCUBRIR'
                        : step.num === '02' ? 'DISEÑAR'
                        : step.num === '03' ? 'CONSTRUIR'
                        : 'OPTIMIZAR'
                      : step.name}
                  </h3>

                  <p className="text-base font-bold text-[#0A0A0A] tracking-tight mb-4 leading-snug">
                    {language === 'es'
                    ? step.num === '01' ? 'Encuentra dónde se están perdiendo oportunidades.'
                      : step.num === '02' ? 'Mapea el proceso y define el sistema.'
                      : step.num === '03' ? 'Conecta herramientas, automatización e IA.'
                      : 'Mide resultados y mejora el flujo.'
                    : step.summary}
                  </p>

                  <p className="text-sm text-[#777777] leading-relaxed mb-6">
                    {language === 'es'
                    ? step.num === '01' ? 'Auditamos tu pipeline comercial, tiempos de respuesta, fragmentación de canales y pérdidas de seguimiento para detectar los puntos exactos de fuga.'
                      : step.num === '02' ? 'Diseñamos la lógica de decisión, criterios de prioridad, tono de marca y límites de intervención humana.'
                      : step.num === '03' ? 'Integramos CRM, canales de comunicación, calendario y conocimiento con automatizaciones personalizadas.'
                      : 'Medimos conversión, velocidad de respuesta y recuperación del pipeline para mejorar continuamente reglas y cadencias.'
                    : step.detail}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0A0A0A]/10">
                  <span className="font-mono-code text-[10px] text-[#777777] uppercase block mb-1">
                    {tr('RESULTADO', 'OUTCOME')}
                  </span>
                  <span className="font-mono-code text-xs text-[#0A3F4D] font-medium">
                    {language === 'es'
                    ? step.num === '01' ? 'Informe de fricción y mapa de oportunidades'
                      : step.num === '02' ? 'Arquitectura del sistema y reglas de gobierno'
                      : step.num === '03' ? 'Sistema comercial integrado y operativo'
                      : 'Panel de rendimiento y optimización continua'
                    : step.deliverable}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
