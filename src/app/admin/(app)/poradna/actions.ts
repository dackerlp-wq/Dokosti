"use server";

import { revalidatePath } from "next/cache";
import { logActivity } from "@/lib/activity";
import { flashError, flashOk } from "@/lib/flash";
import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

export async function setInquiryAnswered(fd: FormData) {
  const admin = await requireAdmin();
  const id = String(fd.get("id") ?? "");
  const answered = fd.get("answered") === "1";
  const db = await getAuthSupabase();
  const { data: row } = await db.from("inquiries").select("name").eq("id", id).maybeSingle();
  const { error } = await db.from("inquiries").update({ answered }).eq("id", id);
  if (error) return flashError(error.message);
  await logActivity(db, admin, { kind: answered ? "poradna.zodpovezeno" : "poradna.vraceno", subject: "inquiry", subjectId: id, text: `Dotaz od ${row?.name || "zákazníka"}: ${answered ? "zodpovězeno" : "vráceno mezi čekající"}` });
  revalidatePath("/admin/poradna");
  revalidatePath("/admin");
  await flashOk(answered ? "Označeno jako zodpovězené." : "Vráceno mezi čekající.");
}
