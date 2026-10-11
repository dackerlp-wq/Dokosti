import { ButtonLink } from "@/components/ui/button";
import { PageIntro } from "@/components/ui/page-intro";

export default function NotFound() {
  return (
    <PageIntro
      eyebrow="Chyba 404"
      title="Tady nic není"
      actions={
        <>
          <ButtonLink href="/rada/barf" variant="action" size="md">
            Vybrat krmivo
          </ButtonLink>
          <ButtonLink href="/" variant="secondary" size="md">
            Zpět na úvod
          </ButtonLink>
        </>
      }
    >
      <p>Stránka neexistuje nebo jsme ji přesunuli. Zkuste nabídku.</p>
    </PageIntro>
  );
}
