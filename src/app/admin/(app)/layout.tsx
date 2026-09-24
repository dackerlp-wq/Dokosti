import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { logout } from "@/app/admin/login/actions";
import { getAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Administrace", robots: { index: false } };

const ADMIN_NAV = [
  { href: "/admin", label: "Přehled" },
  { href: "/admin/objednavky", label: "Objednávky" },
  { href: "/admin/produkty", label: "Produkty" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await getAdmin();
  if (!admin) redirect("/admin/login");

  return (
    <div className="container-dk py-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <nav className="flex flex-wrap gap-1" aria-label="Administrace">
          {ADMIN_NAV.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              className="label inline-flex min-h-9 items-center rounded-[var(--radius-control)] px-3 text-green hover:bg-paper"
            >
              {i.label}
            </Link>
          ))}
        </nav>
        <form action={logout} className="flex items-center gap-3 text-sm text-muted">
          <span>{admin.email}</span>
          <button type="submit" className="label text-brick-text hover:underline">
            Odhlásit
          </button>
        </form>
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
