import type { Metadata } from "next";
import { removeUser, setUserRole } from "@/app/admin/(app)/uzivatele/actions";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { PageHeader } from "@/components/admin/page-header";
import { Table, Td } from "@/components/admin/table";
import { Button } from "@/components/ui/button";
import { ADMIN_ROLE_HINT, ADMIN_ROLE_LABEL, formatDate, type AdminRole } from "@/lib/admin";
import { getAuthSupabase, requireManager } from "@/lib/supabase/auth";

export const metadata: Metadata = { title: "Uživatelé" };

type Row = { user_id: string; email: string; name: string; role: AdminRole; created_at: string; last_sign_in_at: string | null };

/** Uživatelé administrace a jejich role. Založení účtu zatím v Supabase, od etapy Provoz pozvánkou. */
export default async function UsersPage() {
  const admin = await requireManager();
  const db = await getAuthSupabase();
  const { data } = await db.rpc("admin_list");
  const rows = (data ?? []) as Row[];

  return (
    <>
      <PageHeader title="Uživatelé" subtitle="Kdo se dostane do administrace a kasy a co smí. Jméno si každý nastaví v Můj účet, zobrazuje se v deníku změn a u směn." />
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {(Object.keys(ADMIN_ROLE_LABEL) as AdminRole[]).map((r) => (
          <div key={r} className="rounded-card border border-line bg-white p-4">
            <p className="text-eyebrow uppercase text-muted">{ADMIN_ROLE_LABEL[r]}</p>
            <p className="mt-1 text-sm">{ADMIN_ROLE_HINT[r]}</p>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <Table head={["Uživatel", "E-mail", "Role", "Naposledy přihlášen", ""]}>
          {rows.map((u) => (
            <tr key={u.user_id}>
              <Td className="font-semibold">
                {u.name || <span className="text-muted">(bez jména)</span>}
                {u.user_id === admin.id && <span className="ml-2 text-small text-muted">vy</span>}
              </Td>
              <Td className="text-muted">{u.email}</Td>
              <Td>
                {u.user_id === admin.id ? (
                  ADMIN_ROLE_LABEL[u.role]
                ) : (
                  <form action={setUserRole} className="flex items-center gap-2">
                    <input type="hidden" name="user_id" value={u.user_id} />
                    <input type="hidden" name="name" value={u.name || u.email} />
                    <select name="role" defaultValue={u.role} aria-label="Role" className="min-h-8 w-auto py-0">
                      {(Object.keys(ADMIN_ROLE_LABEL) as AdminRole[]).map((r) => (
                        <option key={r} value={r}>
                          {ADMIN_ROLE_LABEL[r]}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" variant="secondary" className="min-h-8 px-3 text-[11px]">
                      Uložit
                    </Button>
                  </form>
                )}
              </Td>
              <Td className="whitespace-nowrap text-muted">{u.last_sign_in_at ? formatDate(u.last_sign_in_at) : "nikdy"}</Td>
              <Td className="text-right">
                {u.user_id !== admin.id && (
                  <ConfirmButton action={removeUser} fields={{ user_id: u.user_id, name: u.name || u.email }} title={`Odebrat přístup: ${u.name || u.email}?`} text="Uživatel se do administrace ani kasy nepřihlásí. Jeho záznamy v deníku, směnách a pohybech zůstanou." confirmLabel="Odebrat přístup" variant="ghost" className="min-h-8 px-2 text-[11px]">
                    Odebrat
                  </ConfirmButton>
                )}
              </Td>
            </tr>
          ))}
        </Table>
      </div>
      <div className="mt-4 rounded-card border border-line bg-white p-4 text-sm">
        <p className="text-eyebrow uppercase text-muted">Nový uživatel</p>
        <p className="mt-1">
          Zatím: v Supabase → Authentication → Users založte uživatele (e-mail a heslo), zkopírujte jeho ID a vložte do tabulky <code>admins</code> s rolí. Pozvánka e-mailem přímo odsud přijde s etapou Provoz (zaměstnanci).
        </p>
      </div>
    </>
  );
}
