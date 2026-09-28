/**
 * Věrnostní karty: kód `DK` + 5 znaků + kontrolní znak, abeceda bez zaměnitelných písmen (0/O, 1/I).
 * Stejná logika je v databázi (card_check_char, card_code_valid v migraci 0023). Viz docs/KARTY.md.
 */
export const CARD_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function cardCheckChar(body: string): string | null {
  let sum = 0;
  for (let i = 0; i < body.length; i++) {
    const pos = CARD_ALPHABET.indexOf(body[i]);
    if (pos < 0) return null;
    sum += pos * (i + 1);
  }
  return CARD_ALPHABET[sum % 32];
}

/** Předtištěná karta se správným kontrolním znakem. Starší ručně zadané kódy tímhle neprojdou, ale platí. */
export function isPrintedCardCode(code: string): boolean {
  return /^DK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$/.test(code) && cardCheckChar(code.slice(2, 7)) === code[7];
}

/** Kód z čehokoli, co přijde ze čtečky nebo z adresy: „dk7f4k2m“, „https://dokosti.cz/k/DK7F4K2M?kiosk=1“ → „DK7F4K2M“. */
export function normalizeCardCode(raw: string): string {
  let s = raw.trim();
  const m = s.match(/\/k\/([A-Za-z0-9-]+)/);
  if (m) s = m[1];
  return s.toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

/** Adresa v QR kódu na kartě. */
export const cardUrl = (siteUrl: string, code: string) => `${siteUrl}/k/${code}`;

export type CardState =
  | { state: "neplatna" }
  | { state: "blokovana" }
  | { state: "volna" }
  | { state: "prirazena"; account: boolean; initials: string; hasEmail: boolean; mine: boolean };
