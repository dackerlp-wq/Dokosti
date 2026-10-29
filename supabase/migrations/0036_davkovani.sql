-- Strukturované dávkování doplňků podle výrobce, aby ho kalkulačka krmení počítala stejně jako text „Podávání“.
-- Tvar: { "unit": "ml" | "g", "pes": Dose, "kocka": Dose }, kde Dose je jedno z:
--   { "per": "food", "min": x, "max": y }   … x–y na 100 g krmiva (BARF dávky)
--   { "per": "body", "min": x, "max": y }   … x–y na 1 kg hmotnosti zvířete denně
--   { "per": "tiers", "tiers": [[doKg, min, max], …] } … pevná denní dávka podle hmotnosti (poslední pásmo bez horní meze: doKg = null)
-- Kalkulačka začíná spodní hranicí, jak výrobci doporučují.
alter table products add column if not exists dose jsonb;
comment on column products.dose is 'Dávkování z textu výrobce pro kalkulačku krmení: {unit, pes, kocka}. Nevymýšlet, prázdné = dávkuje se podle obalu.';

update products set dose = v.dose::jsonb from (values
  ('navic-lososovy-olej-natural-extra', '{"unit":"ml","pes":{"per":"food","min":5,"max":10},"kocka":{"per":"food","min":3,"max":10}}'),
  ('navic-olej-z-trescich-jater', '{"unit":"ml","pes":{"per":"food","min":5,"max":10}}'),
  ('navic-konopny-olej', '{"unit":"ml","pes":{"per":"body","min":0.4,"max":0.67}}'),
  ('navic-lneny-olej', '{"unit":"ml","pes":{"per":"body","min":0.5,"max":0.5}}'),
  ('navic-olej-z-ostropestrce', '{"unit":"ml","pes":{"per":"body","min":1.5,"max":1.5}}'),
  ('navic-vajecne-skorapky', '{"unit":"g","pes":{"per":"body","min":0.2,"max":0.4}}'),
  ('navic-vapnik-horcik-zinek', '{"unit":"g","pes":{"per":"body","min":0.1,"max":0.1}}'),
  ('navic-kelpa-hneda-morska-rasa', '{"unit":"g","pes":{"per":"tiers","tiers":[[5,0.6,0.6],[30,0.6,1.5],[null,1.5,2.5]]}}'),
  ('navic-caulerpa-zelena-morska-rasa', '{"unit":"g","pes":{"per":"tiers","tiers":[[5,1,1.5],[30,2,3],[null,3,6]]}}'),
  ('navic-multivitamin-premium-sypky', '{"unit":"g","pes":{"per":"body","min":0.4,"max":0.6}}'),
  ('navic-pivovarske-kvasnice', '{"unit":"g","pes":{"per":"tiers","tiers":[[10,2,5],[25,6,10],[40,11,15],[65,16,25],[null,26,35]]}}'),
  ('navic-barfex-s-kelpou', '{"unit":"g","pes":{"per":"food","min":10,"max":15}}')
) as v(slug, dose)
where products.slug = v.slug;
