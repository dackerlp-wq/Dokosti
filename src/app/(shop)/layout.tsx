import { CartProvider } from "@/components/cart/cart-context";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { buildCategoryMenu } from "@/lib/menu";
import { getProducts } from "@/lib/products";

/** Katalog se přegeneruje nejpozději za minutu po změně v administraci. */
export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  // Do prohlížeče jde jen to, co košík a hledání potřebují; dlouhé texty by zbytečně zvětšily každou stránku.
  const full = await getProducts();
  const products = full.map((p) => ({ ...p, intro: "", composition: "", storageNote: "", dosage: "" }));
  const menu = buildCategoryMenu(full);
  return (
    <CartProvider products={products}>
      <Header products={products} menu={menu} />
      <main className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  );
}
