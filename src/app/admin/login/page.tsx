import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/ui/logo";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Přihlášení do administrace", robots: { index: false } };

export default async function AdminLoginPage() {
  if (await getAdmin()) redirect("/admin");
  return (
    <div className="container-dk flex flex-col items-center py-16">
      <Logo variant="barevne" width={200} />
      <div className="mt-8 w-full max-w-sm rounded-[var(--radius-card)] border border-line bg-paper p-6">
        <h1 className="text-[24px]">Administrace</h1>
        <p className="mt-1 text-sm text-muted">Přihlášení pro obsluhu prodejny.</p>
        <div className="mt-5">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
