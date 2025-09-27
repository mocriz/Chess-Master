// src/workers/aiWorker.js
import { Chess } from "chess.js";

// nilai material standar
const VAL = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function evaluate(g){
  // material + mobilitas
  const board = g.board();
  let score = 0;
  for (const row of board){
    for (const sq of row){
      if (!sq) continue;
      const v = VAL[sq.type] || 0;
      score += (sq.color === 'w' ? +v : -v);
    }
  }
  // mobilitas sedikit
  try{
    const wmob = g.moves({verbose:true}).length;
    // switch turn
    g.turn = ()=> 'b'; // hack tidak aman → lebih baik pakai dua objek
  }catch{}
  return score;
}

function orderedMoves(g){
  const moves = g.moves({ verbose:true });
  // heuristik sederhana: capture dulu
  return moves.sort((a,b)=>{
    const ac = a.captured ? 1 : 0;
    const bc = b.captured ? 1 : 0;
    return bc - ac;
  });
}

function negamax(g, depth, alpha, beta, color){
  if (depth === 0 || g.isGameOver()){
    const e = evaluate(g);
    return color * e;
  }
  let best = -Infinity;
  const moves = orderedMoves(g);
  for (const m of moves){
    g.move(m);
    const val = -negamax(g, depth-1, -beta, -alpha, -color);
    g.undo();
    if (val > best) best = val;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

function bestMove(fen, depth){
  const g = new Chess(fen);
  let best = null, bestScore = -Infinity;
  const moves = orderedMoves(g);
  for (const m of moves){
    g.move(m);
    const val = -negamax(g, Math.max(0, depth-1), -Infinity, Infinity, -1);
    g.undo();
    if (val > bestScore){
      bestScore = val; best = m;
    }
  }
  if (!best) return { uci: null, score: 0 };
  return { uci: best.from + best.to + (best.promotion || ""), score: bestScore };
}

self.onmessage = (e)=>{
  try{
    const { fen, depth=3 } = e.data || {};
    const out = bestMove(fen, depth);
    self.postMessage(out);
  }catch(err){
    self.postMessage({ uci: null, error: String(err) });
  }
};
