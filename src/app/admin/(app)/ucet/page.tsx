import type { Metadata } from "next";
import { saveMyName } from "@/app/admin/(app)/ucet/actions";
import { PageHeader } from "@/components/admin/page-header";
import { PasswordForm } from "@/components/admin/password-form";
import { Button } from "@/components/ui/button";
import { ADMIN_ROLE_HINT, ADMIN_ROLE_LABEL } from "@/lib/admin";
import { requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Můj účet" };

export default async function AccountPage() {
  const admin = await requireAdmin("brigada");
  return (
    <>
      <PageHeader title="Můj účet" subtitle={`Přihlášení jako ${admin.email} · ${ADMIN_ROLE_LABEL[admin.role]}: ${ADMIN_ROLE_HINT[admin.role]}.`} />
      <div className="mt-5 grid max-w-3xl gap-4 sm:grid-cols-2">
        <form action={saveMyName} className="rounded-card border border-line bg-white p-4">
          <h2 className="mb-3 text-[18px]">Jméno</h2>
          <label className="block">
            <span className="mb-1 block text-label text-green">Jak vás uvidí kolegové</span>
            <input name="name" defaultValue={admin.name} minLength={2} maxLength={60} required />
          </label>
          <p className="mt-2 text-small text-muted">Ukazuje se v deníku změn, u směn v kase a v docházce.</p>
          <Button type="submit" className="mt-3 w-full">
            Uložit jméno
          </Button>
        </form>
        <div className="rounded-card border border-line bg-white p-4">
          <h2 className="mb-3 text-[18px]">Změna hesla</h2>
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
