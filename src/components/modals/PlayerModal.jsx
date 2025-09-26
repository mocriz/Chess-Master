import React, { useState } from "react";

export default function PlayerModal({ open, mode, initialWhite="", initialBlack="", onClose, onConfirm }){
  const [white, setWhite] = useState(initialWhite);
  const [black, setBlack] = useState(initialBlack);
  if(!open) return null;
  const title = mode==='first-run' ? 'Masukkan Nama Kamu' : (mode==='human-vs-human' ? 'Nama Pemain' : 'Nama Pemain & Lawan');
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 bg-white text-slate-800 border border-black/10 dark:bg-slate-800 dark:text-white dark:border-white/10">
        <h3 className="text-xl font-semibold mb-4">{title}</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-600 dark:text-gray-300">Nama Putih</label>
            <input value={white} onChange={(e)=>setWhite(e.target.value)} placeholder="Mis. Budi" className="mt-1 w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2" />
          </div>
          {(mode!=='first-run') && (
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-300">Nama Hitam</label>
              <input value={black} onChange={(e)=>setBlack(e.target.value)} placeholder="Mis. Sari / AI" className="mt-1 w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2" />
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10">Batal</button>
          <button onClick={()=>onConfirm({white, black})} className="px-4 py-2 rounded-lg bg-purple-600 text-white">Simpan</button>
        </div>
      </div>
    </div>
  );
}