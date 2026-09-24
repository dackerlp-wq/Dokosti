import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import type { ProductRow } from "@/lib/admin";
import { LINE_INFO, STORAGE_LABEL, productName } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function ProductsPage() {
  const db = await getAuthSupabase();
  const { data } = await db.from("products").select("*").order("line").order("sort_order").order("variant");
  const products = (data ?? []) as ProductRow[];

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Produkty</h1>
        <ButtonLink href="/admin/produkty/novy">Nový produkt</ButtonLink>
      </div>
      <div className="mt-4">
        <Table head={["Název", "Řada", "Balení", "Cena", "Skladování", "Stav"]}>
          {products.map((p) => (
            <tr key={p.id}>
              <Td>
                <Link href={`/admin/produkty/${p.id}`} className="font-semibold text-green hover:underline">
                  {productName(p)}
                </Link>
              </Td>
              <Td>{LINE_INFO[p.line].name}</Td>
              <Td>{formatWeight(p.weight_grams)}</Td>
              <Td>
                {formatPrice(p.price_czk)}
                {p.original_price_czk && <span className="ml-1 text-muted line-through">{formatPrice(p.original_price_czk)}</span>}
              </Td>
              <Td>{STORAGE_LABEL[p.storage]}</Td>
              <Td>
                <span className="flex flex-wrap gap-1">
                  {p.is_published ? <Badge kind="skladem">Na webu</Badge> : <Badge>Skryté</Badge>}
                  {!p.in_stock && <Badge kind="sleva">Není</Badge>}
                  {p.is_new && <Badge kind="novinka">Novinka</Badge>}
                </span>
              </Td>
            </tr>
          ))}
        </Table>
      </div>
    </>
  );
}
