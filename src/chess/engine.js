import { PIECE_VALUES } from "./constants";

export function createPiece(piece, color) { return { piece, color, hasMoved: false }; }

export function initializeBoard() {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  b[0] = ["rook","knight","bishop","queen","king","bishop","knight","rook"].map(p=>createPiece(p,"white"));
  b[1] = Array(8).fill(null).map(()=>createPiece("pawn","white"));
  b[7] = ["rook","knight","bishop","queen","king","bishop","knight","rook"].map(p=>createPiece(p,"black"));
  b[6] = Array(8).fill(null).map(()=>createPiece("pawn","black"));
  return b;
}

export function cloneBoard(board){return board.map(row=>row.map(c=>c?{...c}:null));}
export function sameSquare(a,b){return a && b && a[0]===b[0] && a[1]===b[1];}
export function inBounds(r,c){return r>=0&&r<8&&c>=0&&c<8;}

export function isPathClear(board, fr, fc, tr, tc){
  const rs = fr===tr?0:(tr-fr)/Math.abs(tr-fr);
  const cs = fc===tc?0:(tc-fc)/Math.abs(tc-fc);
  let r=fr+rs, c=fc+cs;
  while(r!==tr||c!==tc){ if(board[r][c]!==null) return false; r+=rs; c+=cs; }
  return true;
}

export function findKing(board, color){
  for(let r=0;r<8;r++){ for(let c=0;c<8;c++){ const pc=board[r][c]; if(pc&&pc.color===color&&pc.piece==="king") return [r,c]; }}
  return null;
}

export function squareAttackedBy(board, tr, tc, attackerColor, enPassantTarget){
  for(let r=0;r<8;r++) for(let c=0;c<8;c++){
    const pc=board[r][c]; if(!pc||pc.color!==attackerColor) continue;
    if(isPseudoLegalMove(board,r,c,tr,tc,enPassantTarget,true)) return true;
  }
  return false;
}

export function isInCheck(board,color,enPassantTarget){
  const k=findKing(board,color); if(!k) return false; const opp=color==="white"?"black":"white";
  return squareAttackedBy(board, k[0], k[1], opp, enPassantTarget);
}

// Pseudo-legal: no self-check validation; supports EP and castling geometry
export function isPseudoLegalMove(board, fr, fc, tr, tc, enPassantTarget, forAttackOnly=false){
  if(!inBounds(fr,fc)||!inBounds(tr,tc)) return false;
  const src=board[fr][fc]; if(!src) return false; const dst=board[tr][tc]; if(dst&&dst.color===src.color) return false;
  const dr=tr-fr, dc=tc-fc, ar=Math.abs(dr), ac=Math.abs(dc);
  switch(src.piece){
    case "pawn":{
      const dir=src.color==="white"?1:-1; const start=src.color==="white"?1:6;
      if(dc===0){
        if(dr===dir && !dst) return true;
        if(fr===start && dr===2*dir && !dst && board[fr+dir][fc]===null) return true; return false;
      }
      if(ar===1&&ac===1&&dr===dir){
        if(dst && dst.color!==src.color) return true;
        if(!dst && enPassantTarget && enPassantTarget[0]===tr && enPassantTarget[1]===tc) return true;
      }
      return false;
    }
    case "rook": return (fr===tr||fc===tc)&&isPathClear(board,fr,fc,tr,tc);
    case "bishop": return ar===ac && isPathClear(board,fr,fc,tr,tc);
    case "queen": return (fr===tr||fc===tc||ar===ac) && isPathClear(board,fr,fc,tr,tc);
    case "knight": return (ar===2&&ac===1)||(ar===1&&ac===2);
    case "king":{
      if(ar<=1&&ac<=1) return true;
      if(!src.hasMoved && ar===0 && ac===2 && !forAttackOnly){
        const rookCol = dc>0?7:0; const rook=board[fr][rookCol];
        if(isPathClear(board,fr,fc,fr,rookCol) && rook && rook.piece==="rook" && !rook.hasMoved){
          const step=dc>0?1:-1; const p1=[fr,fc+step], p2=[fr,fc+2*step];
          if(board[p1[0]][p1[1]]===null && board[p2[0]][p2[1]]===null) return true;
        }
      }
      return false;
    }
    default: return false;
  }
}

export function applyMove(board, fr, fc, tr, tc, enPassantTarget){
  const b=cloneBoard(board); const src=b[fr][fc]; const dst=b[tr][tc];
  let captured=dst||null; let newEnPassantTarget=null;

  // en passant capture
  if(src.piece==="pawn" && dst===null && enPassantTarget && enPassantTarget[0]===tr && enPassantTarget[1]===tc){
    const dir=src.color==="white"?1:-1; const capR=tr-dir; captured=b[capR][tc]; b[capR][tc]=null;
  }
  // castling
  if(src.piece==="king" && Math.abs(tc-fc)===2 && fr===tr){
    const rookCol = tc>fc?7:0; const newRookCol = tc>fc?tc-1:tc+1; const rook=b[fr][rookCol];
    if(rook && rook.piece==="rook"){ b[fr][newRookCol]={...rook,hasMoved:true}; b[fr][rookCol]=null; }
  }

  b[tr][tc]={...src,hasMoved:true}; b[fr][fc]=null;

  if(src.piece==="pawn" && Math.abs(tr-fr)===2){ const midR=(tr+fr)/2; newEnPassantTarget=[midR, fc]; }

  return { board:b, captured, newEnPassantTarget };
}

export function legalMovesForSquare(board,r,c,color,enPassantTarget){
  const src=board[r][c]; if(!src||src.color!==color) return [];
  const out=[]; for(let tr=0;tr<8;tr++) for(let tc=0;tc<8;tc++){
    if(!isPseudoLegalMove(board,r,c,tr,tc,enPassantTarget)) continue;
    const {board:nb} = applyMove(board,r,c,tr,tc,enPassantTarget);
    if(!isInCheck(nb, color, null)) out.push([tr,tc]);
  }
  return out;
}

// ✅ baru: filter langkah yang TIDAK membuat raja sendiri tetap skak
export function legalMovesForSquareStrict(board, r, c, color, enPassantTarget) {
  const pseudo = legalMovesForSquare(board, r, c, color, enPassantTarget); // ini milikmu yang lama
  const out = [];
  for (const [tr, tc] of pseudo) {
    const { board: nb } = applyMove(board, r, c, tr, tc, enPassantTarget);
    // tolak kalau setelah dijalankan, warna 'color' masih di-check
    if (!isInCheck(nb, color, null)) out.push([tr, tc]);
  }
  return out;
}

// ✅ ganti implementasi: sekarang allLegalMoves benar-benar LEGAL
export function allLegalMoves(board, color, enPassantTarget) {
  const res = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== color) continue;
      const legal = legalMovesForSquareStrict(board, r, c, color, enPassantTarget);
      for (const [tr, tc] of legal) res.push([r, c, tr, tc]);
    }
  }
  return res;
}


export function evaluateBoard(board){
  let s=0; for(let r=0;r<8;r++) for(let c=0;c<8;c++){ const pc=board[r][c]; if(!pc) continue; const v=PIECE_VALUES[pc.piece]||0; s+= pc.color==="white"?v:-v; }
  return s;
}

export function minimax(board, depth, alpha, beta, maximizingColor, toMoveColor, enPassantTarget){
  const legal = allLegalMoves(board, toMoveColor, enPassantTarget); const opp=toMoveColor==="white"?"black":"white";
  if(depth===0 || legal.length===0){
    const evalScore = evaluateBoard(board);
    if(legal.length===0){ if(isInCheck(board,toMoveColor,enPassantTarget)) return {score: toMoveColor===maximizingColor ? -Infinity : Infinity}; return {score:0}; }
    return {score: maximizingColor==="white"?evalScore:-evalScore};
  }
  let bestMove=null;
  if(toMoveColor===maximizingColor){
    let val=-Infinity; for(const [fr,fc,tr,tc] of legal){
      const {board:nb,newEnPassantTarget} = applyMove(board,fr,fc,tr,tc,enPassantTarget);
      const {score} = minimax(nb, depth-1, alpha, beta, maximizingColor, opp, newEnPassantTarget);
      if(score>val){val=score; bestMove=[fr,fc,tr,tc];} alpha=Math.max(alpha,val); if(alpha>=beta) break;
    } return {score:val, move:bestMove};
  } else {
    let val=Infinity; for(const [fr,fc,tr,tc] of legal){
      const {board:nb,newEnPassantTarget} = applyMove(board,fr,fc,tr,tc,enPassantTarget);
      const {score} = minimax(nb, depth-1, alpha, beta, maximizingColor, opp, newEnPassantTarget);
      if(score<val){val=score; bestMove=[fr,fc,tr,tc];} beta=Math.min(beta,val); if(alpha>=beta) break;
    } return {score:val, move:bestMove};
  }
}
