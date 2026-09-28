import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterWizard } from "@/components/account/register-wizard";
import { getCustomerUser } from "@/lib/customer";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Registrace do klubu DoKosti", description: "Účet pro e-shop i věrnostní kartu v prodejně. Kostičky za nákupy, profil vašeho psa nebo kočky a doporučení na míru." };

/** Veřejná registrace: web i tablet v prodejně (?kiosk=1), karta z prodejny (?karta=KÓD). */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ karta?: string; kiosk?: string }> }) {
  const [{ karta, kiosk }, settings] = await Promise.all([searchParams, getSettings()]);
  const isKiosk = kiosk === "1";
  // Přihlášený bez propojeného zákazníka (např. po přihlášení Googlem) registraci dokončí bez hesla.
  let account: { email: string; name: string } | null = null;
  if (!isKiosk) {
    const user = await getCustomerUser();
    if (user) {
      const db = await getAuthSupabase();
      const [{ data: linked }, { data: auth }] = await Promise.all([db.from("customers").select("id").eq("user_id", user.id).maybeSingle(), db.auth.getUser()]);
      if (linked) redirect("/ucet");
      const meta = (auth.user?.user_metadata ?? {}) as { full_name?: string; name?: string };
      account = { email: user.email, name: meta.full_name ?? meta.name ?? "" };
    }
  }
  return (
    <div className="container-dk py-6 md:py-10">
      <div className="max-w-2xl">
        <p className="label text-brick-text">Klub DoKosti</p>
        <h1 className="mt-1">{isKiosk ? "Registrace v prodejně" : "Jeden účet pro e-shop i prodejnu"}</h1>
        <p className="mt-2 text-muted">
          Kostičky za každý nákup, věrnostní karta, historie objednávek a doporučení krmiva podle vašeho psa nebo kočky.
          {settings.club.registrationPoints > 0 && ` Za registraci ${settings.club.registrationPoints} Kostiček`}
          {settings.club.petPoints > 0 && `, za vyplněný profil zvířete dalších ${settings.club.petPoints}`}.
        </p>
      </div>
      <div className="mt-6">
        <RegisterWizard cardCode={(karta ?? "").toUpperCase()} kiosk={isKiosk} club={settings.club} loyalty={settings.loyalty} account={account} />
      </div>
    </div>
  );
}
