import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="container-dk py-20 text-center">
      <p className="label mb-2 text-brick-text">Chyba 404</p>
      <h1>Tady nic není</h1>
      <p className="mx-auto mt-4 max-w-md text-muted">Stránka neexistuje nebo jsme ji přesunuli. Zkuste nabídku.</p>
      <div className="mt-8">
        <ButtonLink href="/">Zpět na úvod</ButtonLink>
      </div>
    </div>
  );
}
