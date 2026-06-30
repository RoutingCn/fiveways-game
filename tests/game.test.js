import test from 'node:test';
import assert from 'node:assert/strict';

import { Game } from '../js/game.js';
import { WOOD, STONE } from '../js/rules.js';


test('local game alternates turns and undoes one ply', () => {
  const game = new Game({ mode: 'local' });
  game.play({ from: [0, 0], to: [1, 0] });
  assert.equal(game.state.currentPlayer, STONE);
  game.undo();
  assert.equal(game.state.currentPlayer, WOOD);
  assert.equal(game.state.board[0][0], WOOD);
});


test('AI game undo restores the position before player and AI plies', async () => {
  const game = new Game({ mode: 'ai', difficulty: 'easy', delay: 0, random: () => 0 });
  const before = JSON.stringify(game.state.board);
  await game.play({ from: [0, 0], to: [1, 0] });
  assert.equal(game.state.currentPlayer, WOOD);
  game.undo();
  assert.equal(JSON.stringify(game.state.board), before);
  assert.equal(game.state.currentPlayer, WOOD);
});


test('reset changes options and clears history', () => {
  const game = new Game({ mode: 'local' });
  game.play({ from: [0, 1], to: [1, 1] });
  game.reset({ mode: 'ai', difficulty: 'hard' });
  assert.equal(game.state.mode, 'ai');
  assert.equal(game.state.difficulty, 'hard');
  assert.equal(game.state.canUndo, false);
  assert.equal(game.state.currentPlayer, WOOD);
});


test('subscribers receive state updates', () => {
  const game = new Game({ mode: 'local' });
  let updates = 0;
  const unsubscribe = game.subscribe(() => { updates += 1; });
  game.play({ from: [0, 2], to: [1, 2] });
  unsubscribe();
  game.play({ from: [4, 2], to: [3, 2] });
  assert.equal(updates, 2);
});
