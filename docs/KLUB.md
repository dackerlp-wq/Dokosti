# Klub DoKosti: registrace, účet, karta a data o zvířatech (návrh)

Stav: návrh k odsouhlasení. Po dohodě se rozpadne na kroky v `PLAN.md` (kategorie 4 Zákaznický účet).

## Co je dnes

- Účet zákazníka = Supabase Auth (e-mail + heslo). Tabulka `customers` je s účtem spojená jen přes e-mail,
  nemá `user_id`. Zákazník založený u kasy (jen jméno, telefon, karta) účet nemá a e-mail mít nemusí.
- Kostičky, objednávky, předplatné a karta visí na `customers`; profily zvířat z kalkulačky (`pets`) visí na
  `auth.users`. Dvě větve, které se nepotkají.
- Registrace sbírá jen e-mail a heslo. Žádné souhlasy, žádný newsletter, žádná data o zvířatech mimo kalkulačku.

## Cíl

Jedna identita zákazníka pro web i prodejnu: **`customers` je střed**. Účet (přihlášení), karta (prodejna),
objednávky, předplatné, Kostičky, zvířata i souhlasy ukazují na jeden řádek. Registrace je jedna veřejná stránka
`/registrace`, stejná pro web i pro kartu z prodejny.

## Datový model (změny)

| Tabulka | Změna |
|---|---|
| `customers` | `user_id` (vazba na účet, nullable: zákazník od kasy bez účtu), `source` (web, prodejna, admin), `consent_marketing_email_at`, `consent_marketing_sms_at`, `terms_accepted_at`, `heard_from`, `birthday` (nepovinné), `preferred_shipping` |
| `pets` | přejde z `user_id` na `customer_id`; strukturované sloupce: `species`, `name`, `breed`, `born_on`, `weight_kg`, `neutered`, `activity`, `condition`, `stage`, `exclude` (vyloučená masa / alergie), `feeding_now` (granule, BARF, mix), `current_food` (co teď krmí), `note`; `data` jsonb zůstane jako profil pro kalkulačku |
| `subscriptions`, `orders`, `pos_sales`, `loyalty_transactions` | už mají `customer_id`, jen se doplní tam, kde chybí (předplatné podle e-mailu) |
| `consent_log` | kdo, kdy, k čemu, jaká verze textu, odkud (web, kasa, admin). GDPR doklad o souhlasu i odvolání |

Propojení existujícího:
- Při registraci se najde `customers` podle e-mailu **nebo** telefonu **nebo** kódu karty. Když existuje
  (nakupoval bez účtu, nebo ho založila kasa), účet se k němu připojí a Kostičky i historie zůstanou.
- Když e-mail sedí na jednoho a karta na druhého zákazníka, registrace se zastaví a řekne „zavolejte nám“
  (sloučení dělá správce v adminu, ne automat).

## Registrace `/registrace` (jedna stránka, 3 kroky, na mobil)

1. **Vy**: jméno, e-mail, telefon, heslo. Kód karty (nepovinné, předvyplní se z QR na kartě
   `/registrace?karta=KOD`). Adresa až při první objednávce, ne tady.
2. **Vaše zvířata** (lze přeskočit, jde doplnit v účtu): pes/kočka, jméno, plemeno, datum narození, váha,
   kastrace, aktivita, kondice, co teď krmíte, na co je citlivý (vyloučená masa). Tlačítko „přidat další“.
   Stejná pole, jaká používá kalkulačka, takže z profilu hned vyjde denní dávka a doporučení.
3. **Souhlasy a odkud**: obchodní podmínky a ochrana údajů (povinné), newsletter e-mailem (nepovinné, samostatné
   zaškrtávátko), SMS k rozvozu (nepovinné), jak jste se o nás dozvěděli.

Po registraci: přihlášení a stránka účtu s „Doporučení pro Rexe“ (dávka, produkty, nabídka pravidelného odběru)
a stavem Kostiček. Potvrzovací e-mail.

## Vstupy do registrace

- Web: hlavička (Účet), pokladna („uložit údaje a založit účet“ jedním zaškrtnutím po objednávce), kalkulačka
  (uložit profil → registrace s předvyplněným zvířetem).
- Prodejna: karta má QR s odkazem `/registrace?karta=KOD`. Zákazník ji dostane u pultu, kasa kartu přiřadí ke
  jménu a telefonu (jak už umí), zákazník doma dokončí registraci a účet se spojí přes kartu nebo telefon.
  Obsluha nikdy nezadává heslo ani souhlasy za zákazníka.
- Admin: správce může poslat pozvánku e-mailem (odkaz na registraci s předvyplněným zákazníkem).

## Co z toho těží zbytek systému

- **Kasa**: sken karty = zákazník včetně zvířat („Rex, 28 kg, bez kuřecího“). Obsluha vidí, co doporučit.
- **Předplatné**: v účtu, navázané na `customer_id`; návrh intervalu z denní dávky zvířete (kolik balení na 14 dní).
- **Kalkulačka**: profily zvířat = `pets` zákazníka, ne zvlášť. Na detailu produktu „kolik balení pro Rexe“.
- **Newsletter a e-maily**: segmenty ze zvířat (pes/kočka, štěně, senior, váha, vyloučené maso). Automatické
  e-maily: připomínka převážení štěněte, narozeniny psa s kódem, „Kostičky propadají“ (pokud budou propadat).
  Odhlášení jedním odkazem, zapsané v `consent_log`.
- **Admin**: u zákazníka zvířata, souhlasy, zdroj, karta, účet. Filtr zákazníků podle souhlasu a druhu zvířete,
  export pro rozesílku.

## Na co si dát pozor

- Žádné zdravotní údaje ani zdravotní tvrzení. „Citlivost na kuřecí“ je preference pro výběr krmiva, ne diagnóza.
  U potíží odkaz na veterináře (pravidlo projektu).
- Dlouhý formulář odradí. Krok 2 lze přeskočit, ale stojí za odměnu (např. Kostičky za vyplněný profil).
- Souhlas s newsletterem musí být samostatný a nezaškrtnutý předem, jinak je neplatný (GDPR, ePrivacy).
- Účet u kasy bez e-mailu: přihlášení je jen e-mailem, takže zákazník bez e-mailu má kartu a Kostičky, ale ne účet.
  To je v pořádku, účet si může doplnit kdykoli.
- Smazání účtu (GDPR) patří ke stejné práci: smaže účet a osobní údaje, objednávky zůstanou anonymizované.
