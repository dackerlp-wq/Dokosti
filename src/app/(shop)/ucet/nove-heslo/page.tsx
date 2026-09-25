import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { NewPasswordForm } from "@/components/account/auth-forms";
import { getCustomerUser } from "@/lib/customer";

export const metadata: Metadata = { title: "Nové heslo", robots: { index: false } };

export default async function NewPasswordPage() {
  if (!(await getCustomerUser())) redirect("/ucet/prihlaseni");
  return (
    <div className="container-dk py-6 md:py-10">
      <h1>Nové heslo</h1>
      <div className="mt-5">
        <NewPasswordForm />
      </div>
    </div>
  );
}
