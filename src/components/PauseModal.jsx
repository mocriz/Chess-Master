import React, { useState } from "react";

export default function PauseModal({
  open,
  onResume,
  onRestart,
  onExit,
  // fitur tambahan:
  onUndo,
  onRedo,
  onExportPGN,
  onImportFEN,
  clocks, // { whiteLabel, blackLabel, white, black }
}) {
  const [fenText, setFenText] = useState("");

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md rounded-2xl bg-white/10 dark:bg-white/10 border border-white/20 p-6 text-white shadow-2xl">
        <h3 className="text-xl font-bold mb-4">Pause</h3>

        {/* Clocks */}
        {clocks && (
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="opacity-80">{clocks.whiteLabel || 'Putih'}</div>
              <div className="text-2xl font-semibold">{clocks.white || '10:00'}</div>
            </div>
            <div className="rounded-xl bg-black/20 border border-white/10 p-3">
              <div className="opacity-80">{clocks.blackLabel || 'Hitam'}</div>
              <div className="text-2xl font-semibold">{clocks.black || '10:00'}</div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button onClick={onResume}  className="py-2 rounded-lg bg-green-600 hover:bg-green-700">Lanjut</button>
          <button onClick={onRestart} className="py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700">Mulai Ulang</button>
          <button onClick={onUndo}    className="py-2 rounded-lg bg-slate-600 hover:bg-slate-700">Undo</button>
          <button onClick={onRedo}    className="py-2 rounded-lg bg-slate-600 hover:bg-slate-700">Redo</button>
          <button onClick={onExportPGN} className="py-2 rounded-lg bg-amber-600 hover:bg-amber-700 col-span-2">Export PGN</button>
        </div>

        <div className="mb-4">
          <label className="text-sm opacity-90 mb-2 block">Import FEN (opsional)</label>
          <input
            value={fenText}
            onChange={(e)=>setFenText(e.target.value)}
            placeholder="contoh: rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
            className="w-full rounded-lg bg-black/20 border border-white/10 px-3 py-2 text-white placeholder:text-white/50"
          />
          <div className="mt-2 flex gap-2">
            <button
              onClick={()=>{ if(fenText.trim()) onImportFEN?.(fenText.trim()); }}
              className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-700"
            >
              Load FEN
            </button>
            <button
              onClick={()=>setFenText("")}
              className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-800"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button onClick={onExit} className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700">
            Keluar ke Menu
          </button>
        </div>
      </div>
    </div>
  );
}
