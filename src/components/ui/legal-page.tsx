import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

/** Právní stránky. Text se upravuje v administraci (Nastavení → Texty stránek). */
export async function LegalPage({ title, body }: { title: string; body: "terms" | "privacy" }) {
  const { shop, pages } = await getSettings();
  const text = pages[body];
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>{title}</h1>
      <div className="mt-6 max-w-2xl">
        {text ? (
          <div className="whitespace-pre-line text-muted">{text}</div>
        ) : (
          <div className="rounded-[var(--radius-card)] border border-line bg-paper p-6 text-muted">
            <p>
              Tuto stránku před spuštěním e-shopu doplní provozovatel: {SITE.name}, IČO {shop.ico}, {shop.address},{" "}
              {shop.city}.
            </p>
            <p className="mt-3">Znění musí odpovídat občanskému zákoníku a zákonu o ochraně spotřebitele.</p>
          </div>
        )}
      </div>
    </div>
  );
}
