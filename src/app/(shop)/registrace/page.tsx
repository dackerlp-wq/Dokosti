import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/account/register-form";
import { PageIntro } from "@/components/ui/page-intro";
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
    <>
      <PageIntro eyebrow="Klub DoKosti" title={isKiosk ? "Registrace v prodejně" : "Jeden účet pro e-shop i prodejnu"}>
        <p>Kostičky za každý nákup, věrnostní karta, historie objednávek a doporučení krmiva podle vašeho psa nebo kočky.</p>
      </PageIntro>
      <div className="mx-auto max-w-[560px] px-5 pb-10 md:pb-15">
        <RegisterForm cardCode="" kiosk={isKiosk} club={settings.club} account={account} />
      </div>
    </>
  );
}
