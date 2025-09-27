import React, { useEffect, useRef, useState } from "react";
import { Users, Bot, Crown, Pause, Play, Repeat } from "lucide-react";
import { Chess } from "chess.js";
import { AI_LEVELS, AI_NAMES } from "./chess/constants";
import {
  initializeBoard, cloneBoard, isInCheck, isPseudoLegalMove,
  applyMove, legalMovesForSquareStrict, allLegalMoves,
  algebraToIndex, indexToAlgebra, boardToFen, fenToArray
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
// (opsional) kalau punya opening book, bisa import; kalau nggak, fungsi akan selalu return null
import { nextBookMoveSAN } from "./chess/openingBook";

function rand(arr){ return arr[Math.floor(Math.random()*arr.length)]; }
function randMs(min,max){ return Math.floor(min + Math.random()*(max-min)); }
function expectedScore(Ra,Rb){ return 1/(1+10**((Rb-Ra)/400)); }
function updateElo(Ra,Rb,score){ return Math.round(Ra + 32*(score-expectedScore(Ra,Rb))); }
function formatTime(s){
  const mm = Math.floor(s/60).toString().padStart(2,'0');
  const ss = Math.floor(s%60).toString().padStart(2,'0');
  return `${mm}:${ss}`;
}

const INITIAL_TIME = 600; // 10:00

export default function ChessGame(){
  const [board, setBoard] = useState(()=>initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]); // {from,to,piece,san}
  const [captured, setCaptured] = useState({ white: [], black: [] });

  const [gameMode, setGameMode] = useState("menu");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiWhite, setAiWhite] = useState("intermediate");
  const [aiBlack, setAiBlack] = useState("master");
  const [aiSide, setAiSide] = useState('black'); // AI side pada HvAI

  const [isThinking, setIsThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [gameState, setGameState] = useState("playing");
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [theme, setTheme] = useState("dark"); // menu only
  const [flipped, setFlipped] = useState(false);

  // Names & ratings
  const [playerWhite, setPlayerWhite] = useState("");
  const [playerBlack, setPlayerBlack] = useState("");
  const [userElo, setUserElo] = useState(1200);

  // Modals
  const [pendingMode, setPendingMode] = useState(null);
  const [showEloModal, setShowEloModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerModalMode, setPlayerModalMode] = useState(null);

  // Animasi
  const [animateKey, setAnimateKey] = useState(0);
  const [lastMove, setLastMove] = useState(null);

  // AI infra
  const aiTimeoutRef = useRef(null);
  const workerRef = useRef(null);

  // Layout lock untuk move-list
  const leftColRef = useRef(null);
  const [leftHeight, setLeftHeight] = useState(0);
  const [isLg, setIsLg] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width:1024px)').matches : false);

  // Clock
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);

  // History dasar buat PGN/FEN
  const START_FEN = boardToFen(initializeBoard(),'white',null,0,1);
  const [baseFen, setBaseFen] = useState(START_FEN);
  const [historySAN, setHistorySAN] = useState([]);

  // ---- NEW: guard & scheduler stabil ----
  // giliran manusia?
  const isHumanTurn =
    gameMode === 'human-vs-human' ||
    (gameMode === 'human-vs-ai' && currentPlayer !== aiSide);

  // snapshot state terbaru buat AI timer
  const latestRef = useRef({ board, currentPlayer, enPassantTarget, moveHistory });
  useEffect(() => {
    latestRef.current = { board, currentPlayer, enPassantTarget, moveHistory };
  }, [board, currentPlayer, enPassantTarget, moveHistory]);

  // siklus AI; dinaikkan setiap AI attempt selesai (sukses atau gagal) supaya effect re-schedule
  const [aiCycle, setAiCycle] = useState(0);

  // Theme
  useEffect(()=>{ document.documentElement.classList.toggle("dark", theme === "dark"); },[theme]);

  // First-run / autosave
  async function ensureHumanName(){
    let name = (playerWhite||"").trim();
    if(!name){
      const saved = await idbGet('playerName');
      if(saved && saved.trim()) { setPlayerWhite(saved.trim()); return saved.trim(); }
      name = 'Player'; setPlayerWhite(name); idbSet('playerName', name);
    }
    return name;
  }

  useEffect(()=>{ (async()=>{
    const savedName=await idbGet('playerName');
    if(savedName){ setPlayerWhite(savedName); } else { setPlayerModalMode('first-run'); setShowPlayerModal(true); }
    const savedElo=await idbGet('userElo'); if(savedElo) setUserElo(savedElo);

    const saved = await idbGet('autosave');
    if (saved && saved.resume && saved.gameMode && saved.gameMode!=='menu'){
      setBoard(saved.board);
      setCurrentPlayer(saved.currentPlayer);
      setMoveHistory(saved.moveHistory||[]);
      setCaptured(saved.captured||{white:[],black:[]});
      setEnPassantTarget(saved.enPassantTarget??null);
      setFlipped(!!saved.flipped);
      setGameMode(saved.gameMode);
      setGameState('playing');
      if (saved.historySAN) setHistorySAN(saved.historySAN);
      setWhiteTime(typeof saved.whiteTime==='number'? saved.whiteTime: INITIAL_TIME);
      setBlackTime(typeof saved.blackTime==='number'? saved.blackTime: INITIAL_TIME);
      setAiSide(saved.aiSide||'black');
      setBaseFen(saved.baseFen||START_FEN);
    } else {
      setGameMode('menu'); idbSet('autosave', null);
    }
  })(); },[]);

  // media query
  useEffect(()=>{ const mm=window.matchMedia('(min-width:1024px)'); const cb=(e)=>setIsLg(e.matches); mm.addEventListener?.('change',cb); setIsLg(mm.matches); return ()=>mm.removeEventListener?.('change',cb); },[]);
  // left height
  useEffect(()=>{ if(!leftColRef.current) return; const el=leftColRef.current; const setH=()=>setLeftHeight(el.offsetHeight); setH(); const ro=new ResizeObserver(setH); ro.observe(el); window.addEventListener('resize',setH); return ()=>{ ro.disconnect(); window.removeEventListener('resize',setH);}; },[leftColRef, gameMode]);

  const depthSingle = AI_LEVELS[aiDifficulty]?.depth ?? 3;
  const depthWhite = AI_LEVELS[aiWhite]?.depth ?? 3;
  const depthBlack = AI_LEVELS[aiBlack]?.depth ?? 3;

  function fenFromState(b=board, side=currentPlayer, ep=enPassantTarget){
    return boardToFen(b, side, ep, 0, 1);
  }

  // destroy AI
  function destroyAI(){
    if (aiTimeoutRef.current){ clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current=null; }
    if (workerRef.current){ try{ workerRef.current.terminate(); }catch{} workerRef.current=null; }
  }
  useEffect(()=>{ const onVis=()=>{ if(document.hidden) destroyAI(); }; document.addEventListener('visibilitychange',onVis); return ()=>document.removeEventListener('visibilitychange',onVis);},[]);

  // ---- AI scheduler stabil ----
  useEffect(() => {
    const aiTurn =
      (gameMode === 'human-vs-ai' && aiSide === currentPlayer) ||
      gameMode === 'ai-vs-ai';

    if (gameState !== 'playing' || !aiTurn || isPaused) return;
    if (isThinking || aiTimeoutRef.current) return; // jangan dobel

    setIsThinking(true);
    const delay = gameMode === 'ai-vs-ai' ? randMs(800,1600) : randMs(250,650);

    aiTimeoutRef.current = setTimeout(async () => {
      let moved = false; // flag apakah berhasil jalan
      try {
        const { board: B, currentPlayer: SIDE, enPassantTarget: EP, moveHistory: MH } = latestRef.current;

        // 1) opening book via SAN (kalau ada)
        let bookSAN = null;
        try { bookSAN = typeof nextBookMoveSAN === 'function' ? nextBookMoveSAN(MH.map(m=>m.san).filter(Boolean)) : null; } catch {}
        if (bookSAN) {
          const g = new Chess(boardToFen(B, SIDE, EP, 0, 1));
          const res = g.move(bookSAN, {sloppy:true});
          if (res){
            const [fr,fc]=algebraToIndex(res.from); const [tr,tc]=algebraToIndex(res.to);
            handleMove(fr,fc,tr,tc); moved=true; return;
          }
        }

        // 2) worker
        const fen = boardToFen(B, SIDE, EP, 0, 1);
        const depth = gameMode==='ai-vs-ai' ? (SIDE==='white'?depthWhite:depthBlack) : depthSingle;

        if (!workerRef.current){
          workerRef.current = new Worker(new URL('./workers/aiWorker.js', import.meta.url), { type:'module' });
        }
        const best = await new Promise((resolve)=>{
          const w = workerRef.current;
          const onMsg = (e)=>{ w.removeEventListener('message', onMsg); resolve(e.data); };
          w.addEventListener('message', onMsg);
          w.postMessage({ fen, depth });
          setTimeout(()=>{ try{w.removeEventListener('message', onMsg);}catch{} resolve({uci:null}); }, 4500 + depth*250);
        });

        if (best?.uci){
          const from = best.uci.slice(0,2), to = best.uci.slice(2,4);
          const [fr,fc]=algebraToIndex(from); const [tr,tc]=algebraToIndex(to);
          // kalau move worker gak cocok dengan engine custom, handleMove akan nolak → kita lanjut fallback
          if (isPseudoLegalMove(B,fr,fc,tr,tc,EP)){ handleMove(fr,fc,tr,tc); moved=true; return; }
        }

        // 3) fallback legal moves (engine custom)
        const legal = allLegalMoves(B, SIDE, EP);
        if (legal.length){
          const m = legal[Math.floor(Math.random()*legal.length)];
          handleMove(...m); moved=true; return;
        }

        // 4) safety: cek via chess.js, kalau masih punya langkah, pilih salah satu
        const g2 = new Chess(fen);
        if (!g2.isGameOver()){
          const moves = g2.moves({ verbose:true });
          if (moves.length){
            const m = moves[Math.floor(Math.random()*moves.length)];
            const [fr,fc]=algebraToIndex(m.from); const [tr,tc]=algebraToIndex(m.to);
            handleMove(fr,fc,tr,tc); moved=true; return;
          }
        }
        // kalau sampai sini: memang game over; biarkan commitMove yang mendeteksi pada giliran berikutnya
      } finally {
        setIsThinking(false);
        if (aiTimeoutRef.current){ clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current=null; }
        // trigger re-schedule kalau tadi tidak ada move yang dieksekusi
        setAiCycle(x=>x+1);
      }
    }, delay);

    // ⛔ jangan clear timeout di cleanup, biarkan timer jalan
    // return () => {};
  }, [currentPlayer, gameMode, gameState, isPaused, aiSide, depthWhite, depthBlack, depthSingle, aiCycle]);

  // Clock
  useEffect(() => {
    if (gameMode==='menu' || gameState!=='playing' || isPaused) return;
    const id = setInterval(()=> {
      if (currentPlayer==='white') setWhiteTime(t=>Math.max(0,t-1));
      else setBlackTime(t=>Math.max(0,t-1));
    }, 1000);
    return ()=>clearInterval(id);
  }, [gameMode, gameState, isPaused, currentPlayer]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (whiteTime === 0 || blackTime === 0) {
      const loser = whiteTime===0?'white':'black';
      const winner = loser==='white'?'black':'white';
      const nameWhite = (playerWhite?.trim()||'Putih');
      const nameBlack = (playerBlack?.trim()||'Hitam');
      setResultModal({ title:`Waktu Habis — ${(winner==='white'?nameWhite:nameBlack)} menang`, subtitle:'Kalah waktu.' });
      setGameState('checkmate'); destroyAI();
    }
  }, [whiteTime, blackTime, gameState, playerWhite, playerBlack]);

  // Handlers (lock input saat bukan giliran human)
  function handleSquareClick(r,c){
    if (gameState!=="playing" || isPaused || isThinking) return;
    if (!isHumanTurn) return;
    const cell=board[r][c];
    if(selected){
      const [sr,sc]=selected;
      const ok=validMoves.some(([tr,tc])=>tr===r&&tc===c);
      if(ok) return handleMove(sr,sc,r,c);
      setSelected(null); setValidMoves([]);
    } else if(cell && cell.color===currentPlayer){
      setSelected([r,c]); setValidMoves(legalMovesForSquareStrict(board,r,c,currentPlayer,enPassantTarget));
    }
  }
  function onDragStart(e,r,c){
    const cell=board[r][c];
    if(!cell||cell.color!==currentPlayer||gameState!=="playing"||isPaused||isThinking) return;
    if (!isHumanTurn) return;
    const moves=legalMovesForSquareStrict(board,r,c,currentPlayer,enPassantTarget);
    setSelected([r,c]); setValidMoves(moves);
    e.dataTransfer.setData("text/plain", JSON.stringify({r,c}));
  }
  function onDrop(e,r,c){
    if(isThinking) return;
    if (!isHumanTurn) return;
    e.preventDefault();
    try{
      const {r:sr,c:sc}=JSON.parse(e.dataTransfer.getData("text/plain"));
      const ok=validMoves.some(([tr,tc])=>tr===r&&tc===c);
      if(ok) handleMove(sr,sc,r,c);
    }catch{}
    setSelected(null); setValidMoves([]);
  }

  function onChoosePromotion(newPiece){
    if(!promotion) return;
    const {to,pendingBoard,color,newEPTarget,historyItem}=promotion;
    const [tr,tc]=to;
    const b2=cloneBoard(pendingBoard);
    b2[tr][tc]={ piece:newPiece, color, hasMoved:true };
    setPromotion(null);
    commitMove(b2,null,newEPTarget,{...historyItem,piece:b2[tr][tc]});
  }

  // Commit move + endgame detect (pakai chess.js)
  function commitMove(nb, cap, newEPTarget, historyItem){
    const fenBefore = boardToFen(board, currentPlayer, enPassantTarget, 0, 1);
    const fromAlg = indexToAlgebra(historyItem.from[0], historyItem.from[1]);
    const toAlg   = indexToAlgebra(historyItem.to[0], historyItem.to[1]);
    const g = new Chess(fenBefore);
    const res = g.move({ from: fromAlg, to: toAlg, promotion:'q' });
    const san = res?.san || `${fromAlg}-${toAlg}`;

    setBoard(nb);
    setMoveHistory(h=>[...h, { ...historyItem, san }]);
    if (cap){
      // captured disimpan ke sisi YANG MENANGKAP (currentPlayer)
      setCaptured(c=>({ ...c, [currentPlayer]: [...c[currentPlayer], cap] }));
    }

    const next = currentPlayer==='white'?'black':'white';
    setCurrentPlayer(next);
    setEnPassantTarget(newEPTarget);
    setLastMove({ from: historyItem.from, to: historyItem.to, piece: nb[historyItem.to[0]][historyItem.to[1]] });
    setAnimateKey(Date.now());

    setHistorySAN(list=>[...list, san]);

    const afterFen = boardToFen(nb, next, newEPTarget, 0, 1);
    const g2 = new Chess(afterFen);
    const nameWhite = (playerWhite?.trim()||'Putih');
    const nameBlack = (playerBlack?.trim()||'Hitam');

    if (g2.isGameOver?.()){
      let title='Seri', subtitle='Permainan berakhir.', winner=null, resultType='draw';
      if (g2.isCheckmate?.()){
        winner = currentPlayer==='white'?'white':'black';
        const winnerName = winner==='white'?nameWhite:nameBlack;
        title=`Skakmat — ${winnerName} menang`; resultType='checkmate';
      } else if (g2.isStalemate?.()){ subtitle='Stalemate.'; resultType='stalemate'; }
      else if (g2.isDraw?.()){ subtitle='Remis.'; resultType='draw'; }
      else if (g2.isInsufficientMaterial?.()){ subtitle='Material tidak cukup.'; resultType='insufficient'; }
      else if (g2.isThreefoldRepetition?.()){ subtitle='Tiga kali repetisi.'; resultType='threefold'; }

      setResultModal({ title, subtitle });
      setGameState('checkmate');
      setShowPauseModal(false);
      setIsThinking(false);
      destroyAI();

      try{
        pushHistory({ t: Date.now(), mode: gameMode, winner: winner||'draw', names:{white:nameWhite, black:nameBlack}, moves: moveHistory.concat({ ...historyItem, san }), resultType, clocks: { whiteTime, blackTime } });
        if (gameMode==='human-vs-ai'){
          const oppElo=1200; const humanColor = (playerWhite===nameWhite)?'white':'black';
          const score = resultType==='draw'?0.5: (winner===humanColor?1:0);
          const newElo = updateElo(userElo, oppElo, score); setUserElo(newElo); idbSet('userElo',newElo);
        }
      }catch{}
    } else {
      setGameState(g2.inCheck?.() || g2.isCheck?.() ? 'check' : 'playing');
    }

    setSelected(null); setValidMoves([]);
    // reset siklus (AI pasti jalan lagi via effect karena currentPlayer sudah berubah)
    setAiCycle(x=>x+1);
  }

  function handleMove(fr,fc,tr,tc){
    if(!isPseudoLegalMove(board,fr,fc,tr,tc,enPassantTarget)) return;
    const src=board[fr][fc];
    const willPromo = src.piece==="pawn" && (tr===0||tr===7);
    const { board:nb, captured:cap, newEnPassantTarget } = applyMove(board,fr,fc,tr,tc,enPassantTarget);
    const historyItem={ from:[fr,fc], to:[tr,tc], piece: nb[tr][tc] };
    if(willPromo){
      setPromotion({ from:[fr,fc], to:[tr,tc], color:src.color, pendingBoard:nb, newEPTarget:newEnPassantTarget, historyItem });
      return;
    }
    commitMove(nb, cap, newEnPassantTarget, historyItem);
  }

  // reset / exit
  function resetBoardOnly(){
    destroyAI();
    setBoard(initializeBoard());
    setCurrentPlayer("white");
    setSelected(null); setValidMoves([]);
    setMoveHistory([]); setCaptured({white:[],black:[]});
    setGameState("playing"); setIsThinking(false); setIsPaused(false);
    setEnPassantTarget(null); setPromotion(null); setResultModal(null);
    setLastMove(null); setHistorySAN([]); setBaseFen(START_FEN);
    setWhiteTime(INITIAL_TIME); setBlackTime(INITIAL_TIME);
    setAiCycle(x=>x+1);
  }
  function exitToMenu(){
    resetBoardOnly();
    setGameMode('menu'); setPendingMode(null);
    setShowPauseModal(false); setShowExitConfirm(false); setShowPlayerModal(false);
  }

  // Menu handlers + confirm
  async function startHumanVsAI(){ await ensureHumanName(); exitToMenu(); setPendingMode('human-vs-ai'); setShowEloModal(true); setPlayerBlack(rand(AI_NAMES)); }
  function startAIVsAI(){ exitToMenu(); setPendingMode('ai-vs-ai'); setShowEloModal(true); setPlayerWhite(rand(AI_NAMES)); setPlayerBlack(rand(AI_NAMES)); }
  function startHumanVsHuman(){ exitToMenu(); setPendingMode('human-vs-human'); setPlayerModalMode('human-vs-human'); setShowPlayerModal(true); }

  async function confirmElo(payload){
    if (pendingMode==='human-vs-ai'){
      const humanName=(await ensureHumanName())||'Player';
      const aiName=rand(AI_NAMES);
      const humanIsWhite = Math.random()<0.5;

      setAiDifficulty(payload.single); setShowEloModal(false);
      resetBoardOnly();

      if (humanIsWhite){ setPlayerWhite(humanName); setPlayerBlack(aiName); setAiSide('black'); setFlipped(false); }
      else { setPlayerWhite(aiName); setPlayerBlack(humanName); setAiSide('white'); setFlipped(true); }

      setGameMode('human-vs-ai'); setPendingMode(null);
      return;
    }
    if (pendingMode==='ai-vs-ai'){
      setAiWhite(payload.white); setAiBlack(payload.black);
      setShowEloModal(false); resetBoardOnly();
      setFlipped(false); setGameMode('ai-vs-ai'); setPendingMode(null);
      return;
    }
    setShowEloModal(false);
  }

  function confirmPlayer({white, black}){
    if(playerModalMode==='first-run'){ const name=(white||'Player').trim(); setPlayerWhite(name); idbSet('playerName',name); setShowPlayerModal(false); return; }
    if(pendingMode==='human-vs-human'){ setPlayerWhite((white||'Putih').trim()); setPlayerBlack((black||'Hitam').trim()); setShowPlayerModal(false); setGameMode('human-vs-human'); resetBoardOnly(); setFlipped(false); return; }
  }

  // autosave
  useEffect(()=>{
    if (gameMode==='menu'){ idbSet('autosave', null); return; }
    idbSet('autosave', {
      resume:true, gameMode, board, currentPlayer, moveHistory, captured, enPassantTarget,
      flipped, aiSide, historySAN, baseFen, whiteTime, blackTime
    });
  },[board,currentPlayer,moveHistory,captured,enPassantTarget,flipped,gameMode,aiSide,historySAN,baseFen,whiteTime,blackTime]);

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

          <div className="mt-8 p-4 rounded-xl bg-black/5 border border-black/10 dark:bg-black/20 dark:border-white/10 space-y-4">
            <div>
              <label className="text-slate-600 dark:text-gray-300 text-sm block mb-2">Tema</label>
              <div className="flex gap-2">
                <button onClick={()=>setTheme('dark')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${theme==='dark'? 'bg-purple-600 text-white':'bg-black/5 dark:bg:white/10'}`}>Dark</button>
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
          <div ref={leftColRef} className="order-2 lg:order-1 lg:col-span-1 min-w-0">
            <Sidebar
              currentPlayer={currentPlayer}
              isThinking={isThinking}
              gameState={gameState}
              captured={captured}
              aiDifficulty={aiDifficulty}
              moveCount={moveHistory.length}
              gameMode={gameMode}
              aiWhite={aiWhite}
              aiBlack={aiBlack}
              playerWhite={playerWhite}
              playerBlack={playerBlack}
            />
          </div>

          {/* kalau mau anti-klik total saat AvA, bisa tambah pointer-events-none di wrapper */}
          <div className={`order-1 lg:order-2 lg:col-span-2 min-w-0 w-full flex justify-center overflow-hidden lg:overflow-visible ${gameMode==='ai-vs-ai' ? 'pointer-events-none' : ''}`}>
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
                      <span>{m.san}</span>
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

        // fitur tambahan yang sudah kamu aktifkan:
        onUndo={null}            // kalau butuh undo/redo tinggal isi fungsi kamu di sini
        onRedo={null}
        onExportPGN={null}
        onImportFEN={null}
        clocks={{
          whiteLabel: (playerWhite?.trim()||'Putih'),
          blackLabel: (playerBlack?.trim()||'Hitam'),
          white: formatTime(whiteTime),
          black: formatTime(blackTime),
        }}
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
