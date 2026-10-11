import { PageIntro } from "@/components/ui/page-intro";
import { getSettings } from "@/lib/settings";
import { SITE } from "@/lib/site";

/** Právní stránky. Text se upravuje v administraci (Nastavení → Texty stránek). */
export async function LegalPage({ title, body }: { title: string; body: "terms" | "privacy" }) {
  const { shop, pages } = await getSettings();
  const text = pages[body];
  return (
    <>
      <PageIntro title={title} />
      <div className="mx-auto max-w-text px-5 pb-15">
        {text ? (
          <div className="whitespace-pre-line">{text}</div>
        ) : (
          <div className="rounded-card bg-paper p-6">
            <p>
              Tuto stránku před spuštěním e-shopu doplní provozovatel: {SITE.name}, IČO {shop.ico}, {shop.address}, {shop.city}.
            </p>
            <p className="mt-3">Znění musí odpovídat občanskému zákoníku a zákonu o ochraně spotřebitele.</p>
          </div>
        )}
      </div>
    </>
  );
}
