# DoKosti BARF · e-shop

Kamenná prodejna a e-shop se syrovým krmivem pro psy a kočky. Next.js 16, Tailwind CSS v4, Supabase.

## Spuštění

```bash
npm install
npm run dev
```

Web běží na http://localhost:3000. Bez `.env.local` používá ukázkový katalog ze `src/lib/catalog.ts`
a objednávky jen loguje do konzole. Pro připojení Supabase zkopírujte `.env.example` do `.env.local`
a doplňte klíče.

## Struktura

| Cesta                         | Co je uvnitř                                                   |
| ----------------------------- | -------------------------------------------------------------- |
| `BRAND.md`                    | Pravidla značky: barvy, písma, loga, tón. Zdroj pravdy pro UI. |
| `docs/`                       | Brand manuál a návrhy loga (PDF).                              |
| `public/brand/`               | Loga v SVG a PNG.                                              |
| `src/app/`                    | Stránky (App Router).                                          |
| `src/components/`             | UI, layout, produkt, košík, pokladna.                          |
| `src/lib/catalog.ts`          | Datový model a ukázková data produktů.                         |
| `src/lib/shipping.ts`         | Způsoby dodání a platby.                                       |
| `src/lib/site.ts`             | Údaje o prodejně a navigace.                                   |
| `supabase/migrations/`        | Schéma databáze.                                               |

## Stránky

- `/` úvod
- `/rada/zaklad`, `/rada/kosti`, `/rada/navic`, `/rada/mlsky` výpis řady, filtr `?zvire=pes|kocka`
- `/produkt/[slug]` detail produktu
- `/kosik`, `/pokladna` košík a objednávka
- `/doprava`, `/o-nas`, `/kontakt`, `/obchodni-podminky`, `/ochrana-udaju`

## Co je placeholder

Ceny, gramáže a složení v `catalog.ts`, ceny dopravy v `shipping.ts`, údaje o prodejně v `site.ts`
a texty právních stránek. Ceny a složení se podle `BRAND.md` nevymýšlejí, před spuštěním se nahradí
daty od výrobců.
