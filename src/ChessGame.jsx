import React, { useEffect, useRef, useState } from "react";
import { Users, Bot, Crown, Pause, Play, Repeat, Undo2, Redo2} from "lucide-react";
import { Chess } from "chess.js";
import { AI_LEVELS, AI_NAMES } from "./chess/constants";
import {
  initializeBoard, cloneBoard, isPseudoLegalMove,
  applyMove, legalMovesForSquareStrict, allLegalMoves,
  algebraToIndex, indexToAlgebra, boardToFen, fenToArray,
  sameSquare
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

const INITIAL_TIME = 600;

export default function ChessGame(){
  const [board, setBoard] = useState(() => initializeBoard());
  const [currentPlayer, setCurrentPlayer] = useState("white");
  const [selected, setSelected] = useState(null);
  const [validMoves, setValidMoves] = useState([]);
  const [moveHistory, setMoveHistory] = useState([]);
  const [captured, setCaptured] = useState({ white: [], black: [] });
  const [gameState, setGameState] = useState("playing");
  const [enPassantTarget, setEnPassantTarget] = useState(null);
  const [promotion, setPromotion] = useState(null);
  const [historySAN, setHistorySAN] = useState([]);
  const [baseFen, setBaseFen] = useState(() => boardToFen(initializeBoard(),'white',null,0,1));
  const [gameMode, setGameMode] = useState("menu");
  const [isThinking, setIsThinking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [flipped, setFlipped] = useState(false);
  const [animateKey, setAnimateKey] = useState(0);
  const [lastMove, setLastMove] = useState(null);
  const [theme, setTheme] = useState("dark");
  const [aiDifficulty, setAiDifficulty] = useState("intermediate");
  const [aiWhite, setAiWhite] = useState("intermediate");
  const [aiBlack, setAiBlack] = useState("master");
  const [aiSide, setAiSide] = useState('black');
  const [playerWhite, setPlayerWhite] = useState("Putih");
  const [playerBlack, setPlayerBlack] = useState("Hitam");
  const [userElo, setUserElo] = useState(1200);
  const [pendingMode, setPendingMode] = useState(null);
  const [showEloModal, setShowEloModal] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [resultModal, setResultModal] = useState(null);
  const [showPlayerModal, setShowPlayerModal] = useState(false);
  const [playerModalMode, setPlayerModalMode] = useState(null);
  const [whiteTime, setWhiteTime] = useState(INITIAL_TIME);
  const [blackTime, setBlackTime] = useState(INITIAL_TIME);
  const aiTimeoutRef = useRef(null);
  const workerRef = useRef(null);
  const latestRef = useRef({});
  const leftColRef = useRef(null);
  const [leftHeight, setLeftHeight] = useState(0);
  const [isLg, setIsLg] = useState(typeof window !== 'undefined' ? window.matchMedia('(min-width:1024px)').matches : false);

  const isHumanTurn = gameMode === 'human-vs-human' || (gameMode === 'human-vs-ai' && currentPlayer !== aiSide);

  useEffect(() => { document.documentElement.classList.toggle("dark", theme === "dark"); }, [theme]);

  useEffect(() => {
    latestRef.current = { board, currentPlayer, enPassantTarget, moveHistory };
  }, [board, currentPlayer, enPassantTarget, moveHistory]);

  useEffect(() => {
    (async () => {
      const savedName = await idbGet('playerName');
      if (savedName) { setPlayerWhite(savedName); } else { setPlayerModalMode('first-run'); setShowPlayerModal(true); }
      const savedElo = await idbGet('userElo'); if (savedElo) setUserElo(savedElo);

      const saved = await idbGet('autosave');
      if (saved && saved.resume && saved.gameMode && saved.gameMode !== 'menu') {
        setBoard(saved.board);
        setCurrentPlayer(saved.currentPlayer);
        setMoveHistory(saved.moveHistory || []);
        setCaptured(saved.captured || { white: [], black: [] });
        setEnPassantTarget(saved.enPassantTarget ?? null);
        setFlipped(!!saved.flipped);
        setGameMode(saved.gameMode);
        setGameState('playing');
        setHistorySAN(saved.historySAN || []);
        setWhiteTime(typeof saved.whiteTime === 'number' ? saved.whiteTime : INITIAL_TIME);
        setBlackTime(typeof saved.blackTime === 'number' ? saved.blackTime : INITIAL_TIME);
        setAiSide(saved.aiSide || 'black');
        setBaseFen(saved.baseFen || boardToFen(initializeBoard(),'white',null,0,1));
      } else {
        setGameMode('menu'); idbSet('autosave', null);
      }
    })();
  }, []);

  useEffect(() => {
    const mm = window.matchMedia('(min-width:1024px)');
    const cb = (e) => setIsLg(e.matches);
    mm.addEventListener?.('change', cb);
    setIsLg(mm.matches);
    return () => mm.removeEventListener?.('change', cb);
  }, []);

  useEffect(() => {
    if (!leftColRef.current) return;
    const el = leftColRef.current;
    const setH = () => setLeftHeight(el.offsetHeight);
    setH();
    const ro = new ResizeObserver(setH);
    ro.observe(el);
    window.addEventListener('resize', setH);
    return () => { ro.disconnect(); window.removeEventListener('resize', setH); };
  }, [leftColRef, gameMode]);

  function destroyAI() {
    if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
    if (workerRef.current) { try { workerRef.current.terminate(); } catch {} workerRef.current = null; }
  }
  useEffect(() => { const onVis = () => { if (document.hidden) destroyAI(); }; document.addEventListener('visibilitychange', onVis); return () => document.removeEventListener('visibilitychange', onVis); }, []);

  // --- [REWORKED] AI Turn Logic with Guaranteed Delay ---
  // ---- AI scheduler stabil (fixed) ----
useEffect(() => {
  const aiTurn =
    (gameMode === 'human-vs-ai' && aiSide === currentPlayer) ||
    gameMode === 'ai-vs-ai';

  if (gameState !== 'playing' || !aiTurn || isPaused) return;
  if (isThinking || aiTimeoutRef.current) return; // cegah dobel jadwal

  setIsThinking(true);

  // ambil level & budget dari constants
  const levelKey = (gameMode === 'ai-vs-ai')
    ? (currentPlayer === 'white' ? aiWhite : aiBlack)
    : aiDifficulty;

  const { thinkMs = 600, maxDepth = 4 } = AI_LEVELS[levelKey] || {};
  const preDelay = (gameMode === 'ai-vs-ai') ? randMs(150, 400) : randMs(100, 300);

  aiTimeoutRef.current = setTimeout(async () => {
    let fallbackTimer = null;
    const startedAt = performance.now();

    try {
      // snapshot state terbaru dari ref internal lo
      const { board: B, currentPlayer: SIDE, enPassantTarget: EP } = latestRef.current;
      const fen = boardToFen(B, SIDE, EP, 0, 1);

      // fresh worker tiap pencarian supaya gak ada listener nyangkut
      if (workerRef.current) { try { workerRef.current.terminate(); } catch {} }
      const w = new Worker(new URL('./workers/aiWorker.js', import.meta.url), { type: 'module' });
      workerRef.current = w;

      let bestUci = null;

      const best = await new Promise((resolve) => {
        const onMsg = (e) => {
          const msg = e.data || {};
          // Simpan progressive best-so-far
          if (msg.uci) bestUci = msg.uci;
          // Finalize jika RESULT
          if (msg.type === 'RESULT') {
            try { w.onmessage = null; } catch {}
            if (fallbackTimer) clearTimeout(fallbackTimer);
            resolve({ uci: msg.uci || bestUci || null });
          }
        };

        w.onmessage = onMsg;
        w.postMessage({ fen, timeMs: thinkMs, maxDepth });

        // Hard cutoff: jangan nunggu tak terbatas
        fallbackTimer = setTimeout(() => {
          try { w.postMessage({ type: 'STOP' }); } catch {}
          try { w.onmessage = null; } catch {}
          resolve({ uci: bestUci || null, error: 'Timeout' });
        }, thinkMs + 300);
      });

      // --- minimal think gating biar gak “ngebut” ---
      const elapsed = performance.now() - startedAt;
      const baseMin = Math.max(350, Math.floor(thinkMs * 0.8)); // min 350ms atau 80% budget
      const jitter = Math.floor(Math.random() * 120);           // +0..120ms natural
      const minThink = Math.min(thinkMs, baseMin) + jitter;
      if (elapsed < minThink) {
        await new Promise(r => setTimeout(r, minThink - elapsed));
      }

      // Guard: jangan apply kalau kondisi udah berubah
      if (isPaused || gameState !== 'playing') {
        try { w.terminate(); } catch {}
        return;
      }

      // Hasil dari worker (UCI)
      if (best?.uci) {
        const from = best.uci.slice(0, 2);
        const to   = best.uci.slice(2, 4);
        const [fr, fc] = algebraToIndex(from);
        const [tr, tc] = algebraToIndex(to);
        if (isPseudoLegalMove(B, fr, fc, tr, tc, EP)) {
          handleMove(fr, fc, tr, tc);
          try { w.terminate(); } catch {}
          return;
        }
      }

      // fallback: random legal (supaya game selalu jalan)
      const legal = allLegalMoves(B, SIDE, EP);
      if (legal.length) {
        const m = legal[Math.floor(Math.random() * legal.length)];
        handleMove(...m);
      }
    } finally {
      setIsThinking(false);
      if (aiTimeoutRef.current) { clearTimeout(aiTimeoutRef.current); aiTimeoutRef.current = null; }
      if (workerRef.current) { try { workerRef.current.terminate(); } catch {} workerRef.current = null; }
    }
  }, preDelay);

  // biarkan scheduled run jalan; cegah dobel via guard di atas
  // return () => {};
}, [currentPlayer, gameMode, gameState, isPaused, aiSide, aiWhite, aiBlack, aiDifficulty]);

  
  // --- [FIXED] Timer Logic for Both Players ---
  useEffect(() => {
    if (gameMode === 'menu' || gameState !== 'playing' || isPaused) return;
    
    const id = setInterval(() => {
      if (currentPlayer === 'white') {
        setWhiteTime(t => Math.max(0, t - 1));
      } else {
        setBlackTime(t => Math.max(0, t - 1));
      }
    }, 1000);

    return () => clearInterval(id);
  }, [gameMode, gameState, isPaused, currentPlayer]);

  useEffect(() => {
    if (gameState !== 'playing') return;
    if (whiteTime === 0 || blackTime === 0) {
      setShowPauseModal(false);
      const loser = whiteTime === 0 ? 'white' : 'black';
      const winner = loser === 'white' ? 'black' : 'white';
      const nameWhite = (playerWhite?.trim() || 'Putih');
      const nameBlack = (playerBlack?.trim() || 'Hitam');
      setResultModal({ title: `Waktu Habis — ${(winner === 'white' ? nameWhite : nameBlack)} menang`, subtitle: 'Kalah waktu.' });
      setGameState('checkmate');
      destroyAI();
    }
  }, [whiteTime, blackTime, gameState, playerWhite, playerBlack]);

  useEffect(()=>{
    if (gameMode==='menu'){ idbSet('autosave', null); return; }
    idbSet('autosave', {
      resume:true, gameMode, board, currentPlayer, moveHistory, captured, enPassantTarget,
      flipped, aiSide, historySAN, baseFen, whiteTime, blackTime
    });
  },[board,currentPlayer,moveHistory,captured,enPassantTarget,flipped,gameMode,aiSide,historySAN,baseFen,whiteTime,blackTime]);

  function handleMove(fr, fc, tr, tc) {
    if (!isPseudoLegalMove(board, fr, fc, tr, tc, enPassantTarget)) return;
    const src = board[fr][fc];
    const willPromo = src.piece === "pawn" && (tr === 0 || tr === 7);
    const { board: nb, captured: cap, newEnPassantTarget } = applyMove(board, fr, fc, tr, tc, enPassantTarget);
    const historyItem = { from: [fr, fc], to: [tr, tc], piece: nb[tr][tc], captured: cap, prevEnPassant: enPassantTarget };
    if (willPromo) {
      setPromotion({ from: [fr, fc], to: [tr, tc], color: src.color, pendingBoard: nb, newEPTarget: newEnPassantTarget, historyItem });
      return;
    }
    commitMove(nb, cap, newEnPassantTarget, historyItem);
  }

  function commitMove(nb, cap, newEPTarget, historyItem) {
    const fenBefore = boardToFen(board, currentPlayer, enPassantTarget, 0, 1);
    const fromAlg = indexToAlgebra(historyItem.from[0], historyItem.from[1]);
    const toAlg = indexToAlgebra(historyItem.to[0], historyItem.to[1]);
    
    const g = new Chess(fenBefore);
    const moveResult = g.move({ from: fromAlg, to: toAlg, promotion: 'q' });
    const san = moveResult?.san || `${fromAlg}-${toAlg}`;

    setBoard(nb);
    setMoveHistory(h => [...h, { ...historyItem, san }]);
    if (cap) {
      setCaptured(c => ({ ...c, [currentPlayer]: [...c[currentPlayer], cap] }));
    }

    const nextPlayer = currentPlayer === 'white' ? 'black' : 'white';
    setCurrentPlayer(nextPlayer);
    setEnPassantTarget(newEPTarget);
    setLastMove({ from: historyItem.from, to: historyItem.to, piece: nb[historyItem.to[0]][historyItem.to[1]] });
    setAnimateKey(Date.now());
    setHistorySAN(list => [...list, san]);

    const afterFen = boardToFen(nb, nextPlayer, newEPTarget, 0, 1);
    const g2 = new Chess(afterFen);
    if (g2.isGameOver()) {
      handleGameOver(g2);
    } else {
      setGameState(g2.inCheck() ? 'check' : 'playing');
    }
    
    setSelected(null);
    setValidMoves([]);
  }
  
  function handleGameOver(g2) {
    destroyAI();
    setShowPauseModal(false);
    let title = 'Seri', subtitle = 'Permainan berakhir.', winner = null, resultType = 'draw';
    const nameWhite = (playerWhite?.trim()||'Putih');
    const nameBlack = (playerBlack?.trim()||'Hitam');

    if (g2.isCheckmate()) {
      winner = currentPlayer;
      const winnerName = winner === 'white' ? nameWhite : nameBlack;
      title = `Skakmat — ${winnerName} menang`;
      subtitle = `${winnerName} memenangkan permainan.`;
      resultType = 'checkmate';
    } else if (g2.isStalemate()) { subtitle = 'Remis karena stalemate.'; resultType = 'stalemate';
    } else if (g2.isThreefoldRepetition()) { subtitle = 'Remis karena repetisi tiga kali.'; resultType = 'threefold';
    } else if (g2.isInsufficientMaterial()) { subtitle = 'Remis karena material tidak cukup.'; resultType = 'insufficient';
    } else if (g2.isDraw()){ subtitle = 'Remis karena aturan 50 langkah.'; resultType = 'draw'; }

    setResultModal({ title, subtitle });
    setGameState('gameover');

    try {
        pushHistory({ t: Date.now(), mode: gameMode, winner: winner || 'draw', names: { white: nameWhite, black: nameBlack }, moves: moveHistory.length, resultType });
        if (gameMode === 'human-vs-ai') {
            const levelKey = aiDifficulty;
            const oppEloStr = AI_LEVELS[levelKey]?.elo.split('–')[0] || '1200';
            const oppElo = parseInt(oppEloStr, 10);
            const humanColor = aiSide === 'white' ? 'black' : 'white';
            const score = resultType === 'draw' ? 0.5 : (winner === humanColor ? 1 : 0);
            const newElo = updateElo(userElo, oppElo, score);
            setUserElo(newElo);
            idbSet('userElo', newElo);
        }
    } catch (e) { console.error("Failed to save history or update ELO:", e); }
  }

  function onChoosePromotion(newPiece) {
    if (!promotion) return;
    const { to, pendingBoard, color, newEPTarget, historyItem } = promotion;
    const [tr, tc] = to;
    const b2 = cloneBoard(pendingBoard);
    b2[tr][tc] = { piece: newPiece, color, hasMoved: true };
    setPromotion(null);
    
    const updatedHistoryItem = { ...historyItem, piece: b2[tr][tc]};
    commitMove(b2, historyItem.captured, newEPTarget, updatedHistoryItem);
  }

  function handleSquareClick(r, c) {
    if (gameState !== "playing" || !isHumanTurn) return;
    const piece = board[r][c];

    if (selected) {
      const [sr, sc] = selected;
      if (sameSquare(selected, [r, c])) {
        setSelected(null);
        setValidMoves([]);
        return;
      }
      const isValid = validMoves.some(([tr, tc]) => tr === r && tc === c);
      if (isValid) {
        handleMove(sr, sc, r, c);
      } else {
        if (piece && piece.color === currentPlayer) {
          setSelected([r, c]);
          setValidMoves(legalMovesForSquareStrict(board, r, c, currentPlayer, enPassantTarget));
        } else {
          setSelected(null);
          setValidMoves([]);
        }
      }
    } else {
      if (piece && piece.color === currentPlayer) {
        setSelected([r, c]);
        setValidMoves(legalMovesForSquareStrict(board, r, c, currentPlayer, enPassantTarget));
      }
    }
  }

  function onDragStart(e, r, c){
    if (gameState !== "playing" || !isHumanTurn) { e.preventDefault(); return; }
    const piece = board[r][c];
    if (piece && piece.color === currentPlayer){
      e.dataTransfer.setData('text/plain', `${r},${c}`);
      e.dataTransfer.effectAllowed = 'move';
    } else {
      e.preventDefault();
    }
  }

  function onDrop(e, tr, tc){
    if (gameState !== "playing" || !isHumanTurn) return;
    const data = e.dataTransfer.getData('text/plain');
    if(!data) return;
    const [fr,fc] = data.split(',').map(Number);
    if(typeof fr !== 'number' || typeof fc !== 'number') return;
    
    const moves = legalMovesForSquareStrict(board, fr, fc, currentPlayer, enPassantTarget);
    const isValid = moves.some(([validTr, validTc]) => validTr === tr && validTc === tc);

    if (isValid){
      handleMove(fr,fc,tr,tc);
    }
  }

  function handleUndo() {
    if (moveHistory.length === 0 || isThinking) return;
    const lastHistoryItem = moveHistory[moveHistory.length - 1];
    const prevHistory = moveHistory.slice(0, -1);
  
    let tempGame = new Chess(baseFen);
    prevHistory.forEach(h => tempGame.move(h.san));
  
    setBoard(fenToArray(tempGame.fen()));
    setCurrentPlayer(tempGame.turn() === 'w' ? 'white' : 'black');
    setEnPassantTarget(lastHistoryItem.prevEnPassant);
    setHistorySAN(h => h.slice(0, -1));
    setMoveHistory(prevHistory);
    
    if (lastHistoryItem.captured) {
      const opponent = currentPlayer;
      setCaptured(c => ({
        ...c,
        [opponent]: c[opponent].slice(0, -1)
      }));
    }
  
    setGameState('playing');
    setSelected(null);
    setValidMoves([]);
    setLastMove(prevHistory.length > 0 ? prevHistory[prevHistory.length-1] : null);
    setAnimateKey(Date.now());
  }
  
  function handleExportPGN() {
    const game = new Chess(baseFen);
    historySAN.forEach(san => game.move(san));
    const pgn = game.pgn();
    
    const blob = new Blob([pgn], { type: 'application/vnd.chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chess-master-game-${Date.now()}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleImportFEN(fen) {
    try {
      const g = new Chess(fen); // Validate FEN
      resetBoardOnly();
      setBoard(fenToArray(g.fen()));
      setCurrentPlayer(g.turn() === 'w' ? 'white' : 'black');
      setBaseFen(g.fen()); // Set the new base FEN
      setShowPauseModal(false);
      alert('Posisi FEN berhasil dimuat!');
    } catch (e) {
      alert('FEN tidak valid! Silakan periksa kembali string FEN Anda.');
    }
  }

  function resetBoardOnly() {
    destroyAI();
    setBoard(initializeBoard());
    setCurrentPlayer("white");
    setSelected(null); setValidMoves([]);
    setMoveHistory([]); setCaptured({ white: [], black: [] });
    setGameState("playing"); setIsThinking(false); setIsPaused(false);
    setEnPassantTarget(null); setPromotion(null); setResultModal(null);
    setLastMove(null); setHistorySAN([]); setBaseFen(boardToFen(initializeBoard(),'white',null,0,1));
    setWhiteTime(INITIAL_TIME); setBlackTime(INITIAL_TIME);
  }

  function exitToMenu() {
    resetBoardOnly();
    setGameMode('menu'); setPendingMode(null);
    setShowPauseModal(false); setShowExitConfirm(false); setShowPlayerModal(false);
  }

  async function ensureHumanName() {
    let name = (playerWhite || "").trim();
    if (!name) {
      const saved = await idbGet('playerName');
      if (saved && saved.trim()) { setPlayerWhite(saved.trim()); return saved.trim(); }
      name = 'Player'; setPlayerWhite(name); idbSet('playerName', name);
    }
    return name;
  }
  
  async function startHumanVsAI() { await ensureHumanName(); exitToMenu(); setPendingMode('human-vs-ai'); setShowEloModal(true); setPlayerBlack(rand(AI_NAMES)); }
  function startAIVsAI() { exitToMenu(); setPendingMode('ai-vs-ai'); setShowEloModal(true); setPlayerWhite(rand(AI_NAMES)); setPlayerBlack(rand(AI_NAMES)); }
  function startHumanVsHuman() { exitToMenu(); setPendingMode('human-vs-human'); setPlayerModalMode('human-vs-human'); setShowPlayerModal(true); }

  async function confirmElo(payload) {
    if (pendingMode === 'human-vs-ai') {
      const humanName = (await ensureHumanName()) || 'Player';
      const aiName = rand(AI_NAMES);
      const humanIsWhite = Math.random() < 0.5;
      setAiDifficulty(payload.single); setShowEloModal(false);
      resetBoardOnly();
      if (humanIsWhite) { setPlayerWhite(humanName); setPlayerBlack(aiName); setAiSide('black'); setFlipped(false); }
      else { setPlayerWhite(aiName); setPlayerBlack(humanName); setAiSide('white'); setFlipped(true); }
      setGameMode('human-vs-ai'); setPendingMode(null);
      return;
    }
    if (pendingMode === 'ai-vs-ai') {
      setAiWhite(payload.white); setAiBlack(payload.black);
      setShowEloModal(false); resetBoardOnly();
      setFlipped(false); setGameMode('ai-vs-ai'); setPendingMode(null);
      return;
    }
    setShowEloModal(false);
  }

  function confirmPlayer({ white, black }) {
    if (playerModalMode === 'first-run') { const name = (white || 'Player').trim(); setPlayerWhite(name); idbSet('playerName', name); setShowPlayerModal(false); return; }
    if (pendingMode === 'human-vs-human') { setPlayerWhite((white || 'Putih').trim()); setPlayerBlack((black || 'Hitam').trim()); setShowPlayerModal(false); setGameMode('human-vs-human'); resetBoardOnly(); setFlipped(false); return; }
  }
  
  const bgClass = "min-h-screen bg-gradient-to-br from-rose-50 via-sky-50 to-amber-50 dark:from-slate-900 dark:via-purple-900 dark:to-slate-900";
  const cardClass = "rounded-2xl border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20";
  const headerCard = `${cardClass} p-4 sm:p-6 mb-4 sm:mb-6 shadow-lg`;

  if (gameMode === "menu") {
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

  return (
    <div className={`${bgClass} p-3 sm:p-4`}>
      <div className="max-w-6xl mx-auto">
        <div className={headerCard}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 sm:gap-4">
              <Crown className="w-7 h-7 sm:w-8 sm:h-8 text-yellow-500" />
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white">Chess Master</h1>
                <p className="text-slate-600 dark:text-gray-300 text-xs sm:text-sm">
                  {gameMode === "human-vs-human" && `${playerWhite||'Putih'} vs ${playerBlack||'Hitam'}`}
                  {gameMode === "human-vs-ai" && `${playerWhite||'Kamu'} vs ${playerBlack||'AI'}`}
                  {gameMode === "ai-vs-ai" && `${playerWhite||'AI'} vs ${playerBlack||'AI'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <button onClick={handleUndo} className="px-3 py-2 rounded-lg bg-slate-600 hover:brightness-110 text-white" aria-label="Undo" title="Undo">
                <Undo2 className="w-5 h-5" />
              </button>
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
              currentPlayer={currentPlayer} isThinking={isThinking} gameState={gameState} captured={captured}
              aiDifficulty={aiDifficulty} moveCount={moveHistory.length} gameMode={gameMode}
              aiWhite={aiWhite} aiBlack={aiBlack} playerWhite={playerWhite} playerBlack={playerBlack}
            />
          </div>

          <div className={`order-1 lg:order-2 lg:col-span-2 min-w-0 w-full flex justify-center overflow-hidden lg:overflow-visible`}>
             <ChessBoard
                board={board} selected={selected} validMoves={validMoves} moveHistory={moveHistory}
                currentPlayer={currentPlayer} onSquareClick={handleSquareClick} onDragStart={onDragStart} onDrop={onDrop}
                flipped={flipped} lastMove={lastMove} animateKey={animateKey} disabled={isPaused || isThinking || gameState!=="playing" || !isHumanTurn}
             />
          </div>

          <div className="order-3 lg:order-3 lg:col-span-1 min-w-0">
            <div className={`${cardClass} p-0`} style={{ height: isLg && leftHeight ? leftHeight : 'auto' }}>
              <div className="h-full flex flex-col">
                <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                  <h3 className="text-slate-800 dark:text-white font-semibold">Riwayat Langkah</h3>
                </div>
                <div className="flex-grow overflow-auto p-4">
                  {moveHistory.length === 0 ? (
                    <p className="text-slate-600 dark:text-gray-300 text-sm">Belum ada langkah</p>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 text-sm">
                      <div className="font-semibold text-slate-500 dark:text-gray-400 text-right">#</div>
                      <div className="font-semibold text-slate-700 dark:text-gray-200 truncate" title={playerWhite || 'Putih'}>
                        {playerWhite || 'Putih'}
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-gray-200 truncate" title={playerBlack || 'Hitam'}>
                        {playerBlack || 'Hitam'}
                      </div>
                      
                      <div className="col-span-3 h-px bg-black/10 dark:bg-white/10 my-1"></div>

                      {moveHistory.reduce((acc, m, i) => {
                        if (i % 2 === 0) acc.push([]);
                        acc[acc.length - 1].push(m);
                        return acc;
                      }, []).map((pair, i) => (
                        <React.Fragment key={i}>
                          <div className="text-slate-500 dark:text-gray-400 text-right">{i + 1}.</div>
                          <div className="text-slate-700 dark:text-gray-200">{pair[0]?.san}</div>
                          <div className="text-slate-700 dark:text-gray-200">{pair[1]?.san || ''}</div>
                        </React.Fragment>
                      ))}
                    </div>
                  )}
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
        onUndo={isHumanTurn && moveHistory.length > 0 ? handleUndo : null}
        onExportPGN={handleExportPGN}
        onImportFEN={handleImportFEN}
        clocks={{
          whiteLabel: (playerWhite?.trim()||'Putih'),
          blackLabel: (playerBlack?.trim()||'Hitam'),
          white: formatTime(whiteTime),
          black: formatTime(blackTime),
        }}
      />
      <ConfirmModal
        open={showExitConfirm} title="Keluar ke Menu?"
        message="Permainan akan direset. Yakin ingin kembali ke menu?"
        confirmText="Keluar" cancelText="Batal" onConfirm={exitToMenu} onCancel={()=>setShowExitConfirm(false)}
      />
      <ResultModal
        open={!!resultModal} title={resultModal?.title} subtitle={resultModal?.subtitle}
        onReplay={()=>{ resetBoardOnly(); setResultModal(null); }} onExit={exitToMenu}
      />
    </div>
  );
}