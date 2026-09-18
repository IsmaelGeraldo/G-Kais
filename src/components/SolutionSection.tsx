import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface Stage {
  num: string;
  name: string;
  action: string;
  detail: string;
  latency: string;
}

const STAGES: Stage[] = [
  {
    num: '01',
    name: 'CAPTURE',
    action: 'Zero-drop omnichannel ingestion',
    detail: 'Aggregates inquiries from forms, inboxes, messaging apps, and phone notes into an encrypted unified data pipeline.',
    latency: '< 50ms'
  },
  {
    num: '02',
    name: 'ANALYZE',
    action: 'Deep intent & qualification parsing',
    detail: 'Evaluates customer intent, budget signals, technical scope, and firmographic fit with corporate benchmarks.',
    latency: '< 200ms'
  },
  {
    num: '03',
    name: 'PRIORITIZE',
    action: 'Algorithmic urgency sorting',
    detail: 'Instantly elevates high-ticket enterprise contracts to top queue while routing informational requests autonomously.',
    latency: 'Real-time'
  },
  {
    num: '04',
    name: 'RESPOND',
    action: 'Context-grounded personalized replies',
    detail: 'Dispatches custom technical answers tailored to the prospect’s exact needs and company history in seconds.',
    latency: '30-60s'
  },
  {
    num: '05',
    name: 'FOLLOW UP',
    action: 'Persistent multi-cadence tracking',
    detail: 'Maintains polite, intelligent touchpoints across days and weeks, reviving quiet conversations automatically.',
    latency: 'Continuous'
  },
  {
    num: '06',
    name: 'MEASURE',
    action: 'Telemetry & closed-loop attribution',
    detail: 'Tracks recovery rate, conversation duration, pipeline velocity, and revenue impact without manual CRM data entry.',
    latency: 'Telemetry'
  }
];

export const SolutionSection: React.FC = () => {
  const [hoveredStage, setHoveredStage] = useState<number | null>(null);

  return (
    <section id="how-it-works" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-28 flex flex-col md:flex-row md:items-end justify-between">
          <div>
            <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-4">
              SYSTEM ARCHITECTURE
            </span>
            <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-tight">
              One intelligent system.
            </h2>
          </div>
          <p className="mt-6 md:mt-0 text-sm md:text-base text-[#777777] max-w-md font-normal">
            Every step is connected. No broken bridges, no lost context, no manual copy-pasting between disconnected tools.
          </p>
        </div>

        {/* Large Typography & Simple Lines List */}
        <div className="border-t border-b border-[#0A0A0A]/15 divide-y divide-[#0A0A0A]/15">
          {STAGES.map((stage, idx) => {
            const isHovered = hoveredStage === idx;
            return (
              <div
                key={stage.name}
                onMouseEnter={() => setHoveredStage(idx)}
                onMouseLeave={() => setHoveredStage(null)}
                className={`group py-8 lg:py-12 px-2 lg:px-6 transition-colors duration-200 cursor-default ${
                  isHovered ? 'bg-[#0A0A0A] text-[#F7F7F5]' : 'hover:bg-white/40'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: Number & Big Title */}
                  <div className="flex items-baseline space-x-6 lg:space-x-12 lg:w-5/12">
                    <span className={`font-mono-code text-xs font-semibold ${isHovered ? 'text-[#F7F7F5]/50' : 'text-[#777777]'}`}>
                      {stage.num}
                    </span>
                    <h3 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight uppercase">
                      {stage.name}
                    </h3>
                  </div>

                  {/* Center: Action & Detail */}
                  <div className="lg:w-5/12 flex flex-col justify-center">
                    <p className={`text-base font-semibold tracking-tight mb-1 ${isHovered ? 'text-[#F7F7F5]' : 'text-[#0A0A0A]'}`}>
                      {stage.action}
                    </p>
                    <p className={`text-sm leading-relaxed ${isHovered ? 'text-[#F7F7F5]/70' : 'text-[#777777]'}`}>
                      {stage.detail}
                    </p>
                  </div>

                  {/* Right: Latency Spec */}
                  <div className="lg:w-2/12 flex lg:justify-end items-center">
                    <span className={`font-mono-code text-xs tracking-wider px-3 py-1 border ${
                      isHovered 
                        ? 'border-[#F7F7F5]/20 text-[#F7F7F5]/90' 
                        : 'border-[#0A0A0A]/10 text-[#0A3F4D]'
                    }`}>
                      {stage.latency}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
