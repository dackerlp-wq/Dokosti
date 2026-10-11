# DoKosti — designová sada pro Claude Code

Vzhled podle mixano.cz v barvách DoKosti. Sada je psaná pro Next.js (App Router), TypeScript a Tailwind CSS v4.

## Obsah

| Soubor | K čemu |
| --- | --- |
| `DESIGN.md` | Pravidla pro Claude Code: tokeny, recepty komponent, stavba stránek, texty, kontrolní seznam. |
| `BRAND-MANUAL.md` | Brand manuál: zásady, hlas, barvy, písmo, fotky, ikony, logo, stránky, vztah k předloze. |
| `dokosti-theme.css` | Tokeny pro Tailwind v4 (`@theme`). |
| `fonts.ts` | Amatic SC a Montserrat přes `next/font/google`. |
| `components/*.tsx` | Referenční komponenty: Button, LinkArrow, Flag a StockStatus, ProductCard, QuantityStepper, Section a SectionHeader, IconTile, AnnouncementBar. |
| `preview-page.tsx` | Ukázková stránka se všemi komponentami. |
| `CLAUDE-snippet.md` | Odstavec k vložení do `CLAUDE.md` projektu. |

## Nasazení

1. Rozbal složku do kořene repozitáře jako `design/`.
2. Obsah `CLAUDE-snippet.md` vlož do `CLAUDE.md`.
3. V globálním stylesheetu nahraď stávající blok `@theme` řádkem `@import "../design/dokosti-theme.css";` hned za `@import "tailwindcss";` (cestu uprav podle umístění stylesheetu).
4. V `app/layout.tsx` nasaď písma podle `fonts.ts` a třídy `amatic.variable` a `montserrat.variable` dej na `<html>`.
5. Komponenty importují `lucide-react`. Pokud ho projekt nemá: `npm i lucide-react`. Jinak přidej `design` do `exclude` v `tsconfig.json`, aby referenční soubory neshodily typovou kontrolu.
6. Zadej Claude Code: „Přestav e-shop podle design/DESIGN.md. Začni tokeny a písmy, pak hlavička a patička, karta produktu, úvod, výpis řady, detail produktu.“

## Na co si dát pozor

- `dokosti-theme.css` přepisuje zlomy `lg` (992 px) a `xl` (1200 px) a mění rohy z 6/12 px na 3 px. Stávající stránky se tím posunou; počítej s tím při postupné přestavbě.
- Tělo stránky je nově bílé a text `muted`; třída `label` (verzálky Archivo Narrow) se u tlačítek přestává používat.
- Komponenty jsou referenční: typově zkontrolované a vykreslené na ukázkové stránce, ale nenapojené na data ani košík projektu. `ProductCard` čeká server action `addToCart(formData)` s poli `productId` a `quantity`.
- Fotky v ukázkách jsou zástupné. Systém počítá s vyříznutými fotkami produktů na bílém nebo průhledném pozadí.
