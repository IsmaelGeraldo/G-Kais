import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

export type Language = 'es' | 'en';

type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  toggleLanguage: () => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

function initialLanguage(): Language {
  try {
    const saved = window.localStorage.getItem('gkais-language');
    if (saved === 'es' || saved === 'en') return saved;
  } catch {}

  const browserLanguage =
    typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'es';

  return browserLanguage.startsWith('es') ? 'es' : 'en';
}

export const LanguageProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(initialLanguage);

  const setLanguage = (next: Language) => {
    setLanguageState(next);
    try {
      window.localStorage.setItem('gkais-language', next);
    } catch {}
  };

  const toggleLanguage = () => {
    setLanguage(language === 'es' ? 'en' : 'es');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const value = useMemo(
    () => ({ language, setLanguage, toggleLanguage }),
    [language]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used inside LanguageProvider.');
  }
  return context;
}
