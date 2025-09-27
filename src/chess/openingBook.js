// Very small opening book (SAN sequences)
export const BOOK = [
  ['e4','e5','Nf3','Nc6','Bb5'],                                // Ruy Lopez
  ['e4','e5','Nf3','Nc6','Bc4','Bc5','c3'],                     // Italian
  ['e4','c5','Nf3','d6','d4','cxd4','Nxd4','Nf6','Nc3','a6'],   // Sicilian Najdorf-ish
  ['e4','e6','d4','d5','Nc3','Bb4'],                            // French
  ['e4','c6','d4','d5','Nc3','dxe4','Nxe4'],                    // Caro-Kann
];

export function nextBookMoveSAN(historySAN) {
  for (const line of BOOK) {
    let ok = true;
    for (let i = 0; i < historySAN.length && i < line.length; i++) {
      if (line[i] !== historySAN[i]) { ok = false; break; }
    }
    if (!ok) continue;
    if (historySAN.length < line.length) return line[historySAN.length];
  }
  return null;
}
