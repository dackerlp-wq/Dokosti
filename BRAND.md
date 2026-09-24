# DoKosti BARF – brand reference

Kamenná prodejna a e-shop se syrovým krmivem (BARF) pro psy a kočky.
Zakladatelé: Dvořák a Kostová (odtud "DoKosti" a monogram "DK").
Značka prodává hotové balené krmivo od výrobců, nevyrábí vlastní.
Trh: ČR, později SK. Jazyk webu: čeština (cs-CZ).

## Název a zápis

- Název značky: **DoKosti** (velké D a K, jedno slovo, nikdy "Do Kosti").
- Plný název prodejny: **DoKosti BARF**.
- Slogan: **Poctivé do kosti.** Používá se beze změn, nejvýš jednou na stránku.
- Doména / handle: [DOMENA] / @[HANDLE] – doplnit po ověření.

## Barvy

| Token             | Hex       | RGB           | Použití                                                            |
| ----------------- | --------- | ------------- | ------------------------------------------------------------------ |
| `--dk-green`      | `#1F3A2D` | 31, 58, 45    | Hlavní barva. Logo, hlavička, patička, primární tlačítka, nadpisy. |
| `--dk-green-hover`| `#2B4D3C` | 43, 77, 60    | Hover primárních tlačítek a odkazů na zelené.                      |
| `--dk-cream`      | `#F3ECDD` | 243, 236, 221 | Základní podklad stránky.                                          |
| `--dk-paper`      | `#FBF7EE` | 251, 247, 238 | Podklad karet a formulářů.                                         |
| `--dk-brick`      | `#B5532F` | 181, 83, 47   | Akcent. Kost v logu, akce, slevy, upozornění. Šetřit.              |
| `--dk-brick-text` | `#9C4424` | 156, 68, 36   | Cihlová pro text a malé prvky (lepší kontrast) a hover akce.       |
| `--dk-ink`        | `#24221F` | 36, 34, 31    | Běžný text místo černé.                                            |
| `--dk-muted`      | `#55645A` | 85, 100, 90   | Vedlejší text, popisky.                                            |
| `--dk-line`       | `#D9CFB8` | 217, 207, 184 | Rámečky, oddělovače.                                               |
| `--dk-ochre`      | `#C8892B` | 200, 137, 43  | Doplňková. Štítek "Novinka", sezónní prvky.                        |
| `--dk-olive`      | `#7A8C3A` | 122, 140, 58  | Doplňková. Byliny, doplňky stravy, zelenina.                       |

Poměr na stránce zhruba 60 % krémová, 30 % zelená, 10 % cihlová.
Doplňkové barvy jen na štítky a ilustrace, nikdy jako podklad sekce.

### CSS proměnné

```css
:root {
  --dk-green: #1f3a2d;
  --dk-green-hover: #2b4d3c;
  --dk-cream: #f3ecdd;
  --dk-paper: #fbf7ee;
  --dk-brick: #b5532f;
  --dk-brick-text: #9c4424;
  --dk-ink: #24221f;
  --dk-muted: #55645a;
  --dk-line: #d9cfb8;
  --dk-ochre: #c8892b;
  --dk-olive: #7a8c3a;
}
```

### Tailwind v4 (`@theme`)

```css
@import "tailwindcss";

@theme {
  --color-green: #1f3a2d;
  --color-green-hover: #2b4d3c;
  --color-cream: #f3ecdd;
  --color-paper: #fbf7ee;
  --color-brick: #b5532f;
  --color-brick-text: #9c4424;
  --color-ink: #24221f;
  --color-muted: #55645a;
  --color-line: #d9cfb8;
  --color-ochre: #c8892b;
  --color-olive: #7a8c3a;
  --font-display: "Fraunces", Georgia, serif;
  --font-label: "Archivo Narrow", Arial, sans-serif;
  --font-body: "Archivo", Arial, sans-serif;
  --radius-control: 6px;
  --radius-card: 12px;
}
```

Použití: `bg-green text-cream`, `font-display`, `rounded-[var(--radius-card)]`.

### Kontrast (WCAG)

- Krémová na zelené: cca 10:1, vhodné pro jakýkoli text.
- Antracit na krémové: cca 13:1, vhodné pro jakýkoli text.
- Cihlová `#B5532F` na krémové: cca 4:1, jen pro text od 24 px nebo tučný od 19 px. Pro menší text použít `--dk-brick-text` (cca 5.5:1).
- Šedá `--dk-muted` na krémové: cca 5:1, vhodné pro běžný text.
- Krémová na cihlové `#B5532F`: cca 4:1, tlačítko "Akce" jen s textem od 18 px tučně.
- Okrová a olivová nejsou pro text, jen podklady štítků s textem `--dk-ink` (okrová) nebo `--dk-cream` (olivová ne, kontrast jen 3:1 – u olivové použít text `--dk-ink`).

## Písmo

| Role    | Font           | Řezy     | Použití                                                                        |
| ------- | -------------- | -------- | ------------------------------------------------------------------------------ |
| Display | Fraunces       | 600, 800 | Nadpisy h1–h3, názvy produktů, ceny. `font-optical-sizing: auto`.              |
| Label   | Archivo Narrow | 500, 600 | Štítky, kategorie, navigace, tlačítka. Vždy VERZÁLKY + `letter-spacing: 0.15em`. |
| Body    | Archivo        | 400, 600 | Běžný text, popisy, formuláře.                                                 |

Všechna tři jsou na Google Fonts, licence SIL OFL, mají českou diakritiku.

Next.js (`next/font/google`):

```ts
import { Fraunces, Archivo_Narrow, Archivo } from "next/font/google";

export const fraunces = Fraunces({ subsets: ["latin", "latin-ext"], weight: ["600", "800"], variable: "--font-display" });
export const archivoNarrow = Archivo_Narrow({ subsets: ["latin", "latin-ext"], weight: ["500", "600"], variable: "--font-label" });
export const archivo = Archivo({ subsets: ["latin", "latin-ext"], weight: ["400", "600"], variable: "--font-body" });
```

Subset `latin-ext` je nutný kvůli české diakritice.

Velikosti (desktop / mobil): h1 56/40 px, h2 40/30 px, h3 28/24 px, body 18/16 px, label 14 px, popisky 14 px.
Řádkování: nadpisy 1.1, text 1.5.

## Logo

Soubory v `/public/brand/` (z balíčku `dokosti-loga.zip`, SVG v křivkách):

| Soubor                                   | Kdy použít                                             |
| ---------------------------------------- | ------------------------------------------------------ |
| `dokosti-logo-barevne.svg`               | Hlavní logo na světlém podkladu (patička, O nás).      |
| `dokosti-logo-negativ.svg`               | Na zelené a tmavé fotce.                               |
| `dokosti-logo-jednobarevne.svg`          | Tisk jednou barvou, razítka.                           |
| `dokosti-logo-bez-podtitulu.svg`         | Hlavička e-shopu na desktopu.                          |
| `dokosti-logo-bez-podtitulu-negativ.svg` | Hlavička na zeleném podkladu.                          |
| `dokosti-napis.svg`                      | Samotný nápis s kostí: mobilní hlavička, malé rozměry. |
| `dokosti-znak.svg` / `-negativ.svg`      | Kulatý znak DK: pečeť, samolepky, dekorace stránky.    |
| `dokosti-znak-samolepka.svg`             | Znak s krémovým pozadím.                               |
| `dokosti-profilovka.png`                 | Favicon, OG obrázek, profilovka (1024 × 1024).         |

Pravidla:
- Ochranná zóna kolem loga aspoň šířka písmene D z nápisu.
- Minimální šířka: logo s podtitulem 240 px, bez podtitulu 150 px, znak 64 px.
- Nikdy neměnit barvy, nenatahovat, nepřidávat stín ani obrys.
- Logo se nepřepisuje textem, vždy SVG (`next/image` nebo inline `<svg>`).

## UI prvky

- Zaoblení rohů: tlačítka a inputy 6 px, karty 12 px, štítky plně zaoblené (`rounded-full`).
- Rámečky 1 px `--dk-line`, u aktivního inputu 2 px `--dk-green`.
- Stíny nepoužívat, hloubku dělá rámeček a podklad `--dk-paper`.
- Tlačítka: text v Archivo Narrow verzálkami, výška min. 44 px.
  - Primární: podklad `--dk-green`, text `--dk-cream`, hover `--dk-green-hover`.
  - Sekundární: průhledné, 2 px rámeček `--dk-green`, text `--dk-green`, hover podklad `--dk-paper`.
  - Akce: podklad `--dk-brick`, text `--dk-cream`, hover `--dk-brick-text`. Jen pro slevy a upozornění.
- Štítky (badge): NOVINKA na `#E9C98F` s textem `--dk-ink`, SLEVA na `--dk-brick` s textem `--dk-cream`, SKLADEM na `--dk-green` s textem `--dk-cream`.
- Ikony: obrysové (stroke 1.75 px, např. Lucide), bez emoji.
- Karta produktu: foto 1:1 na `--dk-cream`, štítek kategorie (label, `--dk-brick-text`), název (Fraunces 600), cena (Fraunces 600), tlačítko DO KOŠÍKU.
- Sekce střídají podklad `--dk-cream` a `--dk-paper`; zelená sekce nejvýš jedna na stránku (hero nebo výzva k akci) plus hlavička a patička.

## Obsah a názvosloví

- Řady (kategorie e-shopu, ne názvy výrobků): **Základ** (mixy), **Kosti** (masité kosti), **Navíc** (doplňky, oleje), **Mlsky** (pamlsky).
- Formát názvu produktu: `Řada · druh masa`, např. "Základ · hovězí mix". Značka výrobce se uvádí v popisu a na etiketě.
- Popis produktu: první věta říká, co to je a pro koho, pak složení v procentech (od výrobce), skladování, dávkování.
- Věrnostní program: "Kostičky", zákazník sbírá kosti.
- Tón: krátké věty, na webu vykáme, na sítích tykáme. Mluví člověk z prodejny, ne firma. Žádné superlativy, žádná zdravotní tvrzení, při potížích odkaz na veterináře.
- Hříčka "do kosti" nejvýš jednou na stránku.

## Obrázky

| Obrázek              | Rozměr       | Poznámka                                  |
| -------------------- | ------------ | ----------------------------------------- |
| Produktová fotka     | 1600 × 1600  | krémové nebo bílé pozadí, bez textu       |
| Obrázek kategorie    | 800 × 800    | jedna surovina nebo zvíře                 |
| OG obrázek           | 1200 × 630   | logo na krémové nebo zelené               |
| Hlavička newsletteru | 1200 × 400   | logo bez podtitulu vlevo, krémový podklad |
| Favicon              | 32, 180, 512 | ze souboru `dokosti-profilovka.png`       |

Fotky: denní světlo, teplé tóny, bez filtrů, skutečná zvířata zákazníků, žádné fotobanky.

## Placeholdery k doplnění

`[DOMENA]`, `[HANDLE]`, `[ADRESA]`, `[TELEFON]`, `[E-MAIL]`, `[IČO]`, `[OTEVÍRACÍ DOBA]`.
Ceny a složení produktů nikdy nevymýšlet, brát z dat od výrobce.
