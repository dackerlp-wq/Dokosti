import type { Metadata } from "next";
import { Suspense } from "react";
import { logout } from "@/app/admin/login/actions";
import { AdminNav, AdminTopbar, SectionTabs } from "@/components/admin/admin-nav";
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
    <div className="admin-shell flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="admin-sidebar flex shrink-0 flex-col md:sticky md:top-0 md:h-screen md:w-[264px]">
        <div className="admin-brand flex items-center gap-3 px-5 py-4">
          <Logo variant="napis-negativ" width={112} priority />
          <span className="ml-auto rounded-full bg-white/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/75">Admin</span>
        </div>
        <div className="px-3 pb-3 md:hidden">
          <SearchPalette />
        </div>
        <AdminNav role={admin.role} badges={{ "/admin/objednavky": open ?? 0, "/admin/ukoly": tasks ?? 0 }} />
        <div className="admin-account mt-auto hidden border-t border-white/10 px-4 py-4 text-sm md:block">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-white">{admin.name.slice(0, 1).toUpperCase()}</span>
            <span className="min-w-0">
              <span className="block truncate font-semibold text-white" title={admin.email}>{admin.name}</span>
              <span className="block text-xs text-white/60">{ADMIN_ROLE_LABEL[admin.role]}</span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <form action={logout}><button type="submit" className="text-white/75 hover:text-white">Odhlásit</button></form>
          </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <AdminTopbar />
        <main className="admin-main min-w-0 px-5 py-6 md:px-8 md:py-8 [&_h1]:font-sans [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:text-green">
          <SectionTabs role={admin.role} />
          {children}
        </main>
      </div>
      <Suspense fallback={null}>
        <Flash />
      </Suspense>
    </div>
  );
}
