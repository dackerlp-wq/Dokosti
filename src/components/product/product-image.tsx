import Image from "next/image";
import { Bone } from "lucide-react";
import type { Product } from "@/lib/catalog";
import { productName } from "@/lib/catalog";

/**
 * Fotka produktu: vyříznutá, na bílé, bez rámečku (`object-contain`). Výška plochy je na rodiči (`h-50` na kartě).
 * Bez fotky se ukáže prázdná plocha v cream.
 */
export function ProductImage({ product, sizes, className = "h-50", priority }: { product: Product; sizes: string; className?: string; priority?: boolean }) {
  return (
    <div className={`relative w-full ${className}`}>
      {product.image ? (
        <Image src={product.image} alt={productName(product)} fill sizes={sizes} priority={priority} className="object-contain" />
      ) : (
        <div className="mx-auto flex h-full max-w-full items-center justify-center rounded-card bg-cream text-line" style={{ aspectRatio: "1 / 1" }}>
          <Bone strokeWidth={1.5} className="size-1/4" aria-hidden />
          <span className="sr-only">Fotka bude doplněna</span>
        </div>
      )}
    </div>
  );
}
