# DoKosti BARF · e-shop

Kamenná prodejna a e-shop se syrovým krmivem pro psy a kočky. Next.js 16, Tailwind CSS v4, Supabase.

## Spuštění

```bash
npm install
npm run dev
```

Web běží na http://localhost:3000. Pro připojení Supabase zkopírujte `.env.example` do `.env.local`
a doplňte URL a publishable klíč (Project settings → API). Bez nich používá ukázkový katalog
ze `src/lib/catalog.ts` a objednávky jen loguje do konzole.

## Supabase a Vercel

- Supabase projekt **DoKosti** (eu-west-1). Migrace jsou v `supabase/migrations/`, ukázková data
  v `supabase/seed.sql`. Produkty se na webu zobrazují, jen když mají `is_published = true`.
- Objednávky zakládá RPC `create_order` (security definer), web tedy pracuje jen s publishable klíčem.
- Vercel projekt **dokosti**, nasazuje se z větve `main`. Proměnné prostředí jsou nastavené v projektu.
- Katalog se na webu obnoví nejpozději minutu po změně v databázi (`revalidate = 60`).

## Struktura

| Cesta                         | Co je uvnitř                                                   |
| ----------------------------- | -------------------------------------------------------------- |
| `BRAND.md`                    | Pravidla značky: barvy, písma, loga, tón. Zdroj pravdy pro UI. |
| `docs/`                       | Brand manuál a návrhy loga (PDF).                              |
| `public/brand/`               | Loga v SVG a PNG.                                              |
| `src/app/`                    | Stránky (App Router).                                          |
| `src/components/`             | UI, layout, produkt, košík, pokladna.                          |
| `src/lib/catalog.ts`          | Datový model a ukázková data produktů.                         |
| `src/lib/products.ts`         | Načítání produktů ze Supabase (fallback na ukázková data).     |
| `src/lib/shipping.ts`         | Způsoby dodání a platby.                                       |
| `src/lib/site.ts`             | Údaje o prodejně a navigace.                                   |
| `supabase/migrations/`        | Schéma databáze.                                               |

## Administrace

`/admin` (přihlášení `/admin/login`). Přístup mají jen uživatelé Supabase Auth zapsaní v tabulce `admins`.
Přehled objednávek a změna jejich stavu, správa produktů včetně nahrávání fotek do bucketu `product-images`.
Nového správce přidáte tak, že založíte uživatele v Supabase (Authentication → Users) a vložíte jeho `id`
do tabulky `admins`.

## Stránky

- `/` úvod
- `/rada/zaklad`, `/rada/kosti`, `/rada/navic`, `/rada/mlsky`, `/rada/granule` výpis řady, filtr `?zvire=pes|kocka`
- `/produkt/[slug]` detail produktu
- `/kosik`, `/pokladna` košík a objednávka
- `/doprava`, `/o-nas`, `/kontakt`, `/obchodni-podminky`, `/ochrana-udaju`

## Co je placeholder

Ceny, gramáže a složení v `catalog.ts`, ceny dopravy v `shipping.ts`, údaje o prodejně v `site.ts`
a texty právních stránek. Ceny a složení se podle `BRAND.md` nevymýšlejí, před spuštěním se nahradí
daty od výrobců.
