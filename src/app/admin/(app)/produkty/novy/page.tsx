import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "@/components/admin/product-form";
import type { ProductRow } from "@/lib/admin";
import { productName } from "@/lib/catalog";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Nový produkt" };

export default async function NewProductPage() {
  const admin = await requireAdmin();
  const db = await getAuthSupabase();
  const [{ data }, { data: suppliers }] = await Promise.all([db.from("products").select("slug, line, variant").order("line").order("variant"), db.from("suppliers").select("id, name, lead_days").eq("active", true).order("name")]);
  const others = ((data ?? []) as Pick<ProductRow, "slug" | "line" | "variant">[]).map((p) => ({ slug: p.slug, name: productName(p) }));
  return (
    <>
      <PageHeader crumbs={[{ href: "/admin/produkty", label: "Produkty" }]} title="Nový produkt" subtitle="Čtyři kroky, vpravo náhled, jak produkt uvidí zákazník. Uloží se najednou tlačítkem dole." />
      <div className="mt-5">
        <ProductForm others={others} manager={admin.isManager} suppliers={(suppliers ?? []) as { id: string; name: string; lead_days: number }[]} />
      </div>
    </>
  );
}
