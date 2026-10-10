import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { logout } from "@/app/admin/login/actions";
import { AdminNav, SectionTabs } from "@/components/admin/admin-nav";
import { Flash } from "@/components/admin/flash";
import { SearchPalette } from "@/components/admin/search-palette";
import { Logo } from "@/components/ui/logo";
import { ADMIN_ROLE_LABEL } from "@/lib/admin";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: { default: "Administrace", template: "%s · Administrace" }, robots: { index: false } };

/** Administrace má vlastní rozhraní: boční menu, bez hlavičky a patičky e-shopu. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin("brigada");
  // Počet objednávek k vyřízení a otevřených úkolů u položek menu.
  const db = await getAuthSupabase();
  const [{ count: open }, { count: tasks }] = await Promise.all([
    db.from("orders").select("id", { count: "exact", head: true }).in("status", ["nova", "potvrzena", "pripravena"]),
    db.from("tasks").select("id", { count: "exact", head: true }).is("done_at", null).lte("due_on", new Date().toISOString().slice(0, 10)),
  ]);

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-paper md:w-[232px] md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-5 py-3 md:block md:pt-5 md:pb-3">
          <Logo variant="napis" width={100} />
          <span className="label text-[10px] text-muted md:mt-0.5 md:block">BARF · admin</span>
        </div>
        <div className="px-3 pb-2 md:pb-3">
          <SearchPalette />
        </div>
        <AdminNav role={admin.role} badges={{ "/admin/objednavky": open ?? 0, "/admin/ukoly": tasks ?? 0 }} />
        <form action={logout} className="mt-auto hidden border-t border-line px-5 py-3.5 text-xs text-muted md:block">
          <p className="truncate" title={admin.email}>
            {admin.name} · {ADMIN_ROLE_LABEL[admin.role].toLowerCase()}
          </p>
          <p className="mt-0.5">
            <Link href="/admin/ucet" className="text-green hover:underline">
              Můj účet
            </Link>{" "}
            ·{" "}
            <button type="submit" className="text-green hover:underline">
              Odhlásit
            </button>
          </p>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">
        <SectionTabs role={admin.role} />
        {children}
      </main>
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
    </div>
  );
}
