import React from 'react';
import { ArrowRight, Database, Sparkles, Target } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface PilotSectionProps {
  onOpenAudit: () => void;
}

export const PilotSection: React.FC<PilotSectionProps> = ({ onOpenAudit }) => {
  const { language } = useLanguage();
  const tr = (es: string, en: string) => (language === 'es' ? es : en);

  const steps = [
    {
      icon: Database,
      number: '01',
      title: tr('Traemos una muestra real', 'Bring a real sample'),
      description: tr(
        'Cargamos una muestra de tus leads actuales para trabajar con situaciones que ya existen en tu negocio.',
        'We load a sample of your current leads so the pilot works with situations that already exist in your business.'
      )
    },
    {
      icon: Target,
      number: '02',
      title: tr('Ordenamos qué necesita atención', 'Prioritize what needs attention'),
      description: tr(
        'G-KAIS organiza contexto, próxima acción, seguimiento y prioridad para que cada oportunidad tenga un siguiente paso claro.',
        'G-KAIS organizes context, next action, follow-up and priority so every opportunity has a clear next step.'
      )
    },
    {
      icon: Sparkles,
      number: '03',
      title: tr('Analizamos casos reales', 'Analyze real cases'),
      description: tr(
        'Usamos AI Brief y la Knowledge Base para entender cada oportunidad, detectar vacíos y proponer cómo abordarla.',
        'We use AI Brief and the Knowledge Base to understand each opportunity, identify gaps and suggest how to approach it.'
      )
    }
  ];

  return (
    <section className="border-t border-[#0A0A0A]/10 bg-white py-24 md:py-32">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-start">
          <div className="lg:col-span-5">
            <span className="font-mono-code text-[10px] uppercase tracking-[0.24em] text-[#0A3F4D] font-bold">
              {tr('PILOTO G-KAIS', 'G-KAIS PILOT')}
            </span>

            <h2 className="mt-4 text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.035em] leading-[1.02]">
              {tr(
                'No tienes que imaginarlo. Podemos probarlo con tus propias oportunidades.',
                'You do not have to imagine it. We can test it with your own opportunities.'
              )}
            </h2>

            <p className="mt-6 text-base sm:text-lg leading-relaxed text-[#666] max-w-xl">
              {tr(
                'Si la auditoría muestra un buen encaje, el siguiente paso puede ser un piloto controlado con una muestra de tus leads actuales. Así evaluamos G-KAIS sobre un proceso real antes de ampliar la implementación.',
                'If the audit shows a good fit, the next step can be a controlled pilot using a sample of your current leads. This lets us evaluate G-KAIS on a real process before expanding implementation.'
              )}
            </p>

            <button
              type="button"
              onClick={onOpenAudit}
              className="mt-8 inline-flex items-center justify-center rounded-xl bg-[#0A0A0A] px-5 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#0A3F4D] transition-colors"
            >
              {tr('Evaluar si aplica a mi negocio', 'See if it fits my business')}
              <ArrowRight className="w-4 h-4 ml-2" />
            </button>

            <p className="mt-3 font-mono-code text-[10px] leading-relaxed text-[#888]">
              {tr(
                'Sin migración completa · Sin obligación de reemplazar tu CRM · Empezamos con una muestra.',
                'No full migration · No requirement to replace your CRM · Start with a sample.'
              )}
            </p>
          </div>

          <div className="lg:col-span-7 grid grid-cols-1 gap-3">
            {steps.map((step) => {
              const Icon = step.icon;

              return (
                <div
                  key={step.number}
                  className="rounded-2xl border border-[#E5E5E5] bg-[#F7F7F5] p-5 sm:p-6 flex items-start gap-4"
                >
                  <div className="w-10 h-10 shrink-0 rounded-xl bg-white border border-[#D8D8D8] flex items-center justify-center text-[#0A3F4D]">
                    <Icon className="w-4 h-4" />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-code text-[9px] text-[#0A3F4D] font-bold">
                        {step.number}
                      </span>
                      <h3 className="text-base font-extrabold tracking-tight">
                        {step.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-[#666]">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}

            <div className="rounded-2xl border border-[#0A3F4D]/20 bg-[#F4F8F8] p-5 sm:p-6">
              <p className="font-mono-code text-[9px] uppercase tracking-wider text-[#0A3F4D] font-bold">
                {tr('QUÉ BUSCAMOS VALIDAR', 'WHAT WE WANT TO VALIDATE')}
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[#4F5F62]">
                {tr(
                  'Que el equipo tenga más claridad sobre qué oportunidad atender, qué falta saber y cuál debería ser el siguiente paso. No prometemos resultados económicos garantizados.',
                  'That the team has more clarity on which opportunity to address, what is still unknown and what the next step should be. We do not promise guaranteed financial results.'
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
