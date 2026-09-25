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
| `src/lib/settings.ts`         | Nastavení e-shopu (výchozí hodnoty, načítání ze Supabase).     |
| `src/lib/shipping.ts`         | Způsoby dodání a platby odvozené z nastavení.                  |
| `src/lib/site.ts`             | Název značky a navigace.                                       |
| `supabase/migrations/`        | Schéma databáze.                                               |

## Administrace

`/admin` (přihlášení `/admin/login`) má vlastní rozhraní oddělené od e-shopu. Přístup mají jen uživatelé
Supabase Auth zapsaní v tabulce `admins`. Sekce: Přehled (otevřené objednávky, docházející sklad),
Objednávky (stavy), Rozvoz a odběry (plán podle dne), Produkty a sklad (fotky do bucketu `product-images`,
množství s hlídáním nuly), Zákazníci (historie, poznámka), Nastavení (prodejna, otevírací doba, doprava
a rozvozové dny, platby, texty stránek, Kostičky; tabulka `settings`, výchozí hodnoty v `src/lib/settings.ts`),
Slevové kódy (procenta nebo částka, platnost, limit použití).

Objednávku počítá výhradně databázová funkce `create_order` (ceny z `products`, doprava ze `settings`,
sleva z `coupons`, Kostičky z `customers`), web jí posílá jen slugy, množství a volby zákazníka.
Kostičky (`settings.loyalty`): 1 za každých 10 Kč, 100 = 50 Kč. Připisují se při stavu „doručeno“,
při zrušení se vrací; historie v `loyalty_transactions`.
E-maily (potvrzení objednávky zákazníkovi, upozornění prodejně, změny stavu) posílá `src/lib/email` přes Resend.
Bez `RESEND_API_KEY` a `EMAIL_FROM` se ukládají do `email_log` se stavem „čeká“ a jdou prohlédnout v adminu (E-maily).
Doklady: tlačítko „Vystavit doklad“ na objednávce přidělí číslo z řady `invoice_seq` (RRRRNNNN) a otevře
tisknutelný doklad (bez DPH, nebo s rozpisem 12 % po zapnutí plátce DPH v nastavení). Statistiky čtou pohledy
`sales_by_day` a `top_products`; export CSV pro účetní je na `/admin/export/objednavky.csv?od=&do=`.
Štítky na balíky: Rozvoz a odběry → Tisk štítků.
Nového správce přidáte tak, že založíte uživatele v Supabase (Authentication → Users) a vložíte jeho `id`
do tabulky `admins`.

## Stránky

- `/` úvod
- `/rada/zaklad`, `/rada/kosti`, `/rada/navic`, `/rada/mlsky`, `/rada/granule` výpis řady, filtr `?zvire=pes|kocka`
- `/produkt/[slug]` detail produktu
- `/kosik`, `/pokladna` košík a objednávka
- `/ucet` zákaznický účet (Kostičky, objednávky, historie), `/ucet/prihlaseni` přihlášení a registrace, `/ucet/nove-heslo` nové heslo
- `/jak-zacit-s-barfem` průvodce pro začátečníky s kalkulačkou dávky a poradnou (`/jak-zacit` přesměruje), `/hledat?q=` vyhledávání
- `/doprava`, `/o-nas`, `/kontakt`, `/obchodni-podminky`, `/ochrana-udaju`
- `/sitemap.xml`, `/robots.txt`; detail produktu má JSON-LD Product, úvod PetStore

Kalkulačka dávky (`components/barf/barf-calculator.tsx`, výpočet v `lib/barf.ts`) doporučí set na 14 dní z aktuální
nabídky a umí ho vložit do košíku. Startovací balíčky se zobrazí, jakmile existují produkty se slugem `startovaci-…`.
Dotazy z poradny jdou do tabulky `inquiries`, e-mailem prodejně a do adminu (Poradna). Cookies lišta a Google Analytics se zapnou proměnnou `NEXT_PUBLIC_GA_ID`; bez ní se nic neměří.
Šarže a expirace: u mraženého a chlazeného produktu v adminu, expirace do 14 dnů svítí na Přehledu.

## Zákaznické účty, hledání, upsell

Hlavička má dva řádky: nahoře logo, hledání s našeptávačem (`components/layout/search-box.tsx`), odkazy na ostatní
stránky, účet a košík; pod tím lišta s řadami produktů (`CATEGORY_NAV` a `PAGE_NAV` v `src/lib/site.ts`).
Zákaznické účty používají Supabase Auth (registrace, přihlášení, obnova hesla přes `/auth/callback`).
Zákazník vidí své objednávky a Kostičky podle e-mailu (RLS v migraci `0013`), pokladna se předvyplní z účtu.
Aby chodily potvrzovací a resetovací e-maily, nastavte v Supabase Authentication → URL Configuration
Site URL `https://dokosti.vercel.app` a Redirect URL `https://dokosti.vercel.app/auth/callback`.
Upsell („Lepší volba“) a cross-sell („Hodí se k tomu“) se nastavují u produktu v adminu (sloupce `upsell_slugs`,
`crosssell_slugs`); zobrazují se na detailu produktu, cross-sell také v košíku.

## Co je placeholder

Ceny, gramáže a složení v `catalog.ts`, ceny dopravy v `shipping.ts`, údaje o prodejně v `site.ts`
a texty právních stránek. Ceny a složení se podle `BRAND.md` nevymýšlejí, před spuštěním se nahradí
daty od výrobců.
