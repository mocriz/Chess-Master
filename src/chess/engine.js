// Engine adapter using chess.js (logic-only; no UI/styling changes)
import { Chess } from 'chess.js';

// ===== Helpers untuk konversi koordinat =====
export function algebraToIndex(s) {
  const str = typeof s === 'string' ? s : (s?.from || s?.to || '');
  const file = str.charCodeAt(0) - 97; // a..h -> 0..7
  const rank = parseInt(str[1], 10);   // 1..8
  const r = 8 - rank;
  const c = file;
  return [r, c];
}
export function indexToAlgebra(r, c) {
  const file = String.fromCharCode(97 + c);
  const rank = 8 - r;
  return file + String(rank);
}
export function sameSquare(a, b) {
  return !!a && !!b && a[0] === b[0] && a[1] === b[1];
}

// ===== Konversi board <-> FEN (untuk sinkron dengan chess.js) =====
const LETTER = { king:'k', queen:'q', rook:'r', bishop:'b', knight:'n', pawn:'p' };

function pieceToFen(cell){
  if(!cell) return null;
  const ch = LETTER[cell.piece] || '?';
  return cell.color === 'white' ? ch.toUpperCase() : ch;
}

// Row 0 = rank 8 (atas), Row 7 = rank 1 (bawah)
function computeCastling(board){
  let s = '';
  // white: e1/h1/a1 -> row7 col4/7/0
  const wK = board[7]?.[4], wRk = board[7]?.[7], wRq = board[7]?.[0];
  if (wK && wK.color==='white' && wK.piece==='king' && !wK.hasMoved) {
    if (wRk && wRk.color==='white' && wRk.piece==='rook' && !wRk.hasMoved) s+='K';
    if (wRq && wRq.color==='white' && wRq.piece==='rook' && !wRq.hasMoved) s+='Q';
  }
  // black: e8/h8/a8 -> row0 col4/7/0
  const bK = board[0]?.[4], bRk = board[0]?.[7], bRq = board[0]?.[0];
  if (bK && bK.color==='black' && bK.piece==='king' && !bK.hasMoved) {
    if (bRk && bRk.color==='black' && bRk.piece==='rook' && !bRk.hasMoved) s+='k';
    if (bRq && bRq.color==='black' && bRq.piece==='rook' && !bRq.hasMoved) s+='q';
  }
  return s || '-';
}

export function boardToFen(board, sideToMove='white', enPassantTarget=null, halfmove=0, fullmove=1){
  let placement = '';
  for(let r=0;r<8;r++){
    let empty = 0;
    for(let c=0;c<8;c++){
      const ch = pieceToFen(board[r][c]);
      if(ch){ if(empty){ placement += empty; empty=0; } placement += ch; }
      else empty++;
    }
    if(empty) placement += empty;
    if(r<7) placement += '/';
  }
  const side = sideToMove==='white'?'w':'b';
  const castling = computeCastling(board);
  const ep = enPassantTarget ? indexToAlgebra(enPassantTarget[0], enPassantTarget[1]) : '-';
  return `${placement} ${side} ${castling} ${ep} ${halfmove} ${fullmove}`;
}

export function fenToArray(fen){
  const game = new Chess(fen);
  const bb = game.board(); // [8][8], index 0 = rank 8
  const arr = Array.from({length:8},()=>Array(8).fill(null));
  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const sq = bb[r][c];
      if(!sq) { arr[r][c] = null; continue; }
      const color = sq.color === 'w' ? 'white' : 'black';
      const piece = sq.type === 'k' ? 'king' : sq.type === 'q' ? 'queen' : sq.type === 'r' ? 'rook' : sq.type === 'b' ? 'bishop' : sq.type === 'n' ? 'knight' : 'pawn';
      arr[r][c] = { piece, color, hasMoved: true };
    }
  }
  // Restore hasMoved dari castling rights
  const rights = (fen.split(' ')[2] || '-');
  if (rights.includes('K')) { if (arr[7][4]?.piece==='king' && arr[7][4]?.color==='white') arr[7][4].hasMoved = false; if (arr[7][7]?.piece==='rook' && arr[7][7]?.color==='white') arr[7][7].hasMoved = false; }
  if (rights.includes('Q')) { if (arr[7][4]?.piece==='king' && arr[7][4]?.color==='white') arr[7][4].hasMoved = false; if (arr[7][0]?.piece==='rook' && arr[7][0]?.color==='white') arr[7][0].hasMoved = false; }
  if (rights.includes('k')) { if (arr[0][4]?.piece==='king' && arr[0][4]?.color==='black') arr[0][4].hasMoved = false; if (arr[0][7]?.piece==='rook' && arr[0][7]?.color==='black') arr[0][7].hasMoved = false; }
  if (rights.includes('q')) { if (arr[0][4]?.piece==='king' && arr[0][4]?.color==='black') arr[0][4].hasMoved = false; if (arr[0][0]?.piece==='rook' && arr[0][0]?.color==='black') arr[0][0].hasMoved = false; }
  return arr;
}

// ===== API publik yang dipakai UI =====
export function initializeBoard(){
  const board = Array.from({length:8},()=>Array(8).fill(null));
  const back = ['rook','knight','bishop','queen','king','bishop','knight','rook'];
  // black (atas)
  for(let c=0;c<8;c++) board[0][c] = { piece: back[c], color:'black', hasMoved:false };
  for(let c=0;c<8;c++) board[1][c] = { piece:'pawn', color:'black', hasMoved:false };
  // white (bawah)
  for(let c=0;c<8;c++) board[7][c] = { piece: back[c], color:'white', hasMoved:false };
  for(let c=0;c<8;c++) board[6][c] = { piece:'pawn', color:'white', hasMoved:false };
  return board;
}
export function cloneBoard(b){ return b.map(row => row.map(cell => cell ? {...cell} : null)); }

export function isInCheck(board, color, enPassantTarget){
  const fen = boardToFen(board, color, enPassantTarget, 0, 1);
  const g = new Chess(fen);
  return (g.inCheck ? g.inCheck() : g.in_check?.()) || false;
}

export function isPseudoLegalMove(board, fr, fc, tr, tc, enPassantTarget){
  const mover = board[fr][fc]; if(!mover) return false;
  const side = mover.color;
  const fen = boardToFen(board, side, enPassantTarget, 0, 1);
  const g = new Chess(fen);
  const from = indexToAlgebra(fr,fc);
  const to   = indexToAlgebra(tr,tc);
  const moves = g.moves({ verbose:true });
  return moves.some(m => m.from===from && m.to===to);
}

export function legalMovesForSquareStrict(board, r, c, currentPlayer, enPassantTarget){
  const fen = boardToFen(board, currentPlayer, enPassantTarget, 0, 1);
  const g = new Chess(fen);
  const from = indexToAlgebra(r,c);
  const list = g.moves({ square: from, verbose:true });
  return list.map(m => algebraToIndex(m.to));
}

export function allLegalMoves(board, currentPlayer, enPassantTarget){
  const fen = boardToFen(board, currentPlayer, enPassantTarget, 0, 1);
  const g = new Chess(fen);
  const moves = g.moves({ verbose:true });
  return moves.map(m => {
    const [fr,fc] = algebraToIndex(m.from);
    const [tr,tc] = algebraToIndex(m.to);
    return [fr,fc,tr,tc];
  });
}

export function applyMove(board, fr, fc, tr, tc, enPassantTarget){
  const src = board[fr][fc];
  if(!src) return { board, captured:null, newEnPassantTarget: enPassantTarget };

  // Human promotion ditangani via modal; di sini cukup “naik” dulu
  const reachingLast = src.piece==='pawn' && (tr===0 || tr===7);
  if (reachingLast){
    const nb = cloneBoard(board);
    const cap = nb[tr][tc] ? { ...nb[tr][tc] } : null;
    nb[tr][tc] = { ...nb[fr][fc], hasMoved:true };
    nb[fr][fc] = null;
    return { board: nb, captured: cap, newEnPassantTarget: null };
  }

  const fen = boardToFen(board, src.color, enPassantTarget, 0, 1);
  const g = new Chess(fen);
  const from = indexToAlgebra(fr,fc);
  const to   = indexToAlgebra(tr,tc);
  const made = g.move({ from, to, promotion:'q' });
  if(!made){
    return { board, captured:null, newEnPassantTarget: enPassantTarget };
  }

  const afterFen = g.fen();
  const epStr = afterFen.split(' ')[3];
  const newEPT = epStr && epStr !== '-' ? algebraToIndex(epStr) : null;

  let captured = null;
  if (made.captured){
    const capColor = src.color === 'white' ? 'black' : 'white';
    const capPiece = made.captured==='k'?'king': made.captured==='q'?'queen': made.captured==='r'?'rook': made.captured==='b'?'bishop': made.captured==='n'?'knight':'pawn';
    captured = { piece: capPiece, color: capColor };
  }

  const nb = fenToArray(afterFen);
  nb[tr][tc] = { ...nb[tr][tc], hasMoved:true };
  return { board: nb, captured, newEnPassantTarget: newEPT };
}

// ===== Minimax sederhana (fallback) =====
const VAL = { p:100, n:305, b:330, r:500, q:900, k:0 };
function evalBoard(g){
  const b = g.board();
  let s = 0;
  for (let r=0;r<8;r++){
    for (let c=0;c<8;c++){
      const sq = b[r][c];
      if(!sq) continue;
      s += (sq.color==='w' ? 1 : -1) * VAL[sq.type];
    }
  }
  const mob = g.moves().length;
  s += (g.turn()==='w'? mob : -mob);
  if (g.inCheckmate ? g.inCheckmate() : g.in_checkmate?.()) {
    s += (g.turn()==='w'? -100000 : 100000);
  }
  return s;
}

export function minimax(board, depth, alpha, beta, playerColor, rootColor, enPassantTarget){
  const rootFen = boardToFen(board, playerColor, enPassantTarget, 0, 1);
  const root = new Chess(rootFen);

  function search(g, d, a, b){
    const isMate = g.isCheckmate?.() || g.inCheckmate?.();
    const isDraw = g.isDraw?.() || g.inDraw?.();
    if (d===0 || isMate || isDraw) return { score: evalBoard(g), move:null };

    const moves = g.moves({ verbose:true });
    if(!moves.length) return { score: evalBoard(g), move:null };

    let best=null;
    if (g.turn()==='w'){
      let max=-Infinity;
      for(const m of moves){
        const gg = new Chess(g.fen());
        gg.move({ from:m.from, to:m.to, promotion: m.promotion || 'q' });
        const { score } = search(gg, d-1, a, b);
        if (score>max){ max=score; best=m; }
        a = Math.max(a, score); if (b<=a) break;
      }
      return { score:max, move:best };
    } else {
      let min= Infinity;
      for(const m of moves){
        const gg = new Chess(g.fen());
        gg.move({ from:m.from, to:m.to, promotion: m.promotion || 'q' });
        const { score } = search(gg, d-1, a, b);
        if (score<min){ min=score; best=m; }
        b = Math.min(b, score); if (b<=a) break;
      }
      return { score:min, move:best };
    }
  }

  const { move } = search(root, depth, alpha, beta);
  if(!move) return { score:0, move:null };
  const [fr,fc] = algebraToIndex(move.from);
  const [tr,tc] = algebraToIndex(move.to);
  return { score:0, move:[fr,fc,tr,tc] };
}
