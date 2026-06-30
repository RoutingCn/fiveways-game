import test from 'node:test';
import assert from 'node:assert/strict';

import { pointPosition, turnText } from '../js/ui.js';
import { WOOD, STONE } from '../js/rules.js';


test('point positions map the grid corners onto the board photograph', () => {
  assert.deepEqual(pointPosition(0, 0), { left: 25.8, top: 8.5 });
  assert.deepEqual(pointPosition(4, 4), { left: 75, top: 89.5 });
  assert.deepEqual(pointPosition(2, 2), { left: 50.4, top: 49 });
});


test('turn text reflects mode, player and thinking state', () => {
  assert.equal(turnText({ thinking: true }), '机器正在琢磨…');
  assert.equal(turnText({ thinking: false, mode: 'ai', currentPlayer: WOOD }), '轮到你 · 木桩');
  assert.equal(turnText({ thinking: false, mode: 'local', currentPlayer: STONE }), '轮到石子方');
});
