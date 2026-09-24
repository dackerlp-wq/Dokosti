# DoKosti BARF

E-shop se syrovým krmivem pro psy a kočky. Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase.
Jazyk webu i kódu (komentáře, texty) je čeština. Na webu vykáme.

## Pravidla

- `BRAND.md` je zdroj pravdy pro barvy, písma, loga a tón. Tokeny jsou v `src/app/globals.css` (`@theme`),
  používej je (`bg-green`, `text-brick-text`, `font-display`, `label`), ne hex hodnoty.
- Stíny nepoužívat, hloubku dělá rámeček `border-line` a podklad `bg-paper`.
- Zelená sekce nejvýš jedna na stránku (kromě hlavičky a patičky).
- Ikony Lucide se `strokeWidth={1.75}`, žádné emoji.
- Název produktu je vždy `productName()` z `src/lib/catalog.ts`: `Řada · druh masa`.
- Ceny a složení produktů nikdy nevymýšlet. Ukázková data v `catalog.ts` jsou označená jako placeholder.
- Žádná zdravotní tvrzení, při potížích odkaz na veterináře.

## Příkazy

- `npm run dev`, `npm run build`, `npm run lint`
