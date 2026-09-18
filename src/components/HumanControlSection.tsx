import React from 'react';

const AI_TASKS = [
  { name: 'Capture', desc: 'Ingests opportunities from all inbound channels 24/7 in real time.' },
  { name: 'Classify', desc: 'Evaluates intent, timeline urgency, budget context, and qualification metrics.' },
  { name: 'Prioritize', desc: 'Identifies which commercial inquiries require immediate executive response.' },
  { name: 'Respond', desc: 'Dispatches precision, brand-governed answers and booking links in seconds.' },
  { name: 'Follow up', desc: 'Maintains polite, persistent follow-up loops so no opportunity goes cold.' },
  { name: 'Organize', desc: 'Keeps CRM pipelines, contact records, and communication histories structured.' }
];

const HUMAN_TASKS = [
  { name: 'Approve', desc: 'Reviews high-value quotes, custom engineering scopes, and strategic proposals.' },
  { name: 'Decide', desc: 'Sets commercial terms, custom agreements, and strategic business direction.' },
  { name: 'Handle exceptions', desc: 'Resolves unique business edge cases, complex requests, and escalations.' },
  { name: 'Close important opportunities', desc: 'Leads high-trust relationship conversations and seals enterprise contracts.' },
  { name: 'Build relationships', desc: 'Invests time in long-term human partnerships and high-touch client advisory.' }
];

export const HumanControlSection: React.FC = () => {
  return (
    <section className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-16 lg:mb-24">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
            GOVERNANCE & RESPONSIBILITY
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight mb-6">
            AI handles the process. Humans keep control.
          </h2>
          <div className="max-w-3xl">
            <p className="text-2xl sm:text-3xl font-medium tracking-tight text-[#777777] leading-snug">
              Automation without losing control.
            </p>
          </div>
        </div>

        {/* Division of Labor Matrix: AI vs HUMAN */}
        <div className="grid grid-cols-1 md:grid-cols-2 border border-[#0A0A0A]/15 divide-y md:divide-y-0 md:divide-x divide-[#0A0A0A]/15 bg-white shadow-sm">
          {/* AI Column */}
          <div className="p-8 lg:p-14">
            <div className="flex items-center justify-between pb-6 border-b border-[#0A0A0A]/10 mb-8">
              <div className="flex items-baseline space-x-3">
                <span className="font-mono-code text-sm text-[#777777]">01 //</span>
                <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                  AI
                </h3>
              </div>
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A3F4D] bg-[#F7F7F5] px-3 py-1 border border-[#0A0A0A]/10 font-semibold">
                SYSTEM EXECUTION
              </span>
            </div>

            <div className="space-y-6">
              {AI_TASKS.map((task) => (
                <div key={task.name} className="flex items-start space-x-4">
                  <div className="mt-1.5 w-2 h-2 bg-[#0A3F4D] shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold tracking-tight text-[#0A0A0A] mb-1">
                      {task.name}
                    </h4>
                    <p className="text-sm text-[#777777] leading-relaxed">
                      {task.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* HUMAN Column */}
          <div className="p-8 lg:p-14">
            <div className="flex items-center justify-between pb-6 border-b border-[#0A0A0A]/10 mb-8">
              <div className="flex items-baseline space-x-3">
                <span className="font-mono-code text-sm text-[#777777]">02 //</span>
                <h3 className="text-2xl lg:text-3xl font-extrabold tracking-tight text-[#0A0A0A]">
                  HUMAN
                </h3>
              </div>
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A0A0A] bg-[#F7F7F5] px-3 py-1 border border-[#0A0A0A]/10 font-semibold">
                HUMAN AUTHORITY
              </span>
            </div>

            <div className="space-y-6">
              {HUMAN_TASKS.map((task) => (
                <div key={task.name} className="flex items-start space-x-4">
                  <div className="mt-1.5 w-2 h-2 bg-[#0A0A0A] shrink-0" />
                  <div>
                    <h4 className="text-lg font-bold tracking-tight text-[#0A0A0A] mb-1">
                      {task.name}
                    </h4>
                    <p className="text-sm text-[#777777] leading-relaxed">
                      {task.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
