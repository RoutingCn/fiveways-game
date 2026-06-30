import test from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY,
  WOOD,
  STONE,
  createInitialBoard,
  generateMoves,
  simulateMove,
  getOutcome,
} from '../js/rules.js';


const emptyBoard = () => Array.from({ length: 5 }, () => Array(5).fill(EMPTY));


test('initial board has five pieces per side', () => {
  const board = createInitialBoard();
  assert.equal(board.flat().filter((value) => value === WOOD).length, 5);
  assert.equal(board.flat().filter((value) => value === STONE).length, 5);
});


test('piece moves only one orthogonal step into an empty point', () => {
  const board = emptyBoard();
  board[2][2] = WOOD;
  const destinations = generateMoves(board, WOOD).map((move) => move.to).sort();
  assert.deepEqual(destinations, [[1, 2], [2, 1], [2, 3], [3, 2]]);
});


test('new gun captures an unrooted enemy', () => {
  const board = emptyBoard();
  board[2][0] = WOOD;
  board[1][1] = WOOD;
  board[2][2] = STONE;
  const result = simulateMove(board, { from: [1, 1], to: [2, 1] }, WOOD);
  assert.deepEqual(result.captured, [[2, 2]]);
  assert.equal(result.board[2][2], EMPTY);
});


test('dead gun and rooted enemy are not captured', () => {
  const dead = emptyBoard();
  dead[2][0] = WOOD;
  dead[2][1] = WOOD;
  dead[2][2] = STONE;
  dead[4][4] = WOOD;
  assert.deepEqual(
    simulateMove(dead, { from: [4, 4], to: [3, 4] }, WOOD).captured,
    [],
  );

  const rooted = emptyBoard();
  rooted[2][0] = WOOD;
  rooted[1][1] = WOOD;
  rooted[2][2] = STONE;
  rooted[2][3] = STONE;
  assert.deepEqual(
    simulateMove(rooted, { from: [1, 1], to: [2, 1] }, WOOD).captured,
    [],
  );
});


test('illegal moves leave the board untouched', () => {
  const board = createInitialBoard();
  const before = JSON.stringify(board);
  assert.throws(
    () => simulateMove(board, { from: [0, 0], to: [2, 0] }, WOOD),
    /Illegal move/,
  );
  assert.equal(JSON.stringify(board), before);
});


test('one remaining piece loses and forty quiet turns draw', () => {
  const board = createInitialBoard();
  board[0] = [WOOD, EMPTY, EMPTY, EMPTY, EMPTY];
  assert.equal(getOutcome(board, STONE, 0).winner, STONE);
  assert.equal(getOutcome(createInitialBoard(), WOOD, 40).draw, true);
});
