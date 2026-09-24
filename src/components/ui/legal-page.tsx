import { SITE } from "@/lib/site";

/** Placeholder právních stránek. Text doplní provozovatel před spuštěním. */
export function LegalPage({ title }: { title: string }) {
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>{title}</h1>
      <div className="mt-6 max-w-2xl rounded-[var(--radius-card)] border border-line bg-paper p-6 text-muted">
        <p>
          Tuto stránku před spuštěním e-shopu doplní provozovatel: {SITE.name}, IČO {SITE.ico}, {SITE.address}.
        </p>
        <p className="mt-3">Znění musí odpovídat občanskému zákoníku a zákonu o ochraně spotřebitele.</p>
      </div>
    </div>
  );
}
