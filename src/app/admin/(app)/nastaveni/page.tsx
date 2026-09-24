import type { Metadata } from "next";
import { SettingsForms } from "@/components/admin/settings-forms";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const settings = await getSettings();
  return (
    <>
      <h1>Nastavení</h1>
      <p className="mt-1 text-sm text-muted">Změny se na webu projeví hned po uložení.</p>
      <div className="mt-5">
        <SettingsForms settings={settings} />
      </div>
    </>
  );
}
