import React from 'react';

interface ProblemItem {
  num: string;
  title: string;
  detail: string;
}

const PROBLEMS: ProblemItem[] = [
  {
    num: '01',
    title: 'Slow response',
    detail: 'Inbound inquiries wait hours while prospect intent and buying urgency rapidly decay.'
  },
  {
    num: '02',
    title: 'Lost conversations',
    detail: 'High-intent prospects stall across fragmented personal inboxes, direct chats and unmonitored threads.'
  },
  {
    num: '03',
    title: 'Missed follow-ups',
    detail: 'Over 80% of sales require multiple touches, yet most opportunities are dropped after a single silence.'
  },
  {
    num: '04',
    title: 'Unclear ownership',
    detail: 'No single source of truth for who owns the next touchpoint or why pipeline deals stalled.'
  }
];

export const ProblemSection: React.FC = () => {
  return (
    <section id="solutions" className="py-24 md:py-36 lg:py-48 border-b border-[#0A0A0A]/10 bg-[#F7F7F5]">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section Header */}
        <div className="mb-20 lg:mb-32">
          <span className="font-mono-code text-xs uppercase tracking-[0.24em] text-[#0A3F4D] font-semibold block mb-6">
            DIAGNOSTIC // THE COMMERCIAL BOTTLENECK
          </span>
          <h2 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-[-0.03em] text-[#0A0A0A] leading-[1.06] max-w-5xl">
            Most businesses don't have a lead problem.
          </h2>
          <p className="mt-3 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-[#777777] leading-[1.08] max-w-5xl">
            They have a follow-up problem.
          </p>
        </div>

        {/* Editorial Composition with Generous Negative Space */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-10 border-t border-[#0A0A0A]/15 pt-12">
          {PROBLEMS.map((problem) => (
            <div 
              key={problem.num} 
              className="flex flex-col justify-between pr-4 group"
            >
              <div>
                <span className="font-mono-code text-5xl lg:text-6xl font-light tracking-tight text-[#0A0A0A] block mb-6 transition-colors duration-200 group-hover:text-[#0A3F4D]">
                  {problem.num}
                </span>
                <h3 className="text-xl lg:text-2xl font-bold tracking-tight text-[#0A0A0A] mb-4">
                  {problem.title}
                </h3>
                <p className="text-sm text-[#777777] leading-relaxed">
                  {problem.detail}
                </p>
              </div>

              <div className="pt-8 mt-8 border-t border-[#0A0A0A]/10">
                <span className="font-mono-code text-[10px] uppercase tracking-widest text-[#0A3F4D] font-semibold">
                  SYSTEM REMEDIATION // ACTIVE
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

