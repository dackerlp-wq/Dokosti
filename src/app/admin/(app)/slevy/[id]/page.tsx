import { notFound } from "next/navigation";
import { CouponForm } from "@/components/admin/coupon-form";
import type { CouponRow } from "@/lib/admin";
import { getAuthSupabase } from "@/lib/supabase/auth";

export default async function EditCouponPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await getAuthSupabase();
  const { data } = await db.from("coupons").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  const c = data as CouponRow;
  return (
    <>
      <h1>{c.code}</h1>
      <p className="mt-1 text-sm text-muted">Použito {c.used_count}×.</p>
      <div className="mt-5">
        <CouponForm coupon={c} />
      </div>
    </>
  );
}
