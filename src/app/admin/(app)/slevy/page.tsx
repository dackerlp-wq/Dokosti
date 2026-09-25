import type { Metadata } from "next";
import Link from "next/link";
import { Table, Td } from "@/components/admin/table";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { formatDay, type CouponRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Slevové kódy" };

export default async function CouponsPage() {
  const db = await getAuthSupabase();
  const { data } = await db.from("coupons").select("*").order("created_at", { ascending: false });
  const coupons = (data ?? []) as CouponRow[];
  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1>Slevové kódy</h1>
        <ButtonLink href="/admin/slevy/novy">Nový kód</ButtonLink>
      </div>
      <div className="mt-4">
        {coupons.length === 0 ? (
          <p className="text-muted">Zatím žádné kódy. Založte třeba VITEJTE na 10 % pro první nákup.</p>
        ) : (
          <Table head={["Kód", "Sleva", "Od (Kč)", "Platnost", "Použito", "Stav"]}>
            {coupons.map((c) => {
              const expired = c.valid_to !== null && c.valid_to < today;
              const exhausted = c.max_uses !== null && c.used_count >= c.max_uses;
              return (
                <tr key={c.id}>
                  <Td>
                    <Link href={`/admin/slevy/${c.id}`} className="font-semibold text-green hover:underline">
                      {c.code}
                    </Link>
                    {c.note && <span className="block text-xs text-muted">{c.note}</span>}
                  </Td>
                  <Td>{c.type === "percent" ? `${c.value} %` : formatPrice(c.value)}</Td>
                  <Td>{c.min_order_czk ? formatPrice(c.min_order_czk) : ""}</Td>
                  <Td>
                    {c.valid_from ? formatDay(c.valid_from) : "…"} – {c.valid_to ? formatDay(c.valid_to) : "…"}
                  </Td>
                  <Td>
                    {c.used_count}
                    {c.max_uses !== null && ` / ${c.max_uses}`}
                  </Td>
                  <Td>
                    {!c.active ? <Badge>Vypnutý</Badge> : expired ? <Badge>Prošlý</Badge> : exhausted ? <Badge>Vyčerpaný</Badge> : <Badge kind="skladem">Aktivní</Badge>}
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </div>
    </>
  );
}
