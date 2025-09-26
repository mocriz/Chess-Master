import React from "react";

export default function ConfirmModal({ open, title = "Konfirmasi", message = "Yakin?", confirmText = "Ya", cancelText = "Batal", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl p-6 bg-white text-slate-800 border border-black/10 dark:bg-slate-800 dark:text-white dark:border-white/10">
        <h3 className="text-xl font-semibold mb-2">{title}</h3>
        <p className="text-slate-600 dark:text-gray-300">{message}</p>
        <div className="flex justify-end gap-2 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg bg-black/5 dark:bg-white/10">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-lg bg-red-600 text-white">{confirmText}</button>
        </div>
      </div>
    </div>
  );
}
