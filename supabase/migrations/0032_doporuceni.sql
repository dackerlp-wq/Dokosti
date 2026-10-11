-- Ruční přednost produktu v doporučení kalkulačky a průvodce (−2 nedoporučovat … +2 přednostně).
alter table products add column if not exists reco_boost smallint not null default 0;
alter table products drop constraint if exists products_reco_boost_check;
alter table products add constraint products_reco_boost_check check (reco_boost between -2 and 2);
