# DoKosti — design systém e-shopu

Pravidla pro každou práci na vzhledu dokosti.cz: komponenty, stránky, styly, texty v rozhraní. Stack: Next.js (App Router), TypeScript, Tailwind CSS v4.

## Směr

> **Platí od 31. 10. 2026:** styl „krémová, zelená, terakota“ podle schváleného návrhu hlavní stránky. Kde se níže uvedené recepty liší (bílá stránka, Amatic SC, Montserrat, rohy 3 px), platí tato část a tokeny v `dokosti-theme.css`.

E-shop je teplý obchod, který prodává očima: velké plochy s fotkou nebo ikonou, málo textu.

1. **Krémová stránka, bílé karty.** Tělo stránky je `paper` (#faf8f5), karty a panely `white` s linkou `line`. Hero má jemný přechod `cream` → `paper`. Zelená plocha nejvýš jedna na stránku.
2. **Jedna terakotová akce.** `bg-brick` (#c85a28) patří tlačítku, které vede k nákupu. Ostatní akce jsou `green` (#2a382e), obrys nebo odkaz v `brick-text`.
3. **Patkové titulky, bezpatkový text.** Fraunces (`font-display`) nese nadpisy, titulky sekcí a ceny na kartách; kurzíva v terakotě pro zvýraznění části H1. Všechno ostatní je Inter.
4. **Oblé tvary.** Ovládací prvky `rounded-control` (12 px), karty `rounded-card` (20 px), velké plochy a dlaždice `rounded-panel` (24 px), štítky oblé (`rounded-full`).
5. **Málo textu.** Hlavní stránka: H1 + jedna věta, dlaždice kategorií jen s názvem, produkty bez popisu. Předplatné netlačíme, jmenuje se „Krmení na míru“.
6. **Na rovinu.** Text říká, co v balíčku je a jak se k zákazníkovi dostane. Bez superlativů.

## Než začneš

1. Otevři globální stylesheet (obvykle `app/globals.css`) a zjisti, jestli už obsahuje tokeny z části „Theme“ na konci tohoto dokumentu. Pokud ne, nahraď stávající blok `@theme` obsahem `dokosti-theme.css` a v `app/layout.tsx` nasaď písma podle `fonts.ts`.
2. Projdi existující komponenty (`components/`). Když komponenta pro daný účel existuje, **přestav ji podle receptů níže, nezakládej duplicitní**. Referenční implementace jsou v `design/components/`, pokud je sada v repozitáři; přizpůsob je datovému modelu a konvencím projektu. Když tam nejsou, postav komponenty podle receptů.
3. Zjisti, jakou sadu ikon projekt používá. Když žádnou, použij `lucide-react`.
4. Loga jsou v `public/brand/` (`dokosti-napis.svg`, `dokosti-logo-bez-podtitulu.svg`, `dokosti-logo-barevne.svg`, `dokosti-logo-negativ.svg`). Nepřekresluj je a nesázej je písmem.

### Co se mění oproti dosavadnímu vzhledu

Stav zjištěný na živém webu 11. 10. 2026; ověř v kódu.

| Dosud | Nově |
| --- | --- |
| Tělo stránky `cream`, sekce `bg-cream` / `bg-paper` | Tělo `white`, sekce střídají `bg-white` / `bg-paper` |
| Tmavý hero `bg-green text-cream` | Hero na bílé, fotka vlevo, text vpravo |
| Fraunces (titulky), Archivo (text), Archivo Narrow (štítky) | Amatic SC (titulky), Montserrat (vše ostatní) |
| Tlačítka: třída `label`, verzálky 12 px, prostrkané | Tlačítka `text-button` 14 px tučně, bez verzálek |
| Text tlačítka `cream` na `brick` | `white` na `brick` (cream má jen 4,2:1) |
| `--radius-control: 6px`, `--radius-card: 12px` | Obojí 3 px; 10 px jen plovoucí menu |
| Karta `bg-paper p-2.5`, tlačítko „Do košíku“ bez volby množství | Karta `bg-white`, fotka 200 px, pole množství vedle tlačítka „Do košíku“ |
| Štítek Novinka jako pilulka `rounded-full` | Praporek přilepený k levé hraně karty |

## Barvy

| Token | Hex | Použití | Text na ní |
| --- | --- | --- | --- |
| `white` | `#ffffff` | stránka, hlavička, karty, pole | `muted`, `ink`, `green`, `brick-text` |
| `paper` | `#fbf7ee` | střídavý pruh sekce, tlačítka krokovače | stejně |
| `cream` | `#f3ecdd` | výjimečný teplý pruh; text na `green` | stejně |
| `line` | `#d9cfb8` | dekorativní linky a okraj karet | — |
| `green` | `#1f3a2d` | nadpisy, ceny, navigace, patička, ikonové disky, tmavé tlačítko | `cream`, `white` |
| `green-hover` | `#2b4d3c` | hover tmavých ploch | `cream` |
| `brick` | `#b5532f` | hlavní tlačítko, štítek Akce, počet v košíku | jen `white` |
| `brick-text` | `#9c4424` | odkazy, cena v akci, chyba, hover cihlového tlačítka | `white` |
| `ochre` | `#c8892b` | oznamovací lišta, drobné dekorace | jen `ink` |
| `ochre-badge` | `#e9c98f` | praporek Novinka | `ink` |
| `olive` | `#7a8c3a` | jen tečka „Skladem“ vedle slova | — |
| `ink` | `#24221f` | tučné zvýraznění, text na okrové | — |
| `muted` | `#55645a` | běžný text, popisky, okraj polí | — |
| `overlay` | `rgb(31 58 45 / 0.8)` | překryv nedostupného produktu | `white` |

Pravidla:

- Odstavce `text-muted`, zvýraznění `text-ink`, nadpisy a ceny `text-green`, odkazy `text-brick-text`.
- `brick` je výplň, ne barva drobného textu. `ochre` a `olive` nejsou barvy textu.
- Okraj karet `border-line`; okraj polí a krokovače `border-muted`.
- Stav skladu vždy slovo + značka jiného tvaru (tečka, kosočtverec, kroužek), nikdy jen barva.
- Fokus: obrys 2 px `green`, odsazení 2 px; na `green` ploše `cream`.
- Tmavý režim není.

## Písmo

| Utility | Velikost / řádek / váha | Použití |
| --- | --- | --- |
| `font-display text-display-xl` | 70 / 77 / 700 | H1 v hero, název v detailu produktu (mobil: `text-display-lg`) |
| `font-display text-display-lg` | 50 / 55 / 700 | titulek sekce (mobil: `text-display-md`, 40 / 44) |
| `font-display text-display-sm` | 25 / 27,5 / 700 | titulek rozbalovacího panelu |
| `text-heading-lg` | 25 / 27,5 / 700 | nadpis dlaždice, mezititulek v obsahu |
| `text-heading-md` | 20 / 22 / 800 | název produktu na kartě |
| `text-price-lg` | 25 / 32,5 / 700 | cena v detailu |
| `text-price` | 20 / 20 / 700 | cena na kartě |
| `text-body` | 16 / 28 / 400 | odstavce (výchozí na `body`) |
| `text-bar uppercase` | 15 / 26 / 700 | oznamovací lišta |
| `text-label` | 15 / 21 / 600 | popisek ceny a polí |
| `text-nav` | 14 / 17 / 700 | navigace |
| `text-button` | 14 / 24,5 / 700 | tlačítka, odkaz se šipkou |
| `text-eyebrow uppercase` | 13 / 23 / 600, prostrkání 1,9 px | nadtitulek sekce |
| `text-small` | 13 / 23 / 400 | drobečky, druhý řádek patičky |

- `font-display` jen s `text-display-*`, vždy `text-green` (na zelené `text-cream`). Nikdy pro ceny, tlačítka, formuláře, odstavce.
- Jeden `text-display-xl` na stránku, jeden `text-display-lg` na sekci.
- Verzálky jen u `text-eyebrow` a `text-bar`.
- Amatic SC nemá minusky; text se vykreslí kapitálkami, piš ho normálně s velkým písmenem na začátku.

## Mezery, rohy, stíny, rozvržení

- Krok Tailwindu je 4 px. Používané hodnoty: 5 px `1.25`, 10 px `2.5`, 14 px `3.5`, 20 px `5`, 30 px `7.5`, 50 px `12.5`, 60 px `15`, 70 px `17.5`.
- Sekce: `px-5 py-10 md:py-15`, obsah `mx-auto max-w-site` (1200 px). Hlavička sekce `mb-12.5`. Mřížky `gap-5`.
- Úzké šířky: `max-w-narrow` (960, příběh), `max-w-text` (708, dlouhý text).
- Rohy: `rounded-control` a `rounded-card` 3 px; `rounded-panel` 10 px jen mega menu; `rounded-full` disky, kulaté fotky, šipky.
- Stíny: `shadow-card`, `hover:shadow-card-hover`, `shadow-header`, `shadow-float`, `shadow-menu`; spodní hrana cihlového tlačítka `inset-shadow-edge`.
- Zlomy: `xs:` 480, `md:` 768, `lg:` 992, `xl:` 1200. Produkty `xs:grid-cols-2 lg:grid-cols-3` (karusel 4), dlaždice `xs:grid-cols-2 xl:grid-cols-4`.
- Přechody `transition-colors duration-300`; nic se neposouvá ani nezvětšuje. Respektuj `prefers-reduced-motion`.
- Žádné přechody barev, sklo, rozostření ani barevné pruhy na okraji karet.

## Komponenty

Recepty jsou závazné pro vzhled; strukturu props přizpůsob projektu. Názvy souborů v závorkách odkazují na referenční kód v `design/components/`.

**Button** (`button.tsx`)
- Základ: `inline-flex items-center justify-center gap-2.5 rounded-control text-button whitespace-nowrap transition-colors duration-300`
- Hlavní: `bg-brick text-white inset-shadow-edge hover:bg-brick-text`
- Tmavé: `bg-green text-cream hover:bg-green-hover`
- Obrysové: `bg-white text-green ring-1 ring-inset ring-green hover:bg-green hover:text-cream` (na zelené: `text-cream ring-cream`)
- Velikosti: `sm` `min-h-10 px-3.5 py-2` (karta, hlavička) · `md` `min-h-13 px-6.5 py-3` · `lg` `min-h-15 px-6.5 py-4` (detail produktu)
- Text začíná slovesem, bez verzálek. V jednom pohledu nejvýš jedno velké cihlové.

**LinkArrow** (`link-arrow.tsx`): `text-button font-semibold text-brick-text hover:underline` + bílý disk `size-7.5 rounded-full shadow-float` se šipkou; při hoveru se disk vyplní `brick-text`. Pro „Vše z řady“, „Podrobnosti o doručení“.

**Flag a StockStatus** (`badge.tsx`)
- Praporek: `rounded-r-control px-2.5 py-1.25 text-[15px]/[18px] font-semibold`; Novinka `bg-ochre-badge text-ink`, Oblíbené `bg-green text-cream`, Akce `bg-brick text-white`. Na kartě `absolute top-7.5 -left-px`, nejvýš dva.
- Sklad: `text-small font-semibold` + značka 9 px: Skladem (tečka `bg-olive`, text `green`), Poslední N ks (kosočtverec `bg-brick`, text `brick-text`), Naskladňujeme (prázdný kroužek, text `muted`).

**ProductCard** (`product-card.tsx`)
- Obal: `relative flex flex-col rounded-card border border-line bg-white shadow-card hover:border-brick hover:shadow-card-hover`
- Fotka: plocha `h-50`, `next/image` s `object-contain`, vyříznutý produkt.
- Název `text-heading-md text-green line-clamp-2`, při hoveru karty `brick-text`; horní část karty je odkaz na detail.
- Řádek: balení + StockStatus (`text-small`). Popis `line-clamp-3`.
- Patička: vlevo „Cena:“ (`text-label text-muted`) a cena (`text-price text-green`); vpravo pole `size-10 border-muted`, „ks“, malé tlačítko „Do košíku“.
- Akce: cena `text-brick-text`, místo popisku přeškrtnutá původní cena.
- Nedostupné: `absolute inset-0 bg-overlay text-white` s ikonou hodin a textem „Naskladňujeme“; tlačítko `disabled`.

**QuantityStepper** (`quantity-stepper.tsx`): `h-15 rounded-control border border-muted`, tlačítka − a + `w-12 bg-paper hover:bg-cream`, uprostřed pole `w-14`; za ním „ks“. Stojí vlevo od tlačítka `lg`.

**Section a SectionHeader** (`section.tsx`): pruh `bg-white | bg-paper | bg-cream`, uvnitř nadtitulek `text-eyebrow text-muted uppercase` a titulek `font-display text-display-md md:text-display-lg text-green`, vše na střed; volitelný LinkArrow vpravo (`md:absolute md:right-0`).

**IconTile** (`icon-tile.tsx`): disk `size-32 rounded-full bg-green text-cream`, ikona `size-14` s tahem 1,5; nadpis `my-5 text-heading-lg text-green`; věta `px-6`, nebo malé tlačítko (rozcestník). Místo disku může být vyříznutá fotka suroviny.

**AnnouncementBar** (`announcement-bar.tsx`): `min-h-10.5 bg-ochre text-bar text-ink uppercase`, jedna věta a nejvýš jeden podtržený odkaz, křížek `bg-white/40` vpravo.

**Header**: bílý, `h-15 shadow-header`, obsah `max-w-site`. Logo `dokosti-napis.svg` výška 44 px; navigace `text-nav text-green p-2.5 hover:text-brick-text`, aktivní položka `text-brick-text`; vpravo Přihlásit a Košík s ikonou 24 px a počtem (`rounded-full bg-brick text-white text-xs font-bold`). Pod `lg` boční panel 300 px zprava.

**Mega menu**: `rounded-panel border border-line bg-white p-2.5 shadow-menu`, `grid grid-cols-2 lg:grid-cols-4 gap-2.5`; položka `flex items-center gap-4 rounded-panel p-2.5 hover:bg-paper`, miniatura `size-10 rounded-panel bg-cream`, název `text-nav text-green`, počet `text-small text-muted`.

**Hero**: `flex flex-col md:flex-row items-center gap-7.5`, fotka vlevo (asi 560×480), vpravo `max-w-[570px]`: nadtitulek, `h1 font-display text-display-lg md:text-display-xl text-green mb-7.5`, odstavec `mb-7.5`, nejvýš dvě tlačítka (hlavní + obrysové).

**Story**: `max-w-narrow flex items-center gap-10`, vlevo nadtitulek, titulek `text-display-lg`, odstavec, podpis (jméno `font-bold text-green`) a LinkArrow; vpravo fotka `size-[350px] rounded-full object-cover`.

**Breadcrumb**: `text-small text-muted`, oddělovač šipka 9 px, poslední položka `text-ink` bez odkazu. Jen na detailu a podstránkách.

**BuyPanel** (pravý sloupec detailu): `h1 font-display text-display-xl text-green`, úvod 1–2 věty, tabulka `grid grid-cols-[150px_1fr]` nad linkou `border-t border-line` (Cena `text-price-lg text-green`, Balení, Dostupnost), řádek: QuantityStepper + „ks“ + `Button size="lg"` „Vložit do košíku“ roztažený (`flex-1`).

**Field**: popisek nad polem `text-label text-green`; pole `h-13.75 rounded-control border border-muted bg-white px-5 text-ink`; fokus `border-green outline-2 outline-green`; chyba `border-brick-text` + věta `text-small font-semibold text-brick-text`, která říká, co opravit.

**Footer**: `bg-green text-cream text-center px-5 pt-6.5 pb-5`; řádek řad (16 px, 600), řádek servisních odkazů (`text-small font-semibold`), spodní pruh `border-t border-green-hover`: negativní logo, telefon jako štítek `rounded-control bg-cream text-green px-2.5 py-1.25`, copyright. Nízká, bez sloupců.

## Stránky

**Úvod:** lišta + hlavička → Hero → rozcestník pěti řad (IconTile s tlačítkem, `paper`) → suroviny (IconTile s fotkou) → Krmení na míru (`cream`, malý Hero) → „Z mrazáku rovnou k vám“ (karusel ProductCard) → Doručení (tři IconTile, `paper`) → Story „Prodejna, ne sklad“ → patička.

**Výpis řady:** hlavička → Hero řady (název řady v `display-xl`, odstavec, odkazy na návody) → SectionHeader + mřížka ProductCard ve 3 sloupcích na `paper`, filtr podle masa jako řádek odkazů nad mřížkou → Story → patička.

**Detail produktu:** hlavička → Breadcrumb → dva sloupce (galerie s miniaturami 183×150, BuyPanel) → popis v `max-w-text` s mezititulky `text-heading-md` (Složení, Analytické složky, Podávání, Skladování) → další z řady → patička.

**Košík a pokladna:** tabulka na bílé, souhrn v panelu `bg-paper`, jedna cihlová akce dole vpravo; kroky značené čísly v discích `green`.

## Texty v rozhraní

- První osoba množného čísla, zákazníkovi vykáme: „vozíme sami“, „spočítáme dávku“.
- Krátké věty; heslo v titulku může končit tečkou: „Poctivé do kosti.“ „Prodejna, ne sklad.“
- Upřímně a konkrétně: „Víme, co je v každém balíčku, a řekneme to na rovinu.“ Žádné „nejlepší“, „prémiové“.
- Píšeme pes, kočka, zvíře, majitel. Ne pejsek, chlupáč, páníček, mňamka, citoslovce.
- Tlačítka: „Vybrat krmivo“, „Sestavit plán“, „Jen spočítat dávku“, „Do košíku“, „Vložit do košíku“.
- Čísla: „149 Kč“, „1,3 kg“, desetinná čárka, pevná mezera před jednotkou.
- Bez emoji a vykřičníků. Chyba říká, co opravit.
- Názvy: BARF mixy, Kosti, Navíc, Mlsky, Granule, Krmení na míru, Košík.

## Co se z předlohy nikdy nebere

Logo, fotografie, ilustrace, ikony a textury Mixana; jeho texty, názvy produktů a slovník („miska“, „Blog Dog“, „haf“); jména, tváře, recenze a videa. Přebírá se uspořádání a tvar, ne obsah.

## Kontrola před odevzdáním

- [ ] Žádný hex, pixelový roh ani stín napsaný ručně; jen utility z tokenů.
- [ ] Na `bg-brick` je `text-white`; na `bg-green` `text-cream`; na okrové `text-ink`.
- [ ] `font-display` jen u `text-display-*`; jeden `display-xl` na stránku.
- [ ] Jedno velké cihlové tlačítko v pohledu.
- [ ] Stránka je bílá; sekce střídají `white` a `paper`.
- [ ] Fotky produktů vyříznuté, `object-contain`.
- [ ] Stav skladu slovem i značkou; ikony mají text nebo `aria-label`.
- [ ] Fokus je vidět na každém ovládacím prvku; pole mají popisek.
- [ ] Vyzkoušeno na 390 px a 1280 px, bez vodorovného posuvu.
- [ ] Texty podle části „Texty v rozhraní“.

## Theme

`dokosti-theme.css` — importuj v globálním stylesheetu hned za `@import "tailwindcss";`. Názvy barev jsou stejné jako dosud, mění se hodnoty rohů, písma a přibývají stíny, velikosti textu a šířky.

```css
/*
 * DoKosti — design tokeny pro Tailwind CSS v4.
 * V globals.css: @import "tailwindcss"; @import "./dokosti-theme.css";
 * Názvy barev zůstávají stejné jako v původním webu (green, cream, paper, brick…),
 * takže stávající utility (bg-green, text-muted, border-line) fungují dál.
 */

@theme {
  /* Barvy */
  --color-white: #ffffff;
  --color-paper: #fbf7ee;
  --color-cream: #f3ecdd;
  --color-line: #d9cfb8;
  --color-green: #1f3a2d;
  --color-green-hover: #2b4d3c;
  --color-brick: #b5532f;
  --color-brick-text: #9c4424;
  --color-ochre: #c8892b;
  --color-ochre-badge: #e9c98f;
  --color-olive: #7a8c3a;
  --color-ink: #24221f;
  --color-muted: #55645a;
  --color-overlay: rgb(31 58 45 / 0.8);

  /* Rohy */
  --radius-control: 3px;
  --radius-card: 3px;
  --radius-panel: 10px;

  /* Stíny */
  --shadow-card: 0 0 5px rgb(0 0 0 / 0.05);
  --shadow-card-hover: 0 0 10px rgb(181 83 47 / 0.3);
  --shadow-header: 0 2px 30px rgb(0 0 0 / 0.06);
  --shadow-float: 0 2px 5px rgb(0 0 0 / 0.1);
  --shadow-menu: 0 5px 15px rgb(0 0 0 / 0.1);
  --inset-shadow-edge: inset 0 -2px 0 #9c4424;

  /* Zlomy: xs je nový, lg a xl přepisují výchozí hodnoty Tailwindu (1024, 1280) */
  --breakpoint-xs: 30rem;
  --breakpoint-lg: 62rem;
  --breakpoint-xl: 75rem;

  /* Šířky obsahu: max-w-site, max-w-narrow, max-w-text */
  --container-site: 75rem;
  --container-narrow: 60rem;
  --container-text: 44.25rem;

  /* Písmo: text-display-xl, text-heading-md, text-eyebrow… */
  --text-display-xl: 4.375rem;
  --text-display-xl--line-height: 1.1;
  --text-display-xl--font-weight: 700;
  --text-display-lg: 3.125rem;
  --text-display-lg--line-height: 1.1;
  --text-display-lg--font-weight: 700;
  --text-display-md: 2.5rem;
  --text-display-md--line-height: 1.1;
  --text-display-md--font-weight: 700;
  --text-display-sm: 1.5625rem;
  --text-display-sm--line-height: 1.1;
  --text-display-sm--font-weight: 700;
  --text-heading-lg: 1.5625rem;
  --text-heading-lg--line-height: 1.1;
  --text-heading-lg--font-weight: 700;
  --text-heading-md: 1.25rem;
  --text-heading-md--line-height: 1.1;
  --text-heading-md--font-weight: 800;
  --text-price-lg: 1.5625rem;
  --text-price-lg--line-height: 1.3;
  --text-price-lg--font-weight: 700;
  --text-price: 1.25rem;
  --text-price--line-height: 1;
  --text-price--font-weight: 700;
  --text-body: 1rem;
  --text-body--line-height: 1.75;
  --text-bar: 0.9375rem;
  --text-bar--line-height: 1.75;
  --text-bar--font-weight: 700;
  --text-label: 0.9375rem;
  --text-label--line-height: 1.4;
  --text-label--font-weight: 600;
  --text-nav: 0.875rem;
  --text-nav--line-height: 1.2;
  --text-nav--font-weight: 700;
  --text-button: 0.875rem;
  --text-button--line-height: 1.75;
  --text-button--font-weight: 700;
  --text-eyebrow: 0.8125rem;
  --text-eyebrow--line-height: 1.75;
  --text-eyebrow--font-weight: 600;
  --text-eyebrow--letter-spacing: 1.9px;
  --text-small: 0.8125rem;
  --text-small--line-height: 1.75;
}

/* Rodiny písma: proměnné --font-amatic a --font-montserrat nastavuje next/font (viz fonts.ts) */
@theme inline {
  --font-display: var(--font-amatic), "Arial Narrow", sans-serif;
  --font-body: var(--font-montserrat), Helvetica, Arial, sans-serif;
  --font-label: var(--font-montserrat), Helvetica, Arial, sans-serif;
}

@layer base {
  body {
    background-color: var(--color-white);
    color: var(--color-muted);
    font-family: var(--font-montserrat), Helvetica, Arial, sans-serif;
    font-size: var(--text-body);
    line-height: var(--text-body--line-height);
    -webkit-font-smoothing: antialiased;
  }
  strong {
    color: var(--color-ink);
  }
  :focus-visible {
    outline: 2px solid var(--color-green);
    outline-offset: 2px;
  }
}
```

`fonts.ts`

```ts
import { Amatic_SC, Montserrat } from "next/font/google";

// Amatic SC: jen titulky (H1, titulek sekce). Montserrat: všechno ostatní.
export const amatic = Amatic_SC({
  weight: "700",
  subsets: ["latin", "latin-ext"],
  variable: "--font-amatic",
  display: "swap",
});

export const montserrat = Montserrat({
  subsets: ["latin", "latin-ext"],
  variable: "--font-montserrat",
  display: "swap",
});

// app/layout.tsx:
// <html lang="cs" className={`${amatic.variable} ${montserrat.variable}`}>
```
