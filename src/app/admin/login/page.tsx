import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { Logo } from "@/components/ui/logo";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Přihlášení do administrace", robots: { index: false } };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  if (await getAdmin()) redirect(next?.startsWith("/admin") ? next : "/admin");
  return (
    <div className="mx-auto flex max-w-site flex-col items-center px-5 py-15">
      <Logo variant="barevne" width={200} />
      <div className="mt-7.5 w-full max-w-[560px] rounded-card border border-line bg-white p-6 shadow-card">
        <p className="text-eyebrow text-muted uppercase">Administrace</p>
        <h1 className="font-display text-display-md text-green">Přihlášení</h1>
        <p className="mt-1">Pro obsluhu prodejny.</p>
        <div className="mt-5">
          <LoginForm next={next?.startsWith("/admin") ? next : ""} />
        </div>
      </div>
    </div>
  );
}
