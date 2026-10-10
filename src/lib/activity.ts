import type { SupabaseClient } from "@supabase/supabase-js";
import type { Admin } from "@/lib/supabase/auth";

/**
 * Deník změn (activity_log): jediné místo, kam všechny akce zapisují „kdo, kdy, co, u čeho“.
 * Detaily objednávky, zákazníka, produktu i Dnes z něj čtou historii.
 */
export type ActivitySubject = "order" | "product" | "customer" | "receipt" | "coupon" | "settings" | "card" | "inquiry" | "task" | "shift" | "sale" | "batch" | "admin" | "subscription";

export type ActivityRow = {
  id: number;
  actor: string | null;
  actor_name: string;
  kind: string;
  subject_type: ActivitySubject;
  subject_id: string;
  text: string;
  data: Record<string, unknown>;
  created_at: string;
};

export async function logActivity(db: SupabaseClient, admin: Admin, entry: { kind: string; subject: ActivitySubject; subjectId?: string; text: string; data?: Record<string, unknown> }) {
  const { error } = await db.from("activity_log").insert({
    actor: admin.id,
    actor_name: admin.name,
    kind: entry.kind,
    subject_type: entry.subject,
    subject_id: entry.subjectId ?? "",
    text: entry.text.slice(0, 500),
    data: entry.data ?? {},
  });
  // Deník nesmí shodit akci, která už proběhla; chybu jen zalogujeme.
  if (error) console.error("activity_log", error.message);
}

/** Historie jednoho záznamu (objednávky, zákazníka…), nejnovější první. */
export async function activityFor(db: SupabaseClient, subject: ActivitySubject, subjectId: string, limit = 30): Promise<ActivityRow[]> {
  const { data } = await db.from("activity_log").select("*").eq("subject_type", subject).eq("subject_id", subjectId).order("created_at", { ascending: false }).limit(limit);
  return (data ?? []) as ActivityRow[];
}

/** Odkaz na záznam, ke kterému se událost váže. */
export function activityHref(a: Pick<ActivityRow, "subject_type" | "subject_id">): string | null {
  if (!a.subject_id) return null;
  switch (a.subject_type) {
    case "order":
      return `/admin/objednavky/${a.subject_id}`;
    case "product":
      return `/admin/produkty/${a.subject_id}`;
    case "customer":
      return `/admin/zakaznici/${a.subject_id}`;
    case "receipt":
      return `/admin/sklad/prijemky#${a.subject_id}`;
    case "coupon":
      return `/admin/slevy/${a.subject_id}`;
    case "sale":
      return `/admin/kasa/uctenka/${a.subject_id}`;
    case "subscription":
      return `/admin/predplatne/${a.subject_id}`;
    case "settings":
      return "/admin/nastaveni";
    case "card":
      return "/admin/karty";
    case "inquiry":
      return "/admin/poradna";
    case "task":
      return "/admin/ukoly";
    default:
      return null;
  }
}
