# Plán vývoje e-shopu DoKosti

Živý dokument. Každá položka má stav: **hotovo** (nasazeno na dokosti.cz), **doladit** (funguje, ale
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
| Podkategorie podle druhu masa, filtry v řadě (maso, zvíře, skladem, skladování, balení, řazení), megamenu | hotovo | Řada Základ přejmenována na BARF mixy (slug barf, staré adresy přesměrované). Druhy masa jsou `products.meats`, upraví se v adminu. Migrace 0022. |
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

Klub DoKosti (návrh v `KLUB.md`): jedna registrace `/registrace` pro e-shop i věrnostní kartu, tablet v prodejně (`?kiosk=1`), QR na kartě (`?karta=KÓD`). Zákazník je střed: účet, karta, objednávky, Kostičky, zvířata a souhlasy. Migrace 0021.

| Položka | Stav | Poznámka |
|---|---|---|
| Registrace do klubu (3 kroky: vy, zvířata, souhlasy), propojení podle e-mailu, karty a telefonu | hotovo | Odměna 50 Kostiček za registraci a 150 za úplný profil zvířete (nejvýš 3), v Nastavení → Klub. |
| Profily zvířat strukturovaně (druh, plemeno, narození, váha, kastrace, aktivita, kondice, krmení, vyloučená masa) | hotovo | Sdílené s kalkulačkou, vidí je kasa i admin. |
| Přihlášení odkazem e-mailem | hotovo | SMTP přes Resend, české šablony v `supabase/auth-emaily/`. |
| Přihlášení a registrace přes Google | doladit | Kód hotový; v Supabase zapnout Google provider (Client ID a Secret z Google Cloud). |
| Newsletter: segmenty podle zvířat, rozesílka, odhlášení odkazem | nápad | Souhlasy a filtr zákazníků už jsou. |
| Automatické e-maily: převážení štěněte, narozeniny zvířete s kódem | nápad | Z profilů zvířat. |
| Smazání účtu (GDPR) | nápad | Anonymizace objednávek. |

| Položka | Stav | Poznámka |
|---|---|---|
| Registrace, přihlášení, obnova hesla | hotovo | Registrace na jeden krok s kódem z e-mailu, bez hesla; heslo volitelně v účtu. |
| Administrace: sedm oddílů, Přehled „dnes“, Objednávky podle práce, kasa s platbou na obrazovce | hotovo | Podle návrhu na canvasu; Předplatné na frontendu je další krok. |
| Věrnostní karty: dávky, QR, /k/KÓD, aktivace z kasy | hotovo | Admin → Karty, docs/KARTY.md. Zbývá: účet z objednávky v pokladně. |
| Přehled objednávek, Kostiček, profilů zvířat, předplatného | hotovo | |
| Předvyplnění pokladny z účtu | hotovo | |
| Úprava kontaktních údajů a adresy v účtu | hotovo | V účtu, včetně souhlasů (newsletter, SMS). |
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
| Objednávka za zákazníka z adminu (telefonická) | hotovo | Admin → Objednávky → Nová objednávka (správce i obsluha). E-mail nepovinný, slevový kód, Kostičky, ruční sleva jen správce, „už zaplaceno“. Migrace 0020. |
| Propojení s účetnictvím (Pohoda, iDoklad) | nápad | Dnes CSV export. |
| Skladové příjemky od dodavatele | nápad | |

## 7. E-maily a notifikace

| Položka | Stav | Poznámka |
|---|---|---|
| Šablony: potvrzení, upozornění prodejně, změny stavu, plán, předplatné | hotovo | |
| Krmení na míru: průvodce, plán s cenou za den, předplatné 2/4 týdny, Kostičky navíc | hotovo | docs/PREDPLATNE.md. Zbývá: připomínka převážení e-mailem. |
| Odesílání přes Resend | hotovo | Doména dokosti.cz ověřená, odesílatel objednavky@dokosti.cz, sledování kliknutí vypnuté. Log v adminu → E-maily. |
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
| Doména dokosti.cz | hotovo | DNS u Forpsi, web na Vercelu, www přesměrovává na dokosti.cz. Zbývá Resend a Supabase Auth URL. |
| Platební brána | čeká | Viz kategorie 2. |
| Zálohy databáze | nápad | Supabase má denní zálohy v placeném plánu. |
| Vlastní doména pro Supabase Auth (auth.dokosti.cz) | nápad | V okně Googlu se pak místo tpzeltvekvliqluhfrvn.supabase.co ukáže dokosti.cz. Vyžaduje plán Pro + doplněk Custom Domain; pak přepnout NEXT_PUBLIC_SUPABASE_URL a redirect URI v Google Cloud. |
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
| 3 | Kasa: dlaždice, čtečka, zákazník a Kostičky, sleva, hotově/kartou/QR, účtenka 80 mm, storno, odložené účty, výdej webových objednávek | hotovo | Migrace 0017, PWA na /admin/kasa. Zákaznické karty s předtištěným kódem se přiřadí při prvním načtení. QR platba potřebuje číslo účtu v Nastavení → Platba. |
| 4 | Denní uzávěrka, účtenky v číselné řadě, vklady a výběry hotovosti, storno obsluhou do 10 minut, kód karty a nákupy v prodejně u zákazníka | hotovo | Směna se otevře počátečním stavem, uzávěrka spočítá rozdíl. Statistiky web vs. prodejna zatím jen přes pohled `pos_sales_by_day` (doladit). |
| 5 | Terminál, Bluetooth tiskárna, nativní obálka pro Android | nápad | Až bude důvod. |

---

## Jak postupujeme

1. Vyberete položku. Já položím otázky a doporučím, co by tam mělo být a co ne.
2. Když napíšete něco, co nedává smysl nebo koliduje s tím, co už je, řeknu to rovnou s důvodem.
3. Dohodneme podobu (u vzhledu nejdřív návrh), pak píšu kód.
4. Ověřím v prohlížeči, nasadím do `main` a označím položku v tomto plánu.
