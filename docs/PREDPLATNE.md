# Krmení na míru: průvodce a předplatné na webu (návrh)

Vzor: průvodce typu PsiBufet. Zákazník odpoví na pár otázek o svém zvířeti, dostane plán s cenou za den a jedním
kliknutím si ho nechá posílat pravidelně. Bez závazku, změní nebo pozastaví kdykoli v účtu.

## Co už máme a použijeme

- Kalkulačka (`lib/barf.ts`): z údajů o zvířeti spočítá denní dávku a sestaví nákup na 7/14/28 dní z naší nabídky
  (`buildPlan` → produkty, kusy, cena za období i za den). Průvodce je jen jiný, přívětivější obal téže logiky.
- Klub: profil zvířete v účtu (`pets`), odměna za profil, registrace kódem z e-mailu.
- Předplatné: `create_subscription` z pokladny, interval a den dodání, stránka správy (`/predplatne/[token]`),
  e-maily, denní cron, admin.

## Průvodce `/krmeni-na-miru`

Jedna otázka na obrazovku, velká tlačítka, ukazatel postupu, jde zpět. Na telefonu i tabletu v prodejně.

| Krok | Otázka                       | Pole                                                                  |
| ---- | ---------------------------- | --------------------------------------------------------------------- |
| 1    | Pro koho plán děláme?        | pes / kočka, jméno                                                    |
| 2    | Kolik je Rexovi?             | štěně (měsíce) / dospělý (roky) / senior; u štěněte odhad dospělé váhy |
| 3    | Kolik váží a jak vypadá?     | váha, kondice (4 siluety: hubený, ideální, nadváha, obezita)          |
| 4    | Jak je aktivní?              | nízká / běžná / vysoká / pracovní, kastrace                           |
| 5    | Co teď žere?                 | granule / vařené / syrové / mix; „začínáme se syrovým“ → přechodový plán |
| 6    | Co nesmí nebo nemá rád?      | druhy masa (štítky s ilustracemi), nepovinné                          |
| 7    | **Plán pro Rexe**            | viz níže                                                              |
| 8    | Kam plán poslat?             | e-mail (+ jméno) → kód z e-mailu = účet a profil Rexe (150 Kostiček)  |
| 9    | Dodání a platba              | stávající pokladna s předvyplněným košíkem a předplatným              |
| 10   | Hotovo                       | první dodávka, odkaz do účtu, co čekat (přechod, převážení za 4 týdny) |

Kdo je přihlášený, krok 8 nevidí; kdo má v účtu zvíře, může začít rovnou od kroku 7 („Plán pro Rexe“).

## Krok 7: Plán

- Nahoře: „Rex potřebuje **565 g denně**“ a věta proč (váha, aktivita, věk). Nic zdravotního, jen orientační dávka.
- Složení dodávky: produkty s kusy na období, každý s „proč“ (základ, rybí den, kosti, olej). Jde odebrat nebo
  nahradit jiný druh masa (už umí kalkulačka).
- **Cena za den** velkým písmem (např. 43 Kč/den), pod tím cena za dodávku.
- Přepínač: **Pravidelně** (výchozí) vs. **Jen vyzkoušet**.
  - Pravidelně: interval každé 2 nebo 4 týdny (podle mrazáku zákazníka), Kostičky navíc za předplatné, „kdykoli
    pozastavíte nebo zrušíte“.
  - Jen vyzkoušet: zkušební balíček na 7 dní se slevou (výše slevy = nastavení, placeholder), po týdnu e-mail
    „Jak Rexovi chutnalo? Nastavte si pravidelné dodávky“.
- Rozvoz / odběr v prodejně, orientační první termín.

## Účet: Můj plán

Sekce „Plán pro Rexe“: dávka, složení, další dodávka, tlačítka Přeskočit / Změnit složení / Změnit interval /
Pozastavit (stávající správa předplatného, jen zasazená do účtu místo odkazu s tokenem). Připomínka převážení
po 4 týdnech e-mailem s odkazem „přepočítat plán“.

## Co nový nebo upravený kód obnáší

1. Průvodce jako jedna klientská komponenta s kroky nad `AnimalInput` a `buildPlan` (bez nové logiky výpočtu).
2. Krok 8: registrace kódem (hotové), uložení profilu zvířete (hotové `savePetProfile`).
3. Pokladna: přijme předvyplněný košík a předplatné z průvodce (dnes bere `?predplatne=` z kalkulačky, doplní se
   položky), nastavení „zkušební balíček“ (sleva, počet dní) v adminu.
4. Účet: sekce Můj plán s manage komponentou podle `customers.user_id` (RLS už je).
5. E-maily: „Jak chutnalo?“ po zkušebním balíčku, připomínka převážení (obojí přes stávající cron).

Odhad: průvodce s plánem a napojením na pokladnu jeden až dva dny, účet a e-maily další půlden.
