-- Prodejna, krok 1: datový základ. Jednotka ks/kg, nákupní cena a marže, role správce/obsluha,
-- pohyby skladu (příjem, prodej, storno, odpis, inventura, oprava), příjemky.

-- 1) Jednotka a nákupní cena u produktu. Cena je vždy za jednotku (za kus, nebo za kg).
create type product_unit as enum ('ks', 'kg');
alter table products
  add column unit product_unit not null default 'ks',
  add column purchase_price_czk numeric(10,2) check (purchase_price_czk is null or purchase_price_czk >= 0),
  add column ean text;
create unique index products_ean_idx on products (ean) where ean is not null and ean <> '';
-- Sklad na tři desetinná místa (kg), u kusového zboží celá čísla. Pohledy nad order_items se přegenerují níže.
drop view if exists top_products;
drop view if exists sales_by_day;
alter table products alter column stock_qty type numeric(10,3);
alter table order_items alter column qty type numeric(10,3);
alter table stock_batches alter column qty type numeric(10,3);
alter table subscription_items alter column qty type numeric(10,3);
-- Nákupní cena v době prodeje pro výpočet zisku.
alter table order_items add column unit_cost_czk numeric(10,2);

-- 2) Role správců: správce vše, obsluha kasa, výdej, příjem.
alter table admins add column role text not null default 'spravce' check (role in ('spravce', 'obsluha'));
create or replace function admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from admins where user_id = auth.uid();
$$;
revoke all on function admin_role() from public, anon;
grant execute on function admin_role() to authenticated;
create or replace function is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role = 'spravce');
$$;
revoke all on function is_manager() from public, anon;
grant execute on function is_manager() to authenticated;
-- Správce může měnit role ostatních (uživatele zakládá v Supabase Auth).
create policy "managers update admins" on admins for update to authenticated using (is_manager()) with check (is_manager());
-- Nastavení, slevové kódy, předplatné a doklady jen správce.
drop policy "admins manage settings" on settings;
create policy "managers manage settings" on settings for all to authenticated using (is_manager()) with check (is_manager());
drop policy "admins manage coupons" on coupons;
create policy "managers manage coupons" on coupons for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff read coupons" on coupons for select to authenticated using (is_admin());

-- 3) Pohyby skladu. Jediné místo, které mění products.stock_qty.
create type stock_kind as enum ('prijem', 'prodej_web', 'prodej_kasa', 'storno', 'odpis', 'inventura', 'oprava');
create table stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  kind stock_kind not null,
  -- kladné = přibylo, záporné = ubylo
  qty numeric(10,3) not null check (qty <> 0),
  unit_cost_czk numeric(10,2),
  order_id uuid references orders (id) on delete set null,
  receipt_id uuid,
  batch_id uuid references stock_batches (id) on delete set null,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index stock_movements_product_idx on stock_movements (product_id, created_at desc);
create index stock_movements_created_idx on stock_movements (created_at desc);
alter table stock_movements enable row level security;
create policy "admins read movements" on stock_movements for select to authenticated using (is_admin());

-- Pohyb upraví stav skladu. Když se sklad zatím neevidoval, začne se evidovat od prvního příjmu.
create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform set_config('dokosti.movement', '1', true);
  update products set
    stock_qty = greatest(coalesce(stock_qty, 0) + new.qty, 0),
    in_stock = case when greatest(coalesce(stock_qty, 0) + new.qty, 0) > 0 then true else in_stock end
  where id = new.product_id;
  update products set in_stock = false where id = new.product_id and stock_qty = 0 and in_stock;
  perform set_config('dokosti.movement', '0', true);
  return new;
end $$;
revoke execute on function apply_stock_movement() from public, anon, authenticated;
create trigger stock_movements_apply after insert on stock_movements for each row execute function apply_stock_movement();

-- Ruční změna stavu v adminu (mimo pohyby) se zapíše jako oprava, aby historie seděla.
create or replace function audit_stock_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dokosti.movement', true), '0') = '1' then return new; end if;
  if new.stock_qty is distinct from old.stock_qty and new.stock_qty is not null and coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0) <> 0 then
    insert into stock_movements (product_id, kind, qty, note, created_by)
    values (new.id, 'oprava', coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0), 'Ruční změna stavu v adminu', auth.uid());
  end if;
  return new;
end $$;
revoke execute on function audit_stock_change() from public, anon, authenticated;
create trigger products_stock_audit after update of stock_qty on products for each row execute function audit_stock_change();

-- 4) Odpis a inventura (jen správce a obsluha, přes RPC).
-- p_kind: 'odpis' (qty = kolik ubylo, kladné číslo) nebo 'inventura' (qty = nový skutečný stav).
create or replace function adjust_stock(p_product_id uuid, p_kind text, p_qty numeric, p_note text default '')
returns numeric language plpgsql security definer set search_path = public as $$
declare v_current numeric; v_delta numeric;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select coalesce(stock_qty, 0) into v_current from products where id = p_product_id for update;
  if p_kind = 'odpis' then
    if p_qty <= 0 then raise exception 'bad qty'; end if;
    v_delta := -least(p_qty, v_current);
  elsif p_kind = 'inventura' then
    if p_qty < 0 then raise exception 'bad qty'; end if;
    v_delta := p_qty - v_current;
  else
    raise exception 'bad kind';
  end if;
  if v_delta <> 0 then
    insert into stock_movements (product_id, kind, qty, note, created_by) values (p_product_id, p_kind::stock_kind, v_delta, left(coalesce(p_note, ''), 300), auth.uid());
  end if;
  return v_current + v_delta;
end $$;
revoke all on function adjust_stock(uuid, text, numeric, text) from public, anon;
grant execute on function adjust_stock(uuid, text, numeric, text) to authenticated;

-- 5) Příjemky od dodavatele.
create sequence if not exists receipt_seq;
create table stock_receipts (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  supplier text not null default '',
  doc_no text not null default '',
  note text not null default '',
  total_czk numeric(12,2) not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table stock_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references stock_receipts (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  qty numeric(10,3) not null check (qty > 0),
  unit_cost_czk numeric(10,2) not null default 0 check (unit_cost_czk >= 0),
  batch_no text not null default '',
  expires_on date
);
create index stock_receipt_items_receipt_idx on stock_receipt_items (receipt_id);
alter table stock_receipts enable row level security;
alter table stock_receipt_items enable row level security;
create policy "admins read receipts" on stock_receipts for select to authenticated using (is_admin());
create policy "admins read receipt items" on stock_receipt_items for select to authenticated using (is_admin());
alter table stock_movements add constraint stock_movements_receipt_fk foreign key (receipt_id) references stock_receipts (id) on delete set null;

-- Zaúčtuje příjemku: položky, pohyby, šarže, poslední nákupní cena.
-- p_receipt: supplier, doc_no, note; p_items: [{product_id, qty, unit_cost_czk, batch_no, expires_on}]
create or replace function post_receipt(p_receipt jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_number text; v_item jsonb; v_qty numeric; v_cost numeric; v_batch uuid; v_total numeric := 0; v_count integer := 0; v_product products;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  v_number := 'P' || to_char(now(), 'YYYY') || lpad(nextval('receipt_seq')::text, 4, '0');
  insert into stock_receipts (number, supplier, doc_no, note, created_by)
  values (v_number, left(coalesce(p_receipt->>'supplier', ''), 120), left(coalesce(p_receipt->>'doc_no', ''), 60), left(coalesce(p_receipt->>'note', ''), 500), auth.uid())
  returning id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    v_cost := coalesce((v_item->>'unit_cost_czk')::numeric, 0);
    if v_qty is null or v_qty <= 0 then continue; end if;
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    if not found then raise exception 'unknown product'; end if;
    insert into stock_receipt_items (receipt_id, product_id, qty, unit_cost_czk, batch_no, expires_on)
    values (v_id, v_product.id, v_qty, v_cost, left(coalesce(v_item->>'batch_no', ''), 60), nullif(v_item->>'expires_on', '')::date);
    v_batch := null;
    if nullif(v_item->>'expires_on', '') is not null then
      insert into stock_batches (product_id, batch_no, expires_on, qty, note)
      values (v_product.id, left(coalesce(v_item->>'batch_no', ''), 60), (v_item->>'expires_on')::date, v_qty, 'Příjemka ' || v_number)
      returning id into v_batch;
    end if;
    insert into stock_movements (product_id, kind, qty, unit_cost_czk, receipt_id, batch_id, note, created_by)
    values (v_product.id, 'prijem', v_qty, v_cost, v_id, v_batch, 'Příjemka ' || v_number || coalesce(' · ' || nullif(p_receipt->>'supplier', ''), ''), auth.uid());
    if v_cost > 0 then update products set purchase_price_czk = v_cost where id = v_product.id; end if;
    v_total := v_total + v_qty * v_cost;
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then raise exception 'empty receipt'; end if;
  update stock_receipts set total_czk = v_total where id = v_id;
  return jsonb_build_object('id', v_id, 'number', v_number, 'total_czk', v_total, 'items', v_count);
end $$;
revoke all on function post_receipt(jsonb, jsonb) from public, anon;
grant execute on function post_receipt(jsonb, jsonb) to authenticated;

-- 6) Prodej z webu a storno jdou přes pohyby (create_order už neupravuje stock_qty přímo).
create or replace function restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'zrusena' and old.status <> 'zrusena' then
    insert into stock_movements (product_id, kind, qty, order_id, note)
    select p.id, 'storno', oi.qty, new.id, 'Zrušená objednávka ' || new.order_number
    from order_items oi join products p on p.slug = oi.product_slug where oi.order_id = new.id and p.stock_qty is not null;
  elsif old.status = 'zrusena' and new.status <> 'zrusena' then
    insert into stock_movements (product_id, kind, qty, order_id, note)
    select p.id, 'prodej_web', -oi.qty, new.id, 'Obnovená objednávka ' || new.order_number
    from order_items oi join products p on p.slug = oi.product_slug where oi.order_id = new.id and p.stock_qty is not null;
  end if;
  return new;
end $$;

create or replace function create_order(p_order jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text;
  v_customer uuid;
  v_email text := lower(trim(p_order->>'customer_email'));
  v_item jsonb;
  v_product products;
  v_qty numeric;
  v_subtotal integer := 0;
  v_shipping jsonb;
  v_method jsonb;
  v_ship_czk integer := 0;
  v_free integer;
  v_min integer;
  v_coupon jsonb;
  v_discount integer := 0;
  v_coupon_code text := null;
  v_sub_settings jsonb;
  v_sub_pct integer := 0;
  v_loyalty jsonb;
  v_points_redeem integer := coalesce((p_order->>'points_redeem')::integer, 0);
  v_points_czk integer := 0;
  v_points_balance integer := 0;
  v_points_earned integer := 0;
  v_total integer;
  v_lines jsonb := '[]'::jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then continue; end if;
    select * into v_product from products where slug = v_item->>'product_slug' and is_published;
    if not found or not v_product.in_stock then
      raise exception 'unavailable: %', v_item->>'product_slug';
    end if;
    if v_product.unit = 'ks' then v_qty := floor(v_qty); if v_qty < 1 then continue; end if; end if;
    if v_product.stock_qty is not null and v_product.stock_qty < v_qty then
      raise exception 'out of stock: %', v_product.slug;
    end if;
    v_subtotal := v_subtotal + round(v_qty * v_product.price_czk)::integer;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id,
      'product_slug', v_product.slug,
      'name', (case v_product.line when 'zaklad' then 'Základ' when 'kosti' then 'Kosti' when 'navic' then 'Navíc'
                                   when 'mlsky' then 'Mlsky' when 'granule' then 'Granule' end) || ' · ' || v_product.variant,
      'qty', v_qty, 'unit_price_czk', v_product.price_czk, 'unit_cost_czk', v_product.purchase_price_czk, 'tracked', v_product.stock_qty is not null);
  end loop;
  if jsonb_array_length(v_lines) = 0 then raise exception 'empty order'; end if;

  select value into v_shipping from settings where key = 'shipping';
  v_method := coalesce(v_shipping -> (p_order->>'shipping_method'), '{}'::jsonb);
  if v_shipping is not null and coalesce((v_method->>'enabled')::boolean, true) = false then
    raise exception 'shipping disabled';
  end if;
  v_ship_czk := coalesce((v_method->>'priceCzk')::integer,
    case p_order->>'shipping_method' when 'odber' then 0 when 'rozvoz' then 79 when 'prepravce' then 249 end);
  v_free := coalesce((v_method->>'freeFromCzk')::integer,
    case p_order->>'shipping_method' when 'rozvoz' then 1500 when 'prepravce' then 3000 else null end);
  v_min := coalesce((v_method->>'minOrderCzk')::integer,
    case p_order->>'shipping_method' when 'rozvoz' then 500 when 'prepravce' then 1000 else 0 end);
  if v_subtotal < v_min then raise exception 'below minimum'; end if;

  if coalesce(p_order->>'coupon_code', '') <> '' then
    v_coupon := check_coupon(p_order->>'coupon_code', v_subtotal);
    if v_coupon ? 'error' then raise exception 'coupon: %', v_coupon->>'error'; end if;
    v_discount := (v_coupon->>'discount')::integer;
    v_coupon_code := v_coupon->>'code';
    update coupons set used_count = used_count + 1 where code = v_coupon_code;
  end if;

  if coalesce(p_order->>'subscribe_interval', '') <> '' then
    select value into v_sub_settings from settings where key = 'subscription';
    if v_sub_settings is null or coalesce((v_sub_settings->>'enabled')::boolean, true) then
      v_sub_pct := coalesce((v_sub_settings->>'discountPct')::integer, 5);
      if v_sub_pct > 0 then
        v_discount := v_discount + round((v_subtotal - v_discount) * v_sub_pct / 100.0)::integer;
        v_coupon_code := coalesce(v_coupon_code, 'PŘEDPLATNÉ');
      end if;
    end if;
  end if;

  select value into v_loyalty from settings where key = 'loyalty';
  if v_loyalty is null then v_loyalty := '{"enabled": true, "czkPerPoint": 10, "redeemStep": 100, "redeemValueCzk": 50}'::jsonb; end if;
  if (v_loyalty->>'enabled')::boolean = false then v_points_redeem := 0; end if;
  if v_points_redeem > 0 then
    if v_points_redeem % (v_loyalty->>'redeemStep')::integer <> 0 then raise exception 'points step'; end if;
    v_points_balance := coalesce((select points from customers where email = v_email), 0);
    if v_points_redeem > v_points_balance then raise exception 'points balance'; end if;
    v_points_czk := v_points_redeem / (v_loyalty->>'redeemStep')::integer * (v_loyalty->>'redeemValueCzk')::integer;
    v_points_czk := least(v_points_czk, v_subtotal - v_discount);
  end if;

  if v_free is not null and v_subtotal >= v_free then v_ship_czk := 0; end if;
  v_total := v_subtotal - v_discount - v_points_czk + v_ship_czk;
  if (v_loyalty->>'enabled')::boolean then
    v_points_earned := floor((v_subtotal - v_discount - v_points_czk) / (v_loyalty->>'czkPerPoint')::numeric);
  end if;

  insert into customers (email, name, phone, street, city, zip)
  values (v_email, p_order->>'customer_name', p_order->>'customer_phone',
          coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''))
  on conflict (email) do update set
    name = excluded.name,
    phone = excluded.phone,
    street = case when excluded.street <> '' then excluded.street else customers.street end,
    city = case when excluded.city <> '' then excluded.city else customers.city end,
    zip = case when excluded.zip <> '' then excluded.zip else customers.zip end
  returning id into v_customer;

  v_number := 'DK' || to_char(now(), 'YYMMDD') || lpad((floor(random() * 10000))::text, 4, '0');

  insert into orders (
    order_number, customer_id, customer_name, customer_email, customer_phone,
    street, city, zip, note, shipping_method, payment_method, delivery_date,
    subtotal_czk, shipping_czk, total_czk,
    coupon_code, discount_czk, points_redeemed, points_discount_czk, points_earned, subscription_id
  ) values (
    v_number, v_customer, p_order->>'customer_name', v_email, p_order->>'customer_phone',
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), coalesce(p_order->>'note', ''),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method,
    nullif(p_order->>'delivery_date', '')::date,
    v_subtotal, v_ship_czk, v_total,
    v_coupon_code, v_discount, v_points_redeem, v_points_czk, v_points_earned,
    nullif(p_order->>'subscription_id', '')::uuid
  )
  returning id into v_id;

  insert into order_items (order_id, product_slug, name, qty, unit_price_czk, unit_cost_czk)
  select v_id, x->>'product_slug', x->>'name', (x->>'qty')::numeric, (x->>'unit_price_czk')::integer, (x->>'unit_cost_czk')::numeric
  from jsonb_array_elements(v_lines) as x;

  -- odpis ze skladu jako pohyb (jen u evidovaných produktů)
  insert into stock_movements (product_id, kind, qty, unit_cost_czk, order_id, note)
  select (x->>'product_id')::uuid, 'prodej_web', -(x->>'qty')::numeric, (x->>'unit_cost_czk')::numeric, v_id, 'Objednávka ' || v_number
  from jsonb_array_elements(v_lines) as x where (x->>'tracked')::boolean;

  if v_points_redeem > 0 then
    update customers set points = points - v_points_redeem where id = v_customer;
    insert into loyalty_transactions (customer_id, order_id, points, reason)
    values (v_customer, v_id, -v_points_redeem, 'Uplatněno v objednávce ' || v_number);
  end if;

  update customers set orders_count = orders_count + 1, total_spent_czk = total_spent_czk + v_total
  where id = v_customer;

  return jsonb_build_object('order_number', v_number, 'total_czk', v_total, 'points_earned', v_points_earned);
end $$;
revoke all on function create_order(jsonb, jsonb) from public;
grant execute on function create_order(jsonb, jsonb) to anon, authenticated, service_role;

-- 7) Statistiky: tržba i hrubý zisk (nákupní cena v době prodeje), pohled na marže.
create view sales_by_day with (security_invoker = true) as
select o.day, o.orders, o.revenue_czk, o.odber, o.rozvoz, o.prepravce, coalesce(c.cost_czk, 0) as cost_czk
from (
  select date_trunc('day', created_at)::date as day,
         count(*) as orders,
         sum(total_czk) as revenue_czk,
         sum(case when shipping_method = 'odber' then 1 else 0 end) as odber,
         sum(case when shipping_method = 'rozvoz' then 1 else 0 end) as rozvoz,
         sum(case when shipping_method = 'prepravce' then 1 else 0 end) as prepravce
  from orders where status <> 'zrusena' group by 1
) o
left join (
  select date_trunc('day', o2.created_at)::date as day, sum(i.qty * coalesce(i.unit_cost_czk, 0)) as cost_czk
  from order_items i join orders o2 on o2.id = i.order_id where o2.status <> 'zrusena' group by 1
) c on c.day = o.day;

create view top_products with (security_invoker = true) as
select i.product_slug, i.name, sum(i.qty) as qty, sum(i.qty * i.unit_price_czk) as revenue_czk,
       sum(i.qty * coalesce(i.unit_cost_czk, 0)) as cost_czk,
       max(o.created_at) as last_sold_at
from order_items i join orders o on o.id = i.order_id
where o.status <> 'zrusena'
group by 1, 2;

create view product_margins with (security_invoker = true) as
select p.id, p.slug, p.line, p.variant, p.unit, p.price_czk, p.purchase_price_czk, p.stock_qty,
       case when p.purchase_price_czk is not null and p.purchase_price_czk > 0
            then round((p.price_czk - p.purchase_price_czk) / p.price_czk * 100, 1) end as margin_pct,
       (select avg(m.unit_cost_czk) from stock_movements m where m.product_id = p.id and m.kind = 'prijem' and m.unit_cost_czk > 0) as avg_purchase_price_czk,
       (select max(m.created_at) from stock_movements m where m.product_id = p.id and m.kind = 'prijem') as last_receipt_at
from products p;
