import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY,
  WOOD,
  STONE,
  createInitialBoard,
  generateMoves,
  simulateMove,
} from '../js/rules.js';
import { chooseMove } from '../js/ai.js';


const emptyBoard = () => Array.from({ length: 5 }, () => Array(5).fill(EMPTY));
const sameMove = (left, right) => JSON.stringify(left) === JSON.stringify(right);


for (const difficulty of ['easy', 'normal', 'hard']) {
  test(`${difficulty} returns a legal move`, () => {
    const board = createInitialBoard();
    const move = chooseMove(board, WOOD, difficulty, () => 0);
    assert.ok(generateMoves(board, WOOD).some((candidate) => sameMove(candidate, move)));
  });
}


test('easy AI takes an immediate capture', () => {
  const board = emptyBoard();
  board[2][0] = WOOD;
  board[1][1] = WOOD;
  board[2][2] = STONE;
  board[4][4] = STONE;
  const move = chooseMove(board, WOOD, 'easy', () => 0);
  assert.equal(simulateMove(board, move, WOOD).captured.length, 1);
});


test('AI returns null when it has no legal move', () => {
  const board = emptyBoard();
  board[0][0] = WOOD;
  board[0][1] = STONE;
  board[1][0] = STONE;
  assert.equal(chooseMove(board, WOOD, 'hard'), null);
});
