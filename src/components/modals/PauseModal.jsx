import React, { useState } from "react";

export default function PauseModal({
  open,
  onResume,
  onRestart,
  onExit,

  // fitur opsional (tampil hanya jika dikirim dari ChessGame)
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
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-800 text-white shadow-2xl border border-white/10">
        {/* Header */}
        <div className="px-6 pt-5">
          <h3 className="text-xl font-bold">Permainan Dijeda</h3>
          <p className="text-white/80 text-sm mt-1">
            Pilih aksi berikut untuk melanjutkan.
          </p>
        </div>

        {/* Clocks (opsional) */}
        {clocks && (
          <div className="px-6 mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs opacity-80">{clocks.whiteLabel || "Putih"}</div>
              <div className="text-2xl font-semibold">{clocks.white || "10:00"}</div>
            </div>
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-xs opacity-80">{clocks.blackLabel || "Hitam"}</div>
              <div className="text-2xl font-semibold">{clocks.black || "10:00"}</div>
            </div>
          </div>
        )}

        {/* Tombol utama (sesuai UI lama) */}
        <div className="px-6 py-5 flex flex-wrap gap-3">
          <button
            onClick={onResume}
            className="px-4 py-2.5 rounded-lg bg-slate-600 hover:bg-slate-500"
          >
            ▶️ Lanjut
          </button>
          <button
            onClick={onRestart}
            className="px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500"
          >
            🔁 Ulangi
          </button>
          <button
            onClick={onExit}
            className="px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500"
          >
            ⏏️ Keluar
          </button>
        </div>

        {/* Divider */}
        {(onUndo || onRedo || onExportPGN || onImportFEN) && (
          <div className="px-6">
            <div className="h-px w-full bg-white/10" />
          </div>
        )}

        {/* Fitur tambahan (opsional) */}
        {(onUndo || onRedo || onExportPGN || onImportFEN) && (
          <div className="px-6 pb-5">
            <p className="text-xs uppercase tracking-wide text-white/60 mt-4 mb-2">
              Fitur Tambahan
            </p>
            <div className="flex flex-wrap gap-2">
              {onUndo && (
                <button
                  onClick={onUndo}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  ↶ Undo
                </button>
              )}
              {onRedo && (
                <button
                  onClick={onRedo}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                >
                  ↷ Redo
                </button>
              )}
              {onExportPGN && (
                <button
                  onClick={onExportPGN}
                  className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-sm"
                >
                  ⬇️ Export PGN
                </button>
              )}
            </div>

            {onImportFEN && (
              <div className="mt-3">
                <label className="text-xs opacity-80 mb-1 block">
                  Import FEN (opsional)
                </label>
                <input
                  value={fenText}
                  onChange={(e)=>setFenText(e.target.value)}
                  placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                  className="w-full rounded-lg bg-white/10 border border-white/10 px-3 py-2 text-white placeholder:text-white/50"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={()=> fenText.trim() && onImportFEN(fenText.trim())}
                    className="px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-sm"
                  >
                    Load FEN
                  </button>
                  <button
                    onClick={()=> setFenText("")}
                    className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
