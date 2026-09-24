import type { Metadata } from "next";

export const metadata: Metadata = { title: "Statistiky" };

export default function StatsPage() {
  return (
    <>
      <h1>Statistiky</h1>
      <p className="mt-2 text-muted">Tržby a nejprodávanější produkty se objeví, jakmile budou první objednávky. Sekce se dokončuje.</p>
    </>
  );
}
