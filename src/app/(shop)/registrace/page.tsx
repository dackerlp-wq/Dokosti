import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/register-form";
import { normalizeCardCode } from "@/lib/cards";
import { signedInWithoutClub } from "@/lib/customer";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Registrace do klubu DoKosti", description: "Účet pro e-shop i věrnostní kartu v prodejně. Kostičky za nákupy, profil vašeho psa nebo kočky a doporučení na míru." };

/** Veřejná registrace: web i tablet v prodejně (?kiosk=1). Karta z prodejny má vlastní stránku /k/KÓD, ?karta=KÓD tam přesměruje. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ karta?: string; kiosk?: string }> }) {
  const [{ karta, kiosk }, settings] = await Promise.all([searchParams, getSettings()]);
  const isKiosk = kiosk === "1";
  if (karta) redirect(`/k/${normalizeCardCode(karta)}${isKiosk ? "?kiosk=1" : ""}`);
  const account = isKiosk ? null : await signedInWithoutClub();
  return (
    <div className="container-dk py-6 md:py-10">
      <div className="max-w-2xl">
        <p className="label text-brick-text">Klub DoKosti</p>
        <h1 className="mt-1">{isKiosk ? "Registrace v prodejně" : "Jeden účet pro e-shop i prodejnu"}</h1>
        <p className="mt-2 text-muted">Kostičky za každý nákup, věrnostní karta, historie objednávek a doporučení krmiva podle vašeho psa nebo kočky.</p>
      </div>
      <div className="mt-6">
        <RegisterForm cardCode="" kiosk={isKiosk} club={settings.club} account={account} />
      </div>
    </div>
  );
}
