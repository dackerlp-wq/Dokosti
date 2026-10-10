import { setOrderStatus } from "@/app/admin/(app)/objednavky/[id]/actions";
import { buttonClass } from "@/components/ui/button";

/** Tlačítko dalšího kroku objednávky (Potvrdit, Připraveno, Doručeno) pro seznam a rozvoz. */
export function OrderStep({ id, status, label, variant = "secondary" }: { id: string; status: string; label: string; variant?: "secondary" | "primary" }) {
  return (
    <form action={setOrderStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className={buttonClass(variant, "min-h-8 px-3 text-[11px]")}>
        {label}
      </button>
    </form>
  );
}
