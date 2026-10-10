# Administrace jako interní systém: plán a pravidla provázání

Návrh obrazovek: plátno „DoKosti admin: návrh interního systému“ (Claude artifact). Tento soubor je zdroj pravdy
pro to, jak jednotlivé části adminu spolu mluví. Každá nová obrazovka nebo akce se drží pravidel níže.

## Pravidla pro všechno v adminu

1. **Každá akce má výsledek.** Server action vrací `ActionResult` (`{ ok, message }` nebo `{ error }`) nebo
   nastaví flash přes `setFlash()` a přesměruje. Nikdy `throw` kvůli uživatelské chybě. Lišta `<Flash />`
   v layoutu hlášku ukáže.
2. **Nevratné kroky se ptají.** Zrušení objednávky, vystavení dokladu, odpis, inventura, blokace karty, smazání,
   uzavření měsíce, uzávěrka směny: tlačítko `<ConfirmButton>` s textem, co se stane.
3. **Všechno se zapisuje do deníku změn** (`activity_log`): kdo, kdy, co, u čeho (`subject_type`, `subject_id`).
   Zapisuje `logActivity()`. Detail objednávky, zákazníka, produktu, dokumentu i zaměstnance ukazuje svou historii
   z téhle jedné tabulky; Dnes ukazuje posledních N záznamů napříč.
4. **Role hlídá server.** `requireAdmin()` a `requireManager()` v každé stránce a akci. Menu role jen skrývá.
   Role: `spravce` (vše), `obsluha` (kasa, objednávky, sklad, zákazníci, deník, vlastní docházka),
   `brigada` (kasa a deník).
5. **Jeden vzor seznamu** (`PageHeader` + pohledy jako pilulky + `FilterBar` + `Table` + export),
   **jeden vzor detailu** (`PageHeader` s drobečky a akcemi vpravo, obsah vlevo, historie a související vpravo).
6. **Úkoly jsou jedna tabulka** (`tasks`). Automatické úkoly mají `auto_key` (např. `invoice-due:<id>`), aby
   vznikly jen jednou a po vyřešení zmizely; ruční úkoly založí člověk. Každý má `source_type`/`source_id`
   a `href`, takže vede tam, kde se řeší.
7. **Dokumenty jsou jedna tabulka** (`documents` + `document_versions` + `document_signatures`) v soukromém
   bucketu. Vážou se polymorfně (`linked_type`, `linked_id`): zaměstnanec, dodavatel, příjemka, objednávka,
   zařízení, firma. Faktura z příjemky je dokument i výdaj zároveň.
8. **Výdaje jsou jedna tabulka** (`expenses`) a vznikají automaticky: z příjemky (zboží), z uzavřeného měsíce mezd
   (mzdy a odvody), z opakovaných výdajů (nájem, energie), z nahrané účtenky. Finance je nad ní čtou, nic
   neduplikují.
9. **Docházka vzniká ze směn v kase** (`pos_shifts` → `attendance`), ručně se přidávají jen výjimky. Mzdy čtou
   docházku, nikdy se hodiny nezadávají znovu.
10. **Upozornění počítá jedno místo** (`lib/alerts.ts`): expirace šarží, docházející zboží, nezaplacené
    objednávky, splatné faktury, končící smlouvy, chybějící zápis teplot, limit dohod. Dnes, badge v menu
    a e-mailové notifikace čtou stejný seznam.
11. **Nic dokladové povahy se nemaže** (objednávky, účtenky, příjemky, pohyby, dokumenty, mzdy): jen storno,
    archivace nebo anonymizace.

## Etapy

| Etapa | Obsah | Stav |
| --- | --- | --- |
| E1 Základ | role na serveru, flash a potvrzení, `activity_log`, `tasks`, nové menu, Dnes, hledání Ctrl+K, sdílené komponenty | hotovo |
| E2 Prodej | historie objednávky, interní poznámka, související, filtry a export, rozvoz s akcemi, nezaplacené s připomínkou, opravy kasy, předávka směny | hotovo |
| E3 Zboží | průvodce Nový produkt a Příjemka, dodavatelé a objednávky u nich, inventura, interní výdej, šarže k prodeji (FIFO), akce a slevy, hromadná změna cen, cenovky | probíhá |
| E4 Provoz | zaměstnanci, docházka, dokumenty (verze, podpis, platnost), teplotní deník, sanitace, checklisty, úkoly, směny a uzávěrky, zaškolení | |
| E5 Mzdy a Finance | parametry roku, podklady pro mzdy, orientační páska, export pro účetní, výdaje, od obratu k zisku, peníze a splatnosti | |
| E6 Napříč | notifikace e-mail/push, zálohy, GDPR anonymizace, kasa offline, plán směn, firemní kalendář, péče o zákazníky, poukazy | |

## Jak spolu moduly mluví (přehled vazeb)

```
kasa (pos_shifts) ──► attendance ──► payroll ──► expenses ──► finance
příjemka ──► stock_movements, stock_batches, documents (faktura), expenses, tasks (splatnost)
objednávka ──► stock_movements, email_log, activity_log, tasks (nezaplaceno), finance (tržby)
documents (platnost) ──► tasks (končí), alerts ──► Dnes, notifications
devices + temperature_log ──► alerts (chybí zápis, mimo rozsah) ──► tasks, notifications
employees ──► admins (přístup), documents (smlouvy), attendance, payroll, checklists (zaškolení)
activity_log ◄── všechny akce; čte Dnes, detaily, deník změn
```
