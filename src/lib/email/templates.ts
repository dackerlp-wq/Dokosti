import { PAYMENT_LABEL, SHIPPING_LABEL } from "@/lib/admin";
import { formatPrice } from "@/lib/format";
import { DAY_NAMES, type Settings } from "@/lib/settings";
import { INTERVAL_LABEL } from "@/lib/shipping";

/** Objednávka tak, jak ji vrací RPC order_for_email. */
export type OrderForEmail = {
  id: string;
  order_number: string;
  status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  street: string;
  city: string;
  zip: string;
  note: string;
  shipping_method: "odber" | "rozvoz" | "prepravce";
  payment_method: "karta" | "prevod" | "hotove";
  delivery_date: string | null;
  subtotal_czk: number;
  shipping_czk: number;
  total_czk: number;
  coupon_code: string | null;
  discount_czk: number;
  points_discount_czk: number;
  points_earned: number;
  created_at: string;
  items: { name: string; qty: number; unit_price_czk: number }[];
};

export type EmailMessage = { subject: string; html: string; text: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const day = new Intl.DateTimeFormat("cs-CZ", { weekday: "long", day: "numeric", month: "long" });
const fmtDay = (iso: string) => day.format(new Date(iso + "T12:00:00"));

/** Společný obal: krémový podklad, zelená hlavička, Georgia/Arial jako záloha za brandová písma. */
function layout(title: string, body: string, shop: Settings["shop"]) {
  return `<!doctype html><html lang="cs"><head><meta charset="utf-8"><title>${esc(title)}</title></head>
<body style="margin:0;background:#f3ecdd;font-family:Arial,Helvetica,sans-serif;color:#24221f;font-size:15px;line-height:1.5">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3ecdd"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="background:#1f3a2d;color:#f3ecdd;padding:20px 24px;border-radius:12px 12px 0 0">
<div style="font-family:Georgia,serif;font-size:26px;font-weight:bold">DoKosti</div>
<div style="font-size:11px;letter-spacing:0.15em;text-transform:uppercase;opacity:.85">BARF · krmivo pro psy a kočky</div></td></tr>
<tr><td style="background:#fbf7ee;padding:24px;border:1px solid #d9cfb8;border-top:0;border-radius:0 0 12px 12px">
<h1 style="font-family:Georgia,serif;font-size:22px;margin:0 0 12px">${esc(title)}</h1>
${body}
<p style="margin:24px 0 0;font-size:12px;color:#55645a;border-top:1px solid #d9cfb8;padding-top:12px">
${esc(shop.name)} · ${esc(shop.address)}, ${esc(shop.city)} · ${esc(shop.phone)} · ${esc(shop.email)}<br>
<span style="font-family:Georgia,serif">Poctivé do kosti.</span></p>
</td></tr></table></td></tr></table></body></html>`;
}

function itemsTable(o: OrderForEmail) {
  const rows = o.items
    .map(
      (i) =>
        `<tr><td style="padding:6px 0;border-bottom:1px solid #d9cfb8">${i.qty} × ${esc(i.name)}</td><td align="right" style="padding:6px 0;border-bottom:1px solid #d9cfb8;white-space:nowrap">${formatPrice(i.qty * i.unit_price_czk)}</td></tr>`,
    )
    .join("");
  const line = (l: string, v: string, strong = false, color = "") =>
    `<tr><td style="padding:4px 0;${color}">${l}</td><td align="right" style="padding:4px 0;white-space:nowrap;${strong ? "font-weight:bold;font-size:17px" : ""}${color}">${v}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0">${rows}
${line("Zboží", formatPrice(o.subtotal_czk))}
${o.discount_czk > 0 ? line(`Sleva ${esc(o.coupon_code ?? "")}`, "−" + formatPrice(o.discount_czk), false, "color:#9c4424") : ""}
${o.points_discount_czk > 0 ? line("Kostičky", "−" + formatPrice(o.points_discount_czk), false, "color:#9c4424") : ""}
${line("Doprava", o.shipping_czk === 0 ? "zdarma" : formatPrice(o.shipping_czk))}
${line("Celkem", formatPrice(o.total_czk), true)}
</table>`;
}

function itemsText(o: OrderForEmail) {
  const lines = o.items.map((i) => `${i.qty} × ${i.name}  ${formatPrice(i.qty * i.unit_price_czk)}`);
  lines.push(`Zboží: ${formatPrice(o.subtotal_czk)}`);
  if (o.discount_czk > 0) lines.push(`Sleva ${o.coupon_code}: −${formatPrice(o.discount_czk)}`);
  if (o.points_discount_czk > 0) lines.push(`Kostičky: −${formatPrice(o.points_discount_czk)}`);
  lines.push(`Doprava: ${o.shipping_czk === 0 ? "zdarma" : formatPrice(o.shipping_czk)}`);
  lines.push(`Celkem: ${formatPrice(o.total_czk)}`);
  return lines.join("\n");
}

function deliveryInfo(o: OrderForEmail, s: Settings) {
  switch (o.shipping_method) {
    case "odber":
      return `Objednávku připravíme k vyzvednutí v prodejně (${s.shop.address}, ${s.shop.city}). Dáme vědět, až bude nachystaná.`;
    case "rozvoz":
      return `Přivezeme ${o.delivery_date ? fmtDay(o.delivery_date) : "v domluvený den"}, ${s.shipping.rozvoz.window}, na adresu ${o.street}, ${o.zip} ${o.city}. Před příjezdem zavoláme.`;
    case "prepravce":
      return `Pošleme chlazeným přepravcem na adresu ${o.street}, ${o.zip} ${o.city}. Balíky odesíláme na začátku týdne, aby nestály přes víkend. O odeslání dáme vědět.`;
  }
}

function paymentInfo(o: OrderForEmail, s: Settings) {
  switch (o.payment_method) {
    case "prevod":
      return s.payment.prevod.bankAccount
        ? `Platba převodem: ${formatPrice(o.total_czk)} na účet ${s.payment.prevod.bankAccount}, variabilní symbol ${o.order_number.replace(/\D/g, "")}. Odesíláme po připsání.`
        : `Platba převodem: ${formatPrice(o.total_czk)}. Číslo účtu pošleme v dalším e-mailu.`;
    case "hotove":
      return `Zaplatíte ${formatPrice(o.total_czk)} na místě, hotově nebo kartou.`;
    case "karta":
      return `Platba kartou online: ${formatPrice(o.total_czk)}.`;
  }
}

/** Potvrzení objednávky zákazníkovi. */
export function orderConfirmation(o: OrderForEmail, s: Settings): EmailMessage {
  const title = `Objednávka ${o.order_number} je u nás`;
  const body = `<p>Dobrý den, ${esc(o.customer_name)},</p>
<p>děkujeme za objednávku. Tady je, co jste si vybrali:</p>
${itemsTable(o)}
<p><strong>Dodání:</strong> ${esc(SHIPPING_LABEL[o.shipping_method])}. ${esc(deliveryInfo(o, s))}</p>
<p><strong>Platba:</strong> ${esc(paymentInfo(o, s))}</p>
${o.note ? `<p><strong>Vaše poznámka:</strong> ${esc(o.note)}</p>` : ""}
${o.points_earned > 0 && s.loyalty.enabled ? `<p>Po doručení vám připíšeme <strong>${o.points_earned} Kostiček</strong>. Uplatníte je při příští objednávce.</p>` : ""}
<p>Kdyby něco nesedělo, zavolejte na ${esc(s.shop.phone)} nebo odpovězte na tento e-mail.</p>`;
  const text = `Dobrý den, ${o.customer_name},

děkujeme za objednávku ${o.order_number}.

${itemsText(o)}

Dodání: ${SHIPPING_LABEL[o.shipping_method]}. ${deliveryInfo(o, s)}
Platba: ${paymentInfo(o, s)}
${o.note ? `Vaše poznámka: ${o.note}\n` : ""}${o.points_earned > 0 && s.loyalty.enabled ? `Po doručení vám připíšeme ${o.points_earned} Kostiček.\n` : ""}
Kdyby něco nesedělo, zavolejte na ${s.shop.phone}.

${s.shop.name} · ${s.shop.address}, ${s.shop.city}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

/** Upozornění pro prodejnu na novou objednávku. */
export function orderNotification(o: OrderForEmail, s: Settings, adminUrl: string): EmailMessage {
  const title = `Nová objednávka ${o.order_number} · ${formatPrice(o.total_czk)}`;
  const body = `<p><strong>${esc(o.customer_name)}</strong> · <a href="tel:${esc(o.customer_phone)}">${esc(o.customer_phone)}</a> · ${esc(o.customer_email)}</p>
<p>${esc(SHIPPING_LABEL[o.shipping_method])}${o.delivery_date ? `, ${esc(fmtDay(o.delivery_date))}` : ""} · ${esc(PAYMENT_LABEL[o.payment_method])}
${o.street ? `<br>${esc(o.street)}, ${esc(o.zip)} ${esc(o.city)}` : ""}</p>
${itemsTable(o)}
${o.note ? `<p><strong>Poznámka:</strong> ${esc(o.note)}</p>` : ""}
<p><a href="${esc(adminUrl)}" style="display:inline-block;background:#1f3a2d;color:#f3ecdd;padding:10px 16px;border-radius:6px;text-decoration:none;font-size:13px;letter-spacing:.1em;text-transform:uppercase">Otevřít v administraci</a></p>`;
  const text = `Nová objednávka ${o.order_number}
${o.customer_name} · ${o.customer_phone} · ${o.customer_email}
${SHIPPING_LABEL[o.shipping_method]}${o.delivery_date ? `, ${fmtDay(o.delivery_date)}` : ""} · ${PAYMENT_LABEL[o.payment_method]}
${o.street ? `${o.street}, ${o.zip} ${o.city}\n` : ""}
${itemsText(o)}
${o.note ? `\nPoznámka: ${o.note}\n` : ""}
${adminUrl}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

/** E-mail při změně stavu. Vrací null, když se pro daný stav nic neposílá. */
export function statusUpdate(o: OrderForEmail, s: Settings, status: string): EmailMessage | null {
  let title: string;
  let msg: string;
  switch (status) {
    case "potvrzena":
      title = `Objednávku ${o.order_number} jsme potvrdili`;
      msg = `Vše máme skladem a chystáme. ${deliveryInfo(o, s)}`;
      break;
    case "pripravena":
      if (o.shipping_method === "odber") {
        title = `Objednávka ${o.order_number} je připravená k vyzvednutí`;
        msg = `Čeká na vás v mrazáku v prodejně (${s.shop.address}, ${s.shop.city}). Otevírací doba: ${s.shop.openingHours.map((h) => `${h.days} ${h.hours}`).join(", ")}.`;
      } else if (o.shipping_method === "rozvoz") {
        title = `Objednávku ${o.order_number} vezeme`;
        msg = `Vyrážíme ${o.delivery_date ? fmtDay(o.delivery_date) : "v domluvený den"}, ${s.shipping.rozvoz.window}. Před příjezdem zavoláme na ${o.customer_phone}.`;
      } else {
        title = `Objednávku ${o.order_number} jsme odeslali`;
        msg = `Balík je na cestě chlazeným přepravcem. Po doručení ho hned rozbalte a krmivo dejte do mrazáku.`;
      }
      break;
    case "zrusena":
      title = `Objednávka ${o.order_number} byla zrušena`;
      msg = `Objednávku jsme zrušili. Pokud jste už platili, peníze vrátíme. Kdyby šlo o omyl, ozvěte se na ${s.shop.phone}.`;
      break;
    default:
      return null;
  }
  const body = `<p>Dobrý den, ${esc(o.customer_name)},</p><p>${esc(msg)}</p><p>Děkujeme, ${esc(s.shop.name)}.</p>`;
  const text = `Dobrý den, ${o.customer_name},\n\n${msg}\n\nDěkujeme, ${s.shop.name}.`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

/** E-mail s plánem krmení v příloze (z kalkulačky). */
export function feedingPlanEmail(names: string[], planUrl: string, s: Settings): EmailMessage {
  const who = names.join(", ");
  const title = `Plán krmení: ${who}`;
  const body = `<p>Dobrý den,</p>
<p>v příloze posíláme plán krmení pro: <strong>${esc(who)}</strong>. Je to orientační výchozí hodnota podle doporučení FEDIAF; po dvou až čtyřech týdnech zvíře zvažte a plán přepočítejte.</p>
<p><a href="${esc(planUrl)}" style="color:#1f3a2d">Otevřít plán znovu v kalkulačce</a></p>
<p>Kdykoli se ozvěte, rádi poradíme.</p>`;
  const text = `Dobrý den,\n\nv příloze posíláme plán krmení pro: ${who}. Je to orientační výchozí hodnota podle doporučení FEDIAF; po dvou až čtyřech týdnech zvíře zvažte a plán přepočítejte.\n\nOtevřít plán znovu: ${planUrl}\n\n${s.shop.name}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

export type SubscriptionForEmail = { intervalDays: number; weekday: number; nextDate: string; manageUrl: string };

/** Potvrzení nastavení pravidelného odběru (posílá se spolu s potvrzením první objednávky). */
export function subscriptionCreated(o: OrderForEmail, s: Settings, sub: SubscriptionForEmail): EmailMessage {
  const title = "Pravidelný odběr je nastavený";
  const when = `${INTERVAL_LABEL[sub.intervalDays] ?? ""}, vždy v ${DAY_NAMES[sub.weekday]}`;
  const body = `<p>Dobrý den, ${esc(o.customer_name)},</p>
<p>stejný nákup jako v objednávce ${esc(o.order_number)} vám budeme posílat <strong>${esc(when)}</strong>. Další dodávka: <strong>${esc(fmtDay(sub.nextDate))}</strong>.</p>
<p>${s.subscription.reminderDaysBefore} dny před každou dodávkou vám napíšeme, co posíláme. Kdykoli můžete dodávku přeskočit, upravit množství, změnit interval nebo odběr zrušit:</p>
<p><a href="${esc(sub.manageUrl)}" style="display:inline-block;background:#1f3a2d;color:#f3ecdd;padding:10px 18px;border-radius:6px;text-decoration:none">Spravovat pravidelný odběr</a></p>
<p style="font-size:12px;color:#55645a">Odkaz si uložte, platí jen pro vás. Platí se za každou dodávku zvlášť, stejně jako u této objednávky.</p>`;
  const text = `Dobrý den, ${o.customer_name},\n\nstejný nákup jako v objednávce ${o.order_number} vám budeme posílat ${when}. Další dodávka: ${fmtDay(sub.nextDate)}.\n\nSpravovat (přeskočit, změnit, zrušit): ${sub.manageUrl}\n\n${s.shop.name}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

/** Připomínka před dodávkou z předplatného. */
export function subscriptionReminder(
  sub: { customer_name: string; next_date: string; items: { name: string | null; qty: number; price_czk: number | null; available: boolean | null }[]; shipping_method: "odber" | "rozvoz" | "prepravce" },
  s: Settings,
  manageUrl: string,
): EmailMessage {
  const title = `${fmtDay(sub.next_date)} vám ${sub.shipping_method === "odber" ? "chystáme" : "posíláme"} pravidelný nákup`;
  const rows = sub.items.map((i) => `<tr><td style="padding:4px 0;border-bottom:1px solid #d9cfb8">${i.qty} × ${esc(i.name ?? "položka")}${i.available === false ? " <span style=\"color:#9c4424\">(teď není skladem)</span>" : ""}</td><td align="right" style="padding:4px 0;border-bottom:1px solid #d9cfb8;white-space:nowrap">${i.price_czk != null ? formatPrice(i.qty * i.price_czk) : ""}</td></tr>`).join("");
  const total = sub.items.reduce((n, i) => n + (i.price_czk ?? 0) * i.qty, 0);
  const cutoff = s.subscription.cutoffDaysBefore;
  const body = `<p>Dobrý den, ${esc(sub.customer_name)},</p>
<p>${sub.shipping_method === "odber" ? "k vyzvednutí připravíme" : "přivezeme"} <strong>${esc(fmtDay(sub.next_date))}</strong>:</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0">${rows}
<tr><td style="padding:6px 0;font-weight:bold">Zboží${s.subscription.discountPct > 0 ? ` (před slevou ${s.subscription.discountPct} %)` : ""}</td><td align="right" style="padding:6px 0;font-weight:bold">${formatPrice(total)}</td></tr></table>
<p>Nic nemusíte dělat. Pokud tentokrát nechcete nic, nebo chcete upravit množství, stačí kliknout, a to do ${cutoff === 0 ? "dne dodání" : cutoff === 1 ? "zítřka" : `${cutoff} dnů před dodáním`}:</p>
<p><a href="${esc(manageUrl)}" style="display:inline-block;background:#1f3a2d;color:#f3ecdd;padding:10px 18px;border-radius:6px;text-decoration:none">Přeskočit nebo upravit</a></p>`;
  const text = `Dobrý den, ${sub.customer_name},\n\n${fmtDay(sub.next_date)} ${sub.shipping_method === "odber" ? "připravíme k vyzvednutí" : "přivezeme"}:\n${sub.items.map((i) => `${i.qty} × ${i.name ?? "položka"}`).join("\n")}\n\nPřeskočit nebo upravit: ${manageUrl}\n\n${s.shop.name}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}

/** Prodejně: objednávku z předplatného se nepodařilo vytvořit. */
export function subscriptionFailed(sub: { customer_name: string; customer_email: string; next_date: string }, error: string, s: Settings, adminUrl: string): EmailMessage {
  const title = `Předplatné ${sub.customer_name}: objednávka nevznikla`;
  const body = `<p>Dodávku ${esc(fmtDay(sub.next_date))} pro ${esc(sub.customer_name)} (${esc(sub.customer_email)}) se nepodařilo objednat: <strong>${esc(error)}</strong>.</p>
<p>Předplatné jsme pozastavili. Domluvte se se zákazníkem a v administraci ho obnovte.</p>
<p><a href="${esc(adminUrl)}" style="color:#1f3a2d">Otevřít předplatné v administraci</a></p>`;
  const text = `Dodávku ${fmtDay(sub.next_date)} pro ${sub.customer_name} (${sub.customer_email}) se nepodařilo objednat: ${error}. Předplatné je pozastavené.\n${adminUrl}`;
  return { subject: title, html: layout(title, body, s.shop), text };
}
