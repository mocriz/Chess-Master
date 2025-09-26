import React from "react";
import { RotateCcw, LogOut } from "lucide-react";

export default function ResultModal({ open, title = "Permainan Selesai", subtitle = "", onReplay, onExit }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 bg-white text-slate-800 border border-black/10 dark:bg-slate-800 dark:text-white dark:border-white/10">
        <h3 className="text-2xl font-bold mb-1">{title}</h3>
        {subtitle && <p className="text-slate-600 dark:text-gray-300 mb-5">{subtitle}</p>}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button onClick={onReplay} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-600 hover:bg-green-700 text-white">
            <RotateCcw className="w-4 h-4" /> Main Lagi
          </button>
          <button onClick={onExit} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white">
            <LogOut className="w-4 h-4" /> Keluar ke Menu
          </button>
        </div>
      </div>
    </div>
  );
}
