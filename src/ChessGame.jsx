import React, { useEffect, useRef, useState } from "react";
import { Users, Bot, Crown, Pause, Play, Repeat } from "lucide-react";
import { AI_LEVELS, AI_NAMES } from "./chess/constants";
import {
  initializeBoard, cloneBoard, isInCheck, isPseudoLegalMove,
  applyMove, legalMovesForSquareStrict, allLegalMoves, minimax
} from "./chess/engine";
import ChessBoard from "./components/ChessBoard";
import Sidebar from "./components/Sidebar";
import PromotionModal from "./components/PromotionModal";
import EloModal from "./components/modals/EloModal";
import PauseModal from "./components/modals/PauseModal";
import ConfirmModal from "./components/modals/ConfirmModal";
import ResultModal from "./components/modals/ResultModal";
import PlayerModal from "./components/modals/PlayerModal";
import { idbGet, idbSet, pushHistory } from "./utils/idb";


function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randMs(min,max){ return Math.floor(min + Math.random()*(max-min)); }
function expectedScore(Ra,Rb){ return 1/(1+10**((Rb-Ra)/400)); }
function updateElo(Ra,Rb,score){ return Math.round(Ra + 32*(score-expectedScore(Ra,Rb))); }

export default function ChessGame(){
  const [board, setBoard] = useState(()=>initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [gameMode, setGameMode] = useState("menu");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiWhite, setAiWhite] = useState("intermediate");
  const [aiBlack, setAiBlack] = useState("master");
  const [isThinking, setIsThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameState, setGameState] = useState("playing");
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [theme, setTheme] = useState("dark"); // menu only
  const [flipped, setFlipped] = useState(true);

  // Names & ratings
  const [playerWhite, setPlayerWhite] = useState("");
  const [playerBlack, setPlayerBlack] = useState("");
  const [userElo, setUserElo] = useState(1200);

  // Modals
  const [pendingMode, setPendingMode] = useState(null);
  const [showEloModal, setShowEloModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [resultModal, setResultModal] = useState(null); // {title, subtitle}
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerModalMode, setPlayerModalMode] = useState(null); // 'first-run' | 'human-vs-human'

  // Animation trigger
  const [animateKey, setAnimateKey] = useState(0);
  const [lastMove, setLastMove] = useState(null);

  // Refs for timers
  const aiTimeoutRef = useRef(null);

  // Layout lock for move-list height
  const leftColRef = useRef(null);
  const [leftHeight, setLeftHeight] = useState(0);
  const [isLg, setIsLg] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width:1024px)').matches : false);

  // Theme applies to root
  useEffect(()=>{ document.documentElement.classList.toggle("dark", theme === "dark"); },[theme]);

  // Ensure/read player name helpers
  async function ensureHumanName(){
    let name = (playerWhite||"").trim();
    if(!name){
      const saved = await idbGet('playerName');
      if(saved && saved.trim()) { setPlayerWhite(saved.trim()); return saved.trim(); }
      name = 'Player'; setPlayerWhite(name); idbSet('playerName', name);
    }
    return name;
  }

  // First-run load
  useEffect(()=>{ (async()=>{ const savedName=await idbGet('playerName'); const savedElo=await idbGet('userElo'); if(savedName){ setPlayerWhite(savedName); } else { setPlayerModalMode('first-run'); setShowPlayerModal(true);} if(savedElo) setUserElo(savedElo); })(); },[]);

  // Media query listen
  useEffect(()=>{ const mm=window.matchMedia('(min-width:1024px)'); const cb=(e)=>setIsLg(e.matches); mm.addEventListener?.('change',cb); setIsLg(mm.matches); return ()=>mm.removeEventListener?.('change',cb); },[]);

  // Measure left column height
  useEffect(()=>{ if(!leftColRef.current) return; const el=leftColRef.current; const setH=()=>setLeftHeight(el.offsetHeight); setH(); const ro=new ResizeObserver(setH); ro.observe(el); window.addEventListener('resize',setH); return ()=>{ ro.disconnect(); window.removeEventListener('resize',setH);}; },[leftColRef, gameMode]);

  const depthSingle = AI_LEVELS[aiDifficulty]?.depth ?? 3;
  const depthWhite = AI_LEVELS[aiWhite]?.depth ?? 3;
  const depthBlack = AI_LEVELS[aiBlack]?.depth ?? 3;

  // AI turn (delay random)
  useEffect(()=>{
    const aiTurn = (gameMode==="human-vs-ai" && currentPlayer==="black") || gameMode==="ai-vs-ai";
    if(gameState!=="playing" || !aiTurn || isPaused) return;
    setIsThinking(true);
    const delay = gameMode === 'ai-vs-ai' ? randMs(800, 1600) : randMs(250, 650);
    aiTimeoutRef.current = setTimeout(()=>{
      const activeDepth = gameMode === "ai-vs-ai" ? (currentPlayer === "white" ? depthWhite : depthBlack) : depthSingle;
      const { move } = minimax(board, activeDepth, -Infinity, Infinity, currentPlayer, currentPlayer, enPassantTarget);
      const fallback = allLegalMoves(board, currentPlayer, enPassantTarget)[0];
      const m = move || fallback; if(m) handleMove(...m);
      setIsThinking(false);
      aiTimeoutRef.current = null;
    }, delay);
    return ()=>{ if(aiTimeoutRef.current){ clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current=null; } };
  },[currentPlayer, gameMode, gameState, isPaused, depthSingle, depthWhite, depthBlack, board, enPassantTarget]);

 useEffect(() => {
  if (!moveHistory.length) return;
  if (gameState === 'checkmate' || gameState === 'stalemate') return;

  const legal = allLegalMoves(board, currentPlayer, enPassantTarget);
  if (legal.length === 0) {
    const check = isInCheck(board, currentPlayer, enPassantTarget);
    const winner = check ? (currentPlayer === 'white' ? 'black' : 'white') : 'draw';

    setGameState(check ? 'checkmate' : 'stalemate');
    setShowPauseModal(false);
    setIsThinking(false); // kalau AI yang matiin

    const nameWhite = (playerWhite?.trim() || 'Putih');
    const nameBlack = (playerBlack?.trim() || 'Hitam');
    const title = winner === 'draw'
      ? 'Stalemate — Seri'
      : `Skakmat — ${(winner === 'white' ? nameWhite : nameBlack)} menang`;
    const subtitle = winner === 'draw' ? 'Permainan berakhir seri.' : 'Permainan berakhir.';

    setResultModal({ title, subtitle });
  }
}, [moveHistory.length, board, currentPlayer, enPassantTarget, gameState, playerWhite, playerBlack]);

useEffect(() => {
  (async () => {
    const saved = await idbGet('autosave')
    if (saved) {
      setBoard(saved.board)
      setCurrentPlayer(saved.currentPlayer)
      setMoveHistory(saved.moveHistory || [])
      setCaptured(saved.captured || { white: [], black: [] })
      setEnPassantTarget(saved.enPassantTarget ?? null)
      setFlipped(!!saved.flipped)
      setGameMode(saved.gameMode || 'human-vs-human')
      setGameState('playing')
    }
  })()
}, [])

useEffect(() => {
  const snapshot = {
    board,
    currentPlayer,
    moveHistory,
    captured,
    enPassantTarget,
    flipped,
    gameMode: gameMode !== 'menu' ? gameMode : 'human-vs-human',
  }
  idbSet('autosave', snapshot)
}, [board, currentPlayer, moveHistory, captured, enPassantTarget, flipped, gameMode])

  function handleSquareClick(r,c){
    if(gameState!=="playing"||isPaused||isThinking) return; // lock ketika AI mikir
    const cell=board[r][c];
    if(selected){ const [sr,sc]=selected; const ok=validMoves.some(([tr,tc])=>tr===r&&tc===c); if(ok) return handleMove(sr,sc,r,c); setSelected(null); setValidMoves([]);} 
    else if(cell && cell.color===currentPlayer){ setSelected([r,c]); setValidMoves(legalMovesForSquareStrict(board,r,c,currentPlayer,enPassantTarget)); }
  }

  function onDragStart(e,r,c){
    const cell=board[r][c];
    if(!cell||cell.color!==currentPlayer||gameState!=="playing"||isPaused||isThinking) return; // lock saat AI mikir
    const moves=legalMovesForSquareStrict(board,r,c,currentPlayer,enPassantTarget); setSelected([r,c]); setValidMoves(moves); e.dataTransfer.setData("text/plain", JSON.stringify({r,c}));
  }

  function onDrop(e,r,c){ if(isThinking) return; e.preventDefault(); try{ const {r:sr,c:sc}=JSON.parse(e.dataTransfer.getData("text/plain")); const ok=validMoves.some(([tr,tc])=>tr===r&&tc===c); if(ok) handleMove(sr,sc,r,c);}catch{} setSelected(null); setValidMoves([]); }

  function afterMoveState(nextBoard, nextPlayer, nextEPT){
    const opp=nextPlayer; // side to move
    const legalOpp=allLegalMoves(nextBoard,opp,nextEPT);
    const checkOpp=isInCheck(nextBoard,opp,nextEPT);

    if(legalOpp.length===0){
      const winner = checkOpp ? (nextPlayer === 'white' ? 'black' : 'white') : 'draw';
      setGameState(checkOpp?"checkmate":"stalemate");
      setShowPauseModal(false);
      if(isThinking) setIsThinking(false); // jaga-jaga kalau AI yang matiin

      const nameWhite = (playerWhite && playerWhite.trim()) ? playerWhite.trim() : 'Putih';
      const nameBlack = (playerBlack && playerBlack.trim()) ? playerBlack.trim() : 'Hitam';
      const winnerName = winner==='draw' ? null : (winner==='white' ? nameWhite : nameBlack);
      const title = winner==='draw' ? 'Stalemate — Seri' : `Skakmat — ${winnerName} menang`;
      const subtitle = winner==='draw' ? 'Permainan berakhir seri.' : 'Permainan berakhir.';

      setTimeout(()=> setResultModal({ title, subtitle }), 0);
      pushHistory({ t: Date.now(), mode: gameMode, winner, names: { white: nameWhite, black: nameBlack }, moves: moveHistory, });

      if(gameMode==='human-vs-ai' && playerWhite){
        const oppElo=1200; const score= winner==='white'?1:winner==='draw'?0.5:0; const newElo=updateElo(userElo,oppElo,score); setUserElo(newElo); idbSet('userElo',newElo);
      }
      return true;
    } else {
      setGameState(checkOpp?"check":"playing");
      return false;
    }
  }

  function handleMove(fr,fc,tr,tc){
    if(!isPseudoLegalMove(board,fr,fc,tr,tc,enPassantTarget)) return;
    const src=board[fr][fc];
    const willPromo = src.piece==="pawn" && (tr===7||tr===0);
    const { board:nb, captured:cap, newEnPassantTarget } = applyMove(board,fr,fc,tr,tc,enPassantTarget);
    if(isInCheck(nb, src.color, null)) return; // illegal: still in check

    const historyItem={ from:[fr,fc], to:[tr,tc], piece: nb[tr][tc] };
    if(willPromo){ setPromotion({ from:[fr,fc], to:[tr,tc], color:src.color, pendingBoard:nb, newEPTarget:newEnPassantTarget, historyItem }); return; }
    commitMove(nb, cap, newEnPassantTarget, historyItem);
  }

  function commitMove(nb, cap, newEPTarget, historyItem){
    setBoard(nb);
    setMoveHistory(h=>[...h, historyItem]);
    if(cap) setCaptured(c=>({...c,[cap.color]:[...c[cap.color],cap]}));
    const next=currentPlayer==="white"?"black":"white";
    setCurrentPlayer(next);
    setEnPassantTarget(newEPTarget);

    // trigger move animation for tap-to-move & drag
    setLastMove({ from: historyItem.from, to: historyItem.to, piece: nb[historyItem.to[0]][historyItem.to[1]] });
    setAnimateKey(Date.now());

    afterMoveState(nb,next,newEPTarget);
    setSelected(null);
    setValidMoves([]);
  }

  function onChoosePromotion(newPiece){ if(!promotion) return; const {to,pendingBoard,color,newEPTarget,historyItem}=promotion; const [tr,tc]=to; const b2=cloneBoard(pendingBoard); b2[tr][tc]={ piece:newPiece, color, hasMoved:true }; setPromotion(null); commitMove(b2,null,newEPTarget,{...historyItem,piece:b2[tr][tc]}); }

  function resetBoardOnly(){ setBoard(initializeBoard()); setCurrentPlayer("white"); setSelected(null); setValidMoves([]); setMoveHistory([]); setCaptured({white:[],black:[]}); setGameState("playing"); setIsThinking(false); setIsPaused(false); setEnPassantTarget(null); setPromotion(null); setResultModal(null); setFlipped(true); setLastMove(null); if(aiTimeoutRef.current){ clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current=null; } }

  function exitToMenu(){ resetBoardOnly(); setGameMode('menu'); setPendingMode(null); setShowPauseModal(false); setShowExitConfirm(false); setShowPlayerModal(false); }

  // Menu handlers
  async function startHumanVsAI(){ await ensureHumanName(); exitToMenu(); setPendingMode('human-vs-ai'); setShowEloModal(true); setPlayerBlack(rand(AI_NAMES)); }
  function startAIVsAI(){ exitToMenu(); setPendingMode('ai-vs-ai'); setShowEloModal(true); setPlayerWhite(rand(AI_NAMES)); setPlayerBlack(rand(AI_NAMES)); }
  function startHumanVsHuman(){ exitToMenu(); setPendingMode('human-vs-human'); setPlayerModalMode('human-vs-human'); setShowPlayerModal(true); }

  // Confirm from ELO modal
  async function confirmElo(payload){
    if(pendingMode==='human-vs-ai'){
      await ensureHumanName();
      setAiDifficulty(payload.single); setGameMode('human-vs-ai');
    } else if(pendingMode==='ai-vs-ai'){
      setAiWhite(payload.white); setAiBlack(payload.black); setGameMode('ai-vs-ai');
    }
    setShowEloModal(false); resetBoardOnly();
  }

  // Confirm from Player modal (first-run or human-vs-human)
  function confirmPlayer({white, black}){
    if(playerModalMode==='first-run'){
      const name = (white||'Player').trim(); setPlayerWhite(name); idbSet('playerName', name); setShowPlayerModal(false); return;
    }
    if(pendingMode==='human-vs-human'){
      setPlayerWhite((white||'Putih').trim()); setPlayerBlack((black||'Hitam').trim()); setShowPlayerModal(false); setGameMode('human-vs-human'); resetBoardOnly(); return;
    }
  }

  const bgClass = "min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-amber-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900";
  const cardClass = "rounded-2xl border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20";

  if(gameMode==="menu"){
    return (
      <div className={`${bgClass} flex items-center justify-center p-4 text-slate-800 dark:text-white`}>
        <div className={`${cardClass} p-8 max-w-md w-full shadow-2xl`}>
          <div className="text-center mb-8">
            <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-4xl font-bold mb-2">Chess Master</h1>
            <p className="text-slate-600 dark:text-gray-300">Pilih mode permainan</p>
          </div>
          <div className="space-y-4">
            <button onClick={startHumanVsHuman} className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"><Users className="w-5 h-5"/>Human vs Human</button>
            <button onClick={startHumanVsAI} className="w-full bg-gradient-to-r from-green-500 to-teal-600 hover:from-green-600 hover:to-teal-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"><Bot className="w-5 h-5"/>Human vs AI</button>
            <button onClick={startAIVsAI} className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 shadow-lg"><Bot className="w-5 h-5"/>AI vs AI</button>
          </div>
          {/* Theme picker tetap di menu */}
          <div className="mt-8 p-4 rounded-xl bg-black/5 border border-black/10 dark:bg-black/20 dark:border-white/10 space-y-4">
            <div>
              <label className="text-slate-600 dark:text-gray-300 text-sm block mb-2">Tema</label>
              <div className="flex gap-2">
                <button onClick={()=>setTheme('dark')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${theme==='dark'? 'bg-purple-600 text-white':'bg-black/5 dark:bg-white/10'}`}>Dark</button>
                <button onClick={()=>setTheme('light')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${theme==='light'? 'bg-amber-500 text-white':'bg-black/5 dark:bg-white/10'}`}>Light</button>
              </div>
            </div>
          </div>
        </div>
        <EloModal open={showEloModal && pendingMode==='human-vs-ai'} mode="human-vs-ai" defaultSingle={aiDifficulty} onClose={()=>setShowEloModal(false)} onConfirm={confirmElo} />
        <EloModal open={showEloModal && pendingMode==='ai-vs-ai'} mode="ai-vs-ai" defaultWhite={aiWhite} defaultBlack={aiBlack} onClose={()=>setShowEloModal(false)} onConfirm={confirmElo} />
        <PlayerModal open={showPlayerModal} mode={playerModalMode} onClose={()=>setShowPlayerModal(false)} onConfirm={confirmPlayer} />
      </div>
    );
  }

  const headerCard = `${cardClass} p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg`;

  return (
    <div className={`${bgClass} p-3 sm:p-4`}>
      <div className="max-w-6xl mx-auto">
        <div className={headerCard}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-white">Chess Master</h1>
                <p className="text-slate-600 dark:text-gray-300 text-xs sm:text-sm">
                  {gameMode === "human-vs-human" && `${playerWhite||'Putih'} vs ${playerBlack||'Hitam'}`}
                  {gameMode === "human-vs-ai" && `${playerWhite||'Kamu'} vs ${playerBlack||'AI'}`}
                  {gameMode === "ai-vs-ai" && `${playerWhite||'AI'} vs ${playerBlack||'AI'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={()=> setFlipped(f=>!f)} className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white"><Repeat className="w-5 h-5"/></button>
              <button onClick={()=>{ setIsPaused(true); setShowPauseModal(true); }} className={`px-3 py-2 rounded-lg text-white ${isPaused?'bg-yellow-600':'bg-slate-600'} hover:brightness-110`}>
                {isPaused ? <Play className="w-5 h-5"/> : <Pause className="w-5 h-5"/>}
              </button>
            </div>
          </div>
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          {/* Sidebar (measured) */}
          <div ref={leftColRef} className="order-2 lg:order-1 lg:col-span-1 min-w-0">
            <Sidebar currentPlayer={currentPlayer} isThinking={isThinking} gameState={gameState} captured={captured} aiDifficulty={aiDifficulty} moveCount={moveHistory.length} gameMode={gameMode} aiWhite={aiWhite} aiBlack={aiBlack} playerWhite={playerWhite} playerBlack={playerBlack} />
          </div>

          {/* Board */}
          <div className="order-1 lg:order-2 lg:col-span-2 min-w-0 w-full flex justify-center overflow-hidden lg:overflow-visible">
            <ChessBoard
              board={board}
              selected={selected}
              validMoves={validMoves}
              moveHistory={moveHistory}
              currentPlayer={currentPlayer}
              onSquareClick={handleSquareClick}
              onDragStart={onDragStart}
              onDrop={onDrop}
              flipped={flipped}
              lastMove={lastMove}
              animateKey={animateKey}
              disabled={isPaused || isThinking || gameState!=="playing"}
            />
          </div>

          {/* Move list card with sticky header & locked height */}
          <div className="order-3 lg:order-3 lg:col-span-1 min-w-0">
            <div className={`${cardClass} p-0`} style={{ height: isLg && leftHeight ? leftHeight : 'auto' }}>
              <div className="h-full overflow-auto">
                <div className="sticky top-0 z-10 px-4 py-3">
                  <h3 className="text-slate-800 dark:text-white font-semibold">Riwayat Langkah</h3>
                </div>
                <div className="px-4 py-3 space-y-2">
                  {moveHistory.length===0 && <p className="text-slate-600 dark:text-gray-300 text-sm">Belum ada langkah</p>}
                  {moveHistory.map((m,i)=> (
                    <div key={i} className="flex items-center gap-2 text-sm text-slate-700 dark:text-gray-300">
                      <span className="text-slate-500 dark:text-gray-400 w-6 sm:w-8">{i+1}.</span>
                      <span>{String.fromCharCode(97 + m.from[1])}{8 - m.from[0]} → {String.fromCharCode(97 + m.to[1])}{8 - m.to[0]}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <PromotionModal promotion={promotion} onChoose={onChoosePromotion} />
      <PauseModal
        open={showPauseModal}
        onResume={()=>{ setIsPaused(false); setShowPauseModal(false); }}
        onRestart={()=>{ resetBoardOnly(); setShowPauseModal(false); }}
        onExit={()=>{ setShowPauseModal(false); setShowExitConfirm(true); }}
      />
      <ConfirmModal
        open={showExitConfirm}
        title="Keluar ke Menu?"
        message="Permainan akan direset. Yakin ingin kembali ke menu?"
        confirmText="Keluar"
        cancelText="Batal"
        onConfirm={exitToMenu}
        onCancel={()=>setShowExitConfirm(false)}
      />
      <ResultModal
        open={!!resultModal}
        title={resultModal?.title}
        subtitle={resultModal?.subtitle}
        onReplay={()=>{ resetBoardOnly(); setResultModal(null); }}
        onExit={exitToMenu}
      />
    </div>
  );
}
