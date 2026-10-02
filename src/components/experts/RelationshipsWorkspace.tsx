import React, { useState } from 'react';
import { HeartHandshake, UsersRound } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';
import { FollowUpWorkWorkspaceV2 } from './FollowUpWorkWorkspaceV2';
import { PeopleWorkspaceV2 } from './PeopleWorkspaceV2';

type RelationshipTab = 'people' | 'follow-up';
export function RelationshipsWorkspace({ language, initialTab = 'people' }: { language: Language; initialTab?: RelationshipTab }) {
  const [tab,setTab]=useState<RelationshipTab>(initialTab);
  return <section className="overflow-hidden rounded-2xl border border-black/10 bg-white">
    <div className="flex flex-col gap-4 border-b border-black/7 p-4 md:p-5 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0A3F4D]">{language==='es'?'RELACIONES':'RELATIONSHIPS'}</p><h3 className="mt-1.5 text-xl font-semibold">{language==='es'?'Una persona, toda la relación':'One person, the whole relationship'}</h3><p className="mt-1.5 max-w-2xl text-sm leading-5 text-black/50">{language==='es'?'Personas es la ficha maestra; Seguimiento es la mesa secundaria de leads y continuidad gratuita.':'People is the master record; Follow-up is the secondary desk for leads and free-continuity relationships.'}</p></div><div className="inline-flex w-fit rounded-xl bg-[#F7F7F5] p-1"><button onClick={()=>setTab('people')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab==='people'?'bg-[#111413] text-white':'text-black/50'}`}><UsersRound className="h-4 w-4"/>{language==='es'?'Personas':'People'}</button><button onClick={()=>setTab('follow-up')} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-xs font-semibold ${tab==='follow-up'?'bg-[#111413] text-white':'text-black/50'}`}><HeartHandshake className="h-4 w-4"/>{language==='es'?'Seguimiento':'Follow-up'}</button></div></div>
    <div className="bg-[#F7F7F5]/35 p-4 md:p-5">{tab==='people'?<PeopleWorkspaceV2 language={language}/>:<FollowUpWorkWorkspaceV2 language={language}/>}</div>
  </section>;
}
