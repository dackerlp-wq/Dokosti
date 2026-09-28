import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/account/auth-forms";
import { getCustomerUser } from "@/lib/customer";

export const metadata: Metadata = { title: "Přihlášení", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; chyba?: string }> }) {
  const { next, chyba } = await searchParams;
  if (await getCustomerUser()) redirect(next && next.startsWith("/") ? next : "/ucet");
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Můj účet</h1>
      {(chyba === "odkaz" || chyba === "google") && (
        <p role="alert" className="mt-3 max-w-md rounded-[var(--radius-control)] border border-brick bg-paper p-3 text-sm text-brick-text">
          {chyba === "google" ? "Přihlášení přes Google se nepovedlo. Zkuste to znovu, nebo se přihlaste e-mailem." : "Odkaz z e-mailu už neplatí nebo byl použitý. Nechte si poslat nový, nebo se přihlaste heslem."}
        </p>
      )}
      <p className="mt-2 mb-5 max-w-md text-muted">Přihlaste se, nebo si založte účet. Nákup jde i bez účtu, s ním ale vidíte objednávky a Kostičky.</p>
      <AuthForms next={next} />
    </div>
  );
}
