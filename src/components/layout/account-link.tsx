import { UserRound } from "lucide-react";
import Link from "next/link";
import { getCustomerUser } from "@/lib/customer";

/** Tlačítko účtu v hlavičce: přihlášení, nebo odkaz na Můj účet. */
export async function AccountLink() {
  const user = await getCustomerUser();
  return (
    <Link
      href={user ? "/ucet" : "/ucet/prihlaseni"}
      className="label inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-control)] px-3 text-green hover:bg-cream"
      aria-label={user ? "Můj účet" : "Přihlásit se"}
    >
      <UserRound strokeWidth={1.75} className="h-5 w-5" />
      <span className="hidden sm:inline">{user ? "Účet" : "Přihlásit"}</span>
    </Link>
  );
}
