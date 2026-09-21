import React, { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { LanguageSelector } from './LanguageSelector';
import { useLanguage } from '../i18n/LanguageContext';

interface HeaderProps {
  onOpenAudit: () => void;
  onOpenAdmin?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenAudit, onOpenAdmin }) => {
  const { language } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const showDevelopmentAdminEntry = import.meta.env.DEV && Boolean(onOpenAdmin);

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
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Large Logo */}
        <a
          href="/"
          className="group flex flex-col justify-center text-left select-none"
          id="brand-logo-link"
          aria-label="G-KAIS home"
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
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
            id="nav-link-solutions"
          >
            {language === 'es' ? 'Soluciones' : 'Solutions'}
          </button>
          <button 
            onClick={() => scrollTo('leadflow')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
            id="nav-link-leadflow"
          >
            LeadFlow
          </button>
          <button 
            onClick={() => scrollTo('the-system')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
            id="nav-link-how-it-works"
          >
            {language === 'es' ? 'Cómo funciona' : 'How It Works'}
          </button>
          <button 
            onClick={() => scrollTo('about')} 
            className="hover:text-[#0A0A0A] transition-colors py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
            id="nav-link-about"
          >
            {language === 'es' ? 'Nosotros' : 'About'}
          </button>
        </nav>

        {/* Header Action Button */}
        <div className="hidden md:flex items-center space-x-3">
          <LanguageSelector compact />
          {showDevelopmentAdminEntry && onOpenAdmin && (
            <button
              type="button"
              onClick={onOpenAdmin}
              id="header-admin-preview-btn"
              className="inline-flex items-center justify-center px-3 py-2.5 text-[10px] font-mono-code font-semibold uppercase tracking-wider text-[#6B6B6B] border border-[#D8D8D8] bg-white hover:text-[#0A0A0A] hover:border-[#0A0A0A] transition-colors rounded-xl"
            >
              {language === 'es' ? 'Vista Admin' : 'Admin Preview'}
            </button>
          )}
          <button
            onClick={onOpenAudit}
            id="header-free-audit-btn"
            className="group inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#F7F7F5] bg-[#0A0A0A] hover:bg-[#0A3F4D] rounded-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]"
          >
            <span>{language === 'es' ? 'Auditoría gratis' : 'Free Audit'}</span>
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
            {language === 'es' ? 'Soluciones' : 'Solutions'}
          </button>
          <button 
            onClick={() => scrollTo('leadflow')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            LeadFlow
          </button>
          <button 
            onClick={() => scrollTo('the-system')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            {language === 'es' ? 'Cómo funciona' : 'How It Works'}
          </button>
          <button 
            onClick={() => scrollTo('about')} 
            className="text-left text-lg font-medium text-[#0A0A0A]"
          >
            {language === 'es' ? 'Nosotros' : 'About'}
          </button>
          <div className="pt-4 border-t border-[#0A0A0A]/10 space-y-3">
            <div className="flex justify-start">
              <LanguageSelector />
            </div>
            {showDevelopmentAdminEntry && onOpenAdmin && (
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  onOpenAdmin();
                }}
                className="w-full rounded-xl text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#0A0A0A] border border-[#0A0A0A]/20 bg-white"
              >
                {language === 'es' ? 'Vista Admin' : 'Admin Preview'}
              </button>
            )}
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAudit();
              }}
              className="w-full rounded-xl text-center px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#F7F7F5] bg-[#0A0A0A]"
            >
              {language === 'es' ? 'Auditoría gratis' : 'Free Audit'}
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
