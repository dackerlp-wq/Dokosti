import { NextResponse, type NextRequest } from "next/server";
import { renderPlanPdf } from "@/lib/pdf/plan";
import { decodePlanRequest, plansFor } from "@/lib/pdf/request";
import { getProducts } from "@/lib/products";
import { getSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Plán krmení jako PDF: ?d=<vstup kalkulačky>&download=1 pro stažení, bez něj se otevře v prohlížeči (tisk). */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const request = decodePlanRequest(url.searchParams.get("d"));
  if (!request) return NextResponse.json({ error: "Neplatný vstup." }, { status: 400 });
  const [products, settings] = await Promise.all([getProducts(), getSettings()]);
  const pdf = await renderPlanPdf(plansFor(request, products), settings.shop);
  const name = `plan-krmeni-${request.animals.map((a) => a.name || a.species).join("-").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9-]+/g, "-").toLowerCase()}.pdf`;
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${url.searchParams.get("download") ? "attachment" : "inline"}; filename="${name}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
