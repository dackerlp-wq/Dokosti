import type { ContractType } from "@/lib/admin";

/**
 * Orientační výpočet mzdy z docházky a sazby. Jeden zdroj pro tabulku Mzdy i pásku.
 * Oficiální mzdy počítá účetní; tenhle výpočet dává podklad a kontrolu řádu.
 * Zjednodušení: dovolená a svátek se platí sazbou (ne průměrem), nemoc 60 % sazby,
 * daň 15 % bez progrese, odvody podle parametrů roku.
 */
export type PayrollParams = {
  year: number;
  min_wage_czk: number;
  dpp_limit_czk: number;
  dpc_limit_czk: number;
  tax_rate_pct: number;
  tax_credit_czk: number;
  emp_social_pct: number;
  emp_health_pct: number;
  er_social_pct: number;
  er_health_pct: number;
  verified: boolean;
  note: string;
};

export type PayrollInput = {
  contract: ContractType;
  hourlyRate: number | null;
  monthlySalary: number | null;
  hoursWork: number;
  hoursVacation: number;
  hoursSick: number;
  hoursHoliday: number;
  bonus: number;
  deduction: number;
  taxDeclaration: boolean;
};

export type BreakdownLine = { label: string; amount: number; kind?: "base" | "minus" | "plus" | "info" };
export type PayrollResult = {
  gross: number;
  empLevies: number;
  tax: number;
  net: number;
  erLevies: number;
  employerCost: number;
  leviesApply: boolean;
  breakdown: BreakdownLine[];
  warnings: string[];
};

const r0 = (n: number) => Math.round(n);
const up = (n: number) => Math.ceil(n - 1e-9);

export function computePayroll(p: PayrollParams, i: PayrollInput): PayrollResult {
  const lines: BreakdownLine[] = [];
  const warnings: string[] = [];
  const rate = Number(i.hourlyRate ?? 0);
  const salary = Number(i.monthlySalary ?? 0);
  let base = 0;

  if (i.contract === "osvc") {
    base = salary > 0 ? salary : r0(rate * i.hoursWork);
    lines.push({ label: salary > 0 ? "Paušální odměna (faktura)" : `Odměna ${fmtH(i.hoursWork)} h × ${rate} Kč (faktura)`, amount: base, kind: "base" });
  } else if (salary > 0) {
    base = salary;
    lines.push({ label: "Měsíční mzda", amount: base, kind: "base" });
    if (i.hoursSick > 0) warnings.push("Nemoc u měsíční mzdy není v odhadu krácena, přesně spočítá účetní.");
  } else {
    const work = r0(rate * i.hoursWork);
    base += work;
    lines.push({ label: `Odpracováno ${fmtH(i.hoursWork)} h × ${rate} Kč`, amount: work, kind: "base" });
    if (i.hoursVacation > 0) {
      const v = r0(rate * i.hoursVacation);
      base += v;
      lines.push({ label: `Dovolená ${fmtH(i.hoursVacation)} h`, amount: v, kind: "plus" });
    }
    if (i.hoursHoliday > 0) {
      const h = r0(rate * i.hoursHoliday);
      base += h;
      lines.push({ label: `Svátek ${fmtH(i.hoursHoliday)} h`, amount: h, kind: "plus" });
    }
    if (i.hoursSick > 0 && i.contract !== "dpp") {
      const s = r0(rate * i.hoursSick * 0.6);
      base += s;
      lines.push({ label: `Nemoc ${fmtH(i.hoursSick)} h (60 %)`, amount: s, kind: "plus" });
      warnings.push("Náhrada za nemoc je spočítána zjednodušeně (60 % sazby), přesně spočítá účetní.");
    }
    if (rate <= 0 && i.hoursWork > 0) warnings.push("Zaměstnanec nemá sazbu, doplňte ji na kartě.");
  }
  if (i.bonus > 0) {
    base += i.bonus;
    lines.push({ label: "Odměna / příplatek", amount: i.bonus, kind: "plus" });
  }
  if (i.deduction > 0) {
    base -= i.deduction;
    lines.push({ label: "Srážka", amount: -i.deduction, kind: "minus" });
  }
  const gross = Math.max(0, r0(base));
  lines.push({ label: "Hrubá mzda", amount: gross, kind: "base" });

  if (i.contract === "osvc") {
    return { gross, empLevies: 0, tax: 0, net: gross, erLevies: 0, employerCost: gross, leviesApply: false, breakdown: [...lines, { label: "K úhradě (faktura)", amount: gross, kind: "base" }], warnings: [...warnings, "OSVČ fakturuje, odvody a daň si řeší sama."] };
  }

  const limit = i.contract === "dpp" ? p.dpp_limit_czk : i.contract === "dpc" ? p.dpc_limit_czk : 0;
  const leviesApply = i.contract === "hpp" || i.contract === "jednatel" || gross >= limit;
  let empLevies = 0;
  let erLevies = 0;
  if (leviesApply) {
    const soc = up((gross * p.emp_social_pct) / 100);
    const health = up((gross * p.emp_health_pct) / 100);
    empLevies = soc + health;
    lines.push({ label: `Sociální pojištění ${p.emp_social_pct} %`, amount: -soc, kind: "minus" });
    lines.push({ label: `Zdravotní pojištění ${p.emp_health_pct} %`, amount: -health, kind: "minus" });
    if (i.contract === "hpp" && gross < p.min_wage_czk && gross > 0) {
      const extra = up(((p.min_wage_czk - gross) * (p.emp_health_pct + p.er_health_pct)) / 100);
      empLevies += extra;
      lines.push({ label: "Doplatek zdravotního do minimální mzdy", amount: -extra, kind: "minus" });
      warnings.push("Hrubá mzda je pod minimální mzdou, zdravotní pojištění se dopočítává z minima.");
    }
    erLevies = up((gross * p.er_social_pct) / 100) + up((gross * p.er_health_pct) / 100);
  } else if (gross > 0) {
    lines.push({ label: `Bez odvodů (${i.contract === "dpp" ? "DPP" : "DPČ"} pod ${fmtK(limit)} Kč)`, amount: 0, kind: "info" });
  }

  let tax = 0;
  if (gross > 0) {
    if (i.taxDeclaration) {
      const taxBase = Math.ceil(gross / 100) * 100;
      const raw = up((taxBase * p.tax_rate_pct) / 100);
      tax = Math.max(0, raw - p.tax_credit_czk);
      lines.push({ label: `Záloha na daň ${p.tax_rate_pct} % ze ${fmtK(taxBase)} Kč`, amount: -raw, kind: "minus" });
      lines.push({ label: "Sleva na poplatníka", amount: Math.min(raw, p.tax_credit_czk), kind: "plus" });
    } else if (!leviesApply) {
      tax = Math.floor((gross * p.tax_rate_pct) / 100);
      lines.push({ label: `Srážková daň ${p.tax_rate_pct} % (bez prohlášení)`, amount: -tax, kind: "minus" });
    } else {
      const taxBase = Math.ceil(gross / 100) * 100;
      tax = up((taxBase * p.tax_rate_pct) / 100);
      lines.push({ label: `Záloha na daň ${p.tax_rate_pct} % (bez prohlášení)`, amount: -tax, kind: "minus" });
    }
  }
  const net = Math.max(0, gross - empLevies - tax);
  lines.push({ label: "Čistá mzda k výplatě", amount: net, kind: "base" });
  if (erLevies > 0) lines.push({ label: `Odvody zaměstnavatele ${p.er_social_pct + p.er_health_pct} %`, amount: erLevies, kind: "info" });
  lines.push({ label: "Celkové náklady zaměstnavatele", amount: gross + erLevies, kind: "info" });
  if (!p.verified) warnings.push(`Parametry roku ${p.year} nejsou potvrzené účetní.`);
  return { gross, empLevies, tax, net, erLevies, employerCost: gross + erLevies, leviesApply, breakdown: lines, warnings };
}

function fmtH(n: number) {
  return n.toLocaleString("cs-CZ", { maximumFractionDigits: 2 });
}
function fmtK(n: number) {
  return Math.round(n).toLocaleString("cs-CZ");
}

/** Součty hodin z docházky pro jednoho člověka a měsíc. */
export function sumHours(rows: { kind: string; hours: number | null }[]) {
  const s = { hoursWork: 0, hoursVacation: 0, hoursSick: 0, hoursHoliday: 0 };
  for (const r of rows) {
    const h = Number(r.hours ?? 0);
    if (r.kind === "prace") s.hoursWork += h;
    else if (r.kind === "dovolena") s.hoursVacation += h;
    else if (r.kind === "nemoc") s.hoursSick += h;
    else if (r.kind === "svatek") s.hoursHoliday += h;
  }
  return s;
}
