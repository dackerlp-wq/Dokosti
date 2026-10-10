import { cookies } from "next/headers";
import { FLASH_COOKIE, type FlashKind, type FlashMessage } from "@/lib/flash-shared";

export type { FlashKind, FlashMessage } from "@/lib/flash-shared";
export { FLASH_BY_CODE, FLASH_COOKIE } from "@/lib/flash-shared";

/**
 * Hláška po akci („Uloženo“, „Nešlo uložit: …“). Server action ji uloží do cookie,
 * komponenta <Flash /> v layoutu ji ukáže a smaže. Funguje i přes přesměrování.
 */
export async function setFlash(kind: FlashKind, text: string) {
  const store = await cookies();
  store.set(FLASH_COOKIE, JSON.stringify({ kind, text } satisfies FlashMessage), { path: "/admin", maxAge: 60, sameSite: "lax", httpOnly: false });
}

export const flashOk = (text: string) => setFlash("ok", text);
export const flashError = (text: string) => setFlash("error", text);
