import React from "react";
import { PIECE_SYMBOLS, AI_LEVELS } from "../chess/constants";

export default function Sidebar({
  currentPlayer,
  isThinking,
  gameState,
  captured,
  aiDifficulty,
  moveCount,
  gameMode,
  aiWhite,
  aiBlack,
  playerWhite,
  playerBlack,
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4 border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20">
        <h3 className="text-slate-800 dark:text-white font-semibold mb-3">
          Giliran
        </h3>
        <div
          className={`flex items-center gap-3 p-3 rounded-lg ${
            currentPlayer === "white"
              ? "bg-white/30 dark:bg-white/20"
              : "bg-black/10 dark:bg-gray-800/50"
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full ${
              currentPlayer === "white" ? "bg-white" : "bg-gray-800"
            }`}
          />
          <span className="text-slate-800 dark:text-white font-medium">
            {currentPlayer === "white"
              ? playerWhite || "Putih"
              : playerBlack || "Hitam"}
          </span>
        </div>
        {isThinking && (
          <p className="mt-2 text-yellow-600 dark:text-yellow-300 text-sm">
            AI berpikir…
          </p>
        )}
        {gameState !== "playing" && (
          <div className="mt-2 text-sm">
            {gameState === "check" && (
              <p className="text-yellow-600 dark:text-yellow-300">Skak!</p>
            )}
            {gameState === "checkmate" && (
              <p className="text-red-600 dark:text-red-300">Skakmat.</p>
            )}
            {gameState === "stalemate" && (
              <p className="text-blue-600 dark:text-blue-300">Stalemate.</p>
            )}
          </div>
        )}
      </div>

      <div className="rounded-xl p-4 border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20">
        <h3 className="text-slate-800 dark:text-white font-semibold mb-3">
          Bidak Tertangkap
        </h3>
        <div className="space-y-3">
          <div>
            <p className="text-slate-600 dark:text-gray-300 text-sm mb-1">
              Putih:
            </p>
            <div className="flex flex-wrap gap-1">
              {captured.white.map((p, i) => (
                <span key={i} className="text-lg">
                  {PIECE_SYMBOLS[p.color][p.piece]}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-slate-600 dark:text-gray-300 text-sm mb-1">
              Hitam:
            </p>
            <div className="flex flex-wrap gap-1">
              {captured.black.map((p, i) => (
                <span key={i} className="text-lg">
                  {PIECE_SYMBOLS[p.color][p.piece]}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl p-4 border bg-black/5 border-black/10 dark:bg-white/10 dark:border-white/20">
        <h3 className="text-slate-800 dark:text-white font-semibold mb-3">
          Statistik
        </h3>
        <div className="space-y-2 text-sm text-slate-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Langkah:</span>
            <span className="text-slate-800 dark:text-white font-medium">
              {moveCount}
            </span>
          </div>
          {gameMode !== "ai-vs-ai" ? (
            <div className="flex justify-between">
              <span>AI:</span>
              <span className="text-slate-800 dark:text-white font-medium">
                {AI_LEVELS[aiDifficulty].name}
              </span>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <span>AI Putih:</span>
                <span className="text-slate-800 dark:text-white font-medium">
                  {AI_LEVELS[aiWhite].name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>AI Hitam:</span>
                <span className="text-slate-800 dark:text-white font-medium">
                  {AI_LEVELS[aiBlack].name}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
