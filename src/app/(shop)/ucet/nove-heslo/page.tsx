import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/account/auth-forms";
import { PageIntro } from "@/components/ui/page-intro";
import { getCustomerUser } from "@/lib/customer";

export const metadata: Metadata = { title: "Nové heslo", robots: { index: false } };

export default async function NewPasswordPage() {
  if (!(await getCustomerUser())) redirect("/ucet/prihlaseni");
  return (
    <>
      <PageIntro eyebrow="Účet" title="Nové heslo" />
      <div className="mx-auto max-w-[560px] px-5 pb-10 md:pb-15">
        <NewPasswordForm />
      </div>
    </>
  );
}
