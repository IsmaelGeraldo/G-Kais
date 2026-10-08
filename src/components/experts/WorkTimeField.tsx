import type { Language } from '../../i18n/LanguageContext';

type WorkTimeFieldProps = {
  value: string;
  onChange: (value: string) => void;
  language: Language;
  variant?: 'compact' | 'standard';
};

const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, index) => String(index).padStart(2, '0'));

/**
 * Keep the phone's native time input. On larger screens, separate hour/minute
 * selects remain operable even when Chrome's native time picker gets clipped.
 * Both modes submit the same HH:mm string used by the existing task services.
 */
export function WorkTimeField({ value, onChange, language, variant = 'compact' }: WorkTimeFieldProps) {
  const [hour, minute] = /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value.split(':') : ['', ''];
  const standard = variant === 'standard';
  const label = language === 'es' ? 'Hora' : 'Time';
  const hoursLabel = language === 'es' ? 'Horas' : 'Hours';
  const minutesLabel = language === 'es' ? 'Minutos' : 'Minutes';

  return (
    <>
      <input
        type="time"
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`min-w-0 w-full border border-black/10 bg-white sm:hidden ${standard ? 'rounded-xl px-2 py-2.5 text-sm' : 'rounded-lg px-2 py-2 text-xs'}`}
      />
      <div
        role="group"
        aria-label={label}
        className={`hidden min-w-0 w-full items-center gap-0.5 border border-black/10 bg-white sm:flex ${standard ? 'rounded-xl px-2 py-1.5 text-sm' : 'rounded-lg px-1 py-1 text-xs'}`}
      >
        <select
          aria-label={hoursLabel}
          title={hoursLabel}
          value={hour}
          onChange={(event) => onChange(event.target.value ? `${event.target.value}:${minute || '00'}` : '')}
          className="w-1/2 min-w-0 flex-1 bg-transparent px-0.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]/35"
        >
          <option value="">HH</option>
          {HOURS.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <span aria-hidden="true" className="shrink-0 text-black/40">:</span>
        <select
          aria-label={minutesLabel}
          title={minutesLabel}
          value={minute}
          disabled={!hour}
          onChange={(event) => onChange(`${hour}:${event.target.value}`)}
          className="w-1/2 min-w-0 flex-1 bg-transparent px-0.5 py-1 outline-none focus-visible:ring-2 focus-visible:ring-[#0A3F4D]/35 disabled:opacity-45"
        >
          <option value="">MM</option>
          {MINUTES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
      </div>
    </>
  );
}
