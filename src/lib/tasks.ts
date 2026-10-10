import type { SupabaseClient } from "@supabase/supabase-js";

/** Úkol z tabulky tasks: ruční, nebo automatický (auto_key, vzniká jednou a po vyřešení se zavře). */
export type TaskRow = {
  id: string;
  title: string;
  detail: string;
  kind: "rucni" | "auto";
  auto_key: string | null;
  source_type: string | null;
  source_id: string | null;
  href: string | null;
  due_on: string | null;
  assigned_to: string | null;
  created_by: string | null;
  done_at: string | null;
  done_by: string | null;
  created_at: string;
};

/**
 * Založí automatický úkol, pokud s tímto klíčem ještě žádný otevřený není.
 * Používají moduly (splatnost faktury, končící smlouva…), aby úkol nevznikl dvakrát.
 */
export async function ensureAutoTask(db: SupabaseClient, task: { autoKey: string; title: string; detail?: string; href?: string; dueOn?: string | null; sourceType?: string; sourceId?: string }) {
  const { data } = await db.from("tasks").select("id").eq("auto_key", task.autoKey).maybeSingle();
  if (data) return;
  await db.from("tasks").insert({ kind: "auto", auto_key: task.autoKey, title: task.title, detail: task.detail ?? "", href: task.href ?? null, due_on: task.dueOn ?? null, source_type: task.sourceType ?? null, source_id: task.sourceId ?? null });
}

/** Automatický úkol je vyřešený (např. faktura zaplacená): zavře se, aby zmizel z Dnes. */
export async function closeAutoTask(db: SupabaseClient, autoKey: string) {
  await db.from("tasks").update({ done_at: new Date().toISOString() }).eq("auto_key", autoKey).is("done_at", null);
}
