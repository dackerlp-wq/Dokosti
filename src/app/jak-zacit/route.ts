import { permanentRedirect } from "next/navigation";

/** Stará adresa stránky pro začátečníky. */
export function GET() {
  permanentRedirect("/jak-zacit-s-barfem");
}
