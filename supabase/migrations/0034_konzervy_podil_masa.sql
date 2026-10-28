-- Nová řada Konzervy (konzervy a kapsičky), oddělená od granulí.
-- products.meat_pct: podíl masa a vnitřností podle složení výrobce, zobrazuje se na kartě a v detailu.
alter type product_line add value if not exists 'konzervy';

alter table products add column if not exists meat_pct numeric(4,1) check (meat_pct is null or (meat_pct > 0 and meat_pct <= 100));
comment on column products.meat_pct is 'Podíl masa a vnitřností v % podle složení od výrobce. Nevymýšlet, prázdné = neuvádět.';
