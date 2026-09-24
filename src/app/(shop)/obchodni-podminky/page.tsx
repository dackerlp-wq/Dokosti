import type { Metadata } from "next";
import { LegalPage } from "@/components/ui/legal-page";

export const metadata: Metadata = { title: "Obchodní podmínky" };

export default function TermsPage() {
  return <LegalPage title="Obchodní podmínky" body="terms" />;
}
