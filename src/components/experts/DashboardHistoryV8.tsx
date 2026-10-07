import React, { useLayoutEffect, useRef } from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { DashboardHistoryV7 } from './DashboardHistoryV7';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
  canInteract?: (id: string) => boolean;
};

export function DashboardHistoryV8(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const priorityDetail = props.language === 'es' ? 'Tareas activas por resolver' : 'Active tasks to resolve';

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const getCards = () => {
      const dashboard = root.querySelector<HTMLElement>('.gkais-dashboard-v7 > div');
      const grid = dashboard?.firstElementChild as HTMLElement | null;
      return grid ? Array.from(grid.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element.tagName === 'ARTICLE') : [];
    };

    const alignPriorityToPurchases = () => {
      const cards = getCards();
      if (cards.length < 2) return;

      const priorityTop = cards[0].firstElementChild as HTMLElement | null;
      const priorityLeft = priorityTop?.firstElementChild as HTMLElement | null;
      const purchasesTop = cards[1].firstElementChild as HTMLElement | null;
      const purchasesLeft = purchasesTop?.firstElementChild as HTMLElement | null;
      if (!priorityTop || !priorityLeft || !purchasesTop || !purchasesLeft) return;

      const purchasesTopHeight = Math.ceil(purchasesTop.getBoundingClientRect().height);
      const purchasesLeftHeight = Math.ceil(purchasesLeft.getBoundingClientRect().height);
      const topMinHeight = `${purchasesTopHeight}px`;
      const leftMinHeight = `${purchasesLeftHeight}px`;
      if (priorityTop.style.minHeight !== topMinHeight) priorityTop.style.minHeight = topMinHeight;
      if (priorityLeft.style.minHeight !== leftMinHeight) priorityLeft.style.minHeight = leftMinHeight;
    };

    const cards = getCards();
    if (cards.length < 2) return;
    const purchasesLabel = cards[1].querySelector<HTMLElement>('p');
    if (purchasesLabel) purchasesLabel.textContent = props.language === 'es' ? 'Compras del mes' : 'Purchases this month';

    alignPriorityToPurchases();
    const observer = new ResizeObserver(alignPriorityToPurchases);
    observer.observe(cards[1]);
    return () => observer.disconnect();
  }, [props.language]);

  return <div ref={rootRef} className="gkais-dashboard-v8">
    <style>{`
      .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div:first-child > div:first-child {
        position:relative;
      }
      .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div:first-child > div:first-child::after {
        content: '${priorityDetail}';
        position:absolute;
        left:0;
        bottom:0;
        font-size:12px;
        line-height:16px;
        font-weight:400;
        color:rgba(0,0,0,.45);
        pointer-events:none;
      }
      .gkais-dashboard-v8 .gkais-dashboard-v7 > div > div:first-child > article:first-child > div[class*="border-t"] {
        color:transparent !important;
      }
    `}</style>
    <DashboardHistoryV7 {...props} />
  </div>;
}
