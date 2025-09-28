export const AI_LEVELS = {
  beginner:     { name: 'Pemula',      elo: '800–1200',  maxDepth: 3, thinkMs: 300 },
  intermediate: { name: 'Menengah',    elo: '1200–1600', maxDepth: 4, thinkMs: 600 },
  advanced:     { name: 'Mahir',       elo: '1600–2000', maxDepth: 5, thinkMs: 1000 },
  master:       { name: 'Master',      elo: '2000+',     maxDepth: 6, thinkMs: 1500 },
};


export const PIECE_SYMBOLS = {
  white: { king: "♔", queen: "♕", rook: "♖", bishop: "♗", knight: "♘", pawn: "♙" },
  black: { king: "♚", queen: "♛", rook: "♜", bishop: "♝", knight: "♞", pawn: "♟" },
};

export const PIECE_VALUES = { pawn: 100, knight: 320, bishop: 330, rook: 500, queen: 900, king: 20000 };

export const AI_NAMES = [
  "Zed-0x13","Orion","Raven","Lambda","Bishop-Bot","Nero","Athena","Nyx","Echo","Vega","Hydra","Sigma","Atlas","Kirin","Komodo","Drake"
];
