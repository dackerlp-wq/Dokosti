# Skilly projektu DoKosti

## Marketingové skilly

Složky `brand-review`, `campaign-plan`, `competitive-brief`, `content-creation`, `draft-content`,
`email-sequence`, `performance-report` a `seo-audit` jsou převzaté z oficiálního pluginu
**Marketing** od Anthropic (https://github.com/anthropics/knowledge-work-plugins, složka `marketing`,
verze 1.2.0). Licence je v `MARKETING-LICENSE`.

Aktualizace: znovu zkopírovat `marketing/skills/*/SKILL.md` z upstream repozitáře.

Spouštění: `/draft-content`, `/campaign-plan`, `/brand-review`, `/competitive-brief`,
`/performance-report`, `/seo-audit`, `/email-sequence`. Skill `content-creation` se načítá
automaticky při psaní marketingových textů.

## Pravidla pro DoKosti (platí nad rámec převzatých skillů)

- Veškerý výstup je česky a vykáme. Pokud skill nabízí anglické šablony, přelož je.
- Tón, barvy a hlasy značky určuje `BRAND.md` v kořeni repozitáře, ne obecné rady ve skillu.
- Žádná zdravotní tvrzení o krmivu. Při zdravotních potížích zvířete vždy odkázat na veterináře.
- Ceny, složení a názvy produktů nikdy nevymýšlet. Název produktu je vždy `productName()`
  z `src/lib/catalog.ts` (`Řada · druh masa`).
- Žádné emoji, ikony jsou Lucide.
