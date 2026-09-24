import Image from "next/image";
import { Bone } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { productName } from "@/lib/catalog";

/** Fotka produktu 1:1 na krémové. Bez fotky se ukáže zástupná plocha. */
export function ProductImage({ product, sizes }: { product: Product; sizes: string }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-[var(--radius-card)] bg-cream">
      {product.image ? (
        <Image src={product.image} alt={productName(product)} fill sizes={sizes} className="object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-line">
          <Bone strokeWidth={1.75} className="h-1/4 w-1/4" aria-hidden />
          <span className="sr-only">Fotka bude doplněna</span>
        </div>
      )}
    </div>
  );
}
