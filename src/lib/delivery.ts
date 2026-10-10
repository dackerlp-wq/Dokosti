import type { OrderRow } from "@/lib/admin";

/** Pomocné funkce pro rozvoz: adresa, odkazy do map, trasa dne. */
export const addressOf = (o: Pick<OrderRow, "street" | "zip" | "city">) => [o.street, [o.zip, o.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

/** Odkaz na navigaci k jedné adrese (Google Maps otevře Mapy nebo navigaci v telefonu). */
export const mapsHref = (address: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;

/** Celá trasa dne jako jedna navigace: start z prodejny, zastávky v pořadí seznamu, nejvýš 9 průjezdních bodů (limit Google Maps). */
export function routeHref(origin: string, stops: string[]): string {
  const list = stops.slice(0, 10);
  const destination = list[list.length - 1];
  const waypoints = list.slice(0, -1);
  const p = new URLSearchParams({ api: "1", travelmode: "driving", origin, destination });
  if (waypoints.length) p.set("waypoints", waypoints.join("|"));
  return `https://www.google.com/maps/dir/?${p}`;
}

export const todayIso = (d = new Date()) => d.toISOString().slice(0, 10);
export const addDays = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};
