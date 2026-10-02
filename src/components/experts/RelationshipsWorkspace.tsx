import React, { useState } from 'react';
import { HeartHandshake, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { FollowUpWorkWorkspace } from './FollowUpWorkWorkspace';
import { PeopleWorkspace } from './PeopleWorkspace';

type RelationshipTab = 'people' | 'follow-up';

type Props = {
  language: Language;
  initialTab?: RelationshipTab;
};

export function RelationshipsWorkspace({ language, initialTab = 'people' }: Props) {
  const [tab, setTab] = useState<RelationshipTab>(initialTab);

  return <div className="space-y-5">
    <section className="rounded-2xl border border-black/10 bg-white p-4 md:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language === 'es' ? 'RELACIONES' : 'RELATIONSHIPS'}</p>
          <h3 className="mt-1.5 text-xl font-semibold">{language === 'es' ? 'Una persona, toda la relación' : 'One person, the whole relationship'}</h3>
          <p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language === 'es'
            ? 'Personas conserva la historia maestra. Seguimiento funciona como una mesa secundaria para no compradores y relaciones de continuidad.'
            : 'People keeps the master history. Follow-up is the secondary work desk for non-buyers and continuity relationships.'}</p>
        </div>
        <div className="inline-flex w-fit rounded-full border border-black/10 bg-[#F7F7F5] p-1">
          <button type="button" onClick={() => setTab('people')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${tab === 'people' ? 'bg-[#111413] text-white' : 'text-black/50'}`}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Personas' : 'People'}</button>
          <button type="button" onClick={() => setTab('follow-up')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${tab === 'follow-up' ? 'bg-[#111413] text-white' : 'text-black/50'}`}><HeartHandshake className="h-3.5 w-3.5" />{language === 'es' ? 'Seguimiento' : 'Follow-up'}</button>
        </div>
      </div>
    </section>

    {tab === 'people' ? <PeopleWorkspace language={language} /> : <FollowUpWorkWorkspace language={language} />}
  </div>;
}
