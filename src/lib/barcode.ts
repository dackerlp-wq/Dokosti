/** Čárový kód Code 128 (sada B) jako SVG, pro zákaznické karty a štítky. Tabulka vzorů podle normy ISO/IEC 15417. */
const PATTERNS = ["11011001100", "11001101100", "11001100110", "10010011000", "10010001100", "10001001100", "10011001000", "10011000100", "10001100100", "11001001000", "11001000100", "11000100100", "10110011100", "10011011100", "10011001110", "10111001100", "10011101100", "10011100110", "11001110010", "11001011100", "11001001110", "11011100100", "11001110100", "11101101110", "11101001100", "11100101100", "11100100110", "11101100100", "11100110100", "11100110010", "11011011000", "11011000110", "11000110110", "10100011000", "10001011000", "10001000110", "10110001000", "10001101000", "10001100010", "11010001000", "11000101000", "11000100010", "10110111000", "10110001110", "10001101110", "10111011000", "10111000110", "10001110110", "11101110110", "11010001110", "11000101110", "11011101000", "11011100010", "11011101110", "11101011000", "11101000110", "11100010110", "11101101000", "11101100010", "11100011010", "11101111010", "11001000010", "11110001010", "10100110000", "10100001100", "10010110000", "10010000110", "10000101100", "10000100110", "10110010000", "10110000100", "10011010000", "10011000010", "10000110100", "10000110010", "11000010010", "11001010000", "11110111010", "11000010100", "10001111010", "10100111100", "10010111100", "10010011110", "10111100100", "10011110100", "10011110010", "11110100100", "11110010100", "11110010010", "11011011110", "11011110110", "11110110110", "10101111000", "10100011110", "10001011110", "10111101000", "10111100010", "11110101000", "11110100010", "10111011110", "10111101110", "11101011110", "11110101110", "11010000100", "11010010000", "11010011100"];
const STOP = "11000111010";
const START_B = 104;

/** Vrátí SVG s kódem, nebo null pro prázdný či nepodporovaný text (jen ASCII 32–126). */
export function code128Svg(text: string, { height = 48, module = 2, label = true }: { height?: number; module?: number; label?: boolean } = {}): string | null {
  const value = text.trim();
  if (!value || /[^\x20-\x7e]/.test(value)) return null;
  const values = [START_B, ...Array.from(value, (ch) => ch.charCodeAt(0) - 32)];
  const check = values.reduce((sum, v, i) => sum + v * Math.max(i, 1), 0) % 103;
  const bits = values.map((v) => PATTERNS[v]).join("") + PATTERNS[check] + STOP + "11";
  const quiet = 10 * module;
  const width = bits.length * module + 2 * quiet;
  const labelH = label ? 16 : 0;
  let rects = "";
  let x = quiet;
  for (let i = 0; i < bits.length; ) {
    let j = i;
    while (j < bits.length && bits[j] === bits[i]) j++;
    if (bits[i] === "1") rects += `<rect x="${x}" y="0" width="${(j - i) * module}" height="${height}"/>`;
    x += (j - i) * module;
    i = j;
  }
  const caption = label ? `<text x="${width / 2}" y="${height + 13}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="12">${value.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</text>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height + labelH}" viewBox="0 0 ${width} ${height + labelH}" role="img" aria-label="${value}" fill="#1f1a14">${rects}${caption}</svg>`;
}

/** Nový kód karty: DK + 8 číslic. */
export function newCardCode(): string {
  return "DK" + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
}
