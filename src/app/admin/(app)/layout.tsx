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
      <aside className="flex shrink-0 flex-col border-b border-line bg-paper md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <Logo variant="napis" width={100} />
          <span className="label mt-1 text-[10px] text-muted md:block">{ADMIN_ROLE_LABEL[admin.role]}</span>
        </div>
        <div className="px-3 pb-2 md:pb-3">
          <SearchPalette />
        </div>
        <AdminNav role={admin.role} badges={{ "/admin/objednavky": open ?? 0, "/admin/ukoly": tasks ?? 0 }} />
        <form action={logout} className="mt-auto hidden border-t border-line px-4 py-3 text-xs text-muted md:block">
          <Link href="/admin/ucet" className="block truncate hover:underline" title={admin.email}>
            {admin.name}
          </Link>
          <button type="submit" className="label mt-1 text-[11px] text-brick-text hover:underline">
            Odhlásit
          </button>
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
