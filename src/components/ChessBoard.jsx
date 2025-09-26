import React, { useEffect, useRef, useState } from "react";
import { PIECE_SYMBOLS } from "../chess/constants";
import { sameSquare } from "../chess/engine";

export default function ChessBoard({
  board,
  selected,
  validMoves,
  moveHistory,
  currentPlayer,
  onSquareClick,
  onDragStart,
  onDrop,
  flipped = false,
  lastMove,          // { from:[r,c], to:[r,c], piece:{color,piece} }
  animateKey,        // number changes every move to retrigger animation
  disabled = false,
}) {
  const files = flipped ? ["h","g","f","e","d","c","b","a"] : ["a","b","c","d","e","f","g","h"];

  const boardRef = useRef(null);
  const cellRefs = useRef(
    Array.from({ length: 8 }, () => Array.from({ length: 8 }, () => null))
  );

  // Floating piece animation state
  const [fAnim, setFAnim] = useState(null); // {symbol, from:{x,y}, to:{x,y}}

  function viewToModel(vr, vc){ const r = flipped ? 7 - vr : vr; const c = flipped ? 7 - vc : vc; return [r,c]; }
  function modelToView(r, c){ const vr = flipped ? 7 - r : r; const vc = flipped ? 7 - c : c; return [vr, vc]; }

  useEffect(()=>{
    if(!lastMove || !boardRef.current) return;
    const { from, to, piece } = lastMove;
    const [vfr, vfc] = modelToView(from[0], from[1]);
    const [vtr, vtc] = modelToView(to[0], to[1]);

    const fromCell = cellRefs.current[vfr]?.[vfc];
    const toCell = cellRefs.current[vtr]?.[vtc];
    const container = boardRef.current;
    if(!fromCell || !toCell || !container) return;

    const crect = container.getBoundingClientRect();
    const frect = fromCell.getBoundingClientRect();
    const trect = toCell.getBoundingClientRect();

    const fromX = frect.left - crect.left + frect.width/2;
    const fromY = frect.top - crect.top + frect.height/2;
    const toX   = trect.left - crect.left + trect.width/2;
    const toY   = trect.top - crect.top + trect.height/2;

    setFAnim({ symbol: PIECE_SYMBOLS[piece.color][piece.piece], from:{x:fromX,y:fromY}, to:{x:toX,y:toY} });

    const timer = setTimeout(()=> setFAnim(null), 320);
    return ()=> clearTimeout(timer);
  }, [animateKey]);

  return (
    <div className={`w-full rounded-2xl p-2 md:p-3 shadow-xl border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20 ${disabled? 'opacity-95' : ''}`}>
      <div ref={boardRef} className={`relative mx-auto w-full aspect-square ${disabled? 'pointer-events-none' : ''}`}>
        {/* Board grid */}
        <div className="grid grid-cols-8 grid-rows-8 gap-[2px] w-full h-full p-1 md:p-2 bg-amber-100 rounded-xl shadow-inner select-none touch-none">
          {Array.from({ length: 8 }).map((_, vr) => (
            Array.from({ length: 8 }).map((__, vc) => {
              const [r,c] = viewToModel(vr,vc);
              const cell = board[r][c];
              const isLight = (vr + vc) % 2 === 0;
              const last = moveHistory[moveHistory.length - 1];
              const isLast = last && (sameSquare(last.from,[r,c]) || sameSquare(last.to,[r,c]));
              const isValid = validMoves.some(([tr,tc]) => tr===r && tc===c);
              const isSelected = selected && sameSquare(selected,[r,c]);

              return (
                <div
                  key={`${vr}-${vc}`}
                  ref={(el)=>{ cellRefs.current[vr][vc]=el; }}
                  className={`w-full h-full flex items-center justify-center text-xl sm:text-2xl md:text-3xl cursor-pointer relative transition-all duration-200 rounded-md
                  ${isLight?"bg-amber-50":"bg-amber-800"}
                  ${isSelected?" ring-4 ring-blue-400":""}
                  ${isValid?" ring-2 ring-green-400":""}
                  ${isLast?" bg-yellow-300":""}
                  hover:brightness-110`}
                  onClick={() => onSquareClick(r,c)}
                  onDragOver={(e)=>e.preventDefault()}
                  onDrop={(e)=>onDrop(e,r,c)}
                >
                  {cell && (
                    <div
                      draggable={!disabled && cell.color===currentPlayer}
                      onDragStart={(e)=>onDragStart(e,r,c)}
                      className={`transition-transform duration-200 ${!disabled && cell.color===currentPlayer?"cursor-move":"cursor-pointer"} hover:scale-110`}
                    >
                      {PIECE_SYMBOLS[cell.color][cell.piece]}
                    </div>
                  )}
                  {isValid && !cell && <div className="w-3 h-3 bg-green-400 rounded-full opacity-60" />}
                  {isValid && cell && <div className="absolute inset-0 border-4 border-red-400 rounded-lg opacity-60 pointer-events-none" />}
                </div>
              );
            })
          ))}
        </div>

        {/* Floating piece animation */}
        {fAnim && (
          <div
            className="pointer-events-none absolute top-0 left-0 w-full h-full"
            style={{
              transition: "transform 300ms ease",
              transform: `translate(${fAnim.to.x - fAnim.from.x}px, ${fAnim.to.y - fAnim.from.y}px)`,
            }}
          >
            <div
              className="absolute text-3xl"
              style={{
                left: fAnim.from.x,
                top: fAnim.from.y,
                transform: "translate(-50%, -50%)",
              }}
            >
              {fAnim.symbol}
            </div>
          </div>
        )}
      </div>
      <div className={`mx-auto w-full flex justify-between mt-2 px-1 sm:px-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400`}>
        {files.map((l)=>(<span key={l}>{l}</span>))}
      </div>
    </div>
  );
}
