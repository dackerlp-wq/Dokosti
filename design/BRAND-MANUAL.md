# DoKosti — brand manuál

DoKosti BARF je kamenná prodejna v Kladně a e-shop se syrovým krmivem pro psy a kočky. E-shop má působit jako vzdušný, přátelský obchod na bílé: velké vyříznuté fotky, ručně psané titulky, kulaté ikonové disky a jedna jasná cihlová akce na každé obrazovce. Barvy a logo jsou DoKosti; stavba stránek, rytmus sekcí a tvar komponent vycházejí z e-shopu Mixano.

## Zásady

1. **Bílá je základ.** Stránka, hlavička i karty jsou `white`. `paper` střídá sekce, `cream` a `green` jsou výjimky, nejvýš jedna taková sekce na stránku.
2. **Jedna cihlová akce.** `brick` patří tlačítku, které vede k nákupu. Všechno ostatní je `green`, obrys nebo odkaz v `brick-text`.
3. **Ruční písmo jen pro titulky.** Amatic SC (`display-*`) nese H1 a titulek sekce. Všechno, co se čte nebo na co se kliká, je Montserrat.
4. **Fotka je vyříznutá.** Produkt, pes i surovina stojí na bílé bez rámečku a bez vlastního pozadí.
5. **Říkáme to na rovinu.** Text popisuje, co v balíčku je a jak se k vám dostane. Bez superlativů.

## Hlas a texty

DoKosti mluví jako prodavač, který krmí syrově vlastní zvířata: věcně, krátce a bez přemlouvání.

- **My a vy.** První osoba množného čísla („vozíme sami“, „spočítáme dávku“), zákazníkovi vykáme s malým „v“.
- **Krátké věty, tečka i v titulku-hesle.** „Poctivé do kosti.“ „Prodejna, ne sklad.“ „Mražené dovezeme mražené.“
- **Upřímnost místo slibů.** „Víme, co je v každém balíčku, a řekneme to na rovinu.“ „BARF není pro každého, a to je v pořádku.“ Žádné „nejlepší“, „prémiové“, „revoluční“.
- **Konkrétní čísla.** „Plán pro vašeho psa za dvě minuty.“ „Sedm otázek o vašem zvířeti.“ „Posíláme na začátku týdne.“
- **Bez psí mluvy a zdrobnělin.** Píšeme pes, kočka, zvíře, majitel. Nepíšeme pejsek, chlupáč, páníček, mňamka ani citoslovce.
- **Velká písmena** jen na začátku věty a ve jménech. Verzálky nastavuje CSS a jen u `eyebrow` a oznamovací lišty.
- **Tlačítka** začínají slovesem: „Vybrat krmivo“, „Sestavit plán“, „Jen spočítat dávku“, „Do košíku“, „Vložit do košíku“.
- **Čísla a jednotky** česky: „149 Kč“, „1,3 kg“, desetinná čárka, mezi číslem a jednotkou pevná mezera.
- **Bez emoji a bez vykřičníků.** Chybová hláška říká, co opravit: „Zkontrolujte e-mail, chybí část za zavináčem.“
- **Názvy řad** se nemění: BARF mixy, Kosti, Navíc, Mlsky, Granule; služba je „Krmení na míru“, košík je „Košík“.

## Barvy

- Text odstavců sázej v `muted`, zvýraznění v `ink`, nadpisy, ceny a navigaci v `green`.
- Odkazy v textu a LinkArrow jsou `brick-text`. Samotná `brick` je výplň, ne barva drobného textu.
- Na `brick` patří jen `white`. Na `green` patří `cream` nebo `white`. Na `ochre` a `ochre-badge` patří `ink`.
- `ochre` nese oznamovací lištu a drobné dekorace; jako barva textu na světlém podkladu se nepoužívá.
- `olive` je jen značka „Skladem“ vedle slova. Stav skladu nikdy neříká barva sama, vždy slovo a tvar značky.
- `line` je dekorativní linka (karty, oddělovače). Okraj polí a krokovače je `muted`.
- Fokus je plný obrys 2 px v `green` s odsazením 2 px; na `green` ploše v `cream`.
- Tmavý režim e-shop nemá.

## Písmo

- Display: **Amatic SC 700**, jen `display-xl`, `display-lg`, `display-sm`, vždy v `green` (na `green` ploše v `cream`). Nikdy pod 25 px, nikdy pro ceny, tlačítka, formuláře a souvislý text.
- Text: **Montserrat** 400, 600, 700, 800. Odstavec `body` 16/28 je záměrně vzdušný; nezhušťuj ho.
- Název produktu na kartě je `heading-md` s váhou 800, cena `price`, popisek ceny `label`.
- Nadtitulek `eyebrow` má prostrkání 1,9 px a verzálky; je to jediné prostrkané písmo v systému.
- Na stránce je jeden `display-xl`. Každá další sekce má jeden `display-lg`.
- Obě písma jsou z Google Fonts; načítej podmnožinu `latin-ext` kvůli češtině. Amatic SC nemá minusky, text se vykreslí kapitálkami.

## Rozvržení a mezery

- Obsah drž v `container` (1200 px) s 10px okraji; dlouhý text v `container-prose`, příběh v `container-narrow`.
- Sekce jsou pruhy přes celou šířku se svislým okrajem `space-2xl` (pod `bp-md` 40 px). Hlavička sekce je na střed, pod ní `space-xl`.
- Mřížka produktů: 3 sloupce ve výpisu řady, 4 v karuselu; dlaždice s ikonou po 4. Mezera vždy `space-md`.
- Detail produktu: dva stejné sloupce (galerie, BuyPanel), pod nimi popis v úzkém sloupci.
- Zlomy: `bp-sm` 480, `bp-md` 768, `bp-lg` 992, `bp-xl` 1200. Pod `bp-lg` se navigace schová do bočního panelu.

## Tvary, linky a stíny

- Rohy jsou ostré: `radius-control` a `radius-card` mají 3 px. Zaoblení 10 px (`radius-panel`) má jen plovoucí menu. Kruh (`radius-round`) patří ikonovým diskům, kulatým fotkám a šipkám.
- Karta má linku `line` a téměř neviditelný `shadow-card`; při hoveru linku `brick` a `shadow-card-hover`.
- Hlavička nemá spodní linku, jen `shadow-header`. Plovoucí panely mají `shadow-menu`, kulaté šipky `shadow-float`.
- Cihlové tlačítko má 2px spodní hranu v `brick-text`; jiné prvky hranu nemají.
- Žádné přechody barev, žádné barevné pruhy na okraji karet, žádné sklo ani rozostření.

## Pohyb

- Přechody barvy, okraje a stínu trvají .3s (`ease`, u karet `ease-in-out`). Nic se neposouvá, nezvětšuje ani neodskakuje.
- Karusel produktů se posouvá jen na pokyn uživatele. Při `prefers-reduced-motion` se přechody vypnou.

## Fotografie

- **Produkt**: balení nebo obsah misky shora, vyříznuté, na průhledném nebo bílém pozadí, měkké přirozené světlo, bez rekvizit. Plocha na kartě je 241×200, v galerii 580×435.
- **Hero**: pes nebo kočka se surovinami (maso, kosti, zelenina), vyříznutí na bílé, zhruba 560×480, klidně s přesahem přes sloupec.
- **Lidé a prodejna**: skutečné fotky z Kladna, v bloku Story ořezané do kruhu.
- Nepoužívej fotobanku s cizími psy jako „naše zákazníky“, ilustrace převzaté odjinud ani fotky s barevným pozadím. Dokud fotka není, zůstane v návrhu prázdná plocha v `cream`.

## Ikony

- Liniové ikony s tahem 1,75 a zaoblenými konci, vykreslené v `currentColor`: 20 px v textu a tlačítkách, 24 px v hlavičce, 56 px v disku (tah 1,5).
- Ukázky používají obrysy ve stylu Lucide (`lucide-react`). Je to náhrada: původní sada ikon z webu DoKosti nebyla převzata. Pokud projekt už ikonovou sadu má, zůstává; nové ikony drž ve stejném tahu.
- Ikona vždy doprovází text, sama stojí jen v hlavičce (uživatel, košík, hledání) s popiskem pro čtečky.
- Kost je motiv loga. Jako ikona smí označovat řady krmiva, jinak ji nepoužívej jako ozdobu.

## Logo

- Logo je nápis DoKosti v `green` s kostí v `brick` a řádkem BARF; soubory jsou ve skupině Logos. Nepřekresluj ho, nepřebarvuj a nesázej ho písmem.
- V hlavičce stojí nápis s kostí bez řádku BARF, výška 44 px. Na `green` a na fotce se používá negativní verze v `cream`.
- Ochranná zóna je výška kosti na všech stranách. Nejmenší šířka je 96 px.
- Logo nestojí na `brick`, `ochre` ani na neklidné fotce.

## Ukázková data

Názvy produktů, balení a ceny v náhledech jsou ukázky. Skutečná data bere e-shop z databáze.

## Paleta

| Barva | Hodnota | Použití |
| --- | --- | --- |
| `white` | `#ffffff` | Základní plocha: stránka, hlavička, produktové karty, vstupy. Stránka je bílá, ne krémová. |
| `paper` | `#fbf7ee` | Střídavý pruh sekce (každá druhá sekce) a podklad miniatur. Text na něm: ink, muted, green, brick-text. |
| `cream` | `#f3ecdd` | Výraznější teplý pruh (newsletter, krmení na míru) a text na green. Text na něm: ink, muted, green, brick-text. |
| `line` | `#d9cfb8` | Dekorativní linky: okraj karet, oddělovače, okraj miniatur. Nenese význam (1,55:1 na bílé); okraj vstupů je muted. |
| `green` | `#1f3a2d` | Barva značky. Nadpisy, ceny, navigace, patička, kulaté ikonové disky, tmavé tlačítko. Na white 12,3:1; text na ní je cream (10,5:1) nebo white. |
| `green-hover` | `#2b4d3c` | Hover a active tmavých ploch (tmavé tlačítko, položky v patičce). Text na ní: cream 8:1. |
| `brick` | `#b5532f` | Hlavní akce: tlačítko Do košíku, aktivní položka menu, štítek Akce, kost v logu. Text na ní vždy white (4,95:1); cream na brick neprojde (4,2:1). |
| `brick-text` | `#9c4424` | Cihlová pro text a odkazy na white, paper a cream (6,4 / 6,0 / 5,5:1); hover a spodní hrana cihlového tlačítka. |
| `ochre` | `#c8892b` | Oznamovací lišta nad hlavičkou a dekorativní akcenty (podtržení, ikony na green). Text na ní jen ink (5,3:1); jako barva textu na bílé neprojde (3:1). |
| `ochre-badge` | `#e9c98f` | Podklad štítku Novinka a jemných zvýraznění. Text na něm: ink (10:1) nebo green (7,8:1). |
| `olive` | `#7a8c3a` | Jen značka stavu: tečka nebo ikona Skladem vedle slova (3,7:1 na white). Nikdy jako barva drobného textu ani podklad pod bílý text. |
| `ink` | `#24221f` | Nejsilnější text: tučné zvýraznění v odstavci, text na ochre a ochre-badge. Na white 15,9:1. |
| `muted` | `#55645a` | Běžný text odstavců, popisky, drobečková navigace, okraj vstupů. Na white 6,3:1, paper 5,9:1, cream 5,3:1. |
| `overlay` | `rgba(31, 58, 45, 0.8)` | Překryv nedostupného produktu (green na 80 %) s bílým textem a ikonou. |

## Typografická škála

Titulky: **Amatic SC 700**. Text a rozhraní: **Montserrat** 400, 600, 700, 800. Obojí z Google Fonts (licence OFL).

| Styl | Písmo | Velikost / řádek | Váha | Použití |
| --- | --- | --- | --- | --- |
| `display-xl` | Amatic SC | 70px / 77px | 700 | H1 v hero a název produktu v detailu. Pod 768 px: 50/55. |
| `display-lg` | Amatic SC | 50px / 55px | 700 | Titulek sekce a titulek v bloku příběhu. Pod 768 px: 40/44. |
| `display-sm` | Amatic SC | 25px / 27.5px | 700 | Titulek rozbalovacího panelu (přihlášení, košík). Menší Amatic SC nepoužívat. |
| `heading-lg` | Montserrat | 25px / 27.5px | 700 | Nadpis dlaždice s ikonou a nadpis bloku v obsahu. |
| `heading-md` | Montserrat | 20px / 22px | 800 | Název produktu na kartě (váha 800), podnadpisy v popisu produktu (váha 700). |
| `price-lg` | Montserrat | 25px / 32.5px | 700 | Cena v detailu produktu, v green. |
| `price` | Montserrat | 20px / 20px | 700 | Cena na kartě produktu, v green. |
| `body` | Montserrat | 16px / 28px | 400 | Odstavce a popisy v muted. Řádkování 28 px je záměrně vzdušné. |
| `body-strong` | Montserrat | 16px / 28px | 700 | Zvýraznění uvnitř odstavce, v ink. |
| `bar` | Montserrat | 15px / 26.25px | 700 | Text oznamovací lišty; verzálky nastav v CSS (text-transform: uppercase). |
| `label` | Montserrat | 15px / 21px | 600 | Popisek nad cenou a u formulářových polí. |
| `nav` | Montserrat | 14px / 16.8px | 700 | Položky hlavní navigace a mega menu. |
| `button` | Montserrat | 14px / 24.5px | 700 | Text tlačítek a odkazů se šipkou. Bez verzálek. |
| `eyebrow` | Montserrat | 13px / 22.75px | 600 | Nadtitulek nad titulkem sekce, verzálky (text-transform: uppercase), v muted. |
| `small` | Montserrat | 13px / 22.75px | 400 | Drobečková navigace, druhý řádek patičky, drobné poznámky. |

## Mezery

| Token | Hodnota | Použití |
| --- | --- | --- |
| `space-2xs` | `5px` | Mezera mezi polem a jednotkou „ks“, vnitřek štítku svisle. |
| `space-xs` | `10px` | Polovina mřížkové mezery, vnitřek štítku vodorovně, mezera pod názvem produktu. |
| `space-sm` | `14px` | Mezera pod odstavcem a pod titulkem sekce. |
| `space-md` | `20px` | Vnitřní okraj karty a mezera mezi kartami v mřížce. |
| `space-lg` | `30px` | Odstup odstavců v hero, logo od navigace, vnitřek obsahu karty (25–30 px). |
| `space-xl` | `50px` | Hlavička sekce od jejího obsahu. |
| `space-2xl` | `60px` | Svislý vnitřní okraj každé sekce (pod 768 px: 40 px). |
| `space-3xl` | `70px` | Odstup obsahu sekce od jejího spodního okraje u pruhů s navazujícím blokem. |

## Rohy

| Token | Hodnota | Použití |
| --- | --- | --- |
| `radius-control` | `3px` | Tlačítka, vstupy, štítky, miniatury. Ostré rohy jsou záměr. |
| `radius-card` | `3px` | Produktová karta, video, blogová karta. |
| `radius-panel` | `10px` | Jen plovoucí panely: mega menu a jeho miniatury. |
| `radius-round` | `50%` | Kulaté ikonové disky, kulatá fotka v příběhu, kulatá šipka. |

## Stíny

| Token | Hodnota | Použití |
| --- | --- | --- |
| `shadow-card` | `0 0 5px rgba(0, 0, 0, 0.05)` | Klidový stav produktové karty. |
| `shadow-card-hover` | `0 0 10px rgba(181, 83, 47, 0.3)` | Hover produktové karty, spolu s okrajem v brick. |
| `shadow-header` | `0 2px 30px rgba(0, 0, 0, 0.06)` | Pod bílou hlavičkou. |
| `shadow-float` | `0 2px 5px rgba(0, 0, 0, 0.1)` | Kulaté šipky karuselu a odkazu se šipkou. |
| `shadow-menu` | `0 5px 15px rgba(0, 0, 0, 0.1)` | Mega menu a rozbalovací panely. |

## Šířky

| Token | Hodnota | Použití |
| --- | --- | --- |
| `container` | `1200px` | Maximální šířka obsahu včetně 10px okrajů po stranách. |
| `container-narrow` | `960px` | Blok příběhu a užší obsahové pasáže. |
| `container-prose` | `708px` | Sloupec dlouhého textu: popis produktu, článek. |
| `header-height` | `60px` | Výška bílé hlavičky na desktopu. |
| `bar-height` | `42px` | Výška oznamovací lišty. |

## Zlomy

| Token | Hodnota | Použití |
| --- | --- | --- |
| `bp-sm` | `480px` | Od této šířky dvě karty vedle sebe. |
| `bp-md` | `768px` | Tablet: plné velikosti display písma, sekce 60 px. |
| `bp-lg` | `992px` | Desktopová navigace a tři karty v řadě. |
| `bp-xl` | `1200px` | Plná šířka kontejneru, čtyři dlaždice v řadě. |

## Stránky

Každá stránka se skládá shora dolů ze stejných dílů: oznamovací lišta, hlavička, pruhy sekcí střídající `white` a `paper`, nízká patička. Každý pruh začíná SectionHeader, kromě hero a detailu produktu.

### Úvod

1. **Header** s lištou.
2. **Hero** na bílé: fotka vlevo, „Poctivé do kosti.“ vpravo, tlačítka „Vybrat krmivo“ a „Jak doručujeme“.
3. **Rozcestník řad** na `paper`: nadtitulek „Nabídka“, titulek „Pět řad, jasný systém“, pět IconTile ve variantě rozcestník (disk, název řady, malé tlačítko).
4. **Z čeho to je** na `white`: čtyři IconTile s vyříznutými fotkami surovin místo disků (maso, kosti, vnitřnosti, doplňky) a jednou větou.
5. **Krmení na míru** na `cream`: malý Hero (fotka 400 px), titulek „Plán pro vašeho psa za dvě minuty“, tlačítka „Sestavit plán“ a „Jen spočítat dávku“.
6. **Skladem** na `white`: SectionHeader „Z mrazáku rovnou k vám“ s LinkArrow, karusel ProductCard po čtyřech.
7. **Doručení** na `paper`: tři IconTile (Osobní odběr, Rozvoz po okolí, Chlazený přepravce) a LinkArrow „Podrobnosti o doručení“.
8. **O nás** na `white`: Story „Prodejna, ne sklad“ s kulatou fotkou.
9. **Footer**.

### Výpis řady

1. **Header**.
2. **Hero řady** na bílé: fotka vlevo; vpravo `display-xl` s názvem řady, tučný podtitulek `heading-md`, odstavec, seznam odkazů na návody (Jak začít, Skladování) a tlačítko „Spočítat dávku“.
3. **Produkty** na `paper`: SectionHeader (nadtitulek = počet nebo upřesnění, titulek = druhy masa), mřížka ProductCard ve 3 sloupcích. Filtr podle masa je řádek textových odkazů nad mřížkou, ne postranní panel.
4. **Story** s recenzí nebo radou k řadě.
5. **Footer**.

### Detail produktu

1. **Header**, pod ním **Breadcrumb**.
2. Dva sloupce: vlevo galerie (hlavní fotka, pod ní miniatury, kulaté šipky se `shadow-float`), vpravo **BuyPanel**.
3. **Popis** v `container-prose`, oddělený linkou `line`: podnadpisy Složení, Analytické složky, Podávání, Skladování, Balení; seznamy s odrážkami v `body`.
4. **Další z řady**: SectionHeader a karusel ProductCard.
5. **Footer**.

### Košík a pokladna

- Košík je tabulka na bílé: miniatura, název (`heading-md` 700), krokovač, cena; souhrn vpravo v panelu na `paper` s velkým tlačítkem „Pokračovat k dopravě“.
- Pokladna má tři kroky (Doprava, Platba, Údaje) značené čísly v discích `green`; pole jsou Field, akce vždy jedna cihlová dole vpravo.
- U mraženého zboží stojí u volby dopravy věta o termínu odeslání ve stylu `small`.

### Obsahové stránky

- Jak začít, O nás, Doprava: `display-xl` nahoře na střed, text v `container-prose`, mezititulky `heading-lg`, obrázky vyříznuté nebo kulaté.
- Kalkulačka a Krmení na míru: formulář v jednom sloupci do 560 px, výsledek v panelu na `paper` s čísly ve stylu `price-lg`.

## Předloha a co z ní nebrat

Stavba e-shopu vychází z mixano.cz. Přebírá se uspořádání a tvar, ne obsah.

### Co se přebírá

| Prvek předlohy | Hodnota v předloze | V DoKosti |
| --- | --- | --- |
| Oznamovací lišta | oranžová `#f19a3e`, bílé verzálky 15 px | `ochre` s textem `ink` |
| Hlavička | bílá, 60 px, stín, navigace 14 px tučně | stejně, text `green` |
| Hlavní tlačítko | oranžové, bílý text 14 px tučně, rohy 3 px, tmavší spodní hrana | `brick`, bílý text, hrana `brick-text` |
| Tmavá barva značky | vínová `#521912`: nadpisy, patička, disky | `green` |
| Běžný text | šedá `#817e7d`, 16/28 | `muted`, 16/28 |
| Světlý pruh | `#f9f7f4` | `paper` |
| Titulky | Amatic SC 700, 70/77 a 50/55 | stejně |
| Text a UI | Montserrat 400–800 | stejně |
| Nadtitulek | 13 px, 600, verzálky, prostrkání 1,9 px | stejně, v `muted` |
| Karta produktu | bílá, linka, rohy 3 px, fotka 220 px, název 20/22, cena 20 px, pole 40×40 + tlačítko | stejně v barvách DoKosti |
| Praporek na kartě | zelený, přilepený vlevo, pravé rohy 3 px | `ochre-badge`, `green`, `brick` |
| Nedostupný produkt | vínový překryv 80 % s ikonou a textem | `overlay` |
| Dlaždice s ikonou | disk 128 px, nadpis 25 px, malé tlačítko | disk `green`, ikona `cream` |
| Mega menu | bílý panel, rohy 10 px, 4 sloupce, miniatury 40 px | stejně |
| Detail produktu | dva sloupce 580 px, krokovač 60 px, tlačítko 60 px | stejně |
| Patička | nízká, tmavá, dva řádky odkazů, telefon jako světlý štítek | `green` s `cream` |
| Zlomy | 480, 768, 992, 1200 | stejně |
| Přechody | .3s | stejně |

### Co se mění oproti předloze

- Bílý text na oranžové má v předloze kontrast 2,2:1. V DoKosti je hlavní akce `brick` s bílým textem (4,95:1) a lišta `ochre` s textem `ink` (5,3:1).
- Šedý text předlohy má 4:1; `muted` má na bílé 6,3:1.
- Nadtitulek má v předloze průhlednost 30 %; zde je plný `muted`.
- Okraj polí je `muted`, ne světlá linka, aby byl ovládací prvek vidět.
- Stav skladu je slovo se značkou, ne jen barva.
- Tlačítko „šipka dolů“ na spodku každé sekce se nepřebírá.

### Co se nepřebírá nikdy

- Logo, fotografie, ilustrace, ikony psů a textury pozadí předlohy.
- Texty, názvy produktů a slovník předlohy: „miska“ místo košíku, „Blog Dog“, „páníček“, „haf“, „chlupáči“.
- Jména a tváře lidí, recenze a videa.
- Názvy řad a služeb předlohy. DoKosti má vlastní: BARF mixy, Kosti, Navíc, Mlsky, Granule, Krmení na míru.
