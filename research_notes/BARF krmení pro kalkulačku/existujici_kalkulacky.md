# Existující BARF kalkulačky a jak e-shopy převádějí výpočet na produkty

Rozsah: srovnání 16 online kalkulaček (CZ 7, SK 2, DE 3, EN/US 6+) podle toho, co je přímo vidět na jejich stránkách (vstupy, výstupy, vzorce, disclaimery, napojení na košík), plus kritika kalkulaček a právní/wordingové mantinely pro český e-shop s krmivem. Datum rešerše: 25. 9. 2026.

Poznámka k dostupnosti: několik zadaných webů nešlo načíst (barfcompany.cz a raw4dogs.cz – DNS „ENOTFOUND“, tj. domény zřejmě nejsou aktivní; barfici.cz se v žádném vyhledávání neobjevilo; barf.sk/kalkulacka, petsdeli.de/barf-rechner, nutriment.co.uk/pages/feeding-calculator, wefeedraw.com/pages/calculator vrátily 404; zoohit magazín 404; mixano.cz 503). Viz Gaps u jednotlivých otázek.

---

## Otázka 1: Co jednotlivé kalkulačky požadují na vstupu, co vrací, jaké vzorce používají a jaké mají UX

### Takeaway
Drtivá většina kalkulaček (CZ i zahraničních) je „procento z váhy“: jediný povinný vstup je hmotnost, volitelně věk/aktivita, a výstup je gramů/den + fixní rozpad na maso/kosti/vnitřnosti/přílohu. Jen menšina (Yoggies, Raw & Well, Viva Raw, We Feed Raw) počítá energii (kcal, RER = 70 × kg^0,75) a jen několik (Canis Lab, Yoggies, BARFeGO, ProDog) se ptá na kastraci, cíl váhy nebo velikostní kategorii.

### Cited Findings – české kalkulačky

**Panakei.cz (blog/e-shop)**
- Vstupy: „Hmotnost psa (v kg, s přesností na 2 desetinná místa)“, aktivita (Nízká / Střední / Vysoká), věk (Štěně / Dospělý / Senior), zdravotní problémy (Žádné / Problémy s ledvinami – méně bílkovin / Nadváha – více zeleniny). Výstup jediné číslo: „Hrubě orientační, doporučená denní dávka potravy, je přibližně 0,40kg“. Doporučené poměry v článku: 70 % svalovina, 10 % kosti, 10 % vnitřnosti (min. 5 % játra), 10 % zelenina/ovoce; pro štěňata jiné poměry (58 % maso, 17 % kosti, 7 % zelenina…). Bez napojení na košík. Disclaimer: „Informace uvedené v tomto článku mají pouze informativní charakter. Nenahrazují odbornou konzultaci, vyšetření ani léčbu veterinárním lékařem.“ — [Panakei BARF kalkulačka](https://www.panakei.cz/vyziva/barf-kalkulacka/)

**Canis Lab (Shopify e-shop, mražený BARF komplet)**
- Vstupy: Váha (kg); Věk: Štěně / Dospělák / Veterán; Míra aktivity: Mírná / Střední / Vysoká / Závodní; Pohlaví: Nekastrovaný pes / Nekastrovaná fena / Kastrovaný pes / Kastrovaná fena. Výstup: „Doporučená porce krmiva na den“ + rozpad „Makro nutrienty: Maso, Vnitřnosti, Kosti, Příloha, Tuk“ a blok „Doporučené produkty přímo pro tebe“ (kloubní výživa, Everyday Balancer, lososový olej, hotová příloha) a „Kompletní B.A.R.F. – Nevíš si rady? Šáhni po jistotě a máš hotovo“ s tlačítkem „Do košíku“ u pěti kompletů (jelen, tuňák, kráva, bažant, losos, 248 Kč). Disclaimer: „* Výsledky kalkulačky jsou pouze orientační a mohou se lišit podle konkrétních potřeb vašeho psa. Vždy se poraďte s odborníkem ohledně stravy vašeho psa.“ Marketing text slibuje „přesnou dávku jednotlivých složek stravy“ a „přesnou dávku doporučených doplňků“. Konkrétní multiplikátory nejsou v HTML vidět (výpočet běží v JS, které se nepodařilo izolovat). — [Canis Lab BARF kalkulačka](https://canislab.cz/pages/barf-kalkulacka) (načteno přes curl, výpis labelů formuláře)

**Yoggies.cz (výrobce granulí, BARF i vařené stravy)**
- Vstupy pes: druh (pes/kočka), typ stravy (Granule / B.A.R.F. / Vařená), stav (kastrovaný/nekastrovaný, březost prvních 42 dní, posledních 21 dní, laktace), věk (štěně do 6 měs., 6–12 měs., dospělý, senior), aktivita (5 stupňů od „gaučáka“ po profesionálního sportovce), aktuální váha (s poznámkou zadat ideální cílovou váhu při nadváze), konkrétní receptura (9 granulí / 7 BARF / 6 vařených). Vstupy kočka: stav (chce zhubnout / sklon k obezitě / chce přibrat / normální / březí / kojící / kotě / senior), váha, typ stravy, produkt. — [Yoggies kalkulačka](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Výstupy: „Doporučená celodenní krmná dávka“ v g, „Orientační energetická potřeba psa: … kcal“, u BARF „z toho Yoggies B.A.R.F.: X g“ a „z toho příloha: X g“ („Výpočet je pro přílohu BARF+“), tlačítko „Do košíku“ u doporučeného produktu, cross-sell pamlsků/olejů. Vzorec kcal není zveřejněn. Nezobrazuje cenu/den, týdenní/měsíční spotřebu ani výdrž balení. — [Yoggies kalkulačka](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Disclaimery: „Vypočtená krmná dávka je orientační, upravujte ji vždy podle aktuálních potřeb a kondice vašeho parťáka.“; „Výsledek kalkulačky Yoggies berte jako doporučenou výchozí hodnotu.“; „Námi doporučenou základní krmnou dávku upravte podle individuální potřeby…“; „Pamlsky, odměny při výcviku i další kalorické doplňky jsou součástí celkového denního příjmu energie.“ — [Yoggies kalkulačka](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)

**Barfuj.cz**
- Vstupy: velikostní kategorie podle aktuální váhy (Mini 1–2 kg, Malý 3–5, Střední 6–15, Velký 16–30, Obr 31–50 kg), věk (Štěně 4–6 % / Dospělý pes 3–4 %) s textem „Štěňata potřebují více energie pro růst (4-6% váhy denně), dospělí psi 3-4% váhy denně“, váha v kg, aktivita (Gauč – minimální / Aktivní – střední / Sportovec – vysoká), a „Na kolik dní dopředu chcete vypočítat celkové množství stravy“. Výstupy: „Denní dávka BARF“ a „Celkem na -- dní“. Bez rozpadu složek; výsledek odkazuje na „Namixovaný BARF“ partnera Mixáno.cz. — [Barfuj.cz kalkulačka](https://www.barfuj.cz/barf-kalkulacka)

**Forbarf.cz (pražský BARF e-shop)**
- Vstupy: „Zadejte optimální váhu vašeho psa“ a „Zadejte objem krmiva v procentech 2-3 % pro dospělého psa, 4-6 % pro štěně“. Výstupy: Celkový objem krmiva; Podíl masa celkem (80 %); Svalovina (35 %); Vnitřnosti (15 %); Masité kosti (30 %); Příloha (20 %). Web zdůrazňuje, že počítá s masitými kostmi (30 %), ne s „10 % čisté kosti“. Disclaimer: „Skutečná potřeba je velmi individuální a může být ve skutečnosti nižší, ale i mnohem vyšší než uvádí obecná doporučení“. Bez košíku, pokračování na „Příprava krmné dávky v praxi“. — [Forbarf praktická kalkulačka](https://www.forbarf.cz/prakticka-barf-kalkulacka)
- Doplňující stránka: „krmná dávka by měla činit 2-3% ideální hmotnosti zvířete“; aktivní 3 %, méně aktivní 2–2,5 %; složení 50–60 % maso, 20–30 % masité kosti, 20–30 % příloha; „Krmná dávka ale nemusí být svým složením vyvážená každý den. Vyváženosti je třeba dosáhnout v řádech dnů, týdnů nebo i měsíce.“ — [Forbarf krmná dávka](https://www.forbarf.cz/krmna-davka)

**Krmimmasem.cz**
- Vstupy: Váha a Objem krmiva v %, s nápovědou „Pro štěně 4% - 10%, doporučujeme začít na 7% a poté upravovat. Pro dospělého nebo starého psa doporučujeme 2% - 4%“. Výstupy: Denní dávka, Svalovina, Zelenina nebo neprané dršťky, Kosti, Vnitřnosti (g); placeholder „vypocet doporucene oleje“ bez skutečné hodnoty (nedodělaná funkce). Disclaimer: „Kalkulačka byla důkladně testována, přesto Vás prosíme o pochopení, že ji poskytujeme bez záruky“ + „Sledujte svého svěřence pozorně. Jsou jedinci, kteří k udržení potřebují více krmiva než je udáváno a naopak...“ Odkaz jen na kategorii „Oleje pro BARF“. — [Krmimmasem kalkulačka](https://www.krmimmasem.cz/vypocet-krmne-davky)

**Barfino.cz (Eshop-rychle)**
- Stránka obsahuje jen banner „Výpočet krmné dávky je pouze orientačí. Vždy je potřeba zohlednit individuální potřeby a stav zvířete.“ a obrázek tabulky poměrů podle životního stádia; samotný formulář kalkulačky není v HTML (existuje i stránka „Kalkulačka test“). — [Barfino kalkulačka](https://www.barfino.cz/kalkulacka)

**Vetamix.cz (metodický článek, ne kalkulačka)**
- „2-3 % z jeho požadované váhy“; při nadváze/podváze počítat z cílové váhy; maso 50–60 %, kosti 20–30 %, přílohy 20–30 %. Příklad bulteriér 31 kg: 620 g/den (2 %), 18,6 kg/měsíc; maso 310 g (z toho 30 % vnitřnosti, 70 % svalovina), kosti 186 g, zelenina/ovoce 124 g. Autor doporučuje spíše měsíční plánování v tabulce podle objednávkového cyklu než denní gramovou přesnost. — [Vetamix výpočet krmné dávky](https://www.vetamix.cz/vypocet-krmne-davky-dospeleho-psa-v-praxi)

**Beez.cz** – článek „Výpočet krmné dávky BARF“ nalezen ve výsledcích, nenačítán. — [Beez](https://beez.cz/psi-clanky/vypocet-krmne-davky-barf/)

### Cited Findings – slovenské
- Barfer.sk: článek popisuje, že kalkulačka má mít vstupy ideální váha, věk (štěňata <12 měs., 12–18 měs., dospělí 18+, senioři), aktivita (3 stupně), volitelně plemeno; ukázkový výstup 600 g = svalovina 300 g (50 %), kosti 120 g (20 %), vnitřnosti 60 g (10 %), zelenina/ovoce 90 g (15 %), doplňky 30 g (5 %). „Tieto hodnoty sú orientačné a môžu sa líšiť podľa individuálnych potrieb psa.“ „BARF kalkulačka je primárne navrhnutá pre psov“ – pro kočky doporučuje samostatnou kalkulačku (taurin). Bez živé kalkulačky, jen odkazy do kategorií. — [Barfer.sk](https://barfer.sk/blog/barf-kalkulacka)
- Panakei.sk a Vetamix.sk jsou jazykové mutace českých verzí; barfi.sk uvádí „Vzorec funguje na základe hmotnosti, zvážiť však treba aj ďalšie faktory, ako je vek, aktivita a kondícia“; obecně „dospelý pes by mal prijať 2-3% svojej ideálnej váhy“. — [vyhledávání](https://www.barfi.sk/blog/barf-strava/)

### Cited Findings – německé
**BARFGOLD**
- Vstupy: váha (slider), krmné procento 0,5–8,0 % (slider), preset poměru zvířecí/rostlinná složka: 90/10, 80/20, 70/30, 60/40. Výstupy: denní a týdenní celkem (přepínač záložek), rozpad Muskelfleisch, Pansen/Blättermagen, Innereien (játra zvlášť), rohe fleischige Knochen, Gemüse, Obst. Doporučení: „…sollte täglich ein tierisches Omega-3 Öl über das Futter gegeben werden“ s odkazy na Lachsöl a Seealgenmehl v e-shopu. — [BARFGOLD Rechner](https://barfgold.com/pages/barfrechner-fuer-hund)

**BARFeGO**
- Vstupy: jméno psa, e-mail („E-Mail für die Ergebnisse per Mail“), váha, životní fáze (Erwachsener Hund / Senior / Welpe-Junghund), aktivita (Wenig aktiv / Normal aktiv / Sehr aktiv-Sporthund), cíl (Gewicht halten / Etwas abnehmen / Zunehmen-höherer Bedarf), velikost (Klein bis mittel – „Oft etwas höherer Energiebedarf“ / Groß – „Meist etwas sparsamer je kg Körpergewicht“). Výstup příklad: Tagesmenge 600 g, týden 4200 g, 2 jídla/den po 300 g; rozpad Muskelfleisch 210 g (35 %), Pansen 90 g (15 %), Innereien 60 g (10 %), RFK 90 g (15 %), Gemüse/Obst 120 g (20 %), Öle/Zusätze 12 g (2 %). Disclaimer: „Hinweis: Dieser Rechner liefert Richtwerte für gesunde Hunde. Individuelle Bedürfnisse, Krankheiten, Alter und Aktivität sollten zusätzlich berücksichtigt werden.“ Pod výsledkem 5 kompletních menu s cenou za kg (Rind 8,49 €, Huhn 7,99 €, Lamm 10,99 €, Pferd 11,49 €, Lachs 7,49 €) s „Ins Körbchen legen“ a Probierpaket 79,90 €; předplatné není. Tlačítka „BARF-Menge berechnen“, „Ergebnis per E-Mail senden“, „Zurücksetzen“. — [BARFeGO Rechner](https://barfego.de/pages/barf-rechner)

**Petman (barf-calculator.de)**
- Popsané vstupy: pes/kočka, váha, aktivita, věk, zdravotní stav/alergie. Tři varianty kalkulačky: Komponenten (vlastní míchání), Beutestücke (hotové porce), BARF-In-One (kompletní). Výstupy: g/den, porce na jídlo, rozpad složek, doporučené Petman produkty. Uvádí, že „ca. 2 % Körpergewicht“ je „meist zu ungenau“. Disclaimer: „Der PETMAN BARF-Rechner bietet Anhaltspunkte nach dem aktuellen Stand der Ernährungswissenschaft für gesunde Hunde und Katzen“. — [Petman Kalkulator](https://petman.de/barf-hund/futterplan-erstellen-mit-dem-barf-kalkulator)

- Obecně DE: „Die Gesamtfuttermenge entspricht je nach Alter des Hundes zwischen 2 und 5 % des Körpergewichts. Rund 70-90 % des Futters sollte tierischen und 10-30 % pflanzlichen Ursprungs sein“; kalkulačky standardně nabízejí týdenní/měsíční součet. — [výsledky vyhledávání DE](https://www.futter-rechner.de/barf-rechner/)

### Cited Findings – anglické
**ProDog Raw (UK)**
- Vstupy: Lifestage (Adult / Puppy), váha kg, u štěněte věk v týdnech (7–10, 10–16, 16–20, 20–24, 24–36, 36–56, 56–68, 68+). Výstupy: „Approx: ___ g per day“ a „Approx: £ ___ per day“. Procenta štěněte: 7–10 týd. 8–10 %, 10–16 týd. 7–8 %, 16–20 týd. 6–7 %, 20–24 týd. 5–6 %, 24–36 týd. 4–5 %, 36–56 týd. 3–4 %, 56–68 týd. 2,5–3,5 %, dospělý 2–3 % ideální váhy. Text: „Remember this is a guide and a common-sense approach and careful observation is needed…“, „Variety over time creates balance.“ Pod kalkulačkou databáze 200+ plemen s předpočítanou dávkou; CTA na Sample Pack a „Subscribe and Save 5%“. — [ProDog calculator](https://www.prodograw.com/raw-dog-food-calculator/)

**Bella & Duke (UK, předplatné)**
- Vstupy: věk (roky 0–20 + měsíce 0–11), váha kg, pes/kočka. Výstupy: Daily Amount (g) a Daily Cost (£) s poznámkou „This cost is an estimation and doesn't include any offers.“ Procenta: dospělí/senioři 2–3 %, štěňata 0–5 měs. 5–10 %, do 6 měs. postupně k 5 %. „The information above is taken as an average.“ CTA „Get Started“ do onboardingu předplatného (kupon 40/30/20 % na první tři boxy); 4kroková grafika „About Them → Perfect Menu → Freezer to Yours → Defrost, Serve, Devour“. — [Bella & Duke calculator](https://www.bellaandduke.com/dogs/raw-dog-food-calculator/)
- Míchání s granulemi: „if you've decided to feed 50/50 simply divide the recommended amounts in half. If you've decided to feed 75/25 take the recommended amount for raw food and… multiply by 75%, then multiply the recommended wet or dry food amount by 25%.“ — [Bella & Duke mixed feeding](https://www.bellaandduke.com/raw-feeding/mixed-feeding-for-dogs-can-you-mix-raw-with-dry-kibble-wet-and-other-dog-foods/)

**Perfectly Rawsome (US, vzdělávací web)**
- 4 kalkulačky: Canine Adult Maintenance (ideální váha, 8 úrovní aktivity od „Inactive & Obese Prone“ po „High Activity & High Intensity (5hr+ daily)“, model BARF/PMR), Canine Growth (aktuální váha, věk 0–4 / 4–8 / 8+ měs., aktivita, model), Feline PMR (váha, procento 2–10 % s popisky „3% = Active“, „8% = 3-4 Months Old“), RMB kalkulačka (denní příjem, % kosti v dietě 5–20 %, % kosti v konkrétní masité kosti 10–85 %). Poměry: PMR dospělý 80/10/5/5; BARF dospělý 70 % maso, 10 % kost, 5 % játra, 5 % orgány, 7 % zelenina, 2 % semena/ořechy, 1 % ovoce; štěně např. 69/17/7/7. Přepočet „538g per 1000kcal average“. Výsledek jako PDF na e-mail. — [Perfectly Rawsome calculators](https://perfectlyrawsome.com/pmr-barf-dog-cat-raw-feeding-calculators/)

**Natural Instinct (UK)**
- Jediný vstup „My Dog/Puppy Weighs kg“, záložky Adult / Puppy. Výstup rozsah „to grams per day“ a „From £ per day“. Procenta: štěňata do 6 měs. 5–6 %, dospělí 2–3 %, senioři 2–3 %; sedavý 2–3 %, středně aktivní 2,5–3 %, velmi aktivní 3–4 %. Disclaimer: „*Guideline only. Variable factors like lifestyle, appetite and temperament can all impact on a pet's weight. Cost is approximate only and is based on Natural Chicken 1kg as at February 2026.“ Kalkulačka je vložená i na produktových stránkách (GIF návod). — [Natural Instinct calculator](https://naturalinstinct.com/pages/food-calculator)

**Paleo Ridge (UK)**
- Jediný vstup váha (current pro štěně, ideal pro dospělého); výstup rozsah g/den zvlášť Puppy a Adult; štěňata 5–6 %, dospělí 2–3 %. „Guideline only. Variable factors like lifestyle, age, and breed can impact on a dog's feed requirements.“ Po výsledku odkaz na řady Essentials / Classic / Paleo Plus. — [Paleo Ridge calculator](https://paleoridge.co.uk/pages/raw-food-calculator)

**Raw Bistro (US)**
- Vstupy: typ mraženého krmiva (Beef/Bison/Chicken/Lamb/Turkey), sušené krmivo, váha v librách, „Percentage of diet“ 10–100 % (tj. podíl syrové stravy v celkové dietě). Vodítka 2–4 % denně; příklad 50 lb pes ≈ 8 lb/týden, 32 lb/měsíc; štěňata 2–3× dávka dospělého, 3–4 jídla denně. „It is important that you observe your pet closely and increase or reduce food quantity as needed for proper weight.“ Kalkulačka sdílí stránku s „Your Cart / Checkout“. — [Raw Bistro calculator](https://rawbistro.com/pages/feeding-calculator)

**We Feed Raw (US, předplatné)**
- Kvíz: „Once you complete the quiz on our site, you will be given a suggested daily portion amount with corresponding daily calories“; faktory věk, velikost, aktivita, váha; „we tailor the amount of raw food in your subscription to your pet's age, weight, and activity level“. Procenta: aktivní/podvyživený 3 % ideální dospělé váhy, ideální 2–2,5 %, senior/nadváha 1,5 %; malí psi do 5 lb 5–6 %, 6–10 lb 4–5 %, 11–14 lb 3–3,5 %, 15–19 lb 2,5–3 %; štěně „portion 2-3% of your puppy's ideal adult weight. But if you're not sure what that will be, feed about 10% of his or her current weight.“ „It's important to note that this is just a baseline recommendation… we rely on you (the pet owner) to tell us if your dog is gaining or losing too much weight.“ — [We Feed Raw blog](https://wefeedraw.com/blog/how-much-raw-food-should-you-feed-your-dog)

**Raw & Well (NRC 2006 kalkulačka)**
- Vstupy: fáze (Adult 1–7 / Puppy / Senior 7+), váha lb/kg, aktivita (Inactive-weight loss … High-intensity working), u štěňat věk (<4 měs. / 4 měs.–dospělost), cíl (Lose / Maintain / Gain), model PMR/BARF. Vzorec: RER = 70 × kg^0,75; dospělí 95–200 × kg^0,75 podle aktivity; cíl ×0,8 / 1,0 / 1,1; senior 1,35–2,28 × RER s minimem 1,4 × RER; štěně 3,0 × RER (<4 měs.) / 2,0 × RER. Převod kcal → g dělením 1,5 kcal/g (rozsah syrové stravy 1,3–1,8 kcal/g). Výstup kcal/den, g/den, rozpad PMR 80/10/5/5, BARF 70/10/5/5 + 10 % zelenina/ovoce. „This calculator tells you how much to feed, not whether your specific ingredients are NRC 2006 complete.“ — [Raw & Well calculator](https://rawandwell.online/raw-dog-food-calculator)

**Steve's Real Food (US)** – rozhraní kalkulačky se nepodařilo z HTML přečíst; wording: „We suggest using the calculator amounts below as a starting point, waiting 2 weeks to see how your pet does and adjusting the amount up or down as needed“; „You know your pet better than we do“. — [Steve's Real Food](https://stevesrealfood.com/quick-guide/feeding-calculator/)

**Recenze ThatMutt (5 kalkulaček)** – Darwin's (druh, fáze, aktivita, ideální váha 5–150 lb → týdenní/měsíční množství; kritika: jen libry, bez denní dávky, bez rozpadu složek), Raw Paws (váha, typ vč. štěně/senior/březí → denní + porce na jídlo), Feed Real (věk, váha lb/kg, aktivita, model, % kosti, typ kosti → detailní rozpad + nákupní seznam; „Feels busy compared to other calculators“), Hare Today (váha, 2–10 % → denní + na jídlo; „Not great for beginning raw feeders“), Perfectly Rawsome. Obecně: kalkulačky „can only provide average values as it's impossible to take each dog's unique nutritional needs into account“; základní vzorec „target body weight divided by 100, multiplied by the average maintenance percentage of 2.5%“. — [ThatMutt](https://www.thatmutt.com/5-raw-dog-food-calculators/)

### Souhrnná srovnávací tabulka (jen to, co bylo na stránkách vidět)

| Kalkulačka | Druh | Vstupy | Výstupy | Vzorec | Napojení na prodej |
|---|---|---|---|---|---|
| Panakei.cz | pes | váha, aktivita 3, věk 3, zdraví 3 | 1 číslo kg/den | % váhy (nezveřejněno) | žádné |
| Canis Lab | pes | váha, věk 3, aktivita 4, pohlaví+kastrace 4 | g/den + maso/vnitřnosti/kosti/příloha/tuk | nezveřejněn | doporučené doplňky + komplety „Do košíku“ |
| Yoggies | pes+kočka | druh, typ stravy, kastrace/březost/laktace, věk 4, aktivita 5, váha, produkt | g/den, kcal, BARF vs příloha | energetický (nezveřejněn) | „Do košíku“ u produktu, cross-sell |
| Barfuj.cz | pes | velikost 5, věk 2, váha, aktivita 3, počet dní | g/den, celkem na N dní | 3–4 % dospělý, 4–6 % štěně | odkaz na Mixáno |
| Forbarf | pes | ideální váha, % (2–3 / 4–6) | 6 hodnot (35/15/30/20) | váha × % | ne |
| Krmimmasem | pes | váha, % (2–4 / 4–10, start 7 %) | 5 hodnot | váha × % | odkaz na oleje |
| Barfer.sk | pes | (popis) váha, věk, aktivita, plemeno | ukázka 50/20/10/15/5 | nezveřejněn | odkazy do kategorií |
| BARFGOLD | pes | váha slider, % 0,5–8 slider, preset 90/10…60/40 | den/týden, 6 složek | váha × % | odkazy na olej, řasy |
| BARFeGO | pes | jméno, e-mail, váha, fáze 3, aktivita 3, cíl 3, velikost 2 | den, týden, jídel/den, g/jídlo, 6 složek | nezveřejněn | 5 kompletů s cenou/kg, košík, Probierpaket, e-mail výsledku |
| Petman | pes+kočka | váha, aktivita, věk, zdraví/alergie; 3 varianty | g/den, porce, složky, produkty | „2 % je moc nepřesné“ | produkty Petman |
| ProDog | pes | fáze, váha, věk štěněte 8 pásem | g/den, £/den | 2–3 %, štěně 8–10 % → 2,5–3,5 % | Sample pack, subscribe -5 % |
| Bella & Duke | pes+kočka | věk r+m, váha | g/den, £/den | 2–3 %, štěně 5–10 % | „Get Started“ předplatné |
| Perfectly Rawsome | pes+kočka+štěně | ideální váha, aktivita 8, model; štěně věk 3 pásma; kočka % 2–10 | g/den + rozpad vč. jater, PDF | 538 g/1000 kcal; poměry 80/10/5/5 | žádné (vzdělávací) |
| Natural Instinct | pes | váha, záložka Adult/Puppy | rozsah g/den, £/den | 2–3 %, štěně 5–6 %, aktivní 3–4 % | produkty pod výsledkem, cena z kuřecího 1 kg |
| Paleo Ridge | pes | váha | rozsah g/den puppy+adult | 2–3 % / 5–6 % | odkaz na řady |
| Raw Bistro | pes | produkt, váha lb, % syrové v dietě 10–100 | (nevidět) | 2–4 % | košík na stránce |
| Raw & Well | pes | fáze, váha, aktivita, cíl, model | kcal, g, rozpad | RER 70×kg^0,75 × faktor / 1,5 kcal/g | žádné |
| We Feed Raw | pes | kvíz: věk, velikost, aktivita, váha | g/den + kcal, plán | kcal + %; senior/nadváha 1,5 % | předplatné šité na míru |

### Inferences
- Standard CZ trhu je „váha × 2–3 % (štěně 4–10 %) → fixní rozpad“. Kalkulačka, která přidá kcal (RER × faktor) a přizná rozsah, bude pro zákazníka věrohodnější než další „přesná“ procentní kalkulačka; zároveň má cenu ukazovat procento, protože ho zákazníci znají.
- Vstup „ideální váha“ místo „aktuální váha“ je nejčastější řešení nadváhy (Forbarf, Vetamix, Yoggies, Paleo Ridge, Perfectly Rawsome); BARFeGO/Raw & Well/Yoggies řeší nadváhu jako „cíl“ nebo „stav“.
- Pouze Canis Lab a Yoggies v ČR rozlišují kastraci; nikdo v ČR nenabízí procento syrové stravy vs granule (jen Raw Bistro v US a Bella & Duke v textu).
- Nikdo ze zkoumaných nepočítá více zvířat v domácnosti najednou.

### Gaps
- Skutečné multiplikátory Canis Lab, Yoggies, Petman, We Feed Raw nejsou veřejné (výpočet v JS/serveru).
- barfcompany.cz, raw4dogs.cz (DNS chyba), barfici.cz (nenalezeno), barf.sk/kalkulacka (404), petsdeli.de/barf-rechner (404), nutriment.co.uk (404), Haustierkost, Fressnapf raw, Anifit, Raw Feeding Miami, Syrovka, Rawity, Barfík, Barfshop – nezkoumáno (nedostupné nebo mimo limit volání).
- Barfino kalkulačka: formulář se v HTML nenačetl (pravděpodobně JS nebo samostatná testovací stránka).

---

## Otázka 2: Jak nejlepší e-shopy převádějí výsledek na doporučení produktů, košík a předplatné

### Takeaway
Nejsilnější vzor je BARFeGO (výsledek → týdenní gramáž → seznam kompletních menu s cenou/kg a „do košíku“) a předplatné modely Bella & Duke / We Feed Raw (kvíz → denní gramáž + cena/den → box na míru). V ČR je nejdál Canis Lab (doporučené doplňky + komplety pod výsledkem) a Yoggies („Do košíku“ u vypočteného produktu); nikdo v ČR nepočítá cenu/den ani „na jak dlouho vydrží balení“.

### Cited Findings
- BARFeGO: pod výsledkem (Tagesmenge, Wochenmenge 4200 g, 2 jídla po 300 g) blok pěti kompletních menu s cenou za kg a tlačítky „Ins Körbchen legen“ + Probierpaket 79,90 €; „Ergebnis per E-Mail senden“. — [BARFeGO](https://barfego.de/pages/barf-rechner)
- Canis Lab: pod výsledkem „Doporučené produkty přímo pro tebe“ (kloubní výživa 629 Kč, Everyday Balancer 329 Kč, Lososák 232 Kč, hotová příloha 399 Kč) a sekce „Kompletní B.A.R.F. – Nevíš si rady? Šáhni po jistotě a máš hotovo“ s „Do košíku“. — [Canis Lab](https://canislab.cz/pages/barf-kalkulacka)
- Yoggies: přímé odkazy a „Do košíku“ u doporučené varianty, cross-sell pamlsků, olejů a doplňků; ale bez ceny, bez týdenní/měsíční spotřeby, bez výdrže balení. — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Barfuj.cz: umožňuje zvolit počet dní a vrací „Celkem na N dní“, tj. přímo objednatelné množství, s odkazem na „Namixovaný BARF“ Mixáno.cz. — [Barfuj.cz](https://www.barfuj.cz/barf-kalkulacka)
- ProDog: výstup cena/den (£), CTA „Sample Pack – now 50% off“, header „Subscribe and Save 5% on Every Order“; databáze plemen s předpočítanou dávkou jako SEO landing pages. — [ProDog](https://www.prodograw.com/raw-dog-food-calculator/)
- Bella & Duke: výstup g/den + £/den, tlačítko „Get Started“ do předplatného, sleva 40/30/20 % na první tři boxy. — [Bella & Duke](https://www.bellaandduke.com/dogs/raw-dog-food-calculator/)
- Natural Instinct: cena/den odvozená z referenčního produktu („based on Natural Chicken 1kg as at February 2026“), kalkulačka vložená i na produktových stránkách. — [Natural Instinct](https://naturalinstinct.com/pages/food-calculator)
- We Feed Raw: „we tailor the amount of raw food in your subscription to your pet's age, weight, and activity level“; výsledek kvízu = denní porce + kcal. — [We Feed Raw](https://wefeedraw.com/blog/how-much-raw-food-should-you-feed-your-dog)
- Petman: tři kalkulačky podle způsobu krmení (vlastní míchání / hotové porce / BARF-In-One) s doporučením konkrétních produktů. — [Petman](https://petman.de/barf-hund/futterplan-erstellen-mit-dem-barf-kalkulator)
- Feed Real (dle recenze): rozpad na jednotlivé kusy masa + generování nákupního seznamu. — [ThatMutt](https://www.thatmutt.com/5-raw-dog-food-calculators/)
- Vetamix: měsíční celkové množství (18,6 kg/měsíc) a doporučení plánovat podle objednávkového cyklu. — [Vetamix](https://www.vetamix.cz/vypocet-krmne-davky-dospeleho-psa-v-praxi)
- ProDog: „Variety over time creates balance.“ (argument pro střídání proteinů). — [ProDog](https://www.prodograw.com/raw-dog-food-calculator/)
- Forbarf: „Vyváženosti je třeba dosáhnout v řádech dnů, týdnů nebo i měsíce.“ — [Forbarf](https://www.forbarf.cz/krmna-davka)

### Inferences
- Konkrétní vzor pro DoKosti (bez přímého zdroje – kombinace pozorovaných prvků): denní g → týdenní/měsíční kg → počet balení Základ (zaokrouhleno nahoru na velikost balení) + Kosti + Navíc podle poměru → cena/den a „vydrží cca N dní“ → jedním tlačítkem do košíku; přepínač „na 1 / 2 / 4 týdny“ (jako Barfuj „počet dní“) a nabídka střídání 2–3 druhů masa („Variety over time“).
- Kombinace ProDog (cena/den) + Natural Instinct (referenční produkt pro cenu) + BARFeGO (cena/kg u každého kompletu) je proveditelná a v ČR ji nikdo nemá.
- E-mail výsledku (BARFeGO, Perfectly Rawsome PDF) je použitelný jako lead-capture, ale musí být volitelný.

### Gaps
- Nepodařilo se ověřit, jak přesně Bella & Duke / We Feed Raw sestavují box (počet balení, frekvence doručení) – help center vrátilo 403 a kalkulační stránka 404.
- Žádný zkoumaný CZ e-shop nezobrazuje „na jak dlouho vydrží balení“ – nebyl nalezen domácí příklad.

---

## Otázka 3: Jak kalkulačky řeší štěňata, kočky, nadváhu, částečné krmení granulemi, více zvířat a jak formulují disclaimery

### Takeaway
Štěňata se řeší buď procentem z aktuální váhy podle věkových pásem (ProDog 8 pásem, Krmimmasem „start 7 %“), nebo procentem z očekávané dospělé váhy (We Feed Raw 2–3 %). Kočky mají jen Yoggies, Perfectly Rawsome a Petman. Nadváha = „počítej z ideální váhy“ nebo volba cíle. Částečné krmení granulemi řeší jen Raw Bistro (% syrové v dietě) a textově Bella & Duke/Big Dog (poměrové dělení dávek). Více zvířat neřeší nikdo. Disclaimery jsou téměř vždy „orientační / guideline only / sledujte kondici“.

### Cited Findings
**Štěňata**
- ProDog: 8 věkových pásem v týdnech s klesajícím procentem 8–10 % → 2,5–3,5 %. — [ProDog](https://www.prodograw.com/raw-dog-food-calculator/)
- Perfectly Rawsome Growth: aktuální váha + věk 0–4 / 4–8 / 8+ měs. + aktivita; poměr štěněte např. 69 % maso / 17 % kost / 7 % játra / 7 % orgány. — [Perfectly Rawsome](https://perfectlyrawsome.com/pmr-barf-dog-cat-raw-feeding-calculators/)
- We Feed Raw: „portion 2-3% of your puppy's ideal adult weight. But if you're not sure what that will be, feed about 10% of his or her current weight.“ — [We Feed Raw](https://wefeedraw.com/blog/how-much-raw-food-should-you-feed-your-dog)
- Raw & Well: štěně 3,0 × RER (<4 měs.), 2,0 × RER (4 měs.–dospělost). — [Raw & Well](https://rawandwell.online/raw-dog-food-calculator)
- Krmimmasem: „Pro štěně 4% - 10%, doporučujeme začít na 7% a poté upravovat.“ — [Krmimmasem](https://www.krmimmasem.cz/vypocet-krmne-davky)
- Yoggies: štěně do 6 měs. / 6–12 měs. jako samostatné kategorie. — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Panakei: štěně 58 % maso, 17 % jedlé kosti, 7 % zelenina (vyšší podíl kostí). — [Panakei](https://www.panakei.cz/vyziva/barf-kalkulacka/)

**Kočky**
- Yoggies kočka: stav (chce zhubnout / sklon k obezitě / chce přibrat / normální / březí / kojící / kotě / senior), váha, granule/BARF. — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Perfectly Rawsome Feline PMR: „Recommended maintenance percentage for an average cat is 3% however if you are feeding a kitten or an active cat you need to increase the maintenance percentage.“ — [Perfectly Rawsome](https://perfectlyrawsome.com/pmr-barf-dog-cat-raw-feeding-calculators/)
- Barfer.sk: kalkulačka „primárne navrhnutá pre psov“; pro kočky doporučuje specializovanou (taurin). — [Barfer.sk](https://barfer.sk/blog/barf-kalkulacka)
- Viva Raw: energie koček škáluje s váhou^0,67 (psi ^0,75). — [Viva Raw](https://vivarawpets.com/blogs/fresh-takes/how-much-to-feed)

**Nadváha / kondice / kastrace**
- Yoggies: vstup váhy s poznámkou zadat ideální cílovou váhu při nadváze; stav kastrovaný/nekastrovaný. — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Canis Lab: Pohlaví × kastrace (4 volby). — [Canis Lab](https://canislab.cz/pages/barf-kalkulacka)
- BARFeGO: cíl „Gewicht halten / Etwas abnehmen / Zunehmen“ + velikost (malí vyšší potřeba na kg, velcí nižší). — [BARFeGO](https://barfego.de/pages/barf-rechner)
- Raw & Well: cíl ×0,8 / 1,0 / 1,1. — [Raw & Well](https://rawandwell.online/raw-dog-food-calculator)
- Perfectly Rawsome: aktivita „Inactive & Obese Prone“ jako nejnižší stupeň. — [Perfectly Rawsome](https://perfectlyrawsome.com/pmr-barf-dog-cat-raw-feeding-calculators/)
- Vetamix, Forbarf, Paleo Ridge: počítat z ideální (požadované) váhy. — [Vetamix](https://www.vetamix.cz/vypocet-krmne-davky-dospeleho-psa-v-praxi), [Forbarf](https://www.forbarf.cz/krmna-davka), [Paleo Ridge](https://paleoridge.co.uk/pages/raw-food-calculator)
- Bella & Duke (vyhledávání): „feed them for the weight you want them to be, not the weight they are just now“; po kastraci často méně kalorií. — [Bella & Duke weight guide](https://www.bellaandduke.com/dogs/expert-advice/dog-health/how-much-should-my-dog-weigh/)

**Částečně granule / míchání**
- Raw Bistro: vstup „Percentage of diet“ 10–100 %. — [Raw Bistro](https://rawbistro.com/pages/feeding-calculator)
- Bella & Duke: 50/50 = polovina doporučené dávky každého; 75/25 = 75 % dávky syrové + 25 % dávky granulí. — [Bella & Duke mixed feeding](https://www.bellaandduke.com/raw-feeding/mixed-feeding-for-dogs-can-you-mix-raw-with-dry-kibble-wet-and-other-dog-foods/)
- Big Dog: „only feed half the recommended feeding portion for each diet“, poměry 50/50, 70/30, 90/10; u citlivého trávení syrové a granule v jiných jídlech (ráno/večer). — [Big Dog co-feeding](https://www.bigdogpetfoods.com/guides/co-feeding-raw-and-kibble)
- Yoggies: pamlsky a odměny jsou součástí denního energetického příjmu (uživatel odečítá ručně). — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)

**Více zvířat** – žádná ze zkoumaných kalkulaček nenabízí více zvířat v jednom výpočtu (Yoggies FAQ explicitně bez tématu). — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)

**Formulace disclaimerů (sbírka přesných znění)**
- CZ: „Výsledky kalkulačky jsou pouze orientační a mohou se lišit podle konkrétních potřeb vašeho psa. Vždy se poraďte s odborníkem ohledně stravy vašeho psa.“ — [Canis Lab](https://canislab.cz/pages/barf-kalkulacka)
- CZ: „Vypočtená krmná dávka je orientační, upravujte ji vždy podle aktuálních potřeb a kondice vašeho parťáka.“ / „berte jako doporučenou výchozí hodnotu“ — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- CZ: „Výpočet krmné dávky je pouze orientačí. Vždy je potřeba zohlednit individuální potřeby a stav zvířete.“ — [Barfino](https://www.barfino.cz/kalkulacka)
- CZ: „Nenahrazují odbornou konzultaci, vyšetření ani léčbu veterinárním lékařem.“ — [Panakei](https://www.panakei.cz/vyziva/barf-kalkulacka/)
- CZ: „Skutečná potřeba je velmi individuální…“ — [Forbarf](https://www.forbarf.cz/prakticka-barf-kalkulacka)
- DE: „Dieser Rechner liefert Richtwerte für gesunde Hunde…“ — [BARFeGO](https://barfego.de/pages/barf-rechner); „Anhaltspunkte nach dem aktuellen Stand der Ernährungswissenschaft für gesunde Hunde und Katzen“ — [Petman](https://petman.de/barf-hund/futterplan-erstellen-mit-dem-barf-kalkulator)
- EN: „Guideline only. Variable factors like lifestyle, appetite and temperament…“ — [Natural Instinct](https://naturalinstinct.com/pages/food-calculator); „a guide, not an exact science“ — [ProDog](https://www.prodograw.com/raw-dog-food-calculator/); „starting point, waiting 2 weeks… adjusting“ — [Steve's](https://stevesrealfood.com/quick-guide/feeding-calculator/)

### Inferences
- Pro štěně je nejrobustnější kombinace: věk (pásma) + aktuální váha + volitelná očekávaná dospělá váha (fallback „10 % aktuální váhy“ jako We Feed Raw) a upozornění na častější krmení (3–4× denně).
- Pro nadváhu: vstup „ideální váha“ (nebo kondice 1–5 → přepočet cílové váhy) a cíl „zhubnout“ ×0,8 (Raw & Well) je srozumitelnější než skryté multiplikátory.
- Míchání s granulemi lze řešit jednoduchým sliderem „podíl syrové stravy“ (Raw Bistro) a poměrovým dělením obou dávek (Bella & Duke); u DoKosti relevantní pro štěněcí Granule.

### Gaps
- Nenalezen žádný příklad kalkulačky pro více psů/koček v domácnosti se součtem objednávky.
- Nenalezeny konkrétní multiplikátory pro kastraci u žádné CZ kalkulačky (jsou skryté).

---

## Otázka 4: Právní a wordingové mantinely pro český e-shop s krmivem (767/2009, FEDIAF, ÚKZÚZ)

### Takeaway
Text kalkulačky je „označení“ ve smyslu nařízení 767/2009 (platí i pro web), takže: žádná tvrzení o prevenci/léčbě nemocí, tvrzení musí být objektivní a ověřitelná, nesmí uvádět v omyl. Bezpečná formulace je „orientační doporučení / výchozí hodnota, sledujte kondici, při potížích veterinář“; obchod by měl uvádět i to, zda je produkt kompletní nebo doplňkové krmivo.

### Cited Findings
- ÚKZÚZ: „Označením se rozumí jakýkoli údaj nebo vyobrazení, které na krmivo odkazuje nebo ho provází, což může být etiketa, ale také reklamní leták nebo informace na internetu“. — [ÚKZÚZ – požadavky na označování](https://ukzuz.gov.cz/public/portal/ukzuz/krmiva/schvalovani-a-registrace-provozu/pozadavky-na-pouzivani-a-oznacovani)
- ÚKZÚZ – zakázaná tvrzení: „že krmivo zabraňuje určitému onemocnění, zmírňuje onemocnění léčí onemocnění (výjimkou jsou kokcidiostatika, medikovaná a dietní krmiva)“. Povolená tvrzení: „dodává nezbytné živiny, přirozeně bohatý na..., zdroj vitamínů“; „podpora trávení, podpora správného fungování..., zlepšuje využití“; „ochrana trávicího traktu“. „Tato tvrzení musí být objektivní a ověřitelná“ a odpovědná osoba musí mít vědecké podklady. — [ÚKZÚZ](https://ukzuz.gov.cz/public/portal/ukzuz/krmiva/schvalovani-a-registrace-provozu/pozadavky-na-pouzivani-a-oznacovani)
- Nařízení (ES) 767/2009, čl. 11: označení nesmí uvádět uživatele v omyl ohledně určeného použití, vlastností, povahy, složení, trvanlivosti, druhu zvířat, ani připisovat účinky, které krmivo nemá; čl. 13 odst. 1: tvrzení musí být „objektivní, ověřitelné příslušnými orgány a srozumitelné“ a vědecky odůvodněné; čl. 13 odst. 3: zákaz tvrzení, že krmivo „zabraňuje určitému onemocnění, zmírňuje ho nebo odstraňuje“ (výjimka kokcidiostatika/histomonostatika); tvrzení o nutriční nerovnováze dovolena, pokud nejsou spojena s nemocí; čl. 3 definice „kompletní krmivo“ (pokrývá denní krmnou dávku) vs „doplňkové krmivo“ (nutno kombinovat). — [767/2009 CZ text na Esipa](https://esipa.cz/sbirka/sbsrv.dll/sb?DR=SB&CP=32009R0767)
- ÚKZÚZ spravuje povinnosti při označování a používání krmiv podle nařízení (EU) 183/2005 a zákona č. 91/1996 Sb., o krmivech; každý provozovatel krmivářského podniku (vč. e-shopu uvádějícího krmivo na trh) musí být registrován/schválen. — [ÚKZÚZ – uvádění krmiv na trh](https://ukzuz.gov.cz/public/portal/ukzuz/krmiva/schvalovani-a-registrace-provozu/uvadeni-krmiv-na-trh)
- ÚKZÚZ vede přehled „Základní krmivářská legislativa aktuální k 1. 1. 2026“. — [ÚKZÚZ legislativa](https://ukzuz.gov.cz/public/portal/ukzuz/-q458091---OkdnRD1C/krmivarska-legislativa-v-roce-2022)
- FEDIAF Code of Good Labelling Practice: praktický průvodce označováním a marketingem, revidovaný ročně, schválený Komisí a členskými státy; velká část kódu vysvětluje, jak dělat tvrzení „scientifically substantiated: accurate, truthful and understandable for the purchaser“; odpovědnost za doložení všech tvrzení, deklarací i grafiky nese provozovatel „prior to use“. Prahy pro ingredienční tvrzení: „flavoured with X“ < 4 %, „with X“ ≥ 4 %, „rich in X“ ≥ 14 %, „X dinner“ ≥ 26 %. — [FEDIAF news](https://europeanpetfood.org/_/news/eu-and-member-states-endorse-the-revised-fediaf-code-of-good-labelling-practice-for-pet-food/), [Pet Food Processing](https://www.petfoodprocessing.net/articles/12754-fediaf-updates-pet-food-labeling-code), [FEDIAF Labelling](https://europeanpetfood.org/self-regulation/labelling/)
- FEDIAF kód v PDF (2019) je ke stažení, ale nešel textově extrahovat v tomto prostředí. — [PDF](https://europeanpetfood.org/wp-content/uploads/2022/02/FEDIAF_labeling_code_2019_onlineOctober2019.pdf)
- Vzory „bezpečného“ wordingu v praxi CZ: „pouze orientační“, „doporučená výchozí hodnota“, „upravujte podle kondice“, „poraďte se s odborníkem/veterinárním lékařem“, „nenahrazuje odbornou konzultaci“ (viz Otázka 3, citace Canis Lab, Yoggies, Barfino, Panakei).

### Inferences
- Slova jako „přesná dávka“ (Canis Lab marketing) jsou v rozporu s tím, co kalkulačka reálně umí, a hraničí s uváděním v omyl (čl. 11); DoKosti by měla důsledně používat „orientační“ a rozsah (od–do).
- Kalkulačka nesmí mapovat zdravotní problém → produkt s implikací léčby (např. „ledviny → tento mix“). Panakei nabízí volbu „Problémy s ledvinami“ – to je pro obchod rizikové; bezpečnější je u zdravotních potíží výpočet zastavit a odkázat na veterináře.
- Doporučení Navíc (orgány/oleje) lze komunikovat jako „dodává živiny / zdroj omega-3“ (povolený typ tvrzení), ne jako „na klouby / proti zánětu“.
- Pokud Základ není kompletní krmivo, kalkulačka by měla jasně říkat, že se kombinuje s Kostmi a Navíc (doplňkové krmivo vyžaduje kombinaci – čl. 3).

### Gaps
- Přesné znění relevantních kapitol FEDIAF kódu (claims, feeding instructions, online communication) nebylo možné citovat – PDF se nepodařilo převést na text; stránka ÚKZÚZ k označování krmiv pro zájmová zvířata je rovněž PDF, které se nepodařilo přečíst.
- Nebyla nalezena judikatura/kontrolní praxe ÚKZÚZ specificky pro online kalkulačky.

---

## Otázka 5: Běžná kritika online BARF kalkulaček a jak se jí vyhnout

### Takeaway
Hlavní výtky: (1) lineární „2–3 % váhy“ podhodnocuje malé a nadhodnocuje velké psy, protože energie škáluje s kg^0,75; (2) ignoruje energetickou hustotu (tučnost) krmiva – rozptyl 1,3–1,8 kcal/g u syrové stravy; (3) slibuje „přesnost“, ale ignoruje kondici a individuální metabolismus; (4) nezohledňuje pamlsky. Řešení: kcal-based výpočet s rozsahem, kondiční skóre/ideální váha, hustota konkrétního produktu, kontrola po 2 týdnech.

### Cited Findings
- „The 2-3% rule underestimates the feeding amount for small dogs and overestimates it for larger dogs… calorie requirements are proportional to their weight to the 0.75 power and 0.67 power for adult dogs and cats respectively“; příklad 40 lb pes: 16 oz vs 20 oz = „a 25% difference“; hustota komerčních syrových krmiv „30 kcals/oz to 80 kcals/oz“ → 1 lb = 480 až 1280 kcal; „all feeding recommendations are just that: recommendations to use as starting points“. — [Viva Raw – Myth of the 2-3% rule](https://vivarawpets.com/blogs/fresh-takes/how-much-to-feed)
- Raw & Well: RER = 70 × kg^0,75, faktory 95–200 × kg^0,75 pro dospělé, převod 1,5 kcal/g (rozsah 1,3–1,8 kcal/g); „feeding amount estimates only, not a nutritional completeness analysis“. — [Raw & Well](https://rawandwell.online/raw-dog-food-calculator)
- Perfectly Rawsome uvádí přepočet „538g per 1000kcal average“ (≈1,86 kcal/g). — [Perfectly Rawsome](https://perfectlyrawsome.com/pmr-barf-dog-cat-raw-feeding-calculators/)
- Petman: 2 % váhy „meist zu ungenau“; individuální metabolismus a životní podmínky. — [Petman](https://petman.de/barf-hund/futterplan-erstellen-mit-dem-barf-kalkulator)
- BARFeGO: velikostní přepínač s vysvětlením „Klein bis mittel – Oft etwas höherer Energiebedarf“, „Groß – Meist etwas sparsamer je kg Körpergewicht“ (jednoduché zohlednění nelineárního škálování). — [BARFeGO](https://barfego.de/pages/barf-rechner)
- We Feed Raw: odstupňované procento pro malé psy (do 5 lb 5–6 %, 6–10 lb 4–5 %, 11–14 lb 3–3,5 %, 15–19 lb 2,5–3 %). — [We Feed Raw](https://wefeedraw.com/blog/how-much-raw-food-should-you-feed-your-dog)
- ThatMutt: kalkulačky „can only provide average values“; Hare Today „Not great for beginning raw feeders“; Feed Real „Feels busy“; Darwin's chválen za konzervativní (nižší) dávky s možností navýšení. — [ThatMutt](https://www.thatmutt.com/5-raw-dog-food-calculators/)
- Steve's: „waiting 2 weeks to see how your pet does and adjusting the amount up or down as needed“. — [Steve's Real Food](https://stevesrealfood.com/quick-guide/feeding-calculator/)
- ProDog: „Monitor your dog's weight, appetite, and appearance monthly, and then adjust if needed.“ — [ProDog](https://www.prodograw.com/raw-dog-food-calculator/)
- Yoggies: pamlsky a odměny jsou součástí denního příjmu energie. — [Yoggies](https://yoggies.cz/pages/kalkulacka-krmnych-davek-pro-psy)
- Krmimmasem: nedodělaný placeholder „vypocet doporucene oleje“ – příklad nedokončené funkce, která snižuje důvěru. — [Krmimmasem](https://www.krmimmasem.cz/vypocet-krmne-davky)
- Forbarf: kritika kalkulaček počítajících „10 % kosti“ vs. praktické „30 % masitých kostí“ – nejednotnost terminologie (čistá kost vs masitá kost) mate uživatele. — [Forbarf](https://www.forbarf.cz/prakticka-barf-kalkulacka)

### Inferences
- Pro DoKosti: počítat MER = 70 × kg^0,75 × faktor (věk/kastrace/aktivita/cíl), převést na gramy přes skutečnou kcal/g daného Základu (pokud je známa a ověřena – nikdy neodhadovat složení), zobrazit rozsah ±10–15 % a ekvivalentní „% váhy“ pro srozumitelnost; u miniaturních a obřích plemen tím odpadne největší chyba lineárních kalkulaček.
- Zobrazit „zkontrolujte za 2–4 týdny“ a jednoduchý kondiční obrázek (BCS) místo skrytých multiplikátorů; kalkulačka by měla umět uložit/aktualizovat hmotnost (re-kalkulace).
- Terminologii kostí sladit s produkty (Kosti = masité kosti, uvést % kosti v produktu), aby rozpad odpovídal tomu, co se reálně prodává.

### Gaps
- Nebyly dohledány české fórové/FB diskuze s kritikou konkrétních CZ kalkulaček (vyhledávání je omezené na USA a diskuze na Facebooku nejsou přístupné).
- Reddit r/rawpetfood nebyl v rámci limitu volání prohledán.
