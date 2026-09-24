import { ProductForm } from "@/components/admin/product-form";

export default function NewProductPage() {
  return (
    <>
      <h1>Nový produkt</h1>
      <div className="mt-5">
        <ProductForm />
      </div>
    </>
  );
}
