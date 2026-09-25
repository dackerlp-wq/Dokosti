import { Document, Font, Image, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer";
import path from "node:path";
import { STAGE_LABEL, TRANSITION_STEPS, weeklySchedule, type Plan } from "@/lib/barf";
import { productName } from "@/lib/catalog";
import type { Settings } from "@/lib/settings";

/**
 * Plán krmení v PDF: jedna strana A4 na zvíře. Písma a barvy podle BRAND.md,
 * soubory písem jsou v public/fonts (statické řezy z Google Fonts).
 */
const fontsDir = path.join(process.cwd(), "public", "fonts");
let registered = false;
function registerFonts() {
  if (registered) return;
  Font.register({ family: "Fraunces", src: path.join(fontsDir, "fraunces-600.ttf"), fontWeight: 600 });
  Font.register({
    family: "Archivo",
    fonts: [
      { src: path.join(fontsDir, "archivo-400.ttf"), fontWeight: 400 },
      { src: path.join(fontsDir, "archivo-600.ttf"), fontWeight: 600 },
    ],
  });
  Font.register({ family: "Archivo Narrow", src: path.join(fontsDir, "archivo-narrow-500.ttf"), fontWeight: 500 });
  Font.registerHyphenationCallback((w) => [w]);
  registered = true;
}

const C = { green: "#1f3a2d", cream: "#f3ecdd", paper: "#fbf7ee", brick: "#b5532f", brickText: "#9c4424", ink: "#24221f", muted: "#55645a", line: "#d9cfb8" };

const s = StyleSheet.create({
  page: { padding: 36, paddingBottom: 60, backgroundColor: C.paper, color: C.ink, fontFamily: "Archivo", fontSize: 10, lineHeight: 1.4 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  logo: { width: 110 },
  label: { fontFamily: "Archivo Narrow", fontSize: 8, letterSpacing: 1.2, textTransform: "uppercase", color: C.brickText },
  h1: { fontFamily: "Fraunces", fontSize: 22, lineHeight: 1.2, color: C.green, marginTop: 2, marginBottom: 2 },
  h2: { fontFamily: "Fraunces", fontSize: 13, lineHeight: 1.3, color: C.green, marginBottom: 4, marginTop: 12 },
  muted: { color: C.muted },
  box: { borderWidth: 1, borderColor: C.line, borderRadius: 8, backgroundColor: C.cream, padding: 10, marginTop: 6 },
  row: { flexDirection: "row", gap: 10 },
  big: { fontFamily: "Fraunces", fontSize: 26, lineHeight: 1.2, color: C.green, marginBottom: 2 },
  bar: { flexDirection: "row", height: 8, borderRadius: 4, overflow: "hidden", marginTop: 6, borderWidth: 1, borderColor: C.line },
  table: { marginTop: 6, borderWidth: 1, borderColor: C.line, borderRadius: 8, overflow: "hidden" },
  tr: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: C.line, paddingVertical: 4, paddingHorizontal: 8 },
  trLast: { borderBottomWidth: 0 },
  tdDay: { width: 64, fontFamily: "Archivo Narrow", fontSize: 9, letterSpacing: 0.8, textTransform: "uppercase", color: C.green, paddingTop: 1 },
  tdItems: { flex: 1 },
  line: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  note: { color: C.muted, fontSize: 8.5 },
  warn: { color: C.brickText },
  step: { width: "31%", borderWidth: 1, borderColor: C.line, borderRadius: 8, padding: 8, backgroundColor: C.cream },
  footer: { position: "absolute", left: 36, right: 36, bottom: 24, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 6, fontSize: 7.5, color: C.muted },
});

const fmtKg = (g: number) => (g >= 1000 ? `${(g / 1000).toFixed(1).replace(".", ",")} kg` : `${g} g`);

function AnimalPage({ plan, shop, logo }: { plan: Plan; shop: Settings["shop"]; logo: string }) {
  const { input: a, result: r } = plan;
  const who = a.name || (a.species === "pes" ? "Pes" : "Kočka");
  const perMeal = Math.round(r.dailyGrams / r.mealsPerDay / 5) * 5;
  const week = weeklySchedule(plan);
  const comp = r.composition;
  const parts = [
    { v: comp.muscle, c: C.green, l: "svalovina" },
    { v: comp.bone, c: C.brick, l: "kost" },
    { v: comp.liver, c: C.brickText, l: "játra" },
    { v: comp.organs, c: "#2b4d3c", l: "vnitřnosti" },
    { v: comp.plant, c: C.line, l: "zelenina" },
  ].filter((p) => p.v > 0);
  const today = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "long", year: "numeric" }).format(new Date());

  return (
    <Page size="A4" style={s.page}>
      <View style={s.header}>
        <View>
          <Text style={s.label}>Plán krmení · {today}</Text>
          <Text style={s.h1}>{who}</Text>
          <Text style={s.muted}>
            {STAGE_LABEL[a.species][a.stage]} · {a.weightKg} kg{a.condition !== "idealni" ? ` · cílová hmotnost ${r.idealKg} kg` : ""}
            {a.stage === "mlade" && a.ageMonths ? ` · ${a.ageMonths} měs.` : ""}
          </Text>
        </View>
        {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image nemá alt */}
        <Image src={logo} style={s.logo} />
      </View>

      <View style={[s.box, s.row]}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Denně</Text>
          <Text style={s.big}>{r.dailyGrams} g</Text>
          <Text style={s.muted}>
            rozmezí {r.rangeGrams[0]}–{r.rangeGrams[1]} g · {r.pct} % hmotnosti
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Porce</Text>
          <Text style={s.big}>
            {r.mealsPerDay} × {perMeal} g
          </Text>
          <Text style={s.muted}>{fmtKg(r.dailyGrams * 7)} týdně{r.kibbleKcal > 0 ? ` · plus granule ${r.kibbleGrams ? `${r.kibbleGrams} g` : `${r.kibbleKcal} kcal`} denně` : ""}</Text>
        </View>
        <View style={{ flex: 1.3 }}>
          <Text style={s.label}>Cílové složení</Text>
          <View style={s.bar}>
            {parts.map((p) => (
              <View key={p.l} style={{ width: `${p.v}%`, backgroundColor: p.c }} />
            ))}
          </View>
          <Text style={[s.muted, { marginTop: 4, fontSize: 8.5 }]}>{parts.map((p) => `${p.l} ${p.v} %`).join(" · ")}</Text>
        </View>
      </View>

      <Text style={s.h2}>Týden v misce</Text>
      <View style={s.table}>
        {week.map((d, i) => (
          <View key={d.day} style={[s.tr, i === week.length - 1 ? s.trLast : {}]} wrap={false}>
            <Text style={s.tdDay}>{d.label}</Text>
            <View style={s.tdItems}>
              {d.items.length === 0 && <Text style={s.muted}>stavte se pro mix, zrovna nic není skladem</Text>}
              {d.items.map((it, j) => (
                <View key={j} style={s.line}>
                  <Text>
                    {productName(it.product)}
                    {it.note ? <Text style={s.note}> · {it.note}</Text> : null}
                  </Text>
                  <Text>{it.grams > 0 ? `${it.grams} g` : ""}</Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
      <Text style={[s.note, { marginTop: 4 }]}>Pamlsky počítejte do denní dávky, nejvýš desetina. Pořadí dnů můžete libovolně prohodit, důležitý je součet za týden.</Text>

      {plan.notes.length > 0 && (
        <View style={{ marginTop: 8 }}>
          {plan.notes.map((n, i) => (
            <Text key={i} style={[s.note, n.kind === "warn" ? s.warn : {}, { marginBottom: 2 }]}>
              • {n.text}
            </Text>
          ))}
        </View>
      )}

      {a.beginner && (
        <View>
          <Text style={s.h2} minPresenceAhead={90}>
            Přechod krok za krokem
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {TRANSITION_STEPS.map((st) => (
              <View key={st.when} style={s.step} wrap={false}>
                <Text style={s.label}>{st.when}</Text>
                <Text style={{ fontWeight: 600, marginTop: 1 }}>{st.title}</Text>
                <Text style={s.note}>{st.text}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={s.footer} fixed>
        <Text>
          Orientační výchozí hodnota pro zdravé zvíře podle doporučení FEDIAF. Dávku upravujte podle kondice: žebra hmatatelná lehkým tlakem, pas viditelný
          shora. Po 2–4 týdnech zvíře zvažte a plán přepočítejte na {shop.name.toLowerCase().includes("dokosti") ? "dokosti.vercel.app/kalkulacka" : "webu"}. U štěňat velkých plemen, březích a kojících zvířat a při
          jakémkoli onemocnění se poraďte s veterinářem. Kosti vždy syrové, pod dohledem, ve velikosti podle zvířete. Rozmrazujte v lednici, rozmražené spotřebujte do dvou dnů.
        </Text>
        <Text style={{ marginTop: 3 }}>
          {shop.name} · {shop.address}, {shop.city} · {shop.phone} · {shop.email} · Poctivé do kosti.
        </Text>
      </View>
    </Page>
  );
}

/** Vykreslí plán krmení pro jedno nebo více zvířat do PDF (Buffer). */
export async function renderPlanPdf(plans: Plan[], shop: Settings["shop"]): Promise<Buffer> {
  registerFonts();
  const logo = path.join(process.cwd(), "public", "brand", "dokosti-logo-barevne-na-kremove.png");
  const doc = (
    <Document title={`Plán krmení · ${plans.map((p) => p.input.name || (p.input.species === "pes" ? "pes" : "kočka")).join(", ")}`} author={shop.name} language="cs">
      {plans.map((p) => (
        <AnimalPage key={p.input.id} plan={p} shop={shop} logo={logo} />
      ))}
    </Document>
  );
  return Buffer.from(await renderToBuffer(doc));
}
