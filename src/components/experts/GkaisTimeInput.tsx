import { Clock3 } from 'lucide-react';
import type { Language } from '../../i18n/LanguageContext';

type GkaisTimeInputProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  variant?: 'compact' | 'standard';
};

/**
 * Keep Chrome's real native time picker indicator clickable.
 * The visible clock is decorative: no separate button, hover lift or focus effect.
 * Mobile continues to use its unmodified native time control.
 */
export function GkaisTimeInput({ value, onChange, language, variant = 'compact' }: GkaisTimeInputProps) {
  const standard = variant === 'standard';
  const label = language === 'es' ? 'Hora' : 'Time';

  return (
    <div className="gkais-native-time-control relative min-w-0 w-full">
      <input
        type="time"
        step={60}
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`gkais-time-picker-input relative min-w-0 w-full border border-black/10 bg-white sm:pr-9 ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      />
      <Clock3
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 z-10 hidden h-3.5 w-3.5 -translate-y-1/2 text-black/70 sm:block"
      />
    </div>
  );
}
