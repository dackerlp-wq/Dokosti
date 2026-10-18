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

Titulek: **Prodejna, ne sklad.** Tři ikonové dlaždice:

- **Prodejna v Kladně.** Mrazáky, váha, člověk, který syrově krmí vlastního psa. Poradíme a nepřemlouváme.
- **Rozvoz po Kladně.** Vozíme sami v chladicím boxu, mražené dovezeme mražené. Domluvíme den a hodinu.
- **Pět řad.** BARF mixy, Kosti, Navíc, Mlsky, Granule. Od výrobců, u kterých víme, co je v balíčku.

Bez cen a bez názvů výrobců, dokud nejsou domluvení.

### 3. Kalkulačka (bílá)

Titulek: **Kolik toho denně do misky?** Vložená kalkulačka v režimu bez produktů. Pod výsledkem jedna věta: „Až otevřeme, složíme vám z toho dodávku. Zapište se a pošleme vám výsledek i s první nabídkou.“ Tlačítko vede na listinu a předvyplní zvíře a hmotnost.

Proč: kalkulačka je jediný důvod přijít na web dřív než v dubnu, a lidem, co už krmí syrově, dá najevo, že víme, o čem mluvíme (FEDIAF, metabolická hmotnost, kosti jako náhrada mixu).

### 4. Listina zakládajících zákazníků (cream)

Nadtitulek: `Zakládající zákazník`. Titulek: **Prvních padesát z Kladna.**

Odstavec: Prvních padesát lidí z listiny, kteří po otevření nakoupí, bere jako zakládající zákazníky. Platí to na jméno, bez časového limitu na první nákup.

Co dostanou (návrh, viz poznámka níže):

- Rozvoz po Kladně zdarma na celý první rok.
- 15 % na první nákup.

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

Titulek: **Psa krmíme syrově [X] let.** Jeden odstavec za tvář značky, křestní jméno, jméno psa, plemeno, jak dlouho syrově, co je na tom vedlo k otevření prodejny. Kulatá fotka člověka se psem. Odkazy: Instagram, Facebook.

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

1. **Tři odměny najednou jsou moc.** Rozvoz zdarma na rok stojí jen čas a pro lidi od online e-shopů je to hlavní důvod přejít. 15 % na první nákup je jednorázové a jasné. Trvalou slevu bych teď nesliboval: marže na mraženém krmivu je tenká a slib padesáti nejaktivnějším zákazníkům platí navždy. Nechte si ji jako rezervu, třeba pro pravidelné odběry.
2. **Konkurence v Kladně.** Když už tu někdo prodává, nestačí „syrové krmivo v Kladně“. Stránka musí říct, v čem jste jiní: rozvoz, poradna a kalkulačka, otevírací doba, šíře řad, konkrétní výrobci. Potřebuji o ní vědět víc, viz otázky.
3. **Bez cen a bez výrobců**, dokud nejsou smlouvy. Stránka se nedá nachytat na slibu.
4. **Double opt-in** (potvrzení e-mailu kliknutím) je čistší vůči GDPR i vůči kvalitě listiny. Stojí jeden e-mail navíc. Doporučuji ano.
