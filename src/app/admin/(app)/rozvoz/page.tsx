import type { Metadata } from "next";
import Link from "next/link";
import { StatusBadge } from "@/components/admin/status-badge";
import { Table, Td } from "@/components/admin/table";
import { formatDay, PAYMENT_LABEL, type OrderRow } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { getAuthSupabase } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Rozvoz a odběry" };

const OPEN = ["nova", "potvrzena", "pripravena"];

export default async function DeliveryPage() {
  const db = await getAuthSupabase();
  const [{ data: rozvoz }, { data: odber }, { data: prepravce }] = await Promise.all([
    db.from("orders").select("*").eq("shipping_method", "rozvoz").in("status", OPEN).order("delivery_date").order("created_at"),
    db.from("orders").select("*").eq("shipping_method", "odber").in("status", OPEN).order("created_at"),
    db.from("orders").select("*").eq("shipping_method", "prepravce").in("status", OPEN).order("created_at"),
  ]);

  const byDay = new Map<string, OrderRow[]>();
  for (const o of (rozvoz ?? []) as OrderRow[]) {
    const k = o.delivery_date ?? "bez-terminu";
    byDay.set(k, [...(byDay.get(k) ?? []), o]);
  }

  return (
    <>
      <h1>Rozvoz a odběry</h1>
      <p className="mt-1 text-sm text-muted">Otevřené objednávky podle způsobu dodání. Doručené a zrušené se tu neukazují.</p>

      <h2 className="mt-6 mb-2 text-[20px]">Rozvoz</h2>
      {byDay.size === 0 ? (
        <p className="text-muted">Žádný rozvoz k naplánování.</p>
      ) : (
        [...byDay.entries()].map(([day, list]) => (
          <section key={day} className="mb-5">
            <h3 className="mb-2 text-[16px]">
              {day === "bez-terminu" ? "Bez termínu" : formatDay(day)}{" "}
              <span className="font-body text-sm font-normal text-muted">· {list.length} zastávek</span>
            </h3>
            <Table head={["Číslo", "Zákazník", "Adresa", "Telefon", "Platba", "Celkem", "Stav"]}>
              {list.map((o) => (
                <Row key={o.id} o={o} address />
              ))}
            </Table>
          </section>
        ))
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Osobní odběr</h2>
      {(odber ?? []).length === 0 ? (
        <p className="text-muted">Nic k přípravě.</p>
      ) : (
        <Table head={["Číslo", "Zákazník", "Telefon", "Platba", "Celkem", "Stav"]}>
          {((odber ?? []) as OrderRow[]).map((o) => (
            <Row key={o.id} o={o} />
          ))}
        </Table>
      )}

      <h2 className="mt-8 mb-2 text-[20px]">Přepravce</h2>
      {(prepravce ?? []).length === 0 ? (
        <p className="text-muted">Nic k odeslání.</p>
      ) : (
        <Table head={["Číslo", "Zákazník", "Adresa", "Telefon", "Platba", "Celkem", "Stav"]}>
          {((prepravce ?? []) as OrderRow[]).map((o) => (
            <Row key={o.id} o={o} address />
          ))}
        </Table>
      )}
    </>
  );
}

function Row({ o, address }: { o: OrderRow; address?: boolean }) {
  return (
    <tr>
      <Td>
        <Link href={`/admin/objednavky/${o.id}`} className="font-semibold text-green hover:underline">
          {o.order_number}
        </Link>
      </Td>
      <Td>{o.customer_name}</Td>
      {address && (
        <Td>
          {o.street}, {o.zip} {o.city}
        </Td>
      )}
      <Td>
        <a href={`tel:${o.customer_phone}`} className="hover:underline">
          {o.customer_phone}
        </a>
      </Td>
      <Td>{PAYMENT_LABEL[o.payment_method]}</Td>
      <Td>{formatPrice(o.total_czk)}</Td>
      <Td>
        <StatusBadge status={o.status} />
      </Td>
    </tr>
  );
}
