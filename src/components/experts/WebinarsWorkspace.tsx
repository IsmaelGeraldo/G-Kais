import React from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { WebinarsWorkspaceV2 } from './WebinarsWorkspaceV2';

export function WebinarsWorkspace({ language }: { language: Language }) {
  return <div className="gkais-webinars-shell">
    <style>{`
      .gkais-webinars-shell button[class*="bg-[#F7F7F5]"] { background:#111413 !important; color:#fff !important; }
      .gkais-webinars-shell button[class*="bg-[#F7F7F5]"] p { color:inherit !important; }
      .gkais-webinars-shell > div > p[class*="bg-[#F7F7F5]"],
      .gkais-webinars-shell p[class*="bg-[#F7F7F5]"][class*="text-black/55"] { position:fixed; right:24px; top:88px; z-index:120; max-width:380px; background:#111413 !important; color:#fff !important; box-shadow:0 16px 44px rgba(0,0,0,.16); border-radius:14px; padding:12px 16px; }
    `}</style>
    <WebinarsWorkspaceV2 language={language} />
  </div>;
}
