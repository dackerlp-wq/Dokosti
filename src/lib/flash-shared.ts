/** Typy a konstanty hlášek sdílené serverem (lib/flash.ts) a prohlížečem (components/admin/flash.tsx). */
export type FlashKind = "ok" | "error";
export type FlashMessage = { kind: FlashKind; text: string };

export const FLASH_COOKIE = "dk_flash";

/** Hlášky předávané adresou (?zprava=…), když nejde nastavit cookie (přesměrování ze stránky). */
export const FLASH_BY_CODE: Record<string, FlashMessage> = {
  opravneni: { kind: "error", text: "Na tuto část nemáte oprávnění. Požádejte správce." },
  prihlaseni: { kind: "ok", text: "Jste přihlášeni." },
};
