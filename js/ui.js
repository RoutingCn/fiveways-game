import { WOOD, STONE, generateMoves } from './rules.js';


const GRID = {
  left: 25.8,
  top: 8.5,
  width: 49.2,
  height: 81,
};


export function pointPosition(row, column) {
  return {
    left: Number((GRID.left + (GRID.width / 4) * column).toFixed(2)),
    top: Number((GRID.top + (GRID.height / 4) * row).toFixed(2)),
  };
}


export function turnText(state) {
  if (state.thinking) return '机器正在琢磨…';
  if (state.mode === 'ai') {
    return state.currentPlayer === WOOD ? '轮到你 · 木桩' : '轮到机器 · 石子';
  }
  return state.currentPlayer === WOOD ? '轮到木桩方' : '轮到石子方';
}


const samePoint = (left, right) => left[0] === right[0] && left[1] === right[1];


export class GameUI {
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
