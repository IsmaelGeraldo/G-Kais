/**
 * A webinar stores the same local wall-clock format previously emitted by
 * datetime-local: YYYY-MM-DDTHH:mm. No implicit UTC conversion on save.
 */
export function composeWebinarStartsAt(date: string, time: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return '';
  const parsed = new Date(`${date}T12:00:00`);
  if (!Number.isFinite(parsed.getTime())) return '';
  const validDate = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, '0')}-${String(parsed.getDate()).padStart(2, '0')}`;
  return validDate === date ? `${date}T${time}` : '';
}

/**
 * Older records may contain seconds or an explicit timezone. For explicit
 * offsets, display the same local time shown in the webinar list.
 */
export function splitWebinarStartsAt(value: string): { date: string; time: string } {
  const match = /^(\d{4}-\d{2}-\d{2})T([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d(?:\.\d+)?)?(?:[zZ]|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return { date: '', time: '' };
  if (/(?:[zZ]|[+-]\d{2}:\d{2})$/.test(value)) {
    const timestamp = new Date(value);
    if (!Number.isFinite(timestamp.getTime())) return { date: '', time: '' };
    return {
      date: `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}-${String(timestamp.getDate()).padStart(2, '0')}`,
      time: `${String(timestamp.getHours()).padStart(2, '0')}:${String(timestamp.getMinutes()).padStart(2, '0')}`
    };
  }
  const date = match[1];
  const time = `${match[2]}:${match[3]}`;
  return composeWebinarStartsAt(date, time) ? { date, time } : { date: '', time: '' };
}
