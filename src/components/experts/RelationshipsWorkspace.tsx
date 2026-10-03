import React, { useState } from 'react';
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
  return <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
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
