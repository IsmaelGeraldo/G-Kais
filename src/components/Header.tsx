import React, { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';

interface HeaderProps {
  onOpenAudit: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAudit }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
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
    <header className="sticky top-0 z-40 bg-[#F7F7F5]/90 backdrop-blur-md border-b border-[#0A0A0A]/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12 h-24 flex items-center justify-between">
        {/* Large Logo */}
        <a 
          href="#" 
          className="group flex flex-col justify-center text-left select-none"
          id="brand-logo-link"
        >
          <span className="font-extrabold text-2xl lg:text-3xl tracking-[-0.03em] text-[#0A0A0A] leading-none">
            G-KAIS
          </span>
          <span className="font-mono-code text-[10px] tracking-[0.24em] text-[#777777] font-semibold mt-1.5 uppercase transition-colors group-hover:text-[#0A3F4D]">
            AI BUSINESS SYSTEMS
          </span>
        </a>

        {/* Clean Desktop Navigation Menu */}
        <nav className="hidden md:flex items-center space-x-10 text-sm font-medium text-[#777777]">
          <button 
            onClick={() => scrollTo('solutions')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left"
            id="nav-link-solutions"
          >
            Solutions
          </button>
          <button 
            onClick={() => scrollTo('the-system')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left"
            id="nav-link-systems"
          >
            Systems
          </button>
          <button 
            onClick={() => scrollTo('leadflow')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left"
            id="nav-link-leadflow"
          >
            LeadFlow
          </button>
          <button 
            onClick={() => scrollTo('process')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left"
            id="nav-link-process"
          >
            Process
          </button>
          <button 
            onClick={() => scrollTo('about')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left"
            id="nav-link-about"
          >
            About
          </button>
        </nav>

        {/* Header Action Button */}
        <div className="hidden md:flex items-center space-x-4">
          <button
            onClick={onOpenAudit}
            id="header-book-audit-btn"
            className="group inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F7F7F5] bg-[#0A0A0A] hover:bg-[#0A3F4D] transition-all duration-200"
          >
            <span>BOOK AN AUDIT</span>
            <ArrowUpRight className="w-3.5 h-3.5 ml-1.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#0A0A0A] hover:text-[#0A3F4D]"
            aria-label="Toggle menu"
            id="mobile-menu-toggle-btn"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#0A0A0A]/10 bg-[#F7F7F5] px-6 py-8 flex flex-col space-y-6">
          <button 
            onClick={() => scrollTo('solutions')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            Solutions
          </button>
          <button 
            onClick={() => scrollTo('the-system')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            Systems
          </button>
          <button 
            onClick={() => scrollTo('leadflow')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            LeadFlow
          </button>
          <button 
            onClick={() => scrollTo('process')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            Process
          </button>
          <button 
            onClick={() => scrollTo('about')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            About
          </button>
          <div className="pt-4 border-t border-[#0A0A0A]/10">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAudit();
              }}
              className="w-full text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#F7F7F5] bg-[#0A0A0A]"
            >
              BOOK AN AUDIT
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
