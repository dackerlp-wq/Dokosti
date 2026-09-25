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

Kalkulačka dávky (`/kalkulacka`, komponenta `components/barf/barf-calculator.tsx`, model v `lib/barf.ts`) počítá potřebu
energie podle FEDIAF/NRC (kg^0,75 pes, kg^0,67 kočka; růstová rovnice pro štěňata, vzorce pro březost a laktaci, tabulka pro
koťata) a převádí ji na gramy podle energie mixu z etikety (`products.kcal_per_100g`); bez ní počítá s referenční hustotou
150 kcal/100 g a výsledek označí jako orientační. Dělá bilanci kosti (cíl 8 % pes, 6 % kočka, 15 % štěně) z podílu kosti v mixu
a v Kostech (`bone_pct`, `bone_class`), doporučí produkty na 7/14/28 dní, cenu za den, výdrž balení, umí více zvířat najednou,
podíl granulí u štěňat a při přechodu, a profil zvířete uloží k účtu (tabulka `pets`) nebo do prohlížeče. Údaje z etikety se
zadávají u produktu v adminu a nikdy se nedopočítávají. Rešerše a odůvodnění modelu: `reports/BARF krmení pro kalkulačku.md`.
Zákazník může doplňky (Kosti, rybí den, olej, zelenina, kost na okusování, granule) vypnout, vyřadit druhy masa, které zvíře
nesmí, i jednotlivé produkty. Plán krmení na lednici generuje `lib/pdf/plan.tsx` (@react-pdf/renderer, písma v `public/fonts`)
na `/kalkulacka/plan.pdf?d=…`, tlačítka Stáhnout, Vytisknout a Poslat e-mailem (příloha přes Resend).
Startovací balíčky se zobrazí, jakmile existují produkty se slugem `startovaci-…`.

## Předplatné (pravidelný odběr)

V pokladně zákazník zvolí Jednorázově / každý týden / každých 14 dní / každé 4 týdny a den dodání (u rozvozu rozvozový den,
jinak den v týdnu). První objednávka projde běžně, `create_subscription` k ní založí předplatné (tabulky `subscriptions`,
`subscription_items`) a zákazník dostane e-mail s odkazem `/predplatne/<token>`, kde dodávku přeskočí, upraví množství,
změní interval nebo odběr pozastaví a zruší (RPC `manage_subscription`). Přihlášený zákazník vidí předplatné i v účtu.
Denní cron `/api/cron/predplatne` (Vercel Cron, `vercel.json`, hlavička `Authorization: Bearer CRON_SECRET`; stejná hodnota je
v tabulce `secrets`) pošle připomínku `reminderDaysBefore` dní předem a `cutoffDaysBefore` dní předem založí objednávku přes
`create_order` (sleva `subscription.discountPct` z nastavení, kód `PŘEDPLATNÉ`), pošle potvrzení a posune `next_date`. Když se
objednávku nepodaří vytvořit, předplatné se pozastaví a prodejna dostane e-mail. Admin: Předplatné (seznam, detail se správou a
objednávkami), Nastavení → Předplatné. Platba za každou dodávku zvlášť; opakovaná platba kartou přijde s platební bránou.
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
