export const AI_LEVELS = {
  beginner: { name: "Pemula", elo: "800-1200", depth: 2 },
  intermediate: { name: "Menengah", elo: "1200-1600", depth: 3 },
  advanced: { name: "Mahir", elo: "1600-2000", depth: 3 },
  master: { name: "Master", elo: "2000+", depth: 4 },
};

export const PIECE_SYMBOLS = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

export const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

export const AI_NAMES = [
  "Zed-0x13","Orion","Raven","Lambda","Bishop-Bot","Nero","Athena","Nyx","Echo","Vega","Hydra","Sigma","Atlas","Kirin","Komodo","Drake"
];
