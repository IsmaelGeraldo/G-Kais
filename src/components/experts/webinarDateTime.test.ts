import assert from 'node:assert/strict';
import { test } from 'node:test';
import { composeWebinarStartsAt, splitWebinarStartsAt } from './webinarDateTime';

test('Webinars: selecting date and hour forms the original local persistence value', () => {
  assert.equal(composeWebinarStartsAt('2026-10-20', '19:45'), '2026-10-20T19:45');
  assert.equal(composeWebinarStartsAt('2026-10-20', '00:00'), '2026-10-20T00:00');
});

test('Webinars: incomplete/invalid date or time cannot be submitted', () => {
  for (const [date, time] of [
    ['', '19:45'], ['2026-10-20', ''], ['2026-02-30', '10:00'],
    ['2026-10-20', '24:00'], ['2026-10-20', '10:60']
  ]) assert.equal(composeWebinarStartsAt(date, time), '');
});

test('Webinars: existing datetime-local records refill the edit controls', () => {
  assert.deepEqual(splitWebinarStartsAt('2026-10-20T19:45'), { date: '2026-10-20', time: '19:45' });
  assert.deepEqual(splitWebinarStartsAt('2026-10-20T19:45:00'), { date: '2026-10-20', time: '19:45' });
  assert.deepEqual(splitWebinarStartsAt(''), { date: '', time: '' });
});

test('Webinars: legacy ISO timestamps with timezone display as local wall-clock time', () => {
  const input = '2026-10-20T19:45:00Z';
  const local = new Date(input);
  assert.deepEqual(splitWebinarStartsAt(input), {
    date: `${local.getFullYear()}-${String(local.getMonth() + 1).padStart(2, '0')}-${String(local.getDate()).padStart(2, '0')}`,
    time: `${String(local.getHours()).padStart(2, '0')}:${String(local.getMinutes()).padStart(2, '0')}`
  });
});
