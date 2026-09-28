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
a v Kostech (`bone_pct`, `bone_class`), doporučí produkty na 7/14/30 dní (jeden nákup s vyřazením a náhradou druhu), cenu za den,
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
Site URL `https://dokosti.cz` a Redirect URLs `https://dokosti.cz/auth/callback` a `https://dokosti.vercel.app/auth/callback`.
České šablony těchto e-mailů jsou v `supabase/auth-emaily/` (vkládají se ručně, viz tamní README).
Přihlášení a registrace přes Google (`components/account/google-button.tsx`, akce `signInWithGoogle`) vyžaduje
v Supabase Authentication → Providers → Google zapnutý provider s Client ID a Client Secret z Google Cloud Console
(OAuth client typu Web application, Authorized redirect URI `https://tpzeltvekvliqluhfrvn.supabase.co/auth/v1/callback`).
Kdo se přihlásí Googlem bez registrace, dokončí ji na `/registrace` bez hesla (účet je propojený, e-mail pevný).

## Věrnostní karty a registrace na jeden krok

Registrace (`/registrace`, `components/account/register-form.tsx`) je jméno, e-mail a souhlas; potvrzuje se šestimístným
kódem z e-mailu (Supabase OTP, šablony v `supabase/auth-emaily/` mají `{{ .Token }}`), heslo se nezadává. Rozpracovaná
registrace se ukládá podle e-mailu (`club_pending`), po ověření kódu ji `club_complete_registration` dokončí. Zvířata
se přidávají až v účtu za odměnu. Karty (`docs/KARTY.md`): dávky vznikají v Admin → Karty (tabulka `cards`, kód `DK` +
5 znaků + kontrolní znak, `lib/cards.ts`), tiskárna dostane CSV s adresou do QR `https://dokosti.cz/k/KÓD`. Stránka
`/k/[kód]` podle stavu karty (RPC `card_state`) nabídne aktivaci (registrace s kartou), doplnění e-mailu ke kartě z kasy,
přihlášení, nebo připojení karty k účtu (RPC `card_claim`). Kasa čte z QR celou adresu a kód si vytáhne; volnou kartu
přiřadí a zákazníkovi s e-mailem pošle „Aktivujte kartu“. Ztracená karta se blokuje v Admin → Karty.
Upsell („Lepší volba“) a cross-sell („Hodí se k tomu“) se nastavují u produktu v adminu (sloupce `upsell_slugs`,
`crosssell_slugs`); zobrazují se na detailu produktu, cross-sell také v košíku.

## Rozvržení administrace

Menu má sedm oddílů (`src/lib/admin-sections.ts`): Přehled, Kasa, Objednávky, Zboží a sklad, Zákazníci a klub, Slevy a akce,
Nastavení. Stránky, které byly dřív samostatné položky (Rozvoz a odběry, Předplatné, Sklad, Karty, Poradna, E-maily,
Statistiky, Můj účet), jsou záložky uvnitř oddílu (`SectionTabs` v layoutu); adresy se nezměnily. Přehled je „dnes“:
tržby, k vyřízení, sklad, klub, seznam „Co je potřeba udělat“ s tlačítkem u každé položky, týden v číslech a poslední
pohyby. Objednávky mají záložky podle práce (K vyřízení, Dnes k výdeji a rozvozu, Hotové, Vše) a tlačítko dalšího kroku
v řádku. Kasa: účtenka vlevo, světlé dlaždice s tečkou řady, platba jako obrazovka (způsob, rychlé částky, klávesnice,
přijato a vrátit). Návrh obrazovek: canvas „DoKosti admin a kasa: návrh“.

## Prodejna: sklad, role, marže

Produkt má prodejní jednotku `unit` (ks, nebo kg = na váhu jen v prodejně, cena za kg, na webu bez košíku), EAN pro čtečku a
poslední nákupní cenu `purchase_price_czk` (jen správce; marže v seznamu produktů a u formuláře). Stav skladu mění výhradně
tabulka `stock_movements` (příjem, prodej web, prodej kasa, storno, odpis, inventura, oprava) přes trigger; `create_order`
a storno zapisují pohyby, ruční změna v adminu se zapíše jako oprava. Admin → Sklad: příjemka (RPC `post_receipt`: položky,
pohyby, šarže s expirací, nákupní cena), seznam příjemek a pohybů; u produktu odpis a inventura (RPC `adjust_stock`) a historie.
`order_items.unit_cost_czk` drží nákupní cenu v době prodeje, statistiky z ní počítají hrubý zisk. Role v `admins.role`:
`spravce` (vše) a `obsluha` (bez nastavení, slev, e-mailů, statistik, předplatného a nákupních cen; RLS pro nastavení a kódy).

## Klub DoKosti (registrace, účet, karta, zvířata)

Návrh v `docs/KLUB.md`. Zákazník (`customers`) je střed: `user_id` (účet Supabase Auth), `card_code` (věrnostní karta),
objednávky, předplatné, Kostičky, zvířata (`pets.customer_id`) a souhlasy (`consent_marketing_email_at`,
`consent_marketing_sms_at`, `terms_accepted_at`, doklad v `consent_log`). Veřejná registrace `/registrace` má tři kroky
(vy, zvířata, souhlasy); `?karta=KÓD` předvyplní kartu (QR na kartě), `?kiosk=1` je režim pro tablet v prodejně (po
dokončení se zařízení odhlásí a vrátí na začátek). Průběh: `signUp` → `club_register_pending` (rozpracovaná registrace
k účtu) → po přihlášení `club_complete_registration` (spojí účet se zákazníkem podle e-mailu, karty nebo telefonu, uloží
souhlasy a zvířata, připíše uvítací Kostičky). Účet (`/ucet`) volá dokončení při každém otevření, takže funguje i po
potvrzení e-mailu. Odměny v Nastavení → Klub (`settings.club`): za registraci a za úplný profil zvířete
(`club_reward_pet`, jméno + váha + datum narození, nejvýš N profilů). V účtu jde upravit kontakt, adresu a souhlasy
(`club_update_profile`) a přidávat zvířata (`src/components/account/pet-form.tsx`, sdílené s registrací; profil se uloží
i jako vstup kalkulačky v `pets.data`). Přihlášení heslem nebo odkazem e-mailem (`signInWithOtp`). Kasa u zákazníka
ukazuje zvířata, admin má u zákazníka klub, souhlasy a zvířata a v seznamu filtry S účtem / S kartou / Newsletter.

Pozor: registrace posílá potvrzovací e-mail přes Supabase Auth. Vestavěný SMTP má limit pár e-mailů za hodinu, před
spuštěním nastavit vlastní SMTP (Resend) v Supabase → Authentication → SMTP a Site URL na doménu.

## Objednávka z adminu

Admin → Objednávky → Nová objednávka založí objednávku za zákazníka (telefon, pult): stávající zákazník podle jména,
telefonu nebo karty, nebo nový bez e-mailu. RPC `admin_create_order` počítá ceny jako `create_order` (bez minimální
objednávky), umí slevový kód, Kostičky, ruční slevu (jen správce, `orders.discount_note`) a příznak `orders.paid_at`
(zaplaceno předem; jde přepnout i v detailu objednávky). `orders.created_by` odlišuje objednávky z adminu od webu.
Potvrzení e-mailem se pošle jen s e-mailem zákazníka (`src/lib/order-emails.ts`, sdílené s webovou pokladnou).

## Kasa (prodejna)

`/admin/kasa` je celoobrazovková pokladna pro tablet nebo notebook, instalovatelná jako PWA (manifest na
`/admin/kasa/manifest.webmanifest`, ikony v `public/brand`). Bez otevřené směny (`pos_shifts`, počáteční hotovost) nejde
prodávat. Vlevo dlaždice produktů podle řad, vyhledávání slouží i jako čtečka: EAN přidá produkt, jiný kód se bere jako
zákaznická karta (`customers.card_code`; neznámý kód se při prvním načtení přiřadí stávajícímu nebo novému zákazníkovi).
Zboží na váhu se zadává v gramech. Účtenka: zákazník (volitelně), slevový kód, uplatnění Kostiček, ruční sleva (jen správce),
odložení účtu (localStorage), platba hotově (vrácení), kartou (terminál je samostatný) nebo QR platbou (SPD kód z čísla účtu
v Nastavení → Platba). RPC `pos_checkout` počítá ceny na serveru, zapisuje `pos_sales` (číselná řada U+rok+pořadí),
`pos_sale_items`, pohyby skladu `prodej_kasa` a Kostičky; `pos_cancel_sale` (storno: správce kdykoli, obsluha vlastní účtenku
do 10 minut) vrací sklad i body. U zákazníka v adminu je kód karty s čárovým kódem Code 128 (`src/lib/barcode.ts`) a seznam
nákupů v prodejně.
Záložka K výdeji vydává webové objednávky k osobnímu odběru (`pos_settle_order` označí objednávku jako doručenou a u dobírky
vezme hotovost). Účtenka pro 80 mm tiskárnu je na `/admin/kasa/uctenka/[id]` (`?tisk=1` otevře tisk). Po zaplacení se kasa
zeptá „Tisk účtenky“ / „Bez účtenky“; automatický tisk po každém prodeji lze zapnout v Nastavení → Kasa. Uzávěrka: vklady a výběry (`pos_cash_moves`), napočítaná hotovost a rozdíl (`pos_close_shift`).

## Testovací produkty

V Supabase jsou zveřejněné produkty českého výrobce Yoggies (yoggies.cz, výroba u Slaného, B2B portál b2b.yoggies.cz) s doslovným
složením, analytickými hodnotami a energií z jejich webu, maloobchodní ceny vč. DPH k 25. 9. 2026. SQL k opakovanému nahrání je
v `supabase/seed_yoggies.sql`, zdroje a mezery v `research_notes/dodavatel.md`. Původní placeholdery jsou v adminu nezveřejněné.

## Co je placeholder

Ceny, gramáže a složení v `catalog.ts`, ceny dopravy v `shipping.ts`, údaje o prodejně v `site.ts`
a texty právních stránek. Ceny a složení se podle `BRAND.md` nevymýšlejí, před spuštěním se nahradí
daty od výrobců.
