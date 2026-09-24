type Kind = "novinka" | "sleva" | "skladem" | "neutral";

const styles: Record<Kind, string> = {
  novinka: "bg-ochre-badge text-ink",
  sleva: "bg-brick text-cream",
  skladem: "bg-green text-cream",
  neutral: "bg-paper text-muted border border-line",
};

export function Badge({ kind = "neutral", children }: { kind?: Kind; children: React.ReactNode }) {
  return (
    <span className={`label inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] ${styles[kind]}`}>
      {children}
    </span>
  );
}
