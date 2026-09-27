# Plán vývoje e-shopu DoKosti

Živý dokument. Každá položka má stav: **hotovo** (nasazeno na dokosti.vercel.app), **doladit** (funguje, ale
chce dotáhnout), **nápad** (zatím nic v kódu), **čeká** (závisí na firmě, dodavateli, prodejně nebo doméně). Postup u každé položky: nejdřív otázky a doporučení,
pak teprve kód, pak ověření v prohlížeči a nasazení do `main`.

**Stav projektu:** ve fázi příprav. Zatím není dodavatel, živnost ani prodejna. Web je proto prototyp, na kterém
ladíme funkce a vzhled; produkty Yoggies slouží jako realistická testovací data, ne jako nabídka. Vše, co vyžaduje
smlouvu, doménu nebo firmu, je v kategorii 9 jako checklist ke spuštění a do té doby se neřeší.

Pořadí: nejdřív software (co jde dělat hned), pak obsah, nakonec spuštění.

---

## 1. Obsah a data (až bude dodavatel)

| Položka | Stav | Poznámka |
|---|---|---|
| Testovací produkty | hotovo | 19 produktů Yoggies s reálným složením a energií, maloobchodní ceny. Slouží k ladění, ne k prodeji. |
| Skutečný sortiment a velkoobchodní ceny | čeká | Až bude dodavatel. Admin i seed SQL jsou připravené. |
| Fotky produktů | čeká | Bucket `product-images` je připravený. Formát 1:1, jednotné pozadí. |
| Údaje prodejny v Nastavení | čeká | Placeholdery, dokud není adresa, telefon, IČO. |
| Texty právních stránek | čeká | Obchodní podmínky a Ochrana údajů potřebují IČO a právní formu. |
| Startovací balíčky | nápad | Stránka Jak začít je na ně připravená (slug `startovaci-…`). |

## 2. Katalog a nákup

| Položka | Stav | Poznámka |
|---|---|---|
| Řady Základ, Kosti, Navíc, Mlsky, Granule, filtr pes/kočka | hotovo | |
| Detail produktu, upsell a cross-sell | hotovo | Nastavuje se v adminu u produktu. |
| Vyhledávání s našeptávačem | hotovo | |
| Košík s cross-sell návrhy | hotovo | |
| Pokladna: odběr, rozvoz (dny), přepravce, platba převodem a na místě | hotovo | |
| Slevové kódy, Kostičky | hotovo | Kostičky 1 za 10 Kč, 100 = 50 Kč. |
| Platební brána (karta online, opakovaná platba) | čeká | Comgate nebo GoPay vyžadují firmu, účet a doménu. Do kódu se dá připravit rozhraní. |
| Varianty balení jednoho produktu (700 g / 1,3 kg / 12×150 g) | nápad | Dnes je každé balení samostatný produkt. Yoggies má tři velikosti u každého mixu. |
| Hodnocení a recenze produktů | nápad | Až budou zákazníci. |
| Dárkové poukazy | nápad | |

## 3. Kalkulačka a poradenství

| Položka | Stav | Poznámka |
|---|---|---|
| Kalkulačka dávky (FEDIAF, štěňata, koťata, senior, březost, kojení) | hotovo | Jedno zvíře, živý výpočet, denně / týdně / měsíčně. |
| Jeden nákup s vyřazením a náhradou druhu, 7 / 14 / 30 dní | hotovo | |
| Doplňky a alergie („Nesmí“) | hotovo | |
| Plán krmení v PDF: stažení, tisk, e-mail | hotovo | E-mail odejde až s Resend. |
| Profil zvířete k účtu | hotovo | |
| Stránka Jak začít s BARFem, FAQ, poradna | hotovo | Texty od vás; dvě formulace jsou blízko zdravotních tvrzení (čistší zuby, krevní rozbor). |
| Připomínka převážení za 2–4 týdny (e-mail) | nápad | Vyžaduje uložený profil a Resend. |
| Kalkulačka na detailu produktu („kolik balení pro mého psa“) | nápad | Z uloženého profilu. |

## 4. Zákaznický účet

| Položka | Stav | Poznámka |
|---|---|---|
| Registrace, přihlášení, obnova hesla | hotovo | V Supabase je nutné nastavit Site URL a Redirect URL. |
| Přehled objednávek, Kostiček, profilů zvířat, předplatného | hotovo | |
| Předvyplnění pokladny z účtu | hotovo | |
| Úprava kontaktních údajů a adresy v účtu | nápad | Dnes se berou z poslední objednávky. |
| Opakovat objednávku jedním kliknutím | nápad | |
| Smazání účtu (GDPR) | nápad | |

## 5. Předplatné (pravidelný odběr)

| Položka | Stav | Poznámka |
|---|---|---|
| Volba v pokladně, sleva, stránka správy, e-maily, denní cron | hotovo | Platba za každou dodávku zvlášť. |
| Admin: seznam, detail, nastavení | hotovo | |
| Přidání nového produktu do běžícího předplatného | nápad | Dnes jde jen měnit množství a odebírat. |
| Opakovaná platba kartou | nápad | Až s bránou. |
| Dodávky z předplatného v plánu rozvozu dopředu | nápad | Dnes se objeví až jako objednávka den předem. |

## 6. Administrace a provoz

| Položka | Stav | Poznámka |
|---|---|---|
| Přehled, objednávky se stavy, e-maily zákazníkům | hotovo | |
| Rozvoz a odběry podle dne, tisk štítků | hotovo | |
| Produkty, sklad, šarže a expirace, fotky | hotovo | |
| Zákazníci s historií a poznámkou | hotovo | |
| Slevové kódy, e-maily (log), poradna, statistiky, export CSV | hotovo | |
| Doklady (číselná řada, tisk, DPH přepínač) | hotovo | DPH „ještě nevím“. |
| Nastavení: prodejna, doprava, platba, texty, Kostičky, předplatné | hotovo | |
| Změna hesla správce | hotovo | Výchozí heslo je nutné změnit. |
| Role: partner s plnými právy | doladit | Tabulka `admins`, druhý účet se přidá ručně v Supabase. |
| Hromadná úprava cen a stavu skladu | nápad | Např. + 5 % u celé řady. |
| Objednávka za zákazníka z adminu (telefonická) | nápad | |
| Propojení s účetnictvím (Pohoda, iDoklad) | nápad | Dnes CSV export. |
| Skladové příjemky od dodavatele | nápad | |

## 7. E-maily a notifikace

| Položka | Stav | Poznámka |
|---|---|---|
| Šablony: potvrzení, upozornění prodejně, změny stavu, plán, předplatné | hotovo | |
| Odesílání přes Resend | čeká | Vyžaduje doménu; do té doby fronta v adminu, kde se dají e-maily prohlédnout. |
| SMS před rozvozem | nápad | |
| Newsletter | nápad | Souhlas, odhlášení, šablona. |

## 8. Marketing, SEO a měření

| Položka | Stav | Poznámka |
|---|---|---|
| Sitemap, robots, JSON-LD, meta popisy | hotovo | |
| Cookies lišta a Google Analytics | hotovo | Zapne se proměnnou `NEXT_PUBLIC_GA_ID`. |
| Blog / rady (články k SEO) | nápad | |
| Sociální sítě a sdílení produktů | nápad | Open Graph obrázky. |
| Google Business, Mapy | nápad | Mimo kód. |

## 9. Spuštění (checklist, až bude firma a dodavatel)

| Položka | Stav | Poznámka |
|---|---|---|
| Supabase (migrace 0001–0015), Vercel, auto-deploy z main | hotovo | |
| Živnost / firma, IČO, případně DPH | čeká | Rozhoduje o dokladech, právních textech a bráně. |
| Dodavatel a smlouva | čeká | Yoggies má B2B portál a je 15 km od Kladna; rozhodnutí je na vás. |
| Prodejna nebo výdejní místo, mrazicí kapacita | čeká | Bez prodejny dává smysl začít jen rozvozem a přepravcem. |
| Doména | čeká | Rozhoduje o Resend, Supabase Auth URL, SEO. |
| Platební brána | čeká | Viz kategorie 2. |
| Zálohy databáze | nápad | Supabase má denní zálohy v placeném plánu. |
| Právní kontrola textů a tvrzení (nařízení 767/2009) | nápad | Jedna kontrola před spuštěním. |
| Testovací provoz s pár zákazníky | nápad | |

## 10. Prodejna (POS a sklad)

E-shop je zároveň systém pro prodejnu: stejné produkty, sklad, zákazníci, Kostičky a doklady. Kasa běží v prohlížeči na
tabletu nebo notebooku jako instalovatelná webová aplikace (PWA), bez offline režimu (v prodejně záložní LTE). Platební
terminál je samostatná krabička, propojí se později. EET neexistuje.

| Krok | Položka | Stav | Poznámka |
|---|---|---|---|
| 1 | Datový základ: jednotka ks/kg, cena za kg, EAN, role správce/obsluha, pohyby skladu, nákupní ceny a marže | hotovo | Migrace 0016. Roli druhému účtu nastaví správce v Supabase (`admins.role`). |
| 2 | Příjemky, odpisy, inventura, historie pohybů u produktu, hrubý zisk ve statistikách | hotovo | Admin → Sklad; odpis a inventura u produktu. Šarže vznikají z příjemky. |
| 3 | Kasa: dlaždice, čtečka, zákazník a Kostičky, sleva, hotově/kartou, účtenka 80 mm, storno, výdej webových objednávek | nápad | PWA na /admin/kasa. |
| 4 | Denní uzávěrka, účtenky v číselné řadě, statistiky web vs. prodejna | nápad | |
| 5 | Terminál, Bluetooth tiskárna, nativní obálka pro Android | nápad | Až bude důvod. |

---

## Jak postupujeme

1. Vyberete položku. Já položím otázky a doporučím, co by tam mělo být a co ne.
2. Když napíšete něco, co nedává smysl nebo koliduje s tím, co už je, řeknu to rovnou s důvodem.
3. Dohodneme podobu (u vzhledu nejdřív návrh), pak píšu kód.
4. Ověřím v prohlížeči, nasadím do `main` a označím položku v tomto plánu.
