import type { Metadata } from "next";
import { SettingsForms } from "@/components/admin/settings-forms";
import { getSettings } from "@/lib/settings";
import { requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  await requireManager();
  const settings = await getSettings();
  return (
    <>
      <h1>Nastavení</h1>
      <p className="mt-1 text-sm text-muted">Změny se na webu projeví hned po uložení.</p>
      <div className="mt-5">
        <SettingsForms settings={settings} />
      </div>
      <section className="mt-8 max-w-3xl rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <h2 className="text-[18px]">Zálohy a data</h2>
        <p className="mt-1 text-sm text-muted">
          Databáze běží v Supabase, které dělá denní zálohy samo. Pro vlastní kopii (účetní, přechod jinam, klid v duši) si stáhněte všechna data najednou. Soubory z úložiště (fotky, dokumenty) v exportu nejsou, zůstávají v Supabase Storage.
        </p>
        <a href="/admin/export/zaloha.json" className="label mt-3 inline-flex min-h-9 items-center rounded-[var(--radius-control)] border border-green px-3 text-[11px] text-green">
          Stáhnout zálohu dat (JSON)
        </a>
        <p className="mt-3 text-xs text-muted">
          Osobní údaje zákazníka, který o to požádá, anonymizujete na jeho kartě (Zákazníci → detail → Anonymizovat). Doklady zůstanou, jméno a kontakty se přepíší.
        </p>
      </section>
    </>
  );
}
