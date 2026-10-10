import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

const TABLES = ["settings", "products", "suppliers", "customers", "orders", "order_items", "pos_shifts", "pos_sales", "pos_sale_items", "stock_receipts", "stock_receipt_items", "stock_movements", "stock_batches", "purchase_orders", "purchase_order_items", "coupons", "cards", "subscriptions", "subscription_items", "employees", "attendance", "shift_plans", "documents", "document_versions", "document_signatures", "devices", "temperature_log", "checklists", "checklist_runs", "expenses", "recurring_expenses", "payroll_params", "payroll_months", "payroll_items", "tasks", "activity_log"];

/** Záloha dat (JSON, jen správce): všechny provozní tabulky, bez souborů z úložiště. Supabase má navíc vlastní denní zálohy. */
export async function GET() {
  await requireManager();
  const db = await getAuthSupabase();
  const out: Record<string, unknown> = { exported_at: new Date().toISOString(), tables: {} };
  const tables = out.tables as Record<string, unknown>;
  for (const t of TABLES) {
    const { data, error } = await db.from(t).select("*").limit(20000);
    tables[t] = error ? { error: error.message } : data;
  }
  const day = new Date().toISOString().slice(0, 10);
  return new Response(JSON.stringify(out), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="dokosti-zaloha-${day}.json"` } });
}
