import React from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { DashboardHistoryV10 } from './DashboardHistoryV10';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
  canInteract?: (id: string) => boolean;
};

export function DashboardHistoryV11(props: Props) {
  return <div className="gkais-dashboard-v11">
    <style>{`
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button,
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button:hover,
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button:focus,
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button:focus-visible,
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button:active,
      .gkais-dashboard-v11 .gkais-dashboard-v10-team .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] [data-gkais-team-workload-host="true"] > button[aria-expanded="true"] {
        color: rgba(0,0,0,.55) !important;
        background: transparent !important;
        box-shadow: none !important;
        outline: none !important;
        filter: none !important;
        -webkit-tap-highlight-color: transparent !important;
      }
    `}</style>
    <DashboardHistoryV10 {...props} />
  </div>;
}
