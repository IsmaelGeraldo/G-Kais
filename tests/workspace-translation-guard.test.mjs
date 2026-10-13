import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(path, 'utf8');

test('Workspace deep links disable browser translation before React starts', () => {
  const html = read('index.html');
  assert.match(html, /location\.pathname\.startsWith\('\/workspace'\)/);
  assert.match(html, /document\.documentElement\.setAttribute\('translate', 'no'\)/);
  assert.match(html, /document\.documentElement\.classList\.add\('notranslate'\)/);
});

test('Workspace shell opts out of browser DOM translation without changing UI language selection', () => {
  const shell = read('src/components/experts/ExpertsWorkspacePilotV3.tsx');
  const lang = read('src/i18n/LanguageContext.tsx');
  assert.match(shell, /return <div\s+translate="no"\s+className=\{\`notranslate /);
  assert.match(lang, /document\.documentElement\.lang = language/);
});

test('Workspace portal notifications also opt out of external translation mutations', () => {
  const notification = read('src/components/ExpertsWorkspace.tsx');
  const persistence = read('src/components/experts/WorkspacePersistenceStatus.tsx');
  assert.match(notification, /<div\s+translate="no"\s+className="notranslate /);
  assert.match(persistence, /<div translate="no" className=\{\`notranslate /);
});
