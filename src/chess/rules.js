// Logic helpers for draw rules & position keys (no UI/styling)

// Map engine piece to FEN letter
const PIECE_LETTER = {
  king: 'k', queen: 'q', rook: 'r', bishop: 'b', knight: 'n', pawn: 'p'
};

function pieceToFenChar(cell){
  if(!cell) return null;
  const ch = PIECE_LETTER[cell.piece] || '?';
  return cell.color === 'white' ? ch.toUpperCase() : ch;
}

// Compute castling rights from board state (based on presence & hasMoved)
function computeCastling(board){
  // Coordinates: white back rank = row 0? In this project, white pawns at row 1, black pawns at row 6,
  // so white back rank is row 0, black back rank is row 7.
  let rights = '';
  const wK = board[0]?.[4];
  const wRk = board[0]?.[7];
  const wRq = board[0]?.[0];
  const bK = board[7]?.[4];
  const bRk = board[7]?.[7];
  const bRq = board[7]?.[0];

  if (wK && wK.color==='white' && wK.piece==='king' && !wK.hasMoved) {
    if (wRk && wRk.color==='white' && wRk.piece==='rook' && !wRk.hasMoved) rights += 'K';
    if (wRq && wRq.color==='white' && wRq.piece==='rook' && !wRq.hasMoved) rights += 'Q';
  }
  if (bK && bK.color==='black' && bK.piece==='king' && !bK.hasMoved) {
    if (bRk && bRk.color==='black' && bRk.piece==='rook' && !bRk.hasMoved) rights += 'k';
    if (bRq && bRq.color==='black' && bRq.piece==='rook' && !bRq.hasMoved) rights += 'q';
  }
  return rights || '-';
}

function toAlgebra([r,c]){
  const file = String.fromCharCode(97 + c);
  const rank = 8 - r;
  return file + String(rank);
}

// Build a repetition key (FEN-like) using: pieces, side-to-move, castling rights, en-passant target
export function positionKey(board, sideToMove, enPassantTarget){
  // piece placement
  let placement = '';
  for(let r=7; r>=0; r--){
    let empty = 0;
    for(let c=0; c<8; c++){
      const ch = pieceToFenChar(board[r][c]);
      if(ch){ if(empty){ placement += empty; empty = 0; } placement += ch; }
      else empty++;
    }
    if(empty) placement += empty;
    if(r>0) placement += '/';
  }

  const side = sideToMove === 'white' ? 'w' : 'b';
  const castling = computeCastling(board);
  const ep = enPassantTarget ? toAlgebra(enPassantTarget) : '-';

  return `${placement} ${side} ${castling} ${ep}`;
}

// Insufficient material detection (simple but correct for common cases)
export function isInsufficientMaterial(board){
  let white = {k:0,q:0,r:0,b:0,n:0,p:0, bishopSquares:[]};
  let black = {k:0,q:0,r:0,b:0,n:0,p:0, bishopSquares:[]};

  for(let r=0;r<8;r++){
    for(let c=0;c<8;c++){
      const cell = board[r][c]; if(!cell) continue;
      const side = cell.color === 'white' ? white : black;
      switch(cell.piece){
        case 'king': side.k++; break;
        case 'queen': side.q++; break;
        case 'rook': side.r++; break;
        case 'bishop': side.b++; side.bishopSquares.push((r+c)&1); break;
        case 'knight': side.n++; break;
        case 'pawn': side.p++; break;
      }
    }
  }

  // Any heavy piece or pawn on board → material sufficient
  if (white.q||white.r||white.p||black.q||black.r||black.p) return false;

  const totalB = white.b + black.b;
  const totalN = white.n + black.n;

  // King vs King
  if (totalB===0 && totalN===0) return true;

  // King + minor vs King
  if (totalB + totalN === 1) return true; // K+B vs K or K+N vs K

  // King + bishop vs King + bishop on same color squares
  if (totalB === 2 && totalN === 0) {
    if (white.b === 1 && black.b === 1) {
      const wColor = white.bishopSquares[0];
      const bColor = black.bishopSquares[0];
      if (wColor === bColor) return true;
    }
  }

  // King + (two knights) vs King — usually insufficient to force mate
  if (totalN === 2 && totalB === 0 && (white.n===2 || black.n===2)) return true;

  return false;
}
