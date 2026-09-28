# Věrnostní karty a jednoduchá registrace (návrh)

Cíl: zákazník se zaregistruje na jednom místě, jedním krokem, kdekoliv (u pultu, doma, z QR na kartě), a předtištěná
karta z prodejny se k účtu připojí sama. Bez hesla, bez tří kroků, bez přepisování kódů.

## 1. Karty

- Karty jsou **předtištěné v dávkách**. Každá má vlastní kód, který vznikne v adminu **před tiskem** (Admin → Karty →
  „Nová dávka“, např. 200 kusů). Tiskárna dostane CSV: kód, adresa QR. Kód nikdo nevymýšlí ani nepřepisuje.
- Formát kódu: `DK` + 6 znaků bez zaměnitelných písmen (bez 0/O, 1/I), např. `DK7F4K2M`. Poslední znak je kontrolní,
  takže překlep nebo cizí kód se pozná hned, bez dotazu do databáze.
- Na kartě jsou tři věci: **QR** s adresou `https://dokosti.cz/k/DK7F4K2M` (telefon zákazníka), **čárový kód**
  Code 128 se stejným kódem (USB čtečka u kasy) a **kód tiskacím písmem** (ruční zadání, když selže obojí).
- Tabulka `cards`: kód, stav (`volna`, `prirazena`, `blokovana`), dávka, zákazník, kdy přiřazena. Karta funguje pro
  Kostičky hned po přiřazení u kasy, účet není podmínka. Stávající ručně zadané kódy zůstávají platné.

## 2. Jedna stránka pro všechno: `/k/KÓD`

Sken QR na kartě otevře `/k/KÓD`. Stránka se podívá, v jakém stavu karta je, a ukáže jen to, co dává smysl:

| Stav karty                                   | Co zákazník vidí                                                                    |
| -------------------------------------------- | ----------------------------------------------------------------------------------- |
| volná                                        | „Aktivujte kartu“: jméno, e-mail, souhlas → kód z e-mailu → hotovo, karta i účet    |
| přiřazená u kasy, zákazník bez účtu          | „Karta Jany N.? Zadejte e-mail“ → kód z e-mailu → účet vznikne a spojí se s kartou  |
| přiřazená, zákazník má účet, nepřihlášen     | přihlášení (kód e-mailem nebo Google), pak rovnou účet                              |
| přiřazená, přihlášený je její majitel        | rovnou účet (karta = rychlý vstup do účtu)                                          |
| volná, zákazník je přihlášený                | „Připojit kartu k účtu“ jedním tlačítkem                                            |
| přiřazená jinému účtu                        | „Karta patří někomu jinému, ozvěte se nám“                                          |
| neplatný kód / blokovaná                     | vysvětlení a odkaz na registraci bez karty                                          |

Stejná stránka funguje na tabletu v prodejně (`?kiosk=1`: po dokončení se odhlásí a vrátí na začátek).

## 3. Registrace = jeden krok, potvrzení kódem

- Formulář: **jméno, e-mail, jeden souhlas** (podmínky + zpracování údajů). Volitelně zaškrtnutí novinek.
  Telefon až když je potřeba (rozvoz, výdej, u kasy), heslo si zákazník může nastavit v účtu, nemusí.
- Potvrzení: na e-mail přijde **šestimístný kód**, zákazník ho opíše do stejné stránky. Žádný odkaz, žádné přepínání
  do pošty a zpět, funguje na tabletu i v cizím prohlížeči. (Supabase OTP; v šabloně e-mailu je `{{ .Token }}`
  i odkaz jako záloha.) Google zůstává jako druhá cesta.
- Po potvrzení: účet + záznam zákazníka + karta (když byla) + 50 Kostiček. Uvítací obrazovka nabídne
  „Přidejte psa nebo kočku, získáte 150 Kostiček“. Zvířata už nejsou krok registrace, ale odměna v účtu.
- `/registrace` bez karty je tentýž formulář. Účet z objednávky: v pokladně zaškrtávátko „Chci Kostičky za tuto
  objednávku“ (předvybrané), e-mail už máme; po objednávce přijde kód a účet je hotový včetně bodů za nákup.

## 4. U kasy

- Sken volné karty (čtečka) → „Nová karta“: obsluha vybere zákazníka nebo zadá jméno (+ telefon, e-mail nepovinné),
  karta se přiřadí, Kostičky se sbírají hned. Když je e-mail, odejde e-mail „Aktivujte účet“ s odkazem `/k/KÓD`.
  Bez e-mailu si zákazník kartu aktivuje doma sám přes QR (stav „přiřazená bez účtu“ výše).
- Sken přiřazené karty → zákazník, body, zvířata, jako dnes.
- Obsluha nikdy nevidí heslo ani nezakládá účet; účet vzniká vždy potvrzením e-mailu zákazníkem.

## 5. Co se nemění

`customers` zůstává střed, Kostičky, objednávky a předplatné visí na něm. `club_complete_registration` už umí spojit
podle e-mailu, karty nebo telefonu a řešit konflikty; jen přibude tabulka `cards` a kontrola kódu.

## 6. Rozsah práce

1. Migrace: tabulka `cards`, generátor dávky, RPC `card_state(kód)` (anonymně, vrací stav a iniciály), napojení
   `pos_assign_card` a `club_complete_registration` na `cards`.
2. Admin → Karty: dávky, export CSV pro tiskárnu, stav karet, blokace ztracené karty.
3. Stránka `/k/[kód]` a nová jednokroková `/registrace` s potvrzením kódem; e-mailová šablona s kódem.
4. Kasa: sken volné karty → přiřazení + e-mail s aktivací.
5. Pokladna: účet z objednávky.

Body 1 až 3 jsou jádro, 4 a 5 doplňky. Odhad: jádro jedno odpoledne práce, doplňky další.
