import React from 'react';
import { Languages } from 'lucide-react';
import { useLanguage } from '../i18n/LanguageContext';

interface LanguageSelectorProps {
  compact?: boolean;
  inverted?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
  compact = false,
  inverted = false
}) => {
  const { language, setLanguage } = useLanguage();

  const base =
    'inline-flex items-center border rounded-xl overflow-hidden text-[10px] font-mono-code uppercase tracking-wider';
  const surface = inverted
    ? 'border-white/20 bg-black text-white'
    : 'border-[#D8D8D8] bg-white text-[#0A0A0A]';

  return (
    <div
      className={`${base} ${surface}`}
      role="group"
      aria-label={language === 'es' ? 'Seleccionar idioma' : 'Select language'}
    >
      {!compact && <Languages className="w-3.5 h-3.5 ml-2.5 mr-1" />}
      {(['es', 'en'] as const).map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLanguage(code)}
          className={`px-2.5 py-2 transition-colors ${
            language === code
              ? inverted
                ? 'bg-white text-black'
                : 'bg-[#0A0A0A] text-white'
              : inverted
              ? 'text-white/60 hover:text-white'
              : 'text-[#777] hover:text-[#0A0A0A]'
          }`}
          aria-pressed={language === code}
        >
          {code.toUpperCase()}
        </button>
      ))}
    </div>
  );
};
