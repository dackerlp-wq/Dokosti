import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/account/auth-forms";
import { PageIntro } from "@/components/ui/page-intro";
import { getCustomerUser } from "@/lib/customer";

export const metadata: Metadata = { title: "Přihlášení", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; chyba?: string }> }) {
  const { next, chyba } = await searchParams;
  if (await getCustomerUser()) redirect(next && next.startsWith("/") ? next : "/ucet");
  return (
    <>
      <PageIntro eyebrow="Účet" title="Přihlášení">
        <p>Přihlaste se, nebo si založte účet. Nákup jde i bez účtu, s ním ale vidíte objednávky a Kostičky.</p>
      </PageIntro>
      <div className="mx-auto max-w-[560px] px-5 pb-10 md:pb-15">
        {(chyba === "odkaz" || chyba === "google") && (
          <p role="alert" className="mb-5 rounded-control border border-brick-text bg-white p-3 text-small font-semibold text-brick-text">
            {chyba === "google" ? "Přihlášení přes Google se nepovedlo. Zkuste to znovu, nebo se přihlaste e-mailem." : "Odkaz z e-mailu už neplatí nebo byl použitý. Nechte si poslat nový, nebo se přihlaste heslem."}
          </p>
        )}
        <AuthForms next={next} />
      </div>
    </>
  );
}
