/** Pomocné funkce pro dokumenty: bezpečný název souboru a cesta v bucketu. */
export function safeFileName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "soubor";
}

export function documentPath(category: string, documentId: string, version: number, fileName: string) {
  return `${category}/${documentId}/v${version}-${safeFileName(fileName)}`;
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
