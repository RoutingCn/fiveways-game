import {
  WOOD,
  STONE,
  cloneBoard,
  createInitialBoard,
  countPieces,
  getOutcome,
  simulateMove,
} from './rules.js';
import { chooseMove } from './ai.js';


const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));


export class Game {
  constructor(options = {}) {
    this.listeners = new Set();
    this.history = [];
    this.options = {
      mode: options.mode ?? 'ai',
      difficulty: options.difficulty ?? 'normal',
      delay: options.delay ?? 320,
      random: options.random ?? Math.random,
    };
    this._state = this.createState();
  }

  createState() {
    return {
      board: createInitialBoard(),
      currentPlayer: WOOD,
      quietTurns: 0,
      outcome: null,
      thinking: false,
      lastMove: null,
      lastCaptured: [],
      mode: this.options.mode,
      difficulty: this.options.difficulty,
    };
  }

  get state() {
    return {
      ...this._state,
      board: cloneBoard(this._state.board),
      lastCaptured: this._state.lastCaptured.map((point) => point.slice()),
      canUndo: this.history.length > 0 && !this._state.thinking,
      counts: {
        wood: countPieces(this._state.board, WOOD),
        stone: countPieces(this._state.board, STONE),
      },
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => this.listeners.delete(listener);
  }

  notify() {
    const snapshot = this.state;
    for (const listener of this.listeners) listener(snapshot);
  }

  snapshot() {
    return {
      ...this._state,
      board: cloneBoard(this._state.board),
      lastMove: this._state.lastMove
        ? { from: this._state.lastMove.from.slice(), to: this._state.lastMove.to.slice() }
        : null,
      lastCaptured: this._state.lastCaptured.map((point) => point.slice()),
    };
  }

  applyMove(move, player) {
    this.history.push(this.snapshot());
    const result = simulateMove(this._state.board, move, player);
    const quietTurns = result.captured.length > 0 ? 0 : this._state.quietTurns + 1;
    const nextPlayer = -player;
    this._state = {
      ...this._state,
      board: result.board,
      currentPlayer: nextPlayer,
      quietTurns,
      outcome: getOutcome(result.board, nextPlayer, quietTurns),
      lastMove: { from: move.from.slice(), to: move.to.slice() },
      lastCaptured: result.captured,
    };
    this.notify();
  }

  play(move) {
    if (this._state.thinking || this._state.outcome) return Promise.resolve(false);
    if (this._state.mode === 'ai' && this._state.currentPlayer !== WOOD) {
      return Promise.resolve(false);
    }

    this.applyMove(move, this._state.currentPlayer);
    if (
      this._state.mode === 'ai'
      && !this._state.outcome
      && this._state.currentPlayer === STONE
    ) {
      return this.runAiTurn();
    }
    return Promise.resolve(true);
  }

  async runAiTurn() {
    this._state.thinking = true;
    this.notify();
    await wait(this.options.delay);

    const move = chooseMove(
      this._state.board,
      STONE,
      this._state.difficulty,
      this.options.random,
    );
    if (move) this.applyMove(move, STONE);
    this._state.thinking = false;
    this.notify();
    return true;
  }

  undo() {
    if (this._state.thinking || this.history.length === 0) return false;

    if (this._state.mode === 'local') {
      this._state = this.history.pop();
    } else {
      while (this.history.length > 0) {
        const candidate = this.history.pop();
        if (candidate.currentPlayer === WOOD) {
          this._state = candidate;
          break;
        }
      }
    }
    this.notify();
    return true;
  }

  reset(options = {}) {
    this.options = {
      ...this.options,
      ...options,
    };
    this.history = [];
    this._state = this.createState();
    this.notify();
  }
}
