# Předstartovní web DoKosti (do otevření, duben 2027)

Návrh k odsouhlasení. Nic z toho zatím není v kódu. Cíl stránky je jediný: získat před otevřením 100 lidí z Kladna a okolí, kteří už krmí syrově, a dát jim mezitím něco užitečného. Všechno ostatní (katalog, košík, účet, plán na míru s nákupem) zůstane v kódu, ale veřejně se schová.

## Co se změní

| Zůstane veřejné | Schová se (přesměrování na úvod) |
| --- | --- |
| `/` úvod v nové podobě (níže) | `/rada/*`, `/produkt/*`, `/hledat` |
| `/kalkulacka` (bez nákupního seznamu a košíku) | `/kosik`, `/pokladna`, `/ucet`, `/registrace`, `/predplatne/*` |
| `/jak-zacit-s-barfem` (bez startovacích balíčků) | `/krmeni-na-miru` (končí nákupem, vrátí se s e-shopem) |
| `/o-nas`, `/kontakt`, `/ochrana-udaju`, `/obchodni-podminky` | mega menu řad v hlavičce |

Technicky: přepínač `prelaunch` v nastavení obchodu (admin), hlavička i patička ho čtou. Vypnutím se jedním klikem vrátí celý e-shop. Kalkulačka dostane režim bez produktů: ukáže gramy a poměr, ne nákupní seznam.

## Rozvržení úvodní stránky

Sekce střídají bílou a `paper`, jedna `cream` (listina), jedna cihlová akce v pohledu: zápis na listinu.

### 0. Oznamovací lišta (ochre)

> Otevíráme v Kladně na jaře 2027. Zapište se, dáme vám vědět první.

### 1. Hero (bílá)

- Nadtitulek: `Syrové krmivo pro psy a kočky · Kladno`
- H1 (Amatic): **Poctivé do kosti.**
- Odstavec: Na jaře 2027 otevíráme v Kladně prodejnu se syrovým krmivem a e-shop. Do té doby tu máte kalkulačku dávky a listinu lidí, kterým dáme vědět první a kteří nakoupí za podmínek zakládajícího zákazníka.
- Cihlové tlačítko: **Zapsat se na listinu** (kotva na sekci 4)
- Vedlejší tlačítko: Spočítat dávku
- Fotka: pes zakladatele se surovinami, vyříznutý na bílé. Do té doby logo na krémovém disku jako dnes.

### 2. Co připravujeme (paper)

V Kladně už je specializovaná BARF prodejna a výdejní místo online e-shopu. Stránka proto neříká „syrové krmivo v Kladně“, to lidé mají. Říká, co je u nás jinak, a jen to, co platí od prvního dne. Titulek: **Prodejna, ne sklad.** Čtyři ikonové dlaždice:

- **Dovezeme až domů.** Kladno a okolí vozíme sami v chladicím boxu, mražené dovezeme mražené. Domluvíme den a hodinu, zakládající zákazníci první rok zdarma.
- **Spočítáme a složíme.** Kalkulačka dávky podle hmotnosti, věku a kondice. V prodejně z ní rovnou složíme dodávku na čtrnáct dní.
- **Jiní výrobci, širší řady.** Značky, které v Kladně zatím nekoupíte, a pět řad od mixů po granule. Jména doplníme, až budou smlouvy.
- **Otevřeno, když máte čas.** [Večerní hodiny a sobota], místo [u parkoviště / na trase]. Doplnit po nalezení prostoru.

Bez cen a bez názvů výrobců, dokud nejsou domluvení. Konkurenci nikde nejmenujeme ani nesrovnáváme.

### 3. Kalkulačka (bílá)

Titulek: **Kolik toho denně do misky?** Vložená kalkulačka v režimu bez produktů. Pod výsledkem jedna věta: „Až otevřeme, složíme vám z toho dodávku. Zapište se a pošleme vám výsledek i s první nabídkou.“ Tlačítko vede na listinu a předvyplní zvíře a hmotnost.

Proč: kalkulačka je jediný důvod přijít na web dřív než v dubnu, a lidem, co už krmí syrově, dá najevo, že víme, o čem mluvíme (FEDIAF, metabolická hmotnost, kosti jako náhrada mixu).

### 4. Listina zakládajících zákazníků (cream)

Nadtitulek: `Zakládající zákazník`. Titulek: **Prvních padesát z Kladna.**

Odstavec: Prvních padesát lidí z listiny, kteří po otevření nakoupí, bere jako zakládající zákazníky. Platí to na jméno, bez časového limitu na první nákup.

Co dostanou (odsouhlaseno):

- Rozvoz po Kladně zdarma na celý první rok.
- 15 % na první nákup.

Trvalá sleva se neslibuje, zůstává v záloze pro pravidelné odběry.

Formulář (6 polí, z toho 3 povinná):

| Pole | Povinné | Proč |
| --- | --- | --- |
| E-mail | ano | kontakt |
| Obec nebo PSČ | ano | víme, odkud lidé jsou a kam má smysl rozvoz |
| Pro koho: pes / kočka / oba | ano | sortiment při otevření |
| Krmíte už syrově? ano / přecházíme / zatím ne | ne | kolik z listiny je cílová skupina |
| Odkud dnes krmivo berete? (text) | ne | konkurence a výrobci, které lidé chtějí |
| Jméno nebo přezdívka | ne | oslovení v e-mailu |

Souhlas: „Zapsáním souhlasíte, že vám pošleme zprávu o otevření a nejvýš jednu zprávu měsíčně do té doby. Odhlásit se jde v každé zprávě.“ Odkaz na ochranu údajů.

Po odeslání: „Jste na listině jako číslo 37. Napíšeme, až budeme mít termín otevření.“ Pořadové číslo je levný a silný prvek: lidé ho sdílejí.

### 5. Kdo za tím stojí (bílá)

Titulek: **[Jméno psa] jí syrově [X] let.** Odstavec (doplnit z poznámky): „Jsem [křestní jméno]. [Jméno psa], [plemeno], jí syrově od [rok]. Začínali jsme stejně jako vy: tabulky, dohady, mrazák plný otazníků. Prodejnu otevíráme proto, aby to měl v Kladně někdo za sebou dřív než vy.“ Kulatá fotka člověka se psem. Odkazy: Instagram, Facebook.

Druhý zakladatel se nezmiňuje jménem, jen „jsme dva, Dvořák a Kostová, odtud DoKosti“, pokud s tím souhlasí.

### 6. Deník (paper)

Titulek: **Co jíme tenhle týden.** Tři poslední příspěvky z Instagramu (zpočátku ručně: fotka, datum, dvě věty, odkaz). Nepotřebuje API, stačí tabulka v adminu. Ukazuje, že web žije, i když se nic neprodává.

### 7. Patička

Kontakt (e-mail, telefon až bude), Instagram, Facebook, Ochrana údajů, Obchodní podmínky až k otevření. Bez odkazů na řady.

## Data a admin

- Tabulka `waitlist`: `id`, `email` (unikátní), `name`, `city`, `animal`, `feeds_raw`, `source_today`, `consent_at`, `source` (odkud přišel: ig, fb, qr, přímý), `created_at`.
- Admin stránka `Listina`: počet celkem, z Kladna, kolik krmí syrově, tabulka, export CSV. Žádný e-mailový nástroj, rozesílku na 100 lidí zvládne na začátku skrytá kopie nebo bezplatný tarif Ecomailu.
- Pořadové číslo v potvrzení = pořadí v tabulce.

## Texty mimo web, které stránka potřebuje

- Instagram a Facebook bio: „Syrové krmivo pro psy a kočky. Prodejna v Kladně od jara 2027. Zatím: kalkulačka dávky a listina na [doména].“
- QR kód na listinu pro výlohu, cvičák, salon. Parametr `?z=qr`, ať víte, co funguje.
- Potvrzovací e-mail: 5 vět, pořadové číslo, co bude dál, odkaz na kalkulačku.

## Poznámky k rozhodnutí

1. **Odměny odsouhlaseny:** rozvoz zdarma na rok a 15 % na první nákup, bez trvalé slevy.
2. **Konkurence v Kladně** je specializovaná BARF prodejna a výdejní místo e-shopu. Odlišení je v sekci 2: rozvoz, poradna a kalkulačka, jiní výrobci, otevírací doba a místo. Z toho rozvoz a kalkulačka jsou jisté hned, výrobci a hodiny se doplní. Konkurenci nejmenovat.
3. **Bez cen a bez výrobců**, dokud nejsou smlouvy. Stránka se nedá nachytat na slibu.
4. **Double opt-in** (potvrzení e-mailu kliknutím) je čistší vůči GDPR i vůči kvalitě listiny. Stojí jeden e-mail navíc. Doporučuji ano.
