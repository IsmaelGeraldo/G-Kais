import React, { useState } from 'react';
import { HeartHandshake, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { ContinuityWorkspace } from './ContinuityWorkspace';
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
            ? 'Busca cualquier persona por nombre, email o teléfono y continúa desde su historial real: webinar, formación, seguimiento o mentoría 1:1.'
            : 'Find anyone by name, email or phone and continue from their real history: webinar, program, follow-up or 1:1 mentoring.'}</p>
        </div>
        <div className="inline-flex w-fit rounded-full border border-black/10 bg-[#F7F7F5] p-1">
          <button type="button" onClick={() => setTab('people')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${tab === 'people' ? 'bg-[#111413] text-white' : 'text-black/50'}`}><UsersRound className="h-3.5 w-3.5" />{language === 'es' ? 'Personas' : 'People'}</button>
          <button type="button" onClick={() => setTab('follow-up')} className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold ${tab === 'follow-up' ? 'bg-[#111413] text-white' : 'text-black/50'}`}><HeartHandshake className="h-3.5 w-3.5" />{language === 'es' ? 'Seguimientos activos' : 'Active follow-up'}</button>
        </div>
      </div>
    </section>

    {tab === 'people' ? <PeopleWorkspace language={language} /> : <ContinuityWorkspace language={language} />}
  </div>;
}
