import React, { useEffect, useRef } from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { FormationsWorkspaceV2 } from './FormationsWorkspaceV2';

export function FormationsWorkspace({ language }: { language: Language }) {
  const shellRef = useRef<HTMLDivElement>(null);
  const deepLinkHandled = useRef(false);

  useEffect(() => {
    if (deepLinkHandled.current || new URLSearchParams(window.location.search).get('tab') !== 'plan') return;
    let frame = 0;
    let attempts = 0;
    const activatePlan = () => {
      attempts += 1;
      const buttons = Array.from(shellRef.current?.querySelectorAll('button') || []);
      const target = buttons.find((button) => /^(Plan de clases|Class plan)\s*\(/i.test((button.textContent || '').trim()));
      if (target) {
        deepLinkHandled.current = true;
        target.click();
        return;
      }
      if (attempts < 20) frame = window.requestAnimationFrame(activatePlan);
    };
    frame = window.requestAnimationFrame(activatePlan);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return <div ref={shellRef} className="gkais-formations-shell">
    <style>{`
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] { background:#111413 !important; color:#fff !important; }
      .gkais-formations-shell button[class*="bg-[#F7F7F5]"] p { color:inherit !important; }
      .gkais-formations-shell > div > p[class*="bg-[#F7F7F5]"],
      .gkais-formations-shell p[class*="bg-[#F7F7F5]"][class*="text-black/55"] { position:fixed; right:24px; bottom:24px; top:auto; z-index:160; max-width:380px; background:#111413 !important; color:#fff !important; box-shadow:0 16px 44px rgba(0,0,0,.20); border-radius:14px; padding:12px 16px; }
    `}</style>
    <FormationsWorkspaceV2 language={language} />
  </div>;
}