import { NextResponse, type NextRequest } from "next/server";
import { cardUrl } from "@/lib/cards";
import { SITE_URL } from "@/lib/seo";
import { getAdmin, getAuthSupabase } from "@/lib/supabase/auth";

export const dynamic = "force-dynamic";

/** CSV dávky pro tiskárnu: kód a adresa do QR. Oddělovač středník (Excel v češtině), UTF-8 s BOM. */
export async function GET(request: NextRequest) {
  if (!(await getAdmin())) return new NextResponse("Nepřihlášen", { status: 401 });
  const batch = Number(request.nextUrl.searchParams.get("davka"));
  if (!Number.isInteger(batch) || batch < 1) return new NextResponse("Chybí dávka", { status: 400 });
  const db = await getAuthSupabase();
  const { data } = await db.from("cards").select("code").eq("batch", batch).order("code");
  const lines = ["kod;qr_adresa", ...((data ?? []) as { code: string }[]).map((c) => `${c.code};${cardUrl(SITE_URL, c.code)}`)];
  return new NextResponse("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="karty-davka-${batch}.csv"` },
  });
}
