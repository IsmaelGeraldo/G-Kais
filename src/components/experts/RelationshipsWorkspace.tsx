import React, { useEffect, useRef, useState } from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { FollowUpWorkWorkspaceV2 } from './FollowUpWorkWorkspaceV2';
import { PeopleWorkspaceV3 } from './PeopleWorkspaceV3';

type RelationshipTab = 'people' | 'follow-up';

function activeStyle(active: boolean): React.CSSProperties | undefined {
  return active ? {
    background: 'var(--gkais-internal-accent, #111413)',
    color: 'var(--gkais-internal-accent-text, #ffffff)'
  } : undefined;
}

export function RelationshipsWorkspace({ language, initialTab = 'people' }: { language: Language; initialTab?: RelationshipTab }) {
  const [tab, setTab] = useState<RelationshipTab>(initialTab);
  const shellRef = useRef<HTMLDivElement>(null);
  const deepLinkHandled = useRef(false);

  useEffect(() => { setTab(initialTab); }, [initialTab]);

  useEffect(() => {
    if (tab !== 'follow-up' || deepLinkHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const requestedSegment = params.get('segment');
    const requestedLane = params.get('lane');
    if (!requestedSegment && !requestedLane) return;

    let frame = 0;
    let attempts = 0;
    const activate = () => {
      attempts += 1;
      const buttons = Array.from(shellRef.current?.querySelectorAll('button') || []);
      const segmentPattern = requestedSegment === 'nurture' ? /^(En seguimiento|In follow-up)$/i : /^(Leads)$/i;
      const segmentButton = buttons.find((button) => segmentPattern.test((button.textContent || '').trim()));
      if (!segmentButton) {
        if (attempts < 20) frame = window.requestAnimationFrame(activate);
        return;
      }
      segmentButton.click();
      frame = window.requestAnimationFrame(() => {
        const nextButtons = Array.from(shellRef.current?.querySelectorAll('button') || []);
        const lanePattern = requestedLane === 'replied'
          ? /^(Respondieron|Replied)\b/i
          : requestedLane === 'waiting'
            ? /^(Interacciones activas|Active interactions)\b/i
            : /^(Por hacer|To do)\b/i;
        nextButtons.find((button) => lanePattern.test((button.textContent || '').trim()))?.click();
        deepLinkHandled.current = true;
      });
    };
    frame = window.requestAnimationFrame(activate);
    return () => window.cancelAnimationFrame(frame);
  }, [tab]);

  return <div ref={shellRef} className="gkais-relationships-shell space-y-4">
    <style>{`
      .gkais-relationships-shell [class*="fixed"][class*="right-6"][class*="top-24"] { top:auto !important; bottom:24px !important; }
      .gkais-relationships-shell p[class*="text-[10px]"][class*="text-[#8D332C]"] { position:fixed !important; right:24px !important; bottom:24px !important; top:auto !important; z-index:160 !important; max-width:380px; border-radius:14px; background:#111413 !important; color:#fff !important; padding:12px 16px !important; box-shadow:0 16px 44px rgba(0,0,0,.20); font-size:12px !important; }
    `}</style>
    <section className="rounded-2xl border border-black/10 bg-white p-2">
      <div className="grid grid-cols-2 gap-1">
        <button type="button" onClick={() => setTab('people')} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'people' ? '' : 'text-black/45'}`} style={activeStyle(tab === 'people')}>{language === 'es' ? 'Personas' : 'People'}</button>
        <button type="button" onClick={() => setTab('follow-up')} className={`rounded-xl px-4 py-3 text-sm font-semibold ${tab === 'follow-up' ? '' : 'text-black/45'}`} style={activeStyle(tab === 'follow-up')}>{language === 'es' ? 'Seguimiento' : 'Follow-up'}</button>
      </div>
    </section>
    {tab === 'people' ? <PeopleWorkspaceV3 language={language} /> : <FollowUpWorkWorkspaceV2 language={language} />}
  </div>;
}