import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatQty, type ProductRow } from "@/lib/admin";
import { LINE_INFO, STORAGE_LABEL, productName } from "@/lib/catalog";
import { formatPrice, formatWeight } from "@/lib/format";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export default async function ProductsPage() {
  const [db, admin] = await Promise.all([getAuthSupabase(), getAdmin()]);
  const manager = admin?.isManager ?? false;
  const { data } = await db.from("products").select("*").order("line").order("sort_order").order("variant");
  const products = (data ?? []) as ProductRow[];
  const margin = (p: ProductRow) => (p.purchase_price_czk && p.price_czk > 0 ? Math.round(((p.price_czk - p.purchase_price_czk) / p.price_czk) * 100) : null);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Produkty</h1>
        <div className="flex gap-2">
          <ButtonLink href="/admin/sklad" variant="secondary">
            Sklad a příjemky
          </ButtonLink>
          <ButtonLink href="/admin/produkty/novy">Nový produkt</ButtonLink>
        </div>
      </div>
      <div className="mt-4">
        <Table head={manager ? ["Název", "Řada", "Balení", "Cena", "Marže", "Sklad", "Stav"] : ["Název", "Řada", "Balení", "Cena", "Sklad", "Stav"]}>
          {products.map((p) => (
            <tr key={p.id}>
              <Td>
                <Link href={`/admin/produkty/${p.id}`} className="font-semibold text-green hover:underline">
                  {productName(p)}
                </Link>
              </Td>
              <Td>{LINE_INFO[p.line].name}</Td>
              <Td>{p.unit === "kg" ? <span className="text-muted">na váhu</span> : formatWeight(p.weight_grams)}</Td>
              <Td>
                {formatPrice(p.price_czk)}
                {p.unit === "kg" && <span className="text-muted">/kg</span>}
                {p.original_price_czk && <span className="ml-1 text-muted line-through">{formatPrice(p.original_price_czk)}</span>}
              </Td>
              {manager && <Td className={margin(p) !== null && margin(p)! < 20 ? "text-brick-text" : ""}>{margin(p) !== null ? `${margin(p)} %` : <span className="text-muted">—</span>}</Td>}
              <Td>
                {p.stock_qty === null ? (
                  <span className="text-muted">{STORAGE_LABEL[p.storage]}</span>
                ) : (
                  <span className={Number(p.stock_qty) <= p.low_stock_threshold ? "font-semibold text-brick-text" : ""}>{formatQty(p.stock_qty, p.unit)}</span>
                )}
              </Td>
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
