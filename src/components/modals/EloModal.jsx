import React, { useState } from "react";
import { AI_LEVELS } from "../../chess/constants";

export default function EloModal({ open, mode, defaultWhite="intermediate", defaultBlack="master", defaultSingle="intermediate", onClose, onConfirm }){
  const [single, setSingle] = useState(defaultSingle);
  const [white, setWhite] = useState(defaultWhite);
  const [black, setBlack] = useState(defaultBlack);
  if(!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 bg-white text-slate-800 border border-black/10 dark:bg-slate-800 dark:text-white dark:border-white/10">
        <h3 className="text-xl font-semibold mb-4">{mode === 'human-vs-ai' ? 'Pilih ELO AI' : 'Pilih ELO AI Putih & Hitam'}</h3>
        {mode === 'human-vs-ai' ? (
          <div>
            <label className="text-sm text-slate-600 dark:text-gray-300">Tingkat AI</label>
            <select value={single} onChange={(e)=>setSingle(e.target.value)} className="mt-1 w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2">
              {Object.entries(AI_LEVELS).map(([k,v])=> <option key={k} value={k} className="bg-white dark:bg-slate-900">{v.name} (ELO {v.elo})</option>)}
            </select>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-300">AI Putih</label>
              <select value={white} onChange={(e)=>setWhite(e.target.value)} className="mt-1 w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2">
                {Object.entries(AI_LEVELS).map(([k,v])=> <option key={k} value={k} className="bg-white dark:bg-slate-900">{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm text-slate-600 dark:text-gray-300">AI Hitam</label>
              <select value={black} onChange={(e)=>setBlack(e.target.value)} className="mt-1 w-full bg-black/5 dark:bg-white/10 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2">
                {Object.entries(AI_LEVELS).map(([k,v])=> <option key={k} value={k} className="bg-white dark:bg-slate-900">{v.name}</option>)}
              </select>
            </div>
          </div>
        )}
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10">Batal</button>
          <button onClick={()=> onConfirm(mode==='human-vs-ai'? {single} : {white,black})} className="px-4 py-2 rounded-lg bg-purple-600 text-white">Mulai</button>
        </div>
      </div>
    </div>
  );
}