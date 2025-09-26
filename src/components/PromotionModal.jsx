import React from "react";
import { PIECE_SYMBOLS } from "../chess/constants";

export default function PromotionModal({ promotion, onChoose }) {
  if (!promotion) return null;
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-slate-800 dark:text-white text-slate-800 rounded-2xl p-6 w-full max-w-sm border border-black/10 dark:border-white/10">
        <h4 className="font-semibold mb-4">Promosi Bidak</h4>
        <p className="text-sm text-slate-600 dark:text-gray-300 mb-4">
          Pilih bidak promosi:
        </p>
        <div className="grid grid-cols-4 gap-3">
          {["queen", "rook", "bishop", "knight"].map((p) => (
            <button
              key={p}
              onClick={() => onChoose(p)}
              className="bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 rounded-xl py-3 text-2xl"
            >
              {PIECE_SYMBOLS[promotion.color][p]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
