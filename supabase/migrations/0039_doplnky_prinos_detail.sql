-- products.benefit_detail: delší vysvětlení hlavního přínosu na stránce produktu (2–3 věty podle údajů výrobce).
alter table products add column if not exists benefit_detail text check (benefit_detail is null or char_length(benefit_detail) between 1 and 600);
comment on column products.benefit_detail is 'Delší vysvětlení hlavního přínosu na stránce produktu, 2–3 věty podle údajů výrobce. Žádná zdravotní tvrzení.';
