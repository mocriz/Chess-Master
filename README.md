# ♟️ Chess Master

UI modern, engine cepat, **tiga mode permainan** (H vs H, H vs AI, AI vs AI), lengkap dengan **Pause Modal**, **FEN/PGN**, **timer**, dan dukungan **PWA**. Cocok buat main santai, latihan taktik, sampai nonton AI vs AI.

<p align="left">
  <img alt="built with" src="https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=fff">
  <img alt="vite" src="https://img.shields.io/badge/Vite-5-646CFF?logo=vite&logoColor=fff">
  <img alt="tailwind" src="https://img.shields.io/badge/TailwindCSS-3-38B2AC?logo=tailwindcss&logoColor=fff">
  <img alt="chess.js" src="https://img.shields.io/badge/chess.js-engine-000?logo=javascript">
  <img alt="pwa" src="https://img.shields.io/badge/PWA-Ready-5A0FC8?logo=pwa&logoColor=fff">
</p>

> **Live Demo:** *(opsional)* isi di sini kalau sudah dideploy, contoh: `https://your-app.netlify.app`

---

## ✨ Fitur Utama

* 🎮 **Mode**: Human vs Human, Human vs AI, **AI vs AI**
* 🧠 **AI Difficulty**: *Pemula, Menengah, Mahir, Master* (depth & think-time beda)
* ⏱ **Timer**: default 10:00 vs 10:00, pause/resume sinkron sama permainan
* ⏸ **Pause Modal**: Lanjut, **Mulai Ulang**, **Export PGN**, **Load FEN** (full spec)
* 🔄 **Flip Board** + **Undo** (Redo opsional) di header
* 🧩 **Aturan Catur**: castling, **en passant**, promosi (queen/rook/bishop/knight), cek-mate, stalemate
* 🧾 **Move History** (SAN) & **Captured Pieces**
* 🌓 **Light/Dark Mode** + UI responsif (mobile friendly)
* 📦 **PWA-ready** (Workbox + vite-plugin-pwa) — bisa “Add to Home Screen”

---

## 📸 Cuplikan

> Taruh screenshot di sini (folder `./docs/` atau `./public/`):
>
> ```
> docs/
> ├─ screenshot-desktop.png
> └─ screenshot-mobile.png
> ```

---

## 🚀 Jalankan di Lokal

Pastikan Node.js terbaru (LTS) terinstal.

```bash
# 1) install dependencies
npm install

# 2) start dev server
npm run dev

# 3) build untuk produksi
npm run build

# 4) preview produksi (opsional)
npm run preview
```

> **Tip:** Setelah ganti-ganti engine atau aset besar, kadang perlu `rm -rf node_modules && npm i` biar bersih.

---

## 🧭 Cara Pakai (cepat)

* **Pilih Mode** di header: H vs H, H vs AI, atau AI vs AI.
* **Flip Board**: tombol ↻ di header.
* **Pause**: buka menu jeda →

  * **Mulai Ulang**: reset ke posisi awal standar (FEN start).
  * **Export PGN**: download `.pgn` + auto-copy ke clipboard.
  * **Load FEN**: paste FEN lengkap (termasuk turn, castling, en-passant).
* **Move History**: notasi SAN otomatis, promosi `=Q/R/B/N`.
* **Undo**: di header (Redo opsional; lihat bagian “Redo” di bawah).

---

## 🧩 FEN & PGN

* **FEN**: field lengkap diterima — *placement side castling ep halfmove fullmove*
  Contoh:

  ```
  rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1
  ```
* **PGN**: file `.pgn` berisi header standar (Event, Site, Date, White, Black, Result) + move list dari permainan aktif.

---

## 🧠 AI

* Menggunakan `chess.js` untuk legal moves + evaluasi sederhana dengan pencarian *iterative deepening*.
* Level **Pemula → Master** mengubah `depth` & `think time`.
* Ada *fallback* kalau worker telat: AI memilih langkah legal pertama (agar UI tidak freeze).

---

## 📱 PWA

* Sudah siap PWA (service worker by Workbox).
* Di mobile/Chrome: buka app → **Add to Home Screen** → bisa jalan layaknya aplikasi native.

---

## 🧱 Struktur Proyek (ringkas)

```
src/
├─ App.jsx
├─ ChessGame.jsx
├─ components/
│  ├─ ChessBoard.jsx
│  ├─ Sidebar.jsx
│  └─ modals/
│     ├─ PauseModal.jsx
│     ├─ ConfirmModal.jsx
│     ├─ EloModal.jsx
│     └─ PlayerModal.jsx
├─ chess/
│  ├─ engine.js        # adapter ke chess.js (legal moves, SAN, FEN)
│  ├─ constants.js
│  └─ openingBook.js   # (opsional)
├─ utils/
│  ├─ pgn.js           # export & download PGN
│  └─ idb.js           # (opsional) cache
└─ workers/
   └─ aiWorker.js
```

---

## 🌿 Branching

* `main` – stabil/produksi
* `testing` – eksperimen/QA
* `gemini` – **versi alternatif** (import dari folder lain)

**Push versi lain ke `gemini`:**

```bash
git checkout gemini
# salin isi project versi lain ke working tree (tanpa .git),
# lalu:
git add -A
git commit -m "Import versi alternatif ke branch gemini"
git push -u origin gemini
```

---

## ↩️ Undo / (Redo opsional)

* **Undo** sudah ada di header (mengembalikan satu langkah & posisi papan).
* **Redo** tidak wajib. Kalau kamu ingin mengaktifkannya:

  * Tambah `redoStack` di state,
  * Saat `undo`, dorong langkah ke `redoStack`,
  * Saat `commitMove` baru, kosongkan `redoStack`,
  * Sediakan tombol **Redo** (disabled kalau stack kosong).

> Implementasi contoh singkat ada di diskusi/PR “redo”.

---

## 🧰 Stack Teknis

* **React 18**, **Vite**, **Tailwind CSS**
* **chess.js** (engine & rules)
* **lucide-react** (ikon)
* **vite-plugin-pwa** + **Workbox** (PWA)

---

## 🛣️ Roadmap (ide)

* Import **PGN** → replay game
* **Opening Explorer** & hints
* Analisis pasca-game (blunder/mistake)
* Custom **time control** (increment, delay)
* Sound & animasi move

---

## 🤝 Kontribusi

PR & issue welcome. Ikuti guideline singkat:

* Pastikan `npm run lint` & `npm run build` lulus.
* Buat branch dari `testing` atau `gemini` untuk fitur besar.
* Sertakan screenshot/rekaman kalau mengubah UI.

---

## 📜 Lisensi

MIT © 2025 — *Chess Master Team*
