-- Prodejna, krok 3 a 4: kasa (prodeje, položky, platby), zákaznické karty, směny a denní uzávěrka,
-- výdej webových objednávek u pultu. Pohyby skladu a Kostičky sdílí s e-shopem.

-- Zákazník bez e-mailu (jen jméno a telefon z kasy) a zákaznická karta s předtištěným kódem.
alter table customers alter column email drop not null;
alter table customers drop constraint customers_email_key;
create unique index customers_email_idx on customers (email) where email is not null;
alter table customers add column card_code text;
create unique index customers_card_idx on customers (card_code) where card_code is not null;
create index customers_phone_idx on customers (phone) where phone <> '';

-- Kostičky lze připsat i za prodej v kase.
alter table loyalty_transactions add column pos_sale_id uuid;

-- Nastavení kasy.
insert into settings (key, value) values ('pos', '{"autoPrint": true, "receiptFooter": "Děkujeme za nákup. Poctivé do kosti."}')
on conflict (key) do nothing;

-- Směny (od otevření pokladny po uzávěrku).
create table pos_shifts (
  id uuid primary key default gen_random_uuid(),
  opened_at timestamptz not null default now(),
  opened_by uuid references auth.users (id) on delete set null,
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  opening_cash_czk integer not null default 0,
  closing_cash_czk integer,
  expected_cash_czk integer,
  cash_sales_czk integer not null default 0,
  card_sales_czk integer not null default 0,
  qr_sales_czk integer not null default 0,
  sales_count integer not null default 0,
  cancelled_count integer not null default 0,
  note text not null default ''
);
create index pos_shifts_open_idx on pos_shifts (closed_at) where closed_at is null;

create type pos_cash_kind as enum ('vklad', 'vyber');
create table pos_cash_moves (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references pos_shifts (id) on delete cascade,
  kind pos_cash_kind not null,
  amount_czk integer not null check (amount_czk > 0),
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create type pos_payment as enum ('hotove', 'karta', 'qr', 'prevod');
create type pos_status as enum ('zaplaceno', 'storno');
create sequence if not exists pos_seq;

create table pos_sales (
  id uuid primary key default gen_random_uuid(),
  number text not null unique,
  shift_id uuid references pos_shifts (id) on delete set null,
  customer_id uuid references customers (id) on delete set null,
  -- výdej webové objednávky: položky jsou v order_items, sklad už odepsaný
  order_id uuid references orders (id) on delete set null,
  status pos_status not null default 'zaplaceno',
  subtotal_czk integer not null default 0,
  discount_czk integer not null default 0,
  discount_note text not null default '',
  coupon_code text,
  points_redeemed integer not null default 0,
  points_discount_czk integer not null default 0,
  points_earned integer not null default 0,
  total_czk integer not null default 0,
  payment pos_payment not null,
  cash_received_czk integer,
  change_czk integer,
  note text not null default '',
  cashier uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text
);
create index pos_sales_created_idx on pos_sales (created_at desc);
create index pos_sales_shift_idx on pos_sales (shift_id);
create index pos_sales_customer_idx on pos_sales (customer_id);

create table pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references pos_sales (id) on delete cascade,
  product_id uuid references products (id) on delete set null,
  product_slug text not null,
  name text not null,
  qty numeric(10,3) not null check (qty > 0),
  unit product_unit not null default 'ks',
  unit_price_czk integer not null,
  unit_cost_czk numeric(10,2),
  line_total_czk integer not null
);
create index pos_sale_items_sale_idx on pos_sale_items (sale_id);
alter table stock_movements add column pos_sale_id uuid references pos_sales (id) on delete set null;

alter table pos_shifts enable row level security;
alter table pos_cash_moves enable row level security;
alter table pos_sales enable row level security;
alter table pos_sale_items enable row level security;
create policy "admins read shifts" on pos_shifts for select to authenticated using (is_admin());
create policy "admins read cash moves" on pos_cash_moves for select to authenticated using (is_admin());
create policy "admins read pos sales" on pos_sales for select to authenticated using (is_admin());
create policy "admins read pos sale items" on pos_sale_items for select to authenticated using (is_admin());

-- Otevřená směna, nebo null.
create or replace function pos_current_shift()
returns uuid language sql stable security definer set search_path = public as $$
  select id from pos_shifts where closed_at is null order by opened_at desc limit 1;
$$;
revoke all on function pos_current_shift() from public, anon;
grant execute on function pos_current_shift() to authenticated;

create or replace function pos_open_shift(p_opening_cash integer)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if pos_current_shift() is not null then return pos_current_shift(); end if;
  insert into pos_shifts (opened_by, opening_cash_czk) values (auth.uid(), greatest(coalesce(p_opening_cash, 0), 0)) returning id into v_id;
  return v_id;
end $$;
revoke all on function pos_open_shift(integer) from public, anon;
grant execute on function pos_open_shift(integer) to authenticated;

create or replace function pos_cash_move(p_kind text, p_amount integer, p_note text default '')
returns void language plpgsql security definer set search_path = public as $$
declare v_shift uuid := pos_current_shift();
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if v_shift is null then raise exception 'no shift'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'bad amount'; end if;
  insert into pos_cash_moves (shift_id, kind, amount_czk, note, created_by) values (v_shift, p_kind::pos_cash_kind, p_amount, left(coalesce(p_note, ''), 200), auth.uid());
end $$;
revoke all on function pos_cash_move(text, integer, text) from public, anon;
grant execute on function pos_cash_move(text, integer, text) to authenticated;

-- Uzávěrka: sečte prodeje ve směně, spočítá očekávanou hotovost a směnu uzavře.
create or replace function pos_close_shift(p_closing_cash integer, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_shift pos_shifts; v_cash integer; v_card integer; v_qr integer; v_count integer; v_cancelled integer; v_in integer; v_out integer; v_expected integer;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select * into v_shift from pos_shifts where id = pos_current_shift();
  if not found then raise exception 'no shift'; end if;
  select coalesce(sum(case when payment = 'hotove' then total_czk end), 0), coalesce(sum(case when payment = 'karta' then total_czk end), 0),
         coalesce(sum(case when payment = 'qr' then total_czk end), 0), count(*)
    into v_cash, v_card, v_qr, v_count from pos_sales where shift_id = v_shift.id and status = 'zaplaceno';
  select count(*) into v_cancelled from pos_sales where shift_id = v_shift.id and status = 'storno';
  select coalesce(sum(case when kind = 'vklad' then amount_czk end), 0), coalesce(sum(case when kind = 'vyber' then amount_czk end), 0) into v_in, v_out from pos_cash_moves where shift_id = v_shift.id;
  v_expected := v_shift.opening_cash_czk + v_cash + v_in - v_out;
  update pos_shifts set closed_at = now(), closed_by = auth.uid(), closing_cash_czk = p_closing_cash, expected_cash_czk = v_expected,
    cash_sales_czk = v_cash, card_sales_czk = v_card, qr_sales_czk = v_qr, sales_count = v_count, cancelled_count = v_cancelled, note = left(coalesce(p_note, ''), 500)
  where id = v_shift.id;
  return jsonb_build_object('id', v_shift.id, 'cash', v_cash, 'card', v_card, 'qr', v_qr, 'count', v_count, 'cancelled', v_cancelled, 'expected', v_expected, 'counted', p_closing_cash, 'difference', p_closing_cash - v_expected);
end $$;
revoke all on function pos_close_shift(integer, text) from public, anon;
grant execute on function pos_close_shift(integer, text) to authenticated;

-- Zákaznická karta: najde zákazníka podle kódu, nebo přiřadí kód existujícímu / novému zákazníkovi.
create or replace function pos_assign_card(p_code text, p_customer_id uuid default null, p_name text default null, p_phone text default null, p_email text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text := upper(trim(p_code));
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if length(v_code) < 4 then raise exception 'bad code'; end if;
  if exists (select 1 from customers where card_code = v_code) then raise exception 'card taken'; end if;
  if p_customer_id is not null then
    update customers set card_code = v_code where id = p_customer_id returning id into v_id;
  else
    if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
    if nullif(lower(trim(p_email)), '') is not null and exists (select 1 from customers where email = lower(trim(p_email))) then
      update customers set card_code = v_code, name = case when name = '' then trim(p_name) else name end, phone = case when phone = '' then coalesce(trim(p_phone), '') else phone end
      where email = lower(trim(p_email)) returning id into v_id;
    else
      insert into customers (email, name, phone, card_code) values (nullif(lower(trim(p_email)), ''), trim(p_name), coalesce(trim(p_phone), ''), v_code) returning id into v_id;
    end if;
  end if;
  return v_id;
end $$;
revoke all on function pos_assign_card(text, uuid, text, text, text) from public, anon;
grant execute on function pos_assign_card(text, uuid, text, text, text) to authenticated;

-- Prodej u pultu. p_sale: customer_id, payment (hotove|karta|qr), cash_received_czk, discount_czk, discount_pct, discount_note,
-- coupon_code, points_redeem, note. p_items: [{product_id, qty}]. Ceny bere z products, ruční slevu smí jen správce.
create or replace function pos_checkout(p_sale jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_number text; v_shift uuid := pos_current_shift(); v_customer uuid := nullif(p_sale->>'customer_id', '')::uuid;
  v_item jsonb; v_product products; v_qty numeric; v_subtotal integer := 0; v_lines jsonb := '[]'::jsonb;
  v_discount integer := 0; v_coupon jsonb; v_coupon_code text := null; v_loyalty jsonb;
  v_points_redeem integer := coalesce((p_sale->>'points_redeem')::integer, 0); v_points_czk integer := 0; v_points_earned integer := 0; v_balance integer := 0;
  v_total integer; v_payment pos_payment := (p_sale->>'payment')::pos_payment; v_cash integer; v_change integer;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if v_shift is null then raise exception 'no shift'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'empty sale'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then continue; end if;
    select * into v_product from products where id = (v_item->>'product_id')::uuid;
    if not found then raise exception 'unknown product'; end if;
    if v_product.unit = 'ks' then v_qty := floor(v_qty); if v_qty < 1 then continue; end if; else v_qty := round(v_qty, 3); end if;
    v_subtotal := v_subtotal + round(v_qty * v_product.price_czk)::integer;
    v_lines := v_lines || jsonb_build_object('product_id', v_product.id, 'product_slug', v_product.slug,
      'name', (case v_product.line when 'zaklad' then 'Základ' when 'kosti' then 'Kosti' when 'navic' then 'Navíc' when 'mlsky' then 'Mlsky' when 'granule' then 'Granule' end) || ' · ' || v_product.variant,
      'qty', v_qty, 'unit', v_product.unit, 'unit_price_czk', v_product.price_czk, 'unit_cost_czk', v_product.purchase_price_czk,
      'line_total_czk', round(v_qty * v_product.price_czk)::integer, 'tracked', v_product.stock_qty is not null);
  end loop;
  if jsonb_array_length(v_lines) = 0 then raise exception 'empty sale'; end if;

  -- slevový kód (kdokoli), ruční sleva (jen správce)
  if coalesce(p_sale->>'coupon_code', '') <> '' then
    v_coupon := check_coupon(p_sale->>'coupon_code', v_subtotal);
    if v_coupon ? 'error' then raise exception 'coupon: %', v_coupon->>'error'; end if;
    v_discount := (v_coupon->>'discount')::integer;
    v_coupon_code := v_coupon->>'code';
    update coupons set used_count = used_count + 1 where code = v_coupon_code;
  end if;
  if coalesce((p_sale->>'discount_czk')::integer, 0) > 0 or coalesce((p_sale->>'discount_pct')::numeric, 0) > 0 then
    if not is_manager() then raise exception 'discount not allowed'; end if;
    v_discount := v_discount + greatest(coalesce((p_sale->>'discount_czk')::integer, 0), round((v_subtotal - v_discount) * coalesce((p_sale->>'discount_pct')::numeric, 0) / 100.0)::integer);
  end if;
  v_discount := least(v_discount, v_subtotal);

  -- Kostičky
  select value into v_loyalty from settings where key = 'loyalty';
  if v_loyalty is null then v_loyalty := '{"enabled": true, "czkPerPoint": 10, "redeemStep": 100, "redeemValueCzk": 50}'::jsonb; end if;
  if (v_loyalty->>'enabled')::boolean = false or v_customer is null then v_points_redeem := 0; end if;
  if v_points_redeem > 0 then
    if v_points_redeem % (v_loyalty->>'redeemStep')::integer <> 0 then raise exception 'points step'; end if;
    select points into v_balance from customers where id = v_customer;
    if v_points_redeem > coalesce(v_balance, 0) then raise exception 'points balance'; end if;
    v_points_czk := least(v_points_redeem / (v_loyalty->>'redeemStep')::integer * (v_loyalty->>'redeemValueCzk')::integer, v_subtotal - v_discount);
  end if;
  v_total := v_subtotal - v_discount - v_points_czk;
  if v_customer is not null and (v_loyalty->>'enabled')::boolean then
    v_points_earned := floor(v_total / (v_loyalty->>'czkPerPoint')::numeric);
  end if;

  if v_payment = 'hotove' then
    v_cash := coalesce((p_sale->>'cash_received_czk')::integer, v_total);
    if v_cash < v_total then raise exception 'cash short'; end if;
    v_change := v_cash - v_total;
  end if;

  v_number := 'U' || to_char(now(), 'YYYY') || lpad(nextval('pos_seq')::text, 5, '0');
  insert into pos_sales (number, shift_id, customer_id, subtotal_czk, discount_czk, discount_note, coupon_code, points_redeemed, points_discount_czk, points_earned,
    total_czk, payment, cash_received_czk, change_czk, note, cashier)
  values (v_number, v_shift, v_customer, v_subtotal, v_discount, left(coalesce(p_sale->>'discount_note', ''), 120), v_coupon_code, v_points_redeem, v_points_czk, v_points_earned,
    v_total, v_payment, v_cash, v_change, left(coalesce(p_sale->>'note', ''), 300), auth.uid())
  returning id into v_id;

  insert into pos_sale_items (sale_id, product_id, product_slug, name, qty, unit, unit_price_czk, unit_cost_czk, line_total_czk)
  select v_id, (x->>'product_id')::uuid, x->>'product_slug', x->>'name', (x->>'qty')::numeric, (x->>'unit')::product_unit, (x->>'unit_price_czk')::integer, (x->>'unit_cost_czk')::numeric, (x->>'line_total_czk')::integer
  from jsonb_array_elements(v_lines) as x;

  insert into stock_movements (product_id, kind, qty, unit_cost_czk, pos_sale_id, note, created_by)
  select (x->>'product_id')::uuid, 'prodej_kasa', -(x->>'qty')::numeric, (x->>'unit_cost_czk')::numeric, v_id, 'Účtenka ' || v_number, auth.uid()
  from jsonb_array_elements(v_lines) as x where (x->>'tracked')::boolean;

  if v_customer is not null then
    if v_points_redeem > 0 then
      update customers set points = points - v_points_redeem where id = v_customer;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (v_customer, v_id, -v_points_redeem, 'Uplatněno u pultu, účtenka ' || v_number);
    end if;
    if v_points_earned > 0 then
      update customers set points = points + v_points_earned where id = v_customer;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (v_customer, v_id, v_points_earned, 'Nákup v prodejně, účtenka ' || v_number);
    end if;
    update customers set orders_count = orders_count + 1, total_spent_czk = total_spent_czk + v_total where id = v_customer;
  end if;

  return jsonb_build_object('id', v_id, 'number', v_number, 'total_czk', v_total, 'change_czk', v_change, 'points_earned', v_points_earned);
end $$;
revoke all on function pos_checkout(jsonb, jsonb) from public, anon;
grant execute on function pos_checkout(jsonb, jsonb) to authenticated;

-- Storno účtenky: vrátí sklad i Kostičky.
create or replace function pos_cancel_sale(p_sale_id uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare s pos_sales;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select * into s from pos_sales where id = p_sale_id for update;
  if not found or s.status = 'storno' then return; end if;
  update pos_sales set status = 'storno', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(coalesce(p_reason, ''), 200) where id = p_sale_id;
  if s.order_id is null then
    insert into stock_movements (product_id, kind, qty, pos_sale_id, note, created_by)
    select i.product_id, 'storno', i.qty, s.id, 'Storno účtenky ' || s.number, auth.uid()
    from pos_sale_items i join products p on p.id = i.product_id where i.sale_id = s.id and p.stock_qty is not null;
  end if;
  if s.customer_id is not null then
    if s.points_earned > 0 then
      update customers set points = greatest(points - s.points_earned, 0) where id = s.customer_id;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (s.customer_id, s.id, -s.points_earned, 'Storno účtenky ' || s.number);
    end if;
    if s.points_redeemed > 0 then
      update customers set points = points + s.points_redeemed where id = s.customer_id;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (s.customer_id, s.id, s.points_redeemed, 'Vráceno, storno účtenky ' || s.number);
    end if;
    update customers set orders_count = greatest(orders_count - 1, 0), total_spent_czk = greatest(total_spent_czk - s.total_czk, 0) where id = s.customer_id;
  end if;
  if s.coupon_code is not null then update coupons set used_count = greatest(used_count - 1, 0) where code = s.coupon_code; end if;
end $$;
revoke all on function pos_cancel_sale(uuid, text) from public, anon;
grant execute on function pos_cancel_sale(uuid, text) to authenticated;

-- Výdej webové objednávky u pultu: zaplatí se (pokud nebyla převodem) a označí jako doručená.
create or replace function pos_settle_order(p_order_id uuid, p_payment text, p_cash_received integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders; v_id uuid; v_number text; v_shift uuid := pos_current_shift(); v_payment pos_payment; v_change integer;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if v_shift is null then raise exception 'no shift'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'unknown order'; end if;
  if o.status in ('doruceno', 'zrusena') then raise exception 'order closed'; end if;
  v_payment := case when o.payment_method = 'prevod' then 'prevod' when o.payment_method = 'karta' then 'prevod' else p_payment end::pos_payment;
  if v_payment = 'hotove' then
    if coalesce(p_cash_received, o.total_czk) < o.total_czk then raise exception 'cash short'; end if;
    v_change := coalesce(p_cash_received, o.total_czk) - o.total_czk;
  end if;
  v_number := 'U' || to_char(now(), 'YYYY') || lpad(nextval('pos_seq')::text, 5, '0');
  insert into pos_sales (number, shift_id, customer_id, order_id, subtotal_czk, discount_czk, coupon_code, points_redeemed, points_discount_czk, points_earned, total_czk, payment, cash_received_czk, change_czk, note, cashier)
  values (v_number, v_shift, o.customer_id, o.id, o.subtotal_czk + o.shipping_czk, o.discount_czk, o.coupon_code, o.points_redeemed, o.points_discount_czk, 0, o.total_czk, v_payment,
    case when v_payment = 'hotove' then coalesce(p_cash_received, o.total_czk) end, v_change, 'Výdej objednávky ' || o.order_number, auth.uid())
  returning id into v_id;
  update orders set status = 'doruceno' where id = o.id;
  return jsonb_build_object('id', v_id, 'number', v_number, 'total_czk', o.total_czk, 'change_czk', v_change, 'order_number', o.order_number);
end $$;
revoke all on function pos_settle_order(uuid, text, integer) from public, anon;
grant execute on function pos_settle_order(uuid, text, integer) to authenticated;

-- Tržby kasy po dnech (pro statistiky web vs. prodejna).
create view pos_sales_by_day with (security_invoker = true) as
select date_trunc('day', s.created_at)::date as day, count(*) as sales, sum(s.total_czk) as revenue_czk,
       coalesce(sum((select sum(i.qty * coalesce(i.unit_cost_czk, 0)) from pos_sale_items i where i.sale_id = s.id)), 0) as cost_czk
from pos_sales s where s.status = 'zaplaceno' and s.order_id is null
group by 1;
