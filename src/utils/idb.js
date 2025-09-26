const DB_NAME = 'chess-db';
const KV = 'kv';
const HISTORY = 'history';

function openDB(){
  return new Promise((resolve, reject)=>{
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if(!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      if(!db.objectStoreNames.contains(HISTORY)) db.createObjectStore(HISTORY);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbGet(key){ const db=await openDB(); return new Promise(res=>{ const tx=db.transaction(KV); const r=tx.objectStore(KV).get(key); r.onsuccess=()=>res(r.result); r.onerror=()=>res(undefined); }); }
export async function idbSet(key,val){ const db=await openDB(); return new Promise(res=>{ const tx=db.transaction(KV,'readwrite'); tx.objectStore(KV).put(val,key); tx.oncomplete=()=>res(); }); }
export async function pushHistory(obj){ const db=await openDB(); return new Promise(res=>{ const tx=db.transaction(HISTORY,'readwrite'); const id=Date.now(); tx.objectStore(HISTORY).put(obj,id); tx.oncomplete=()=>res(id); }); }
