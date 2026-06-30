export const EMPTY = 0;
export const WOOD = 1;
export const STONE = -1;

export const BOARD_SIZE = 5;
export const DIRECTIONS = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];


export function createInitialBoard() {
  return [
    [WOOD, WOOD, WOOD, WOOD, WOOD],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [EMPTY, EMPTY, EMPTY, EMPTY, EMPTY],
    [STONE, STONE, STONE, STONE, STONE],
  ];
}


export function cloneBoard(board) {
  return board.map((row) => row.slice());
}


export function countPieces(board, player) {
  return board.flat().filter((value) => value === player).length;
}


export function inBoard(row, column) {
  return row >= 0 && row < BOARD_SIZE && column >= 0 && column < BOARD_SIZE;
}


function samePoint(a, b) {
  return a[0] === b[0] && a[1] === b[1];
}


export function generateMoves(board, player) {
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


export function findGuns(board, player) {
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


export function simulateMove(board, move, player) {
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


export function getOutcome(board, currentPlayer, quietTurns = 0) {
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
