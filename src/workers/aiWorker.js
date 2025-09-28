import { Chess } from "chess.js";

// --- LOGIKA EVALUASI CANGGIH ---
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };

const PST = {
  p: [
    [0, 0, 0, 0, 0, 0, 0, 0], [5, 10, 10, -20, -20, 10, 10, 5], [5, -5, -10, 0, 0, -10, -5, 5], [0, 0, 0, 20, 20, 0, 0, 0],
    [5, 5, 10, 25, 25, 10, 5, 5], [10, 10, 20, 30, 30, 20, 10, 10], [50, 50, 50, 50, 50, 50, 50, 50], [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  n: [
    [-50, -40, -30, -30, -30, -30, -40, -50], [-40, -20, 0, 0, 0, 0, -20, -40], [-30, 0, 10, 15, 15, 10, 0, -30], [-30, 5, 15, 20, 20, 15, 5, -30],
    [-30, 0, 15, 20, 20, 15, 0, -30], [-30, 5, 10, 15, 15, 10, 5, -30], [-40, -20, 0, 5, 5, 0, -20, -40], [-50, -40, -30, -30, -30, -30, -40, -50],
  ],
  b: [
    [-20, -10, -10, -10, -10, -10, -10, -20], [-10, 5, 0, 0, 0, 0, 5, -10], [-10, 10, 10, 10, 10, 10, 10, -10], [-10, 0, 10, 10, 10, 10, 0, -10],
    [-10, 5, 5, 10, 10, 5, 5, -10], [-10, 0, 5, 10, 10, 5, 0, -10], [-10, 0, 0, 0, 0, 0, 0, -10], [-20, -10, -10, -10, -10, -10, -10, -20],
  ],
  r: [
    [0, 0, 0, 5, 5, 0, 0, 0], [5, 10, 10, 10, 10, 10, 10, 5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5],
    [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [-5, 0, 0, 0, 0, 0, 0, -5], [0, 0, 0, 0, 0, 0, 0, 0],
  ],
  q: [
    [-20, -10, -10, -5, -5, -10, -10, -20], [-10, 0, 5, 0, 0, 0, 0, -10], [-10, 5, 5, 5, 5, 5, 0, -10], [0, 0, 5, 5, 5, 5, 0, -5],
    [-5, 0, 5, 5, 5, 5, 0, -5], [-10, 0, 5, 5, 5, 5, 0, -10], [-10, 0, 0, 0, 0, 0, 0, -10], [-20, -10, -10, -5, -5, -10, -10, -20],
  ],
  k: [
    [20, 30, 10, 0, 0, 10, 30, 20], [20, 20, 0, 0, 0, 0, 20, 20], [-10, -20, -20, -20, -20, -20, -20, -10], [-20, -30, -30, -40, -40, -30, -30, -20],
    [-30, -40, -40, -50, -50, -40, -40, -30], [-30, -50, -50, -50, -50, -50, -50, -30], [-30, -50, -50, -50, -50, -50, -50, -30], [-30, -50, -50, -50, -50, -50, -50, -30],
  ],
};

function evaluateBoard(game) {
  let total = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (piece) {
        const pstValue = PST[piece.type][piece.square.charCodeAt(1) - '1'][piece.square.charCodeAt(0) - 'a'] || 0;
        const materialValue = VAL[piece.type] || 0;
        const value = materialValue + pstValue;
        total += (piece.color === 'w' ? value : -value);
      }
    }
  }
  return total;
}

function orderMoves(game) {
  const moves = game.moves({ verbose: true });
  return moves.sort((a, b) => {
    const scoreA = (a.captured ? 10 * VAL[a.captured] - VAL[a.piece] : 0) + (a.promotion ? VAL[a.promotion] : 0);
    const scoreB = (b.captured ? 10 * VAL[b.captured] - VAL[b.piece] : 0) + (b.promotion ? VAL[b.promotion] : 0);
    return scoreB - scoreA;
  });
}

function negamax(game, depth, alpha, beta, color, deadline) {
  if (performance.now() > deadline) return { abort: true, score: 0 };
  if (depth === 0 || game.isGameOver()) {
    return { score: color * evaluateBoard(game) };
  }

  let bestScore = -Infinity;
  for (const move of orderMoves(game)) {
    game.move(move);
    const result = negamax(game, depth - 1, -beta, -alpha, -color, deadline);
    game.undo();

    if (result.abort) return result;
    const currentScore = -result.score;
    
    if (currentScore > bestScore) {
      bestScore = currentScore;
    }
    if (bestScore > alpha) {
      alpha = bestScore;
    }
    if (alpha >= beta) {
      break; 
    }
  }
  return { score: bestScore };
}

function findBestMove(fen, timeMs = 600, maxDepth = 4) {
  const start = performance.now();
  const deadline = start + timeMs;
  const game = new Chess(fen);
  
  let bestMove = null;
  let bestScore = -Infinity;
  const color = game.turn() === 'w' ? 1 : -1;

  for (let d = 1; d <= maxDepth; d++) {
    const moves = orderMoves(game);
    let currentBestMoveForDepth = null;

    for (const move of moves) {
      if (performance.now() > deadline) break;
      game.move(move);
      const result = negamax(game, d - 1, -Infinity, Infinity, -color, deadline);
      game.undo();
      
      if (result.abort) break;

      const score = -result.score;
      if (score > bestScore) {
        bestScore = score;
        bestMove = move;
        currentBestMoveForDepth = move;
      }
    }
    if (performance.now() > deadline && currentBestMoveForDepth) {
        bestMove = currentBestMoveForDepth;
        break;
    }
  }
  
  if (!bestMove) {
    const moves = game.moves({ verbose: true });
    if (moves.length > 0) bestMove = moves[0];
  }
  
  if (!bestMove) return { uci: null };
  
  return {
    uci: bestMove.from + bestMove.to + (bestMove.promotion || ""),
    score: bestScore,
  };
}

self.onmessage = (e) => {
  try {
    const { fen, timeMs, maxDepth } = e.data || {};
    const result = findBestMove(fen, timeMs, maxDepth);
    self.postMessage(result);
  } catch (err) {
    self.postMessage({ uci: null, error: String(err) });
  }
};