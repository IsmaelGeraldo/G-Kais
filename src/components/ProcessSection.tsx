import React, { useState } from 'react';

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
  const [activeStep, setActiveStep] = useState<string>('01');

  return (
    <section id="process" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
            IMPLEMENTATION METHODOLOGY
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight max-w-4xl">
            From opportunity to operating system.
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
                    {step.name}
                  </h3>

                  <p className="text-base font-bold text-[#0A0A0A] tracking-tight mb-4 leading-snug">
                    {step.summary}
                  </p>

                  <p className="text-sm text-[#777777] leading-relaxed mb-6">
                    {step.detail}
                  </p>
                </div>

                <div className="pt-4 border-t border-[#0A0A0A]/10">
                  <span className="font-mono-code text-[10px] text-[#777777] uppercase block mb-1">
                    OUTCOME
                  </span>
                  <span className="font-mono-code text-xs text-[#0A3F4D] font-medium">
                    {step.deliverable}
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
