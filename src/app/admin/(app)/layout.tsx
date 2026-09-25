import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { AdminNav } from "@/components/admin/admin-nav";
import { Logo } from "@/components/ui/logo";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: { default: "Administrace", template: "%s · Administrace" }, robots: { index: false } };

/** Administrace má vlastní rozhraní: boční menu, bez hlavičky a patičky e-shopu. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-line bg-paper md:w-56 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between px-4 py-3 md:block md:py-5">
          <Logo variant="napis" width={100} />
          <span className="label mt-1 hidden text-[10px] text-muted md:block">Administrace</span>
        </div>
        <AdminNav />
        <form action={logout} className="mt-auto hidden border-t border-line px-4 py-3 text-xs text-muted md:block">
          <Link href="/admin/ucet" className="block truncate hover:underline" title={admin.email}>
            {admin.email}
          </Link>
          <button type="submit" className="label mt-1 text-[11px] text-brick-text hover:underline">
            Odhlásit
          </button>
        </form>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-5 md:px-8 md:py-6">{children}</main>
    </div>
  );
}
