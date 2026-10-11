/** Jednoduchá tabulka pro administraci: bílá s linkou, hlavička verzálkami. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-card border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line text-left">
            {head.map((h) => (
              <th key={h} className="px-3.5 py-2.5 text-eyebrow font-semibold text-muted uppercase">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`px-3.5 py-2.5 align-top ${className}`}>{children}</td>;
}
