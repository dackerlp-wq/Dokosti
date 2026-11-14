import { Document, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import { CONTRACT_LABEL, monthLabel, slugify, type PayrollItemRow, type PayrollMonthRow } from "@/lib/admin";
import { PDF_COLORS as C, PDF_LOGO, registerPdfFonts } from "@/lib/pdf/brand";
import type { PayslipEmployee } from "@/lib/payroll";
import type { Settings } from "@/lib/settings";

/**
 * Výplatní páska v PDF: jedna strana A4. Stejný rozpis jako páska na obrazovce (breakdown z položky mezd).
 * Orientační výpočet z interního systému; závazná je páska od účetní, a to se na dokumentu říká.
 */
export type PayslipData = {
  item: PayrollItemRow;
  month: PayrollMonthRow | null;
  employee: PayslipEmployee | null;
  shop: Settings["shop"];
};

const s = StyleSheet.create({
  page: { padding: 40, paddingBottom: 64, backgroundColor: "#ffffff", color: C.ink, fontFamily: "Archivo", fontSize: 10, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderBottomWidth: 1, borderBottomColor: C.line, paddingBottom: 12 },
  logo: { width: 100 },
  label: { fontFamily: "Archivo Narrow", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: C.brickText },
  labelMuted: { fontFamily: "Archivo Narrow", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: C.muted },
  h1: { fontFamily: "Fraunces", fontSize: 22, lineHeight: 1.2, color: C.green, marginTop: 2 },
  h2: { fontFamily: "Fraunces", fontSize: 13, lineHeight: 1.3, color: C.green, marginBottom: 4, marginTop: 14 },
  muted: { color: C.muted },
  grid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12, borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: C.paper, padding: 10 },
  cell: { width: "50%", paddingVertical: 2, paddingRight: 8 },
  table: { marginTop: 6, borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: "hidden" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 5, paddingHorizontal: 10 },
  trLast: { borderBottomWidth: 0 },
  trBase: { backgroundColor: C.paper },
  td: { flex: 1 },
  tdNum: { width: 110, textAlign: "right" },
  bold: { fontWeight: 600 },
  minus: { color: C.brickText },
  total: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 14, borderRadius: 8, backgroundColor: C.green, padding: 14 },
  totalLabel: { fontFamily: "Archivo Narrow", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: C.cream },
  totalSub: { color: C.cream, fontSize: 9, marginTop: 2 },
  big: { fontFamily: "Fraunces", fontSize: 28, lineHeight: 1.1, color: C.cream },
  note: { color: C.muted, fontSize: 8.5 },
  footer: { position: "absolute", left: 40, right: 40, bottom: 26, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, fontSize: 7.5, color: C.muted },
});

const czk = new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 });
const fmtH = (n: number) => Number(n).toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric", year: "numeric" }).format(new Date(iso));
const fmtDay = (day: string) => fmtDate(`${day}T12:00:00`);

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.cell}>
      <Text style={s.labelMuted}>{label}</Text>
      <Text>{value}</Text>
    </View>
  );
}

function PayslipPage({ item: r, month, employee: e, shop }: PayslipData) {
  const closed = month?.status === "uzavreny";
  const lines = (r.breakdown ?? []) as { label: string; amount: number; kind?: string }[];
  const hours = [`odpracováno ${fmtH(r.hours_work)} h`, Number(r.hours_vacation) > 0 && `dovolená ${fmtH(r.hours_vacation)} h`, Number(r.hours_sick) > 0 && `nemoc ${fmtH(r.hours_sick)} h`, Number(r.hours_holiday) > 0 && `svátek ${fmtH(r.hours_holiday)} h`].filter(Boolean).join(", ");
  const rate = r.monthly_salary_czk ? `${Number(r.monthly_salary_czk).toLocaleString("cs-CZ")} Kč/měsíc` : r.hourly_rate_czk ? `${Number(r.hourly_rate_czk).toLocaleString("cs-CZ")} Kč/h` : "—";
  const generated = r.payslip_generated_at ? fmtDate(r.payslip_generated_at) : fmtDate(new Date().toISOString());

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.label}>Výplatní páska{r.payslip_no ? ` · ${r.payslip_no}` : ""}</Text>
          <Text style={s.h1}>{monthLabel(r.month)}</Text>
          <Text style={s.muted}>{closed ? `Měsíc uzavřen${month?.closed_at ? ` ${fmtDate(month.closed_at)}` : ""}, orientační výpočet.` : "Předběžná páska, měsíc je ještě otevřený a čísla se mohou změnit."}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image nemá alt */}
          <Image src={PDF_LOGO} style={s.logo} />
          <Text style={[s.bold, { marginTop: 4 }]}>{shop.name}</Text>
          <Text style={s.muted}>{[shop.address, shop.city].filter(Boolean).join(", ")}</Text>
          {shop.ico ? <Text style={s.muted}>IČO {shop.ico}</Text> : null}
        </View>
      </View>

      <View style={s.grid}>
        <Cell label="Zaměstnanec" value={r.employee_name} />
        <Cell label="Smlouva" value={CONTRACT_LABEL[r.contract_type]} />
        {e?.position ? <Cell label="Pozice" value={e.position} /> : null}
        <Cell label="Prohlášení poplatníka" value={e?.tax_declaration ? "ano" : "ne"} />
        {e?.started_on ? <Cell label="Nástup" value={fmtDay(e.started_on)} /> : null}
        {e?.birth_date ? <Cell label="Datum narození" value={fmtDay(e.birth_date)} /> : null}
        <Cell label="Sazba" value={rate} />
        <Cell label="Hodiny" value={hours} />
        {e?.bank_account ? <Cell label="Účet pro výplatu" value={e.bank_account} /> : null}
      </View>

      <Text style={s.h2}>Výpočet</Text>
      <View style={s.table}>
        {lines.map((l, i) => (
          <View key={i} style={[s.tr, i === lines.length - 1 ? s.trLast : {}, l.kind === "base" ? s.trBase : {}]} wrap={false}>
            <Text style={[s.td, l.kind === "base" ? s.bold : {}, l.kind === "info" ? s.muted : {}]}>{l.label}</Text>
            <Text style={[s.tdNum, l.kind === "base" ? s.bold : {}, l.kind === "info" ? s.muted : {}, l.amount < 0 ? s.minus : {}]}>{l.kind === "info" && l.amount === 0 ? "" : czk.format(l.amount)}</Text>
          </View>
        ))}
      </View>

      <View style={s.total} wrap={false}>
        <View>
          <Text style={s.totalLabel}>K výplatě</Text>
          <Text style={s.totalSub}>{e?.bank_account ? `na účet ${e.bank_account}` : "čistá mzda"}</Text>
        </View>
        <Text style={s.big}>{czk.format(Number(r.net_czk))}</Text>
      </View>

      {r.note ? <Text style={[s.note, { marginTop: 10 }]}>Poznámka: {r.note}</Text> : null}

      <View style={s.footer} fixed>
        <Text>
          Orientační výpočet z interního systému {shop.name}, vygenerováno {generated} (podklady z {fmtDate(r.updated_at)}). Dovolená a svátek sazbou, nemoc 60 % sazby, daň bez progrese. Nezohledňuje slevy na děti, exekuce, průměrný
          výdělek pro náhrady a další individuální položky; závazná je výplatní páska od účetní.
        </Text>
        <Text style={{ marginTop: 3 }}>
          {shop.name} · {[shop.address, shop.city].filter(Boolean).join(", ")} · {shop.phone} · {shop.email}
        </Text>
      </View>
    </Page>
  );
}

/** Vykreslí výplatní pásku do PDF (Buffer). */
export async function renderPayslipPdf(data: PayslipData): Promise<Buffer> {
  registerPdfFonts();
  const doc = (
    <Document title={`Výplatní páska ${monthLabel(data.item.month)} · ${data.item.employee_name}`} author={data.shop.name} language="cs">
      <PayslipPage {...data} />
    </Document>
  );
  return Buffer.from(await renderToBuffer(doc));
}

/** Název souboru pásky: vyplatni-paska-2026-10-barbora-balazova.pdf (případně s číslem pásky). */
export function payslipFileName(item: Pick<PayrollItemRow, "month" | "employee_name" | "payslip_no">) {
  return `vyplatni-paska-${item.month}-${slugify(item.employee_name)}${item.payslip_no ? `-${item.payslip_no.toLowerCase()}` : ""}.pdf`;
}
