import type { PayrollItemRow, PayrollMonthRow } from "@/lib/admin";
import { PAYSLIP_SELECT, type PayslipEmployee } from "@/lib/payroll";
import { payslipFileName, renderPayslipPdf } from "@/lib/pdf/payslip";
import { getSettings } from "@/lib/settings";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Výplatní páska jako PDF. Přístup hlídá RLS: správce vše, zaměstnanec svou po uzavření měsíce.
 * Vygenerovaná páska (uzavřený měsíc) se podává z bucketu, aby byla pokaždé stejná; jinak se
 * vykreslí z aktuálních podkladů jako předběžná. ?stahnout=1 vynutí stažení, ?nahled=1 čerstvé vykreslení.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin("brigada");
  const { id } = await params;
  const sp = new URL(request.url).searchParams;
  const db = await getAuthSupabase();
  const { data } = await db.from("payroll_items").select(PAYSLIP_SELECT).eq("id", id).maybeSingle();
  if (!data) return new Response("Páska nenalezena nebo k ní nemáte přístup.", { status: 404 });
  const r = data as unknown as PayrollItemRow & { payroll_months: PayrollMonthRow | null; employees: PayslipEmployee | null };
  const name = payslipFileName(r);
  if (r.payslip_path && !sp.get("nahled")) {
    const { data: signed } = await db.storage.from("dokumenty").createSignedUrl(r.payslip_path, 120, sp.get("stahnout") ? { download: name } : undefined);
    if (signed) return Response.redirect(signed.signedUrl, 302);
  }
  const settings = await getSettings();
  const pdf = await renderPayslipPdf({ item: r, month: r.payroll_months, employee: r.employees, shop: settings.shop });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${sp.get("stahnout") ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
