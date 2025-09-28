import React, { useMemo, useState } from "react";
import { Play, RotateCcw, Download, Clipboard, Upload, DoorOpen, X, Pause } from "lucide-react";

/** Wrapper untuk mencegah error hooks saat komponen tidak dirender */
export default function PauseModal(props) {
  if (!props.open) return null;
  return <PauseModalInner {...props} />;
}

function PauseModalInner({
  onResume,
  onRestart,
  onExit,
  onExportPGN,
  onImportFEN,
  clocks,
}) {
  const [fenText, setFenText] = useState("");
  const isFenLong = useMemo(() => (fenText?.length || 0) > 80, [fenText]);

  const handleLoadFen = () => {
    const val = (fenText || "").trim();
    if (val) onImportFEN?.(val);
  };
  const handleCopyFen = async () => {
    if (!fenText) return;
    try { 
      await navigator.clipboard.writeText(fenText);
    } catch (e) { 
      console.error("Gagal menyalin FEN:", e); 
    }
  };
  const handlePasteFen = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setFenText(text);
    } catch (e) {
      console.error("Gagal menempel FEN:", e);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 supports-[backdrop-filter]:backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div
        className="w-full max-w-lg rounded-2xl border shadow-2xl bg-white text-slate-800 border-slate-200/20 dark:bg-slate-900 dark:text-white dark:border-white/10 flex flex-col max-h-[90vh]"
      >
        {/* Header - Center */}
        <div className="flex items-center justify-center px-5 py-3 border-b border-slate-200/20 dark:border-white/10 flex-shrink-0">
          <h2 id="pause-modal-title" className="font-semibold text-base flex items-center gap-2">
            <Pause className="size-4 opacity-70" />
            Permainan Dijeda
          </h2>
        </div>

        {/* Konten Scrollable */}
        <div className="overflow-y-auto p-5 space-y-4">
          {/* Clocks */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl p-3 border bg-slate-50 border-slate-200/30 dark:bg-white/10 dark:border-white/10">
              <div className="text-xs uppercase text-slate-500 dark:text-gray-300/80">{clocks?.whiteLabel || "Putih"}</div>
              <div className="text-2xl font-mono">{clocks?.white ?? "10:00"}</div>
            </div>
            <div className="rounded-xl p-3 border bg-slate-50 border-slate-200/30 dark:bg-white/10 dark:border-white/10">
              <div className="text-xs uppercase text-slate-500 dark:text-gray-300/80">{clocks?.blackLabel || "Hitam"}</div>
              <div className="text-2xl font-mono">{clocks?.black ?? "10:00"}</div>
            </div>
          </div>

          {/* Grup Aksi Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={onResume}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition"
            >
              <Play className="size-4" />
              Lanjut
            </button>
             <button
              onClick={onRestart}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-slate-600 hover:brightness-110 text-white transition"
            >
              <RotateCcw className="size-4" /> Mulai Ulang
            </button>
            <button
              onClick={onExit}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white transition"
            >
              <DoorOpen className="size-4" /> Keluar
            </button>
          </div>

          {/* FEN Section */}
          <div className="space-y-2 pt-2">
            <label htmlFor="fen-input" className="text-sm font-medium">Impor/Ekspor FEN</label>
            <textarea
              id="fen-input"
              value={fenText}
              onChange={(e) => setFenText(e.target.value)}
              placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
              rows={isFenLong ? 3 : 2}
              spellCheck={false}
              className="w-full rounded-lg bg-slate-100 dark:bg-black/20 border border-slate-200/30 dark:border-white/10 px-3 py-2 font-mono text-sm outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
            />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
               <button onClick={handleCopyFen} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">
                <Clipboard className="size-4" /> Copy
              </button>
              <button onClick={handlePasteFen} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">
                <Clipboard className="size-4" /> Paste
              </button>
              <button onClick={() => setFenText("")} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600">
                <X className="size-4" /> Clear
              </button>
              <button onClick={handleLoadFen} className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white">
                <Upload className="size-4" /> Load FEN
              </button>
            </div>
          </div>
        </div>

        {/* Footer - Tombol Export PGN */}
        <div className="px-5 py-4 border-t border-slate-200/20 dark:border-white/10 flex-shrink-0">
           <button
              onClick={onExportPGN}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition"
            >
              <Download className="size-4" /> Export PGN
            </button>
        </div>
      </div>
    </div>
  );
}