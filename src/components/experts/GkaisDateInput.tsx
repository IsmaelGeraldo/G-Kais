import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type GkaisDateInputProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  variant?: 'compact' | 'standard';
};

const POPUP_WIDTH = 232;
const POPUP_HEIGHT = 316;
const YEARS = Array.from({ length: 201 }, (_, i) => i + 1900);

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function parseIsoDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const result = new Date(year, month - 1, day, 12);
  return result.getFullYear() === year && result.getMonth() === month - 1 && result.getDate() === day ? result : null;
}

function formatDate(value: string, language: Language): string {
  const date = parseIsoDate(value);
  if (!date) return language === 'es' ? 'dd-mm-aaaa' : 'mm/dd/yyyy';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return language === 'es' ? `${day}-${month}-${year}` : `${month}/${day}/${year}`;
}

/** Same white/black popover language as GkaisTimeInput, retaining YYYY-MM-DD data. */
export function GkaisDateInput({ value, onChange, language, variant = 'compact' }: GkaisDateInputProps) {
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState('');
  const [viewYear, setViewYear] = useState(new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [selector, setSelector] = useState<'day' | 'month' | 'year'>('day');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const yearsRef = useRef<HTMLDivElement>(null);
  const es = language === 'es';
  const standard = variant === 'standard';
  const locale = es ? 'es-CL' : 'en-US';
  const label = es ? 'Fecha' : 'Date';

  const positionPopup = () => {
    const rectangle = triggerRef.current?.getBoundingClientRect();
    if (!rectangle) return;
    const left = Math.max(8, Math.min(rectangle.right - POPUP_WIDTH, window.innerWidth - POPUP_WIDTH - 8));
    const below = rectangle.bottom + 6;
    const top = below + POPUP_HEIGHT <= window.innerHeight - 8
      ? below
      : Math.max(8, rectangle.top - POPUP_HEIGHT - 6);
    setPosition({ top, left });
  };

  const show = () => {
    const date = parseIsoDate(value) || new Date();
    setDraftDate(parseIsoDate(value) ? value : '');
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelector('day');
    positionPopup();
    setOpen(true);
  };

  const changeMonth = (offset: number) => {
    const date = new Date(viewYear, viewMonth + offset, 1, 12);
    setViewYear(date.getFullYear());
    setViewMonth(date.getMonth());
    setSelector('day');
  };

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popupRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', keydown);
    window.addEventListener('resize', positionPopup);
    window.addEventListener('scroll', positionPopup, true);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', keydown);
      window.removeEventListener('resize', positionPopup);
      window.removeEventListener('scroll', positionPopup, true);
    };
  }, [open]);

  useEffect(() => {
    if (open && selector === 'year' && yearsRef.current) {
      const row = Math.floor(Math.max(0, viewYear - YEARS[0]) / 3);
      yearsRef.current.scrollTop = Math.max(0, row * 36 - 72);
    }
  }, [open, selector]);

  const todayIso = toIsoDate(new Date());
  const weekdayStart = es ? 1 : 0;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstWeekday = new Date(viewYear, viewMonth, 1, 12).getDay();
  const offset = (firstWeekday - weekdayStart + 7) % 7;
  const monthNames = Array.from({ length: 12 }, (_, month) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, month, 1, 12))
  );
  const weekdayNames = Array.from({ length: 7 }, (_, i) => {
    const weekday = (weekdayStart + i) % 7;
    return new Intl.DateTimeFormat(locale, { weekday: 'short' })
      .format(new Date(2024, 0, 7 + weekday, 12)).replace(/\.$/, '');
  });

  const accept = () => {
    if (!draftDate) return;
    onChange(draftDate);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative min-w-0 w-full">
      <input
        type="date"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 w-full border border-black/10 bg-white sm:hidden ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      />
      <button
        type="button"
        ref={triggerRef}
        data-gkais-static-interaction="true"
        aria-label={es ? 'Seleccionar fecha' : 'Select date'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : show()}
        className={`hidden min-w-0 w-full items-center justify-between gap-1 border border-black/10 bg-white text-left shadow-none outline-offset-2 sm:flex ${value ? 'text-[#111413]' : 'text-black/45'} ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      >
        <span className="truncate tabular-nums">{formatDate(value, language)}</span>
        <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-black/70" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label={es ? 'Seleccionar fecha' : 'Select date'}
          className="fixed z-[220] w-[232px] rounded-xl border border-black/10 bg-white p-2 shadow-xl"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-2 flex h-7 items-center justify-between gap-1">
            <button type="button" onClick={() => changeMonth(-1)} aria-label={es ? 'Mes anterior' : 'Previous month'} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-black/60 hover:bg-black/5">
              <ChevronLeft aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={es ? 'Elegir mes' : 'Choose month'}
              aria-expanded={selector === 'month'}
              onClick={() => setSelector(selector === 'month' ? 'day' : 'month')}
              className={`min-w-0 flex-1 truncate rounded-md px-0.5 py-1 text-center text-xs font-semibold ${selector === 'month' ? 'bg-black/5 text-[#111413]' : 'text-black/55'}`}
            >{monthNames[viewMonth]}</button>
            <button
              type="button"
              aria-label={es ? 'Elegir año' : 'Choose year'}
              aria-expanded={selector === 'year'}
              onClick={() => setSelector(selector === 'year' ? 'day' : 'year')}
              className={`w-[47px] shrink-0 rounded-md px-0.5 py-1 text-center text-xs font-semibold tabular-nums ${selector === 'year' ? 'bg-black/5 text-[#111413]' : 'text-black/55'}`}
            >{viewYear}</button>
            <button type="button" onClick={() => changeMonth(1)} aria-label={es ? 'Mes siguiente' : 'Next month'} className="grid h-6 w-6 shrink-0 place-items-center rounded-lg text-black/60 hover:bg-black/5">
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
            </button>
          </div>
          {selector === 'year' ? (
            <div
              ref={yearsRef}
              role="group"
              aria-label={es ? 'Seleccionar año' : 'Choose year'}
              className="gkais-light-scrollbar grid h-[176px] grid-cols-3 content-start gap-1 overflow-y-auto rounded-lg border border-black/8 p-1"
            >
              {YEARS.map((year) => (
                <button
                  key={year}
                  type="button"
                  aria-pressed={viewYear === year}
                  onClick={() => { setViewYear(year); setSelector('day'); }}
                  className={`h-8 rounded-md text-center text-xs tabular-nums ${viewYear === year ? 'bg-[#111413] font-semibold text-white' : 'text-black/65 hover:bg-black/5'}`}
                >{year}</button>
              ))}
            </div>
          ) : selector === 'month' ? (
            <div
              role="group"
              aria-label={es ? 'Seleccionar mes' : 'Choose month'}
              className="grid h-[176px] grid-cols-3 content-start gap-1 rounded-lg border border-black/8 p-1"
            >
              {monthNames.map((month, i) => (
                <button
                  key={i}
                  type="button"
                  aria-pressed={viewMonth === i}
                  onClick={() => { setViewMonth(i); setSelector('day'); }}
                  className={`h-8 truncate rounded-md px-0.5 text-center text-[10px] ${viewMonth === i ? 'bg-[#111413] font-semibold text-white' : 'text-black/65 hover:bg-black/5'}`}
                >{month.slice(0, 3)}</button>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-7 gap-0.5 pb-1 text-center text-[9px] font-semibold text-black/40">
                {weekdayNames.map((day, i) => <span key={i}>{day}</span>)}
              </div>
              <div className="grid grid-cols-7 gap-0.5" role="group" aria-label={es ? 'Días del mes' : 'Days of month'}>
                {Array.from({ length: 42 }, (_, index) => {
                  const day = index - offset + 1;
                  if (day < 1 || day > daysInMonth) return <span key={index} className="h-[26px]" />;
                  const date = toIsoDate(new Date(viewYear, viewMonth, day, 12));
                  const chosen = draftDate === date;
                  const isToday = todayIso === date;
                  return (
                    <button
                      key={index}
                      type="button"
                      aria-label={new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(viewYear, viewMonth, day, 12))}
                      aria-pressed={chosen}
                      aria-current={isToday ? 'date' : undefined}
                      onClick={() => setDraftDate(date)}
                      className={`h-[26px] rounded-md text-center text-[11px] tabular-nums ${chosen ? 'bg-[#111413] font-semibold text-white' : isToday ? 'border border-black/25 font-semibold text-black/75' : 'text-black/70 hover:bg-black/5'}`}
                    >{day}</button>
                  );
                })}
              </div>
            </>
          )}
          <div className="mt-2 flex items-center justify-between gap-1">
            <button type="button" onClick={() => {
              const today = new Date();
              setDraftDate(toIsoDate(today));
              setViewYear(today.getFullYear());
              setViewMonth(today.getMonth());
            }} className="rounded-lg px-1 py-1.5 text-[11px] font-medium text-black/60">{es ? 'Hoy' : 'Today'}</button>
            <div className="flex items-center gap-0.5">
              <button type="button" onClick={() => { onChange(''); setOpen(false); triggerRef.current?.focus(); }} className="rounded-lg px-1 py-1.5 text-[11px] text-black/55">{es ? 'Borrar' : 'Clear'}</button>
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-1 py-1.5 text-[11px] text-black/55">{es ? 'Cancelar' : 'Cancel'}</button>
              <button type="button" disabled={!draftDate} onClick={accept} className="rounded-lg bg-[#111413] px-2 py-1.5 text-[11px] font-semibold text-white disabled:opacity-30">{es ? 'Aceptar' : 'Apply'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
