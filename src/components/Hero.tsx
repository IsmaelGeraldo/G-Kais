import React from 'react';
import { ArrowRight, ArrowDown } from 'lucide-react';
import { HeroSystemVisual } from './HeroSystemVisual.tsx';

interface HeroProps {
  onOpenAudit: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenAudit }) => {
  const scrollToSystem = () => {
    const element = document.getElementById('the-system');
    if (element) {
      const offset = 80;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <section className="relative pt-16 pb-24 md:pt-24 md:pb-36 lg:pt-32 lg:pb-44 border-b border-[#0A0A0A]/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Top small label */}
        <div className="mb-8">
          <span className="inline-block font-mono-code text-xs uppercase tracking-[0.28em] text-[#0A3F4D] font-semibold">
            AI BUSINESS SYSTEMS
          </span>
        </div>

        {/* Giant Title & Second Line */}
        <div className="max-w-5xl mb-8">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl xl:text-8xl font-extrabold tracking-[-0.04em] text-[#0A0A0A] leading-[1.03]">
            Find where your business is losing opportunities.
          </h1>
          <p className="mt-4 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-[-0.03em] text-[#777777] leading-[1.05]">
            Then build the system that recovers them.
          </p>
        </div>

        {/* Third explanatory text */}
        <div className="max-w-3xl mb-12">
          <p className="text-lg sm:text-xl text-[#777777] leading-relaxed">
            G-KAIS designs AI-powered business systems that capture, qualify, respond to and follow up with commercial opportunities — while keeping your team in control.
          </p>
        </div>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-6 mb-20 md:mb-28">
          <button
            onClick={onOpenAudit}
            id="hero-book-audit-btn"
            className="group inline-flex items-center justify-center px-8 py-4 bg-[#0A0A0A] text-[#F7F7F5] font-semibold text-xs tracking-wider uppercase hover:bg-[#0A3F4D] transition-all duration-200"
          >
            <span>BOOK A FREE AUDIT</span>
            <ArrowRight className="w-4 h-4 ml-3 transition-transform duration-200 group-hover:translate-x-1" />
          </button>

          <button
            onClick={scrollToSystem}
            id="hero-see-how-it-works-btn"
            className="inline-flex items-center justify-center px-8 py-4 border border-[#0A0A0A]/20 bg-transparent text-[#0A0A0A] font-semibold text-xs tracking-wider uppercase hover:bg-white/60 transition-all duration-200"
          >
            <span>SEE HOW IT WORKS</span>
            <ArrowDown className="w-4 h-4 ml-2.5 text-[#777777]" />
          </button>

          <span className="text-xs font-mono-code tracking-wide text-[#777777] sm:pl-2">
            No commitment. No complicated setup.
          </span>
        </div>

        {/* Minimalist G-KAIS SYSTEM Architecture Visual */}
        <div className="w-full" id="hero-system-visual">
          <div className="mb-3 flex items-center justify-between text-xs font-mono-code text-[#777777]">
            <span>G-KAIS SYSTEM ARCHITECTURE</span>
            <span>SPEC: UNIFIED COMMERCIAL ENGINE</span>
          </div>
          <HeroSystemVisual />
        </div>
      </div>
    </section>
  );
};

