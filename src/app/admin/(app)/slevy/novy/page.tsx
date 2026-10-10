import { CouponForm } from "@/components/admin/coupon-form";
import { requireManager } from "@/lib/supabase/auth";

export default async function NewCouponPage() {
  await requireManager();
  return (
    <>
      <h1>Nový slevový kód</h1>
      <div className="mt-5">
        <CouponForm />
      </div>
    </>
  );
}
