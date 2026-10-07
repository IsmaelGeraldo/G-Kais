import React, { useEffect, useLayoutEffect, useRef } from 'react';
import type { Language } from '../../i18n/LanguageContext';
import { DashboardHistoryV6 } from './DashboardHistoryV6';

type Props = {
  language: Language;
  onNavigate: (id: string) => void;
  onOpenClient: (id: string) => void;
  onStartSession: (id: string) => void;
  canInteract?: (id: string) => boolean;
};

const WEEKDAY_INDEX: Record<string, number> = {
  domingo: 0, sunday: 0,
  lunes: 1, monday: 1,
  martes: 2, tuesday: 2,
  miercoles: 3, wednesday: 3,
  jueves: 4, thursday: 4,
  viernes: 5, friday: 5,
  sabado: 6, saturday: 6
};

const MONTH_INDEX: Record<string, number> = {
  ene: 0, jan: 0,
  feb: 1,
  mar: 2,
  abr: 3, apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7, aug: 7,
  sep: 8, sept: 8,
  oct: 9,
  nov: 10,
  dic: 11, dec: 11
};

function normalizedWord(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace('.', '').trim();
}

function dateLabel(year: number, month: number, day: number, hours?: number, minutes?: number): string {
  const datePart = `${String(day).padStart(2, '0')}-${String(month + 1).padStart(2, '0')}-${year}`;
  if (hours === undefined || minutes === undefined) return datePart;
  return `${datePart} · ${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function relativeAgendaLabel(value: string): string | null {
  const match = value.trim().match(/^([^·,]+)\s*·\s*(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const word = normalizedWord(match[1]);
  const hours = Number(match[2]);
  const minutes = Number(match[3]);
  const now = new Date();
  const candidate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0, 0);
  if (word === 'hoy' || word === 'today') return dateLabel(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), hours, minutes);
  if (word === 'manana' || word === 'tomorrow') {
    candidate.setDate(candidate.getDate() + 1);
    return dateLabel(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), hours, minutes);
  }
  const weekday = WEEKDAY_INDEX[word];
  if (weekday === undefined) return null;
  let delta = (weekday - now.getDay() + 7) % 7;
  if (delta === 0 && candidate.getTime() < now.getTime()) delta = 7;
  candidate.setDate(candidate.getDate() + delta);
  return dateLabel(candidate.getFullYear(), candidate.getMonth(), candidate.getDate(), hours, minutes);
}

function normalizeAgendaDateText(value: string): string {
  if (/\b\d{2}-\d{2}-\d{4}(?:\s*·\s*\d{2}:\d{2})?\b/.test(value)) return value;

  const iso = value.match(/\b(\d{4})-(\d{2})-(\d{2})(?:\s*(?:·|T)\s*|\s+)?(\d{1,2}:\d{2})?/);
  if (iso) {
    const replacement = dateLabel(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]), iso[4] ? Number(iso[4].split(':')[0]) : undefined, iso[4] ? Number(iso[4].split(':')[1]) : undefined);
    return value.replace(iso[0], replacement);
  }

  const relative = relativeAgendaLabel(value);
  if (relative) return relative;

  const spanish = value.match(/\b(\d{1,2})\s+(ene|feb|mar|abr|may|jun|jul|ago|sep|sept|oct|nov|dic)\.?\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2}))?/i);
  if (spanish) {
    const month = MONTH_INDEX[normalizedWord(spanish[2])];
    if (month !== undefined) {
      const replacement = dateLabel(Number(spanish[3]), month, Number(spanish[1]), spanish[4] ? Number(spanish[4]) : undefined, spanish[5] ? Number(spanish[5]) : undefined);
      return value.replace(spanish[0], replacement);
    }
  }

  const english = value.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\.?\s+(\d{1,2}),\s+(\d{4})(?:,?\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (english) {
    const month = MONTH_INDEX[normalizedWord(english[1])];
    if (month !== undefined) {
      let hours = english[4] ? Number(english[4]) : undefined;
      const minutes = english[5] ? Number(english[5]) : undefined;
      const meridiem = english[6]?.toUpperCase();
      if (hours !== undefined && meridiem === 'PM' && hours < 12) hours += 12;
      if (hours !== undefined && meridiem === 'AM' && hours === 12) hours = 0;
      const replacement = dateLabel(Number(english[3]), month, Number(english[2]), hours, minutes);
      return value.replace(english[0], replacement);
    }
  }

  return value;
}

function normalizeAgenda(root: HTMLElement): void {
  const agendaSection = Array.from(root.querySelectorAll('section')).find((section) =>
    Array.from(section.querySelectorAll('p')).some((item) => (item.textContent || '').trim() === 'AGENDA')
  );
  if (!agendaSection) return;
  agendaSection.querySelectorAll('button').forEach((button) => {
    const subtitle = Array.from(button.querySelectorAll('span')).find((span) => {
      const className = typeof span.className === 'string' ? span.className : '';
      return className.includes('mt-1') && className.includes('text-[10px]');
    });
    if (!subtitle?.textContent) return;
    const next = normalizeAgendaDateText(subtitle.textContent);
    if (next !== subtitle.textContent) subtitle.textContent = next;
  });
}

function alignMetricCardsToBuyers(root: HTMLElement): void {
  const dashboard = root.firstElementChild as HTMLElement | null;
  const metricGrid = dashboard?.firstElementChild as HTMLElement | null;
  if (!metricGrid) return;

  const cards = Array.from(metricGrid.children).filter((element): element is HTMLElement => element instanceof HTMLElement && element.tagName === 'ARTICLE');
  if (cards.length < 4) return;

  const buyersCard = cards[1];
  const buyersTop = buyersCard.firstElementChild as HTMLElement | null;
  const buyersLeft = buyersTop?.firstElementChild as HTMLElement | null;
  const buyersLabel = buyersLeft?.firstElementChild as HTMLElement | null;
  if (!buyersTop || !buyersLeft || !buyersLabel) return;

  const labelHeight = Math.ceil(buyersLabel.getBoundingClientRect().height);
  const leftHeight = Math.ceil(buyersLeft.getBoundingClientRect().height);
  const topHeight = Math.ceil(buyersTop.getBoundingClientRect().height);

  cards.forEach((card, index) => {
    if (index === 1) return;
    const top = card.firstElementChild as HTMLElement | null;
    const left = top?.firstElementChild as HTMLElement | null;
    const label = left?.firstElementChild as HTMLElement | null;
    if (!top || !left || !label) return;
    label.style.minHeight = `${labelHeight}px`;
    left.style.minHeight = `${leftHeight}px`;
    top.style.minHeight = `${topHeight}px`;
  });
}

export function DashboardHistoryV7(props: Props) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    normalizeAgenda(root);
    const observer = new MutationObserver(() => normalizeAgenda(root));
    observer.observe(root, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    const align = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => alignMetricCardsToBuyers(root));
    };

    align();
    const observer = new ResizeObserver(align);
    observer.observe(root);
    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, []);

  return <div ref={rootRef} className="gkais-dashboard-v7">
    <style>{`
      .gkais-dashboard-v7 > div > div:first-child { align-items: stretch; }
      .gkais-dashboard-v7 > div > div:first-child > article { display:flex; height:100%; flex-direction:column; }
      .gkais-dashboard-v7 > div > div:first-child > article > div:first-child > div:first-child { display:flex; flex-direction:column; }
      .gkais-dashboard-v7 > div > div:first-child > article > div:first-child > div:first-child > p[class*="mt-1"] { margin-top:auto !important; padding-top:4px; }
      .gkais-dashboard-v7 > div > div:first-child > article > button[data-gkais-static-interaction="true"],
      .gkais-dashboard-v7 > div > div:first-child > article > div[class*="border-t"] { margin-top:4px !important; }
    `}</style>
    <DashboardHistoryV6 {...props} />
  </div>;
}
