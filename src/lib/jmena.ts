/**
 * Skloňování jmen zvířat (a lidí) podle pohlaví. Jen pravidla pro běžná jména,
 * cizí nebo nesklonná jména (Rocky, Lili, Dagmar) nechává beze změny.
 * Pády: dat = 3. pád („Kolik je Báře / Rexovi“), acc = 4. pád („pro Báru / pro Rexe“).
 */
export type Sex = "samec" | "samice";
export type Pad = "nom" | "dat" | "acc";

/** Souhlásky, po kterých má mužské jméno ve 4. pádě -e (Rex → Rexe, Muf → Mufa ne, Max → Maxe). */
const SOFT_END = /[žščřcjďťňx]$/i;

/** Vyskloňuje první slovo jména; prázdné jméno vrací beze změny. */
export function sklonuj(name: string, sex: Sex, pad: Pad): string {
  const n = name.trim();
  if (!n || pad === "nom") return n;
  const [first, ...rest] = n.split(/\s+/);
  const out = sex === "samice" ? female(first, pad) : male(first, pad);
  return [out, ...rest].join(" ");
}

function female(w: string, pad: Pad): string {
  const lw = w.toLowerCase();
  if (lw.endsWith("a")) {
    const stem = w.slice(0, -1);
    if (pad === "acc") return stem + "u"; // Bára → Báru, Micka → Micku
    // 3. pád: -a → -e s měkčením souhlásky (Bára → Báře, Micka → Micce, Olga → Olze, Ida → Idě, Máňa → Máně)
    const ls = stem.toLowerCase();
    if (ls.endsWith("ch")) return stem.slice(0, -2) + "še";
    const last = ls.slice(-1);
    const soften: Record<string, string> = { r: "ř", k: "c", h: "z", g: "z" };
    if (soften[last]) return stem.slice(0, -1) + soften[last] + "e";
    if ("dtn".includes(last)) return stem + "ě";
    const hacek: Record<string, string> = { ď: "d", ť: "t", ň: "n" };
    if (hacek[last]) return stem.slice(0, -1) + hacek[last] + "ě";
    return stem + "e"; // Dáša → Dáše, Bella → Belle
  }
  if (lw.endsWith("ie")) return w.slice(0, -1) + "i"; // Lucie → Lucii (3. i 4. pád)
  return w; // Dagmar, Lili, Molly, Kitty, Chloe
}

function male(w: string, pad: Pad): string {
  const lw = w.toLowerCase();
  if (/[bcčdďfghjklmnňpqrřsštťvwxzž]$/i.test(lw)) {
    // Rex → Rexovi / Rexe, Ben → Benovi / Bena, Alík → Alíkovi / Alíka
    if (pad === "dat") return w + "ovi";
    return w + (SOFT_END.test(lw) ? "e" : "a");
  }
  if (lw.endsWith("a")) return w.slice(0, -1) + (pad === "dat" ? "ovi" : "u"); // Puňťa → Puňťovi / Puňťu
  if (lw.endsWith("o")) return w.slice(0, -1) + (pad === "dat" ? "ovi" : "a"); // Bruno → Brunovi / Bruna
  return w; // Rocky, Charlie, Benny, Rudi, Jake
}
