import React, { useEffect, useRef, useState } from 'react';
import { HeartHandshake, UsersRound } from 'lucide-react';
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
  const shellRef = useRef<HTMLElement>(null);
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

  return <section ref={shellRef} className="gkais-relationships-shell overflow-hidden rounded-2xl border border-black/10 bg-white">
    <style>{`
      .gkais-relationships-shell div[class*="fixed"][class*="right-6"][class*="top-24"] {
        top:auto !important;
        bottom:24px !important;
      }
      .gkais-relationships-shell p[class*="text-[10px]"][class*="text-[#8D332C]"] {
        position:fixed !important;
        right:24px !important;
        bottom:24px !important;
        top:auto !important;
        z-index:160 !important;
        max-width:380px;
        border-radius:14px;
        background:#111413 !important;
        color:#fff !important;
        padding:12px 16px !important;
        box-shadow:0 16px 44px rgba(0,0,0,.20);
        font-size:12px !important;
      }
    `}</style>
    <div className="flex flex-col gap-4 border-b border-black/7 p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'RELACIONES' : 'RELATIONSHIPS'}</p>
        <h3 className="mt-1.5 text-xl font-semibold">{language === 'es' ? 'Una persona, toda la relación' : 'One person, the whole relationship'}</h3>
        <p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es'
          ? 'Personas es la ficha maestra; Seguimiento es la mesa secundaria para leads y relaciones que todavía no son alumnos o clientes 1:1.'
          : 'People is the master record; Follow-up is the secondary desk for leads and relationships that are not yet students or 1:1 clients.'}</p>
      </div>
      <div className="inline-flex w-fit rounded-xl bg-[#F7F7F5] p-1">
        <button type="button" onClick={() => setTab('people')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'people' ? '' : 'text-black/50'}`} style={activeStyle(tab === 'people')}><UsersRound className="h-4 w-4" />{language === 'es' ? 'Personas' : 'People'}</button>
        <button type="button" onClick={() => setTab('follow-up')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab === 'follow-up' ? '' : 'text-black/50'}`} style={activeStyle(tab === 'follow-up')}><HeartHandshake className="h-4 w-4" />{language === 'es' ? 'Seguimiento' : 'Follow-up'}</button>
      </div>
    </div>
    <div className="bg-[#F7F7F5]/35 p-4 md:p-5">{tab === 'people' ? <PeopleWorkspaceV3 language={language} /> : <FollowUpWorkWorkspaceV2 language={language} />}</div>
  </section>;
}
