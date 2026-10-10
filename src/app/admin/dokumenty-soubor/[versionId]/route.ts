import { getAuthSupabase, requireAdmin } from "@/lib/supabase/auth";

/**
 * Stažení souboru dokumentu (verze) nebo obrázku podpisu. Přístup hlídá RLS: správce vše,
 * zaměstnanec jen dokumenty navázané na sebe. Soubor jde přes krátce platný podepsaný odkaz.
 */
export async function GET(request: Request, { params }: { params: Promise<{ versionId: string }> }) {
  await requireAdmin("brigada");
  const { versionId } = await params;
  const sp = new URL(request.url).searchParams;
  const db = await getAuthSupabase();
  let path: string | null = null;
  let name = "soubor";
  if (sp.get("podpis")) {
    const { data } = await db.from("document_signatures").select("signature_path, signer_name").eq("id", sp.get("podpis")!).eq("version_id", versionId).maybeSingle();
    path = data?.signature_path ?? null;
    name = `podpis-${data?.signer_name ?? ""}.png`;
  } else {
    const { data } = await db.from("document_versions").select("storage_path, file_name").eq("id", versionId).maybeSingle();
    path = data?.storage_path ?? null;
    name = data?.file_name ?? name;
  }
  if (!path) return new Response("Soubor nenalezen nebo k němu nemáte přístup.", { status: 404 });
  const { data: signed, error } = await db.storage.from("dokumenty").createSignedUrl(path, 120, sp.get("stahnout") ? { download: name } : undefined);
  if (error || !signed) return new Response("Soubor se nepodařilo otevřít.", { status: 404 });
  return Response.redirect(signed.signedUrl, 302);
}
