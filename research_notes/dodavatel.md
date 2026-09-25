# Dodavatel BARF pro DoKosti – rešerše (25. 9. 2026)

## Vybraný dodavatel: Yoggies s.r.o. (yoggies.cz)

**Proč Yoggies**
- Jediný z prověřených kandidátů, který u každého produktu zveřejňuje složení s %, analytické složky
  (protein, tuk, vláknina, popel, vlhkost) a u psích směsí i metabolizovanou energii v kcal/kg.
- Je to výrobce: BARF a pamlsky vyrábí ve vlastní kuchyni **u Slaného** (cca 15 km od Kladna), granule
  lisované za studena nechává vyrábět v Německu. Sídlo/showroom: Evropská 695/73, Praha 6 – Vokovice.
- Má B2B/velkoobchodní e‑shop: registrace na https://www.yoggies.cz/pages/b2b-registrace, portál
  b2b.yoggies.cz, kontakt office@yoggies.cz, +420 311 240 331 (Po–Čt 7–17, Pá 7–15). Aktivace účtu do 2
  pracovních dnů. Minimální odběr ani velkoobchodní slevy nejsou veřejně uvedeny.
- Sortiment pokrývá psí i kočičí kompletní směsi, jednodruhové maso (kosti), oleje, řasy, sušené pamlsky
  i granule, takže lze celý e‑shop stavět na jednom dodavateli.

**Ostatní kandidáti (proč ne)**
- Forbarf.cz – má velkoobchod (od 3 000 Kč bez DPH doprava zdarma), ale je distributor, ne výrobce, a u
  směsí nezveřejňuje % složení ani analytiku.
- Barfici.cz, Barfino.cz, Krmivo-barf.cz – maloobchodní e‑shopy bez B2B sekce.
- Krmiva-hulin.cz – server vracel 503. Barfcompany.cz, Rawity.cz, Syrovka.cz – domény nedostupné (DNS).
- Vetamix, BARFER – nezkoušeno (Yoggies splnil všechna kritéria).

## Jak byla data sbírána
- Zdroj: produktové stránky yoggies.cz (HTML sekce „Složení“ a „Dávkování“) a Shopify JSON
  `/products/<handle>.json` (varianty, ceny, gramáže). Texty složení a analytiky jsou kopírované doslova
  (včetně překlepů jako „krutí“, „Antalytické“).
- **Ceny jsou maloobchodní vč. DPH** z yoggies.cz k 25. 9. 2026. Velkoobchodní ceník je jen po B2B registraci.
- U psích směsí je jako hlavní balení zvoleno 1 300 g; ostatní varianty (700 g, 12×150 g) jsou v `notes`.
- kcal/100 g = kcal/kg ÷ 10 (Yoggies uvádí kcal/kg nebo kcal/100 g, žádné kJ/MJ). Původní hodnota je vždy v `notes`.

## Soubor
`research_notes/dodavatel_produkty.json` – 19 produktů: 10× zaklad (7 pes, 3 kočka), 3× kosti, 3× navic,
2× mlsky, 1× granule.

## Mezery a upozornění
- **Podíl kosti (bonePct)** není nikde uveden samostatně – Yoggies píše „svalovina s kostí 76 %“. Vyplněno null
  (0 u produktů, které kosti výslovně neobsahují).
- **100% hovězí s probiotiky neobsahuje kosti** (výrobce doporučuje doplnit vápník z řas) – do kategorie
  „zaklad s kostí“ jen s upozorněním.
- Kočičí komplety a jednodruhové maso (křídla, stehna, játra) nemají uvedenou energii; jednodruhové maso
  nemá popel ani vlákninu.
- Taurin u koček je uveden jako „1,0–1,7 %“ v tabulce „na 100 g“ – matematicky 10 000–17 000 mg/kg, což je
  nezvykle vysoké; ověřit u dodavatele.
- Yoggies nemá: jehněčí, kachní, vepřové ani rybí psí směs (rybí jen v kombinaci losos+králík / losos+kůň+krůta),
  žádné krky ani hovězí žebra (kosti pokryty krůtími křídly, kuřecími stehny a krůtími stehny), žádný speciální
  štěněcí BARF (všechny psí směsi jsou „vhodné pro štěňata od 30. dne“), žádný zeleninový mix, vaječné skořápky
  ani bachor (nabízí sušené přílohy s vločkami a Kelpu/Chlorellu).
- Granule: Yoggies prodává vlastní granule, proto nebyl brán Brit Fresh Puppy. Zvolena Kuřecí & Hovězí (od
  štěněte po seniora), samostatná štěněcí receptura neexistuje.
- `isComplete`: psí směsi jsou na stránce „syrové kompletní krmivo“, ale zároveň „téměř kompletní menu“ s
  doporučením 80 % maso / 20 % příloha – v JSON true s poznámkou. U jednodruhového masa a doplňků je false
  odvozeno z textu (stránka termín „doplňkové krmivo“ výslovně používá jen u pamlsků).
- Skladovací pokyn chybí u Kelpy a sušeného kuřecího masa.
