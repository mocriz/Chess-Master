// Smarter, non-template AI (JS)
// Works with your current board shape (8x8 matrix of {piece, color} | null)
// Public API:
//   pickAIMove(board, color, moves, { level, history }) -> [fr,fc,tr,tc]

const VAL = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 0 };

// Simple piece-square tables (midgame-ish), white perspective (row 0 = white back rank)
const PST = {
  pawn: [
    [  0,  0,  0,  0,  0,  0,  0,  0],
    [ 50, 50, 50, 50, 50, 50, 50, 50],
    [ 10, 10, 20, 30, 30, 20, 10, 10],
    [  5,  5, 10, 25, 25, 10,  5,  5],
    [  0,  0,  0, 20, 20,  0,  0,  0],
    [  5, -5,-10,  0,  0,-10, -5,  5],
    [  5, 10, 10,-20,-20, 10, 10,  5],
    [  0,  0,  0,  0,  0,  0,  0,  0],
  ],
  knight: [
    [-50,-40,-30,-30,-30,-30,-40,-50],
    [-40,-20,  0,  5,  5,  0,-20,-40],
    [-30,  5, 10, 15, 15, 10,  5,-30],
    [-30,  0, 15, 20, 20, 15,  0,-30],
    [-30,  5, 15, 20, 20, 15,  5,-30],
    [-30,  0, 10, 15, 15, 10,  0,-30],
    [-40,-20,  0,  0,  0,  0,-20,-40],
    [-50,-40,-30,-30,-30,-30,-40,-50],
  ],
  bishop: [
    [-20,-10,-10,-10,-10,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5, 10, 10,  5,  0,-10],
    [-10,  5,  5, 10, 10,  5,  5,-10],
    [-10,  0, 10, 10, 10, 10,  0,-10],
    [-10, 10, 10, 10, 10, 10, 10,-10],
    [-10,  5,  0,  0,  0,  0,  5,-10],
    [-20,-10,-10,-10,-10,-10,-10,-20],
  ],
  rook: [
    [  0,  0,  0,  5,  5,  0,  0,  0],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [ -5,  0,  0,  0,  0,  0,  0, -5],
    [  5, 10, 10, 10,  10, 10, 10,  5],
    [  0,  0,  0,  0,  0,  0,  0,  0],
  ],
  queen: [
    [-20,-10,-10, -5, -5,-10,-10,-20],
    [-10,  0,  0,  0,  0,  0,  0,-10],
    [-10,  0,  5,  5,  5,  5,  0,-10],
    [ -5,  0,  5,  5,  5,  5,  0, -5],
    [  0,  0,  5,  5,  5,  5,  0, -5],
    [-10,  5,  5,  5,  5,  5,  0,-10],
    [-10,  0,  5,  0,  0,  0,  0,-10],
    [-20,-10,-10, -5, -5,-10,-10,-20],
  ],
  king: [
    [ 20, 30, 10,  0,  0, 10, 30, 20],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-20,-30,-30,-40,-40,-30,-30,-20],
    [-10,-20,-20,-20,-20,-20,-20,-10],
    [ 20, 20,  0,  0,  0,  0, 20, 20],
    [ 20, 30, 10,  0,  0, 10, 30, 20],
  ],
};

function cloneBoard(board){
  return board.map(row => row.map(cell => cell ? { ...cell } : null));
}

function applyMove(board, move){
  const [fr, fc, tr, tc] = move;
  const nb = cloneBoard(board);
  const moving = nb[fr][fc];
  const captured = nb[tr][tc];
  nb[tr][tc] = moving;
  nb[fr][fc] = null;
  // simple promotion (to queen) if pawn reaches last rank
  if (moving && moving.piece === 'pawn'){
    if ((moving.color === 'white' && tr === 7) || (moving.color === 'black' && tr === 0)){
      nb[tr][tc] = { piece: 'queen', color: moving.color };
    }
  }
  return { board: nb, captured };
}

function evalBoardForWhite(board){
  let score = 0;
  for (let r = 0; r < 8; r++){
    for (let c = 0; c < 8; c++){
      const p = board[r][c];
      if (!p) continue;
      const s = VAL[p.piece];
      const pst = PST[p.piece][r][c];
      score += (p.color === 'white' ? +1 : -1) * (s + pst);
    }
  }
  // small center control bonus (e4,d4,e5,d5)
  const centers = [[3,3],[3,4],[4,3],[4,4]];
  for (const [r,c] of centers){
    const p = board[r][c];
    if (!p) continue;
    score += (p.color === 'white' ? 6 : -6);
  }
  return score;
}

function evaluatePosition(board, povColor){
  const s = evalBoardForWhite(board);
  return povColor === 'white' ? s : -s;
}

function isImmediateRepetition(history, move){
  if (!history || history.length === 0) return false;
  const last = history[history.length - 1];
  if (!last || !last.from || !last.to) return false;
  const [fr, fc, tr, tc] = move;
  return (last.from[0] === tr && last.from[1] === tc && last.to[0] === fr && last.to[1] === fc);
}

function devBonus(fr, fc, tr, tc, piece, color){
  let bonus = 0;
  if (piece === 'knight' || piece === 'bishop'){
    // leaving the back rank is generally good early
    if ((color === 'white' && fr === 0) || (color === 'black' && fr === 7)) bonus += 12;
  }
  if (piece === 'pawn'){
    if (fc === 3 || fc === 4) bonus += 6; // push center pawns
  }
  return bonus;
}

function captureBonus(captured){
  if (!captured) return 0;
  return VAL[captured.piece] * 0.9;
}

function noiseByLevel(level){
  switch(level){
    case 'beginner': return 30;
    case 'intermediate': return 12;
    case 'advanced': return 6;
    case 'master': return 2;
    default: return 10;
  }
}

function sampleTopK(scored, k){
  const sorted = [...scored].sort((a,b)=>b.score - a.score);
  const top = sorted.slice(0, Math.max(1, k));
  const idx = Math.floor(Math.random() * top.length);
  return top[idx];
}

function findKing(board, color){
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const p = board[r][c];
      if (p && p.piece==='king' && p.color===color) return [r,c];
    }
  }
  return null;
}

function kingSafetyDelta(board, color){
  // negative if king is too central and exposed; positive if shielded by pawns
  let delta = 0;
  const kp = findKing(board, color);
  if (!kp) return 0;
  const [kr,kc] = kp;
  // central squares (rough): rows 2..5, cols 2..5
  if (kr>=2 && kr<=5 && kc>=2 && kc<=5) delta -= 15;

  // pawn shield: friendly pawns one rank in front (depending on color)
  const dir = (color==='white') ? +1 : -1;
  const rr = kr + dir;
  if (rr>=0 && rr<8){
    for (let dc=-1; dc<=1; dc++){
      const cc = kc + dc;
      if (cc<0||cc>=8) continue;
      const p = board[rr][cc];
      if (p && p.color===color && p.piece==='pawn') delta += 6; // small shield bonus per pawn
    }
  }
  return delta;
}

function minorsOnBackRank(board, color){
  let cnt = 0;
  const back = (color==='white') ? 0 : 7;
  for (let c of [1,2,5,6]){
    const p = board[back][c];
    if (p && p.color===color && (p.piece==='knight' || p.piece==='bishop')) cnt++;
  }
  return cnt;
}

export function pickAIMove(board, color, moves, opts={}){
  if (!moves || moves.length === 0) return null;
  const level = opts.level || 'intermediate';
  const history = opts.history || [];
  const jitter = noiseByLevel(level);
  const halfMoves = history.length; // used to detect early game

  const scored = moves.map(m => {
    const [fr, fc, tr, tc] = m;
    const moving = board[fr][fc];
    const { board: nb, captured } = applyMove(board, m);

    let score = evaluatePosition(nb, color);

    // positional tweaks
    score += captureBonus(captured);
    score += devBonus(fr, fc, tr, tc, moving?.piece, color);

    // discourage back-and-forth
    if (isImmediateRepetition(history, m)) score -= 25;

    // tiny penalty for rook shuffling on back rank forever
    if (moving && moving.piece === 'rook'){
      const onBack = (moving.color === 'white' ? tr === 0 : tr === 7);
      if (onBack) score -= 6;
    }

    // NEW: early king move is risky
    if (moving && moving.piece === 'king' && halfMoves < 12){
      score -= 100; // avoid Kxf2 / Kxf7 kind of stuff early
    }

    // NEW: early rook move if minors undeveloped
    if (moving && moving.piece === 'rook' && halfMoves < 20){
      const undeveloped = minorsOnBackRank(board, moving.color);
      if (undeveloped >= 2) score -= 35;
    }

    // NEW: simple king safety after the move
    score += kingSafetyDelta(nb, color);

    // randomness by level (keeps variety)
    score += (Math.random() * 2 - 1) * jitter;

    return { move: m, score };
  });

  // choose with small diversity per level
  let pick;
  switch(level){
    case 'master': pick = sampleTopK(scored, 2); break;
    case 'advanced': pick = sampleTopK(scored, 3); break;
    case 'intermediate': pick = sampleTopK(scored, 4); break;
    case 'beginner': pick = sampleTopK(scored, 6); break;
    default: pick = sampleTopK(scored, 4);
  }

  return pick.move;
}
