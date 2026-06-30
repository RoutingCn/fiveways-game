import {
  WOOD,
  generateMoves,
  simulateMove,
  countPieces,
  findGuns,
  getOutcome,
} from './rules.js';


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


export function evaluateBoard(board, player) {
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
    const enemyCanCapture = immediateCaptures(candidate.result.board, -player) > 0;
    if (enemyCanCapture) score -= 100;
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
      best = Math.max(
        best,
        minimax(result.board, depth - 1, alpha, beta, -currentPlayer, aiPlayer),
      );
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }

  let best = Infinity;
  for (const { result } of candidates) {
    best = Math.min(
      best,
      minimax(result.board, depth - 1, alpha, beta, -currentPlayer, aiPlayer),
    );
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


export function chooseMove(board, player, difficulty = 'normal', random = Math.random) {
  if (difficulty === 'easy') return easyMove(board, player, random);
  if (difficulty === 'hard') return hardMove(board, player, random);
  return normalMove(board, player, random);
}
