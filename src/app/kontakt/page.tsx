import type { Metadata } from "next";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Kontakt" };

export default function ContactPage() {
  return (
    <div className="container-dk py-6 md:py-10">
      <p className="label mb-2 text-brick-text">Kontakt</p>
      <h1>Ozvěte se</h1>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h2 className="text-[19px]">Prodejna</h2>
          <address className="mt-3 not-italic text-muted">
            {SITE.name}
            <br />
            {SITE.address}
            <br />
            IČO {SITE.ico}
          </address>
          <p className="mt-4 text-muted">
            {SITE.phone}
            <br />
            {SITE.email}
          </p>
        </div>
        <div className="rounded-[var(--radius-card)] border border-line bg-paper p-4">
          <h2 className="text-[19px]">Otevírací doba</h2>
          <dl className="mt-3 text-muted">
            {SITE.openingHours.map((o) => (
              <div key={o.days} className="flex justify-between border-b border-line py-2 last:border-0">
                <dt>{o.days}</dt>
                <dd>{o.hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
