import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('index can be launched directly from a folder without ES module loading', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  assert.ok(html.includes('src="./js/app-standalone.js"'));
  assert.ok(!html.includes('type="module"'));
});
