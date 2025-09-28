// src/utils/pgn.js
import { Chess } from "chess.js";

export function buildPGN({ history = [], startFEN, tags = {}, indexToAlgebra }) {
  const g = new Chess(startFEN);
  for (const h of history) {
    g.move({
      from: indexToAlgebra(h.from[0], h.from[1]),
      to: indexToAlgebra(h.to[0], h.to[1]),
      promotion: h.promotion || undefined,
    });
  }
  const header = [];
  const tagMap = {
    Event: tags.Event || "Casual Game",
    Site: tags.Site || "Local",
    Date: tags.Date || new Date().toISOString().slice(0,10),
    Round: tags.Round || "1",
    White: tags.White || "White",
    Black: tags.Black || "Black",
    Result: tags.Result || (g.isDraw() ? "1/2-1/2" : g.isCheckmate() ? (g.turn()==="w" ? "0-1" : "1-0") : "*"),
  };
  for (const [k,v] of Object.entries(tagMap)) header.push(`[${k} "${v}"]`);
  header.push("");
  header.push(g.pgn());
  return header.join("\n");
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 0);
}
