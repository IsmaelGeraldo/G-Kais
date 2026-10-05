import React from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { DashboardHistoryV7 } from './DashboardHistoryV7';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
};

export function DashboardHistoryV8(props: Props) {
  const priorityDetail = props.language === 'es' ? 'Tareas activas por resolver' : 'Active tasks to resolve';

  return <div className="gkais-dashboard-v8">
    <style>{`
      .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div:first-child > div:first-child::after {
        content: '${priorityDetail}';
        display:block;
        margin-top:4px;
        font-size:12px;
        line-height:16px;
        font-weight:400;
        color:rgba(0,0,0,.45);
      }
      .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] {
        color:transparent !important;
      }
    `}</style>
    <DashboardHistoryV7 {...props} />
  </div>;
}
