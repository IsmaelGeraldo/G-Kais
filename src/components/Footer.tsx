import React from 'react';
import { useLanguage } from '../i18n/LanguageContext';

interface FooterProps {
  onOpenAudit: () => void;
  onOpenContact: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenAudit, onOpenContact }) => {
  const { language } = useLanguage();
  const scrollTo = (id: string) => {
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
    <footer className="bg-[#F7F7F5] border-t border-[#0A0A0A]/10 py-16 lg:py-24">
      <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-16 border-b border-[#0A0A0A]/10">
          {/* Brand Info */}
          <div className="md:col-span-5 flex flex-col justify-between">
            <div>
              <span className="font-extrabold text-3xl tracking-[-0.03em] text-[#0A0A0A] leading-none block">
                G-KAIS
              </span>
              <span className="font-mono-code text-[11px] tracking-[0.24em] text-[#777777] font-semibold mt-2 uppercase block">
                AI BUSINESS SYSTEMS
              </span>
              <p className="text-sm text-[#777777] mt-6 max-w-sm leading-relaxed">
                {language === 'es'
                  ? 'G-KAIS diseña e implementa sistemas empresariales inteligentes que capturan, organizan y hacen seguimiento a oportunidades comerciales.'
                  : 'G-KAIS designs and implements intelligent AI business systems that capture, organize, and follow up with commercial opportunities.'}
              </p>
            </div>

            <div className="mt-8 pt-4">
              <span className="font-mono-code text-[10px] text-[#777777] uppercase tracking-widest">
                {language === 'es' ? 'DISEÑADO PARA ESCALAR // EJECUCIÓN CONFIABLE' : 'ARCHITECTED FOR SCALE // DETERMINISTIC EXECUTION'}
              </span>
            </div>
          </div>

          {/* Links Columns */}
          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {/* Solutions */}
            <div className="flex flex-col space-y-3">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A0A0A] font-bold">
                {language === 'es' ? 'Soluciones' : 'Solutions'}
              </span>
              <button 
                onClick={() => scrollTo('leadflow')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-leadflow"
              >
                LeadFlow
              </button>
              <button 
                onClick={() => scrollTo('about')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-bookingflow"
              >
                BookingFlow
              </button>
              <button 
                onClick={() => scrollTo('about')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-supportflow"
              >
                SupportFlow
              </button>
              <button 
                onClick={() => scrollTo('about')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-quoteflow"
              >
                QuoteFlow
              </button>
              <button 
                onClick={() => scrollTo('about')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-reviewflow"
              >
                ReviewFlow
              </button>
            </div>

            {/* Company */}
            <div className="flex flex-col space-y-3">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A0A0A] font-bold">
                {language === 'es' ? 'Empresa' : 'Company'}
              </span>
              <button 
                onClick={() => scrollTo('about')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-about"
              >
                {language === 'es' ? 'Nosotros' : 'About'}
              </button>
              <button 
                onClick={() => scrollTo('process')}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-process"
              >
                {language === 'es' ? 'Proceso' : 'Process'}
              </button>
              <button 
                onClick={onOpenContact}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-contact"
              >
                {language === 'es' ? 'Contacto' : 'Contact'}
              </button>
              <button 
                onClick={onOpenAudit}
                className="text-sm text-[#0A3F4D] font-medium text-left hover:underline pt-2"
                id="footer-link-free-audit"
              >
                {language === 'es' ? 'Auditoría gratis →' : 'Free Audit →'}
              </button>
            </div>

            {/* Legal */}
            <div className="flex flex-col space-y-3">
              <span className="font-mono-code text-[11px] uppercase tracking-wider text-[#0A0A0A] font-bold">
                {language === 'es' ? 'Legal' : 'Legal'}
              </span>
              <button 
                onClick={onOpenContact}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-privacy"
              >
                {language === 'es' ? 'Privacidad' : 'Privacy'}
              </button>
              <button 
                onClick={onOpenContact}
                className="text-sm text-[#777777] hover:text-[#0A0A0A] text-left transition-colors"
                id="footer-link-terms"
              >
                {language === 'es' ? 'Términos' : 'Terms'}
              </button>
              <span className="text-xs font-mono-code text-[#777777] pt-4">
                {language === 'es' ? 'Protección de datos empresarial' : 'Enterprise Data Protection'}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom copyright line */}
        <div className="pt-8 flex flex-col sm:flex-row items-start sm:items-center justify-between text-xs text-[#777777] font-mono-code">
          <span>
            &copy; {new Date().getFullYear()} G-KAIS Systems Inc. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}
          </span>
          <span className="mt-2 sm:mt-0">
            {language === 'es' ? 'Sistemas empresariales con IA // Nivel empresarial' : 'AI Business Systems // Enterprise Grade'}
          </span>
        </div>
      </div>
    </footer>
  );
};
