/** Sdílená pracovní tabulka: rychlé skenování řádků a jasná hlavička ve všech částech administrace. */
export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <div className="admin-table overflow-x-auto rounded-xl border border-line bg-white">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-line bg-[#f7f9f7] text-left">
            {head.map((h) => (
              <th key={h} scope="col" className="whitespace-nowrap px-3.5 py-3 text-[10px] font-bold tracking-[.08em] text-muted uppercase">
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
  return <td className={`px-3.5 py-3 align-middle ${className}`}>{children}</td>;
}
