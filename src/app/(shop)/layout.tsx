import { CartProvider } from "@/components/cart/cart-context";
import { Footer } from "@/components/layout/footer";
import { Header } from "@/components/layout/header";
import { getProducts } from "@/lib/products";

/** Katalog se přegeneruje nejpozději za minutu po změně v administraci. */
export const revalidate = 60;

export default async function ShopLayout({ children }: { children: React.ReactNode }) {
  const products = await getProducts();
  return (
    <CartProvider products={products}>
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </CartProvider>
  );
}
