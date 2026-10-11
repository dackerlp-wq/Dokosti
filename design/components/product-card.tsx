import Image from "next/image";
import Link from "next/link";
import { Clock } from "lucide-react";
import { Flag, StockStatus, type Stock } from "./badge";
import { Button } from "./button";

export type ProductCardProps = {
  id: string;
  href: string;
  title: string;
  /** Vyříznutá fotka na bílém nebo průhledném pozadí */
  image: string;
  /** Balení, např. "1,3 kg" */
  pack: string;
  /** Cena už naformátovaná, např. "149 Kč" */
  price: string;
  /** Původní cena u zboží v akci */
  oldPrice?: string;
  description?: string;
  stock: Stock;
  flags?: Array<"new" | "favourite" | "sale">;
  /** Server action pro vložení do košíku; dostane productId a quantity */
  addToCart?: (formData: FormData) => void | Promise<void>;
};

export function ProductCard({ id, href, title, image, pack, price, oldPrice, description, stock, flags = [], addToCart }: ProductCardProps) {
  const unavailable = stock.state === "out";
  return (
    <article className="group relative flex w-full flex-col rounded-card border border-line bg-white text-left shadow-card transition-[border-color,box-shadow] duration-300 ease-in-out hover:border-brick hover:shadow-card-hover">
      {unavailable ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center gap-3.5 rounded-card bg-overlay pt-20 text-center text-price text-white">
          <Clock className="size-14" strokeWidth={1.25} aria-hidden />
          Naskladňujeme
        </div>
      ) : null}

      {flags.length > 0 ? (
        <div className="absolute top-7.5 -left-px z-20 grid justify-items-start gap-1.25">
          {flags.slice(0, 2).map((kind) => (
            <Flag key={kind} kind={kind} />
          ))}
        </div>
      ) : null}

      <div className="relative mx-5 mt-5 h-50">
        <Image src={image} alt="" fill sizes="(min-width: 62rem) 380px, (min-width: 30rem) 50vw, 100vw" className="object-contain" />
      </div>

      <div className="flex flex-1 flex-col px-5 pt-6 pb-5">
        <h3 className="mb-2.5 line-clamp-2 text-heading-md text-green">
          {/* after: roztáhne odkaz přes fotku a text, patička s nákupem zůstává nad ním */}
          <Link href={href} className="transition-colors duration-300 after:absolute after:inset-x-0 after:top-0 after:bottom-20 after:z-10 group-hover:text-brick-text">
            {title}
          </Link>
        </h3>
        <p className="mb-1.25 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-small">
          <span>{pack}</span>
          <StockStatus stock={stock} />
        </p>
        {description ? <p className="mb-1.25 line-clamp-3">{description}</p> : null}

        <div className="mt-auto flex items-end justify-between gap-2.5 pt-2.5">
          <div>
            <div className="text-label whitespace-nowrap text-muted">{oldPrice ? <s className="font-normal">{oldPrice}</s> : "Cena:"}</div>
            <div className={`text-price whitespace-nowrap ${oldPrice ? "text-brick-text" : "text-green"}`}>{price}</div>
          </div>
          <form action={addToCart} className="relative z-20 flex items-center gap-1.25">
            <input type="hidden" name="productId" value={id} />
            <input
              name="quantity"
              inputMode="numeric"
              defaultValue={1}
              aria-label="Počet kusů"
              className="size-10 rounded-control border border-muted bg-white text-center text-body text-ink"
            />
            <span>ks</span>
            <Button type="submit" size="sm" disabled={unavailable}>
              Do košíku
            </Button>
          </form>
        </div>
      </div>
    </article>
  );
}
