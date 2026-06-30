import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('styles include a dedicated mobile landscape layout', () => {
  const css = readFileSync(new URL('../styles.css', import.meta.url), 'utf8');

  assert.match(css, /@media\s*\(max-width:\s*900px\)\s*and\s*\(orientation:\s*landscape\)/);
  assert.match(css, /\.mobile-rotate-tip/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*minmax\(168px,\s*190px\)/);
});
