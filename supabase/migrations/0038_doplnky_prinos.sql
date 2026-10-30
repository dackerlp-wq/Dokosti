-- products.benefit: hlavní přínos doplňku, krátký štítek na kartě a v detailu ("Zdroj omega-3").
-- Jen podle složení a popisu výrobce, žádná zdravotní tvrzení (léčí, chrání, pomáhá při…).
alter table products add column if not exists benefit text check (benefit is null or char_length(benefit) between 1 and 30);
comment on column products.benefit is 'Hlavní přínos doplňku, max 30 znaků. Výživový údaj podle výrobce, ne zdravotní tvrzení. Prázdné = nezobrazuje se.';
