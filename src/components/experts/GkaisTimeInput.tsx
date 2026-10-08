import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Clock3 } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type GkaisTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  variant?: 'compact' | 'standard';
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));
const PICKER_WIDTH = 232;
const PICKER_HEIGHT = 286;

/**
 * On mobile, use the native time control. On notebook/desktop Chrome, render
 * an accessible small time popover rather than relying on showPicker() or the
 * pseudo-element indicator, which can merely select the native time segments.
 * Its value remains exactly the existing HH:mm task field.
 */
export function GkaisTimeInput({ value, onChange, language, variant = 'compact' }: GkaisTimeInputProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const hoursRef = useRef<HTMLDivElement>(null);
  const minutesRef = useRef<HTMLDivElement>(null);
  const standard = variant === 'standard';
  const es = language === 'es';
  const label = es ? 'Hora' : 'Time';

  const updatePosition = () => {
    const rectangle = triggerRef.current?.getBoundingClientRect();
    if (!rectangle) return;
    const left = Math.max(8, Math.min(rectangle.right - PICKER_WIDTH, window.innerWidth - PICKER_WIDTH - 8));
    const below = rectangle.bottom + 6;
    const top = below + PICKER_HEIGHT <= window.innerHeight - 8
      ? below
      : Math.max(8, rectangle.top - PICKER_HEIGHT - 6);
    setPosition({ top, left });
  };

  const show = () => {
    const parts = /^([01]\\d|2[0-3]):([0-5]\\d)$/.exec(value);
    const now = new Date();
    setHour(parts?.[1] ?? String(now.getHours()).padStart(2, '0'));
    setMinute(parts?.[2] ?? String(now.getMinutes()).padStart(2, '0'));
    updatePosition();
    setOpen(true);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!popupRef.current?.contains(target) && !triggerRef.current?.contains(target)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (hoursRef.current) hoursRef.current.scrollTop = Math.max(0, Number(hour) * 32 - 64);
    if (minutesRef.current) minutesRef.current.scrollTop = Math.max(0, Number(minute) * 32 - 64);
  }, [open]);

  const accept = () => {
    onChange(`${hour}:${minute}`);
    setOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="relative min-w-0 w-full">
      <input
        type="time"
        step={60}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 w-full border border-black/10 bg-white sm:hidden ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      />
      <button
        ref={triggerRef}
        type="button"
        data-gkais-static-interaction="true"
        aria-label={es ? 'Elegir hora y minutos' : 'Choose hour and minutes'}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => open ? setOpen(false) : show()}
        className={`hidden min-w-0 w-full items-center justify-between gap-1 border border-black/10 bg-white text-left text-black/65 shadow-none outline-offset-2 sm:flex ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      >
        <span className="truncate tabular-nums">{value || '--:--'}</span>
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-black/70" />
      </button>
      {open && typeof document !== 'undefined' && createPortal(
        <div
          ref={popupRef}
          role="dialog"
          aria-label={es ? 'Seleccionar hora' : 'Select time'}
          className="fixed z-[220] w-[232px] rounded-xl border border-black/10 bg-white p-2 shadow-xl"
          style={{ top: position.top, left: position.left }}
        >
          <div className="mb-2 grid grid-cols-2 gap-2 px-1 text-center text-[10px] font-semibold uppercase tracking-wide text-black/45">
            <span>{es ? 'Horas' : 'Hours'}</span>
            <span>{es ? 'Minutos' : 'Minutes'}</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div ref={hoursRef} role="listbox" aria-label={es ? 'Horas' : 'Hours'} className="gkais-light-scrollbar h-[176px] overflow-y-auto rounded-lg border border-black/8 p-1">
              {HOURS.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={hour === item}
                  onClick={() => setHour(item)}
                  className={`block h-8 w-full rounded-md text-center text-xs tabular-nums ${hour === item ? 'bg-[#111413] font-semibold text-white' : 'text-black/70 hover:bg-black/5'}`}
                >{item}</button>
              ))}
            </div>
            <div ref={minutesRef} role="listbox" aria-label={es ? 'Minutos' : 'Minutes'} className="gkais-light-scrollbar h-[176px] overflow-y-auto rounded-lg border border-black/8 p-1">
              {MINUTES.map((item) => (
                <button
                  key={item}
                  type="button"
                  role="option"
                  aria-selected={minute === item}
                  onClick={() => setMinute(item)}
                  className={`block h-8 w-full rounded-md text-center text-xs tabular-nums ${minute === item ? 'bg-[#111413] font-semibold text-white' : 'text-black/70 hover:bg-black/5'}`}
                >{item}</button>
              ))}
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="pl-1 text-xs font-medium tabular-nums text-black/55">{hour}:{minute}</span>
            <div className="flex items-center gap-1">
              <button type="button" onClick={() => setOpen(false)} className="rounded-lg px-2 py-1.5 text-xs text-black/55">{es ? 'Cancelar' : 'Cancel'}</button>
              <button type="button" onClick={accept} className="rounded-lg bg-[#111413] px-2.5 py-1.5 text-xs font-semibold text-white">{es ? 'Aceptar' : 'Apply'}</button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
