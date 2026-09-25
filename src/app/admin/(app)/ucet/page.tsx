import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Můj účet" };

export default async function AccountPage() {
  const admin = await getAdmin();
  return (
    <>
      <h1>Můj účet</h1>
      <p className="mt-1 text-sm text-muted">Přihlášení jako {admin?.email}.</p>
      <div className="mt-5 max-w-sm rounded-[var(--radius-card)] border border-line bg-paper p-4">
        <h2 className="mb-3 text-[18px]">Změna hesla</h2>
        <PasswordForm />
      </div>
    </>
  );
}
