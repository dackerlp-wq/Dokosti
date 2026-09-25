import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return (
    <>
      <h1>Nový slevový kód</h1>
      <div className="mt-5">
        <CouponForm />
      </div>
    </>
  );
}
