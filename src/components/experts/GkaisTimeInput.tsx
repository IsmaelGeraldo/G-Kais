import { useRef } from 'react';
import { Clock3 } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type GkaisTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  variant?: 'compact' | 'standard';
};

/**
 * Use the browser's native time picker on every device.
 * Desktop Chrome can hide its built-in picker indicator in a narrow grid
 * cell, so a visible clock button opens the same native picker explicitly.
 * Mobile retains the normal native indicator and touch interaction.
 */
export function GkaisTimeInput({ value, onChange, language, variant = 'compact' }: GkaisTimeInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const standard = variant === 'standard';
  const label = language === 'es' ? 'Hora' : 'Time';
  const openLabel = language === 'es' ? 'Abrir selector de hora' : 'Open time picker';

  const openPicker = () => {
    const input = inputRef.current;
    if (!input) return;
    try {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
        return;
      }
    } catch {
      // Fall back to keyboard entry if a browser blocks its native picker.
    }
    input.focus();
  };

  return (
    <div className="relative min-w-0 w-full">
      <input
        ref={inputRef}
        type="time"
        step={60}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`gkais-time-picker-input min-w-0 w-full border border-black/10 bg-white sm:pr-9 ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      />
      <button
        type="button"
        aria-label={openLabel}
        title={openLabel}
        onClick={openPicker}
        className={`absolute inset-y-0 right-0 hidden w-8 items-center justify-center text-black/70 hover:text-black focus-visible:rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0A3F4D] sm:flex ${standard ? 'rounded-r-xl' : 'rounded-r-lg'}`}
      >
        <Clock3 aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
