import Image from "next/image";

type Variant =
  | "barevne"
  | "negativ"
  | "jednobarevne"
  | "bez-podtitulu"
  | "bez-podtitulu-negativ"
  | "napis"
  | "napis-negativ"
  | "znak"
  | "znak-negativ";

/** Soubor a rozměry viewBoxu jednotlivých SVG, aby se logo nenatahovalo. */
const FILES: Record<Variant, { file: string; w: number; h: number }> = {
  barevne: { file: "dokosti-logo-barevne.svg", w: 689, h: 409 },
  negativ: { file: "dokosti-logo-negativ.svg", w: 689, h: 409 },
  jednobarevne: { file: "dokosti-logo-jednobarevne.svg", w: 689, h: 409 },
  "bez-podtitulu": { file: "dokosti-logo-bez-podtitulu.svg", w: 689, h: 349 },
  "bez-podtitulu-negativ": { file: "dokosti-logo-bez-podtitulu-negativ.svg", w: 689, h: 349 },
  napis: { file: "dokosti-napis.svg", w: 689, h: 250 },
  "napis-negativ": { file: "dokosti-napis-negativ.svg", w: 689, h: 250 },
  znak: { file: "dokosti-znak.svg", w: 680, h: 680 },
  "znak-negativ": { file: "dokosti-znak-negativ.svg", w: 680, h: 680 },
};

export function Logo({
  variant,
  width,
  className = "",
  priority,
}: {
  variant: Variant;
  width: number;
  className?: string;
  priority?: boolean;
}) {
  const { file, w, h } = FILES[variant];
  return (
    <Image
      src={`/brand/${file}`}
      alt="DoKosti BARF"
      width={width}
      height={Math.round((width * h) / w)}
      className={className}
      priority={priority}
    />
  );
}
