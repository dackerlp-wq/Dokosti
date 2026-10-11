# DoKosti BARF

E-shop se syrovým krmivem pro psy a kočky. Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase.
Jazyk webu i kódu (komentáře, texty) je čeština. Na webu vykáme.

## Design

Vzhled e-shopu se řídí design systémem v `design/DESIGN.md`. Před každou prací na UI (komponenty, stránky, styly, texty v rozhraní) si ho přečti a drž se ho.

- Tokeny jsou v `design/dokosti-theme.css` (Tailwind v4 `@theme`, importuje ho `src/app/globals.css`); v komponentách žádné ruční hex barvy, rohy ani stíny.
  Používej utility z tokenů (`bg-green`, `text-brick-text`, `font-display text-display-lg`, `rounded-control`, `shadow-card`).
- Referenční komponenty jsou v `design/components/`. Existující komponenty v `src/components/` přestavuj podle nich, nezakládej duplicity.
- Hlas značky, práce s logem a fotkami: `design/BRAND-MANUAL.md`. `BRAND.md` v kořeni je starší reference (logo, název, zápis); kde se liší, platí `design/`.
- Stránka je bílá, sekce střídají `white` a `paper`; `cream` nebo `green` sekce nejvýš jedna na stránku (kromě hlavičky a patičky).
- Amatic SC (`font-display`) jen s `text-display-*` pro H1 a titulky sekcí, nikdy pro ceny, tlačítka a text. Všechno ostatní je Montserrat.
- Jedna cihlová (`bg-brick text-white`) akce v pohledu: tlačítko, které vede k nákupu.
- Administrace (`/admin`) a kasa používají stejné tokeny a primitiva (PageHeader s titulkem v `font-display text-display-md`, Table, Stat, Field, chipClass). Popisky polí `text-label text-green`, drobné nadtitulky `text-eyebrow uppercase`; třída `label` se už nepoužívá.

## Pravidla

- Ikony Lucide se `strokeWidth={1.75}` (v disku 1.5), žádné emoji.
- Název produktu je vždy `productName()` z `src/lib/catalog.ts`: druh masa s velkým písmenem („Kuřecí mix“), řada je štítek.
  Řady: barf (BARF mixy), kosti, navic, mlsky, granule. Druhy masa jsou `meats` na produktu (podkategorie `/rada/[řada]/[maso]`).
- Ceny a složení produktů nikdy nevymýšlet. Ukázková data v `catalog.ts` jsou označená jako placeholder.
- Žádná zdravotní tvrzení, při potížích odkaz na veterináře.

## Příkazy

- `npm run dev`, `npm run build`, `npm run lint`
