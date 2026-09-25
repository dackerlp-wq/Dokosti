import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForms } from "@/components/account/auth-forms";
import { getCustomerUser } from "@/lib/customer";

export const metadata: Metadata = { title: "Přihlášení", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getCustomerUser()) redirect(next && next.startsWith("/") ? next : "/ucet");
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Můj účet</h1>
      <p className="mt-2 mb-5 max-w-md text-muted">Přihlaste se, nebo si založte účet. Nákup jde i bez účtu, s ním ale vidíte objednávky a Kostičky.</p>
      <AuthForms next={next} />
    </div>
  );
}
