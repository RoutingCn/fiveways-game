(function () {
  'use strict';

  const EMPTY = 0;
  const WOOD = 1;
  const STONE = -1;
  const BOARD_SIZE = 5;
  const DIRECTIONS = [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
  ];
  const GRID = { left: 25.8, top: 8.5, width: 49.2, height: 81 };

  const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
  const samePoint = (left, right) => left[0] === right[0] && left[1] === right[1];

  function createInitialBoard() {
    return [
      [WOOD, WOOD, WOOD, WOOD, WOOD],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
      [STONE, STONE, STONE, STONE, STONE],
    ];
  }

  function cloneBoard(board) {
    return board.map((row) => row.slice());
  }

  function countPieces(board, player) {
    return board.flat().filter((value) => value === player).length;
  }

  function inBoard(row, column) {
    return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
  }

  function generateMoves(board, player) {
    const moves = [];

    for (let row = 0; row < BOARD_SIZE; row += 1) {
      for (let column = 0; column < BOARD_SIZE; column += 1) {
        if (board[row][column] !== player) continue;

        for (const [rowDelta, columnDelta] of DIRECTIONS) {
          const nextRow = row + rowDelta;
          const nextColumn = column + columnDelta;
          if (inBoard(nextRow, nextColumn) && board[nextRow][nextColumn] === EMPTY) {
            moves.push({ from: [row, column], to: [nextRow, nextColumn] });
          }
        }
      }
    }

    return moves;
  }

  function findGuns(board, player) {
    const enemy = -player;
    const guns = [];

    for (const [rowDelta, columnDelta] of DIRECTIONS) {
      for (let row = 0; row < BOARD_SIZE; row += 1) {
        for (let column = 0; column < BOARD_SIZE; column += 1) {
          if (board[row][column] !== player) continue;

          const secondRow = row + rowDelta;
          const secondColumn = column + columnDelta;
          const targetRow = row + rowDelta * 2;
          const targetColumn = column + columnDelta * 2;
          if (!inBoard(secondRow, secondColumn) || !inBoard(targetRow, targetColumn)) continue;
          if (board[secondRow][secondColumn] !== player) continue;
          if (board[targetRow][targetColumn] !== enemy) continue;

          const rootRow = row + rowDelta * 3;
          const rootColumn = column + columnDelta * 3;
          const hasRoot = inBoard(rootRow, rootColumn) && board[rootRow][rootColumn] === enemy;
          if (!hasRoot) {
            guns.push({
              shooter1: [row, column],
              shooter2: [secondRow, secondColumn],
              target: [targetRow, targetColumn],
              direction: [rowDelta, columnDelta],
            });
          }
        }
      }
    }

    return guns;
  }

  function gunKey(gun) {
    return `${gun.target[0]},${gun.target[1]}|${gun.direction[0]},${gun.direction[1]}`;
  }

  function isLegalMove(board, move, player) {
    return generateMoves(board, player).some(
      (candidate) => samePoint(candidate.from, move.from) && samePoint(candidate.to, move.to),
    );
  }

  function simulateMove(board, move, player) {
    if (!move?.from || !move?.to || !isLegalMove(board, move, player)) {
      throw new Error('Illegal move');
    }

    const existingGunKeys = new Set(findGuns(board, player).map(gunKey));
    const nextBoard = cloneBoard(board);
    const [fromRow, fromColumn] = move.from;
    const [toRow, toColumn] = move.to;
    nextBoard[fromRow][fromColumn] = EMPTY;
    nextBoard[toRow][toColumn] = player;

    const newGun = findGuns(nextBoard, player).find((gun) => !existingGunKeys.has(gunKey(gun)));
    const captured = [];
    if (newGun) {
      const [capturedRow, capturedColumn] = newGun.target;
      if (nextBoard[capturedRow][capturedColumn] === -player) {
        nextBoard[capturedRow][capturedColumn] = EMPTY;
        captured.push([capturedRow, capturedColumn]);
      }
    }

    return { board: nextBoard, captured };
  }

  function getOutcome(board, currentPlayer, quietTurns = 0) {
    const woodCount = countPieces(board, WOOD);
    const stoneCount = countPieces(board, STONE);

    if (woodCount <= 1) return { winner: STONE, draw: false, reason: 'pieces' };
    if (stoneCount <= 1) return { winner: WOOD, draw: false, reason: 'pieces' };
    if (quietTurns >= 40) return { winner: null, draw: true, reason: 'quiet-turns' };
    if (generateMoves(board, currentPlayer).length === 0) {
      return { winner: -currentPlayer, draw: false, reason: 'blocked' };
    }

    return null;
  }

  function randomChoice(items, random) {
    return items[Math.min(items.length - 1, Math.floor(random() * items.length))];
  }

  function movesWithResults(board, player) {
    return generateMoves(board, player).map((move) => ({
      move,
      result: simulateMove(board, move, player),
    }));
  }

  function centerScore(board, player) {
    let score = 0;
    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        if (board[row][column] !== player) continue;
        const distance = Math.abs(row - 2) + Math.abs(column - 2);
        score += [12, 8, 4, 2, 1][distance] ?? 0;
      }
    }
    return score;
  }

  function immediateCaptures(board, player) {
    return movesWithResults(board, player).filter(({ result }) => result.captured.length > 0).length;
  }

  function staticScore(board, player) {
    const enemy = -player;
    let score = (countPieces(board, player) - countPieces(board, enemy)) * 100;
    score += (generateMoves(board, player).length - generateMoves(board, enemy).length) * 4;
    score += centerScore(board, player) - centerScore(board, enemy);
    score += findGuns(board, player).length * 18;
    score -= findGuns(board, enemy).length * 22;
    return score;
  }

  function evaluateBoard(board, player) {
    let score = staticScore(board, player);
    score += immediateCaptures(board, player) * 130;
    score -= immediateCaptures(board, -player) * 155;
    return score;
  }

  function easyMove(board, player, random) {
    const candidates = movesWithResults(board, player);
    if (candidates.length === 0) return null;
    const captures = candidates.filter(({ result }) => result.captured.length > 0);
    return randomChoice(captures.length > 0 ? captures : candidates, random).move;
  }

  function normalMove(board, player, random) {
    const candidates = movesWithResults(board, player);
    if (candidates.length === 0) return null;
    let bestScore = -Infinity;
    let best = [];

    for (const candidate of candidates) {
      let score = evaluateBoard(candidate.result.board, player);
      if (candidate.result.captured.length > 0) score += 120;
      if (immediateCaptures(candidate.result.board, -player) > 0) score -= 100;
      if (score > bestScore) {
        bestScore = score;
        best = [candidate.move];
      } else if (score === bestScore) {
        best.push(candidate.move);
      }
    }

    return randomChoice(best, random);
  }

  function orderedCandidates(board, player) {
    return movesWithResults(board, player).sort((left, right) => {
      const leftPriority = left.result.captured.length * 1000 + staticScore(left.result.board, player);
      const rightPriority = right.result.captured.length * 1000 + staticScore(right.result.board, player);
      return rightPriority - leftPriority;
    });
  }

  function minimax(board, depth, alpha, beta, currentPlayer, aiPlayer) {
    const outcome = getOutcome(board, currentPlayer, 0);
    if (outcome) {
      if (outcome.draw) return 0;
      return outcome.winner === aiPlayer ? 10000 + depth : -10000 - depth;
    }
    if (depth === 0) return staticScore(board, aiPlayer);

    const candidates = orderedCandidates(board, currentPlayer);
    if (currentPlayer === aiPlayer) {
      let best = -Infinity;
      for (const { result } of candidates) {
        best = Math.max(best, minimax(result.board, depth - 1, alpha, beta, -currentPlayer, aiPlayer));
        alpha = Math.max(alpha, best);
        if (beta <= alpha) break;
      }
      return best;
    }

    let best = Infinity;
    for (const { result } of candidates) {
      best = Math.min(best, minimax(result.board, depth - 1, alpha, beta, -currentPlayer, aiPlayer));
      beta = Math.min(beta, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  function hardMove(board, player, random) {
    const candidates = orderedCandidates(board, player);
    if (candidates.length === 0) return null;
    let bestScore = -Infinity;
    let best = [];

    for (const candidate of candidates) {
      const score = minimax(candidate.result.board, 4, -Infinity, Infinity, -player, player);
      if (score > bestScore) {
        bestScore = score;
        best = [candidate.move];
      } else if (score === bestScore) {
        best.push(candidate.move);
      }
    }

    return randomChoice(best, random);
  }

  function chooseMove(board, player, difficulty = 'normal', random = Math.random) {
    if (difficulty === 'easy') return easyMove(board, player, random);
    if (difficulty === 'hard') return hardMove(board, player, random);
    return normalMove(board, player, random);
  }

  function pointPosition(row, column) {
    return {
      left: Number((GRID.left + (GRID.width / 4) * column).toFixed(2)),
      top: Number((GRID.top + (GRID.height / 4) * row).toFixed(2)),
    };
  }

  function turnText(state) {
    if (state.thinking) return '机器正在琢磨…';
    if (state.mode === 'ai') {
      return state.currentPlayer === WOOD ? '轮到你 · 木桩' : '轮到机器 · 石子';
    }
    return state.currentPlayer === WOOD ? '轮到木桩方' : '轮到石子方';
  }

  class Game {
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
      if (this._state.mode === 'ai' && !this._state.outcome && this._state.currentPlayer === STONE) {
        return this.runAiTurn();
      }
      return Promise.resolve(true);
    }

    async runAiTurn() {
      this._state.thinking = true;
      this.notify();
      await wait(this.options.delay);

      const move = chooseMove(this._state.board, STONE, this._state.difficulty, this.options.random);
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
      this.options = { ...this.options, ...options };
      this.history = [];
      this._state = this.createState();
      this.notify();
    }
  }

  class GameUI {
    constructor(game, root = document) {
      this.game = game;
      this.root = root;
      this.selected = null;
      this.legalMoves = [];
      this.points = [];
      this.elements = {
        pointLayer: root.querySelector('#point-layer'),
        pieceLayer: root.querySelector('#piece-layer'),
        thinkingCover: root.querySelector('#thinking-cover'),
        turnStatus: root.querySelector('#turn-status'),
        hint: root.querySelector('#hint-text'),
        woodCount: root.querySelector('#wood-count'),
        stoneCount: root.querySelector('#stone-count'),
        woodLabel: root.querySelector('#wood-label'),
        stoneLabel: root.querySelector('#stone-label'),
        undo: root.querySelector('#undo-button'),
        reset: root.querySelector('#reset-button'),
        rules: root.querySelector('#rules-button'),
        mode: root.querySelector('#mode-select'),
        difficulty: root.querySelector('#difficulty-select'),
        difficultyControl: root.querySelector('#difficulty-control'),
        rulesDialog: root.querySelector('#rules-dialog'),
        resultDialog: root.querySelector('#result-dialog'),
        resultTitle: root.querySelector('#result-title'),
        resultMessage: root.querySelector('#result-message'),
        playAgain: root.querySelector('#play-again-button'),
      };
      this.buildPoints();
      this.bindControls();
      this.unsubscribe = game.subscribe((state) => this.render(state));
    }

    buildPoints() {
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          const button = document.createElement('button');
          const position = pointPosition(row, column);
          button.type = 'button';
          button.className = 'board-point';
          button.style.left = `${position.left}%`;
          button.style.top = `${position.top}%`;
          button.dataset.row = row;
          button.dataset.column = column;
          button.setAttribute('aria-label', `第${row + 1}行第${column + 1}列`);
          button.addEventListener('click', () => this.handlePoint(row, column));
          this.elements.pointLayer.append(button);
          this.points.push(button);
        }
      }
    }

    bindControls() {
      this.elements.undo.addEventListener('click', () => {
        this.clearSelection();
        this.game.undo();
      });
      this.elements.reset.addEventListener('click', () => this.resetGame());
      this.elements.rules.addEventListener('click', () => this.elements.rulesDialog.showModal());
      this.elements.playAgain.addEventListener('click', () => this.resetGame(false));

      this.elements.mode.addEventListener('change', (event) => {
        if (window.confirm('切换模式会重新开始当前棋局，继续吗？')) {
          this.game.reset({ mode: event.target.value });
        } else {
          event.target.value = this.game.state.mode;
        }
      });
      this.elements.difficulty.addEventListener('change', (event) => {
        if (window.confirm('更换难度会重新开始当前棋局，继续吗？')) {
          this.game.reset({ difficulty: event.target.value });
        } else {
          event.target.value = this.game.state.difficulty;
        }
      });
    }

    resetGame(confirmFirst = true) {
      if (confirmFirst && !window.confirm('要重新摆好棋子，开始一局新棋吗？')) return;
      this.clearSelection();
      this.game.reset();
    }

    canSelect(player, state) {
      if (state.thinking || state.outcome || player !== state.currentPlayer) return false;
      return state.mode === 'local' || player === WOOD;
    }

    handlePiece(row, column, player) {
      const state = this.game.state;
      if (!this.canSelect(player, state)) return;
      const point = [row, column];
      if (this.selected && samePoint(this.selected, point)) {
        this.clearSelection();
        this.render(state);
        return;
      }
      this.selected = point;
      this.legalMoves = generateMoves(state.board, player).filter((move) => samePoint(move.from, point));
      this.render(state);
    }

    handlePoint(row, column) {
      const move = this.legalMoves.find((candidate) => samePoint(candidate.to, [row, column]));
      if (!move) return;
      this.clearSelection();
      this.game.play(move);
    }

    clearSelection() {
      this.selected = null;
      this.legalMoves = [];
    }

    render(state) {
      if (this.selected && state.board[this.selected[0]][this.selected[1]] === 0) {
        this.clearSelection();
      }
      this.renderPoints(state);
      this.renderPieces(state);
      this.renderChrome(state);
      this.renderOutcome(state);
    }

    renderPoints(state) {
      for (const point of this.points) {
        const target = [Number(point.dataset.row), Number(point.dataset.column)];
        const legal = this.legalMoves.some((move) => samePoint(move.to, target));
        const last = state.lastMove && samePoint(state.lastMove.to, target);
        point.classList.toggle('is-legal', legal);
        point.classList.toggle('was-last', Boolean(last));
        point.disabled = !legal;
      }
    }

    renderPieces(state) {
      this.elements.pieceLayer.replaceChildren();
      for (let row = 0; row < 5; row += 1) {
        for (let column = 0; column < 5; column += 1) {
          const player = state.board[row][column];
          if (!player) continue;
          const position = pointPosition(row, column);
          const piece = document.createElement('button');
          piece.type = 'button';
          piece.className = `piece ${player === WOOD ? 'piece-wood' : 'piece-stone'}`;
          piece.style.left = `${position.left}%`;
          piece.style.top = `${position.top}%`;
          piece.setAttribute('aria-label', `${player === WOOD ? '木桩' : '石子'}，第${row + 1}行第${column + 1}列`);
          piece.disabled = !this.canSelect(player, state);
          if (this.selected && samePoint(this.selected, [row, column])) piece.classList.add('is-selected');
          if (state.lastMove && samePoint(state.lastMove.to, [row, column])) piece.classList.add('just-moved');
          const image = document.createElement('img');
          image.src = player === WOOD ? './assets/wood-piece.png' : './assets/stone-piece.png';
          image.alt = '';
          image.draggable = false;
          piece.append(image);
          piece.addEventListener('click', () => this.handlePiece(row, column, player));
          this.elements.pieceLayer.append(piece);
        }
      }
    }

    renderChrome(state) {
      this.elements.turnStatus.textContent = turnText(state);
      this.elements.woodCount.textContent = state.counts.wood;
      this.elements.stoneCount.textContent = state.counts.stone;
      this.elements.undo.disabled = !state.canUndo;
      this.elements.mode.value = state.mode;
      this.elements.difficulty.value = state.difficulty;
      this.elements.difficultyControl.hidden = state.mode === 'local';
      this.elements.thinkingCover.hidden = !state.thinking;
      this.elements.woodLabel.textContent = state.mode === 'ai' ? '你 · 木桩' : '木桩方';
      this.elements.stoneLabel.textContent = state.mode === 'ai' ? '机器 · 石子' : '石子方';
      this.elements.hint.textContent = state.thinking
        ? '它在泥地上盘算下一步'
        : this.selected
          ? '选择一个亮起的落点'
          : '点一枚棋子，再点亮起的落点';
    }

    renderOutcome(state) {
      if (!state.outcome || this.elements.resultDialog.open) return;
      if (state.outcome.draw) {
        this.elements.resultTitle.textContent = '这一局，和了';
        this.elements.resultMessage.textContent = '四十回合没有吃子，双方握手言和。';
      } else {
        const winnerName = state.outcome.winner === WOOD ? '木桩方' : '石子方';
        this.elements.resultTitle.textContent = `${winnerName}赢了`;
        this.elements.resultMessage.textContent = state.outcome.reason === 'blocked'
          ? '对手已经无路可走。'
          : '对手只剩下最后一枚棋子。';
      }
      this.elements.resultDialog.showModal();
    }
  }

  const game = new Game({ mode: 'ai', difficulty: 'normal' });
  const ui = new GameUI(game);

  window.fiveways = Object.freeze({
    game,
    ui,
    rules: { WOOD, STONE, EMPTY, generateMoves, simulateMove },
  });
}());
