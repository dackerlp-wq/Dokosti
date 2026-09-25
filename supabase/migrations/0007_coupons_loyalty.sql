-- Slevové kódy a věrnostní Kostičky. create_order si nově všechno počítá sám
-- (ceny z products, dopravu ze settings, slevy z coupons, body z customers).

create type coupon_type as enum ('percent', 'amount');

create table coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  type coupon_type not null,
  value integer not null check (value > 0),
  min_order_czk integer not null default 0,
  valid_from date,
  valid_to date,
  max_uses integer check (max_uses is null or max_uses > 0),
  used_count integer not null default 0,
  active boolean not null default true,
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table coupons enable row level security;
create policy "admins manage coupons" on coupons for all to authenticated
  using (is_admin()) with check (is_admin());

alter table customers add column points integer not null default 0 check (points >= 0);

create table loyalty_transactions (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  order_id uuid references orders (id) on delete set null,
  points integer not null,
  reason text not null,
  created_at timestamptz not null default now()
);
create index loyalty_customer_idx on loyalty_transactions (customer_id, created_at desc);
alter table loyalty_transactions enable row level security;
create policy "admins manage loyalty" on loyalty_transactions for all to authenticated
  using (is_admin()) with check (is_admin());

alter table orders
  add column coupon_code text,
  add column discount_czk integer not null default 0,
  add column points_redeemed integer not null default 0,
  add column points_discount_czk integer not null default 0,
  add column points_earned integer not null default 0;

-- Nastavení věrnostního programu (klíč 'loyalty' v settings, výchozí hodnoty i v kódu).
insert into settings (key, value) values ('loyalty', '{"enabled": true, "czkPerPoint": 10, "redeemStep": 100, "redeemValueCzk": 50}')
on conflict (key) do nothing;

-- Ověření slevového kódu; vrací slevu v Kč nebo chybu. Volá se i z pokladny (náhled).
create or replace function check_coupon(p_code text, p_subtotal integer)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare c coupons; v_discount integer;
begin
  select * into c from coupons where code = upper(trim(p_code));
  if not found or not c.active then return jsonb_build_object('error', 'Tento kód neznáme.'); end if;
  if c.valid_from is not null and current_date < c.valid_from then return jsonb_build_object('error', 'Kód ještě neplatí.'); end if;
  if c.valid_to is not null and current_date > c.valid_to then return jsonb_build_object('error', 'Platnost kódu vypršela.'); end if;
  if c.max_uses is not null and c.used_count >= c.max_uses then return jsonb_build_object('error', 'Kód už byl vyčerpán.'); end if;
  if p_subtotal < c.min_order_czk then return jsonb_build_object('error', format('Kód platí od %s Kč.', c.min_order_czk)); end if;
  v_discount := case c.type when 'percent' then round(p_subtotal * c.value / 100.0) else c.value end;
  v_discount := least(v_discount, p_subtotal);
  return jsonb_build_object('code', c.code, 'discount', v_discount, 'label',
    case c.type when 'percent' then c.value || ' %' else c.value || ' Kč' end);
end $$;
revoke all on function check_coupon(text, integer) from public;
grant execute on function check_coupon(text, integer) to anon, authenticated, service_role;

-- Stav Kostiček podle e-mailu (pro pokladnu).
create or replace function loyalty_balance(p_email text)
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((select points from customers where email = lower(trim(p_email))), 0);
$$;
revoke all on function loyalty_balance(text) from public;
grant execute on function loyalty_balance(text) to anon, authenticated, service_role;

drop function if exists create_order(jsonb, jsonb);

-- p_order: customer_name, customer_email, customer_phone, street, city, zip, note,
--          shipping_method, payment_method, delivery_date, coupon_code, points_redeem
-- p_items: [{product_slug, qty}]
-- Vrací {order_number, total_czk, points_earned}.
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
  v_qty integer;
  v_subtotal integer := 0;
  v_shipping jsonb;
  v_method jsonb;
  v_ship_czk integer := 0;
  v_free integer;
  v_min integer;
  v_coupon jsonb;
  v_discount integer := 0;
  v_coupon_code text := null;
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

  -- položky: ceny z databáze, sklad ověřit a odečíst
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::integer;
    if v_qty is null or v_qty < 1 then continue; end if;
    select * into v_product from products where slug = v_item->>'product_slug' and is_published;
    if not found or not v_product.in_stock then
      raise exception 'unavailable: %', v_item->>'product_slug';
    end if;
    if v_product.stock_qty is not null and v_product.stock_qty < v_qty then
      raise exception 'out of stock: %', v_product.slug;
    end if;
    update products set stock_qty = stock_qty - v_qty where id = v_product.id and stock_qty is not null;
    v_subtotal := v_subtotal + v_qty * v_product.price_czk;
    v_lines := v_lines || jsonb_build_object(
      'product_slug', v_product.slug,
      'name', (case v_product.line when 'zaklad' then 'Základ' when 'kosti' then 'Kosti' when 'navic' then 'Navíc'
                                   when 'mlsky' then 'Mlsky' when 'granule' then 'Granule' end) || ' · ' || v_product.variant,
      'qty', v_qty, 'unit_price_czk', v_product.price_czk);
  end loop;
  if jsonb_array_length(v_lines) = 0 then raise exception 'empty order'; end if;
  update products set in_stock = false where stock_qty = 0 and in_stock;

  -- doprava ze settings
  select value into v_shipping from settings where key = 'shipping';
  v_method := coalesce(v_shipping -> (p_order->>'shipping_method'), '{}'::jsonb);
  if v_shipping is not null and coalesce((v_method->>'enabled')::boolean, true) = false then
    raise exception 'shipping disabled';
  end if;
  -- výchozí ceny, když nastavení není uložené (musí odpovídat DEFAULT_SETTINGS v kódu)
  v_ship_czk := coalesce((v_method->>'priceCzk')::integer,
    case p_order->>'shipping_method' when 'odber' then 0 when 'rozvoz' then 79 when 'prepravce' then 249 end);
  v_free := coalesce((v_method->>'freeFromCzk')::integer,
    case p_order->>'shipping_method' when 'rozvoz' then 1500 when 'prepravce' then 3000 else null end);
  v_min := coalesce((v_method->>'minOrderCzk')::integer,
    case p_order->>'shipping_method' when 'rozvoz' then 500 when 'prepravce' then 1000 else 0 end);
  if v_subtotal < v_min then raise exception 'below minimum'; end if;

  -- slevový kód
  if coalesce(p_order->>'coupon_code', '') <> '' then
    v_coupon := check_coupon(p_order->>'coupon_code', v_subtotal);
    if v_coupon ? 'error' then raise exception 'coupon: %', v_coupon->>'error'; end if;
    v_discount := (v_coupon->>'discount')::integer;
    v_coupon_code := v_coupon->>'code';
    update coupons set used_count = used_count + 1 where code = v_coupon_code;
  end if;

  -- Kostičky
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
    coupon_code, discount_czk, points_redeemed, points_discount_czk, points_earned
  ) values (
    v_number, v_customer, p_order->>'customer_name', v_email, p_order->>'customer_phone',
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), coalesce(p_order->>'note', ''),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method,
    nullif(p_order->>'delivery_date', '')::date,
    v_subtotal, v_ship_czk, v_total,
    v_coupon_code, v_discount, v_points_redeem, v_points_czk, v_points_earned
  )
  returning id into v_id;

  insert into order_items (order_id, product_slug, name, qty, unit_price_czk)
  select v_id, x->>'product_slug', x->>'name', (x->>'qty')::integer, (x->>'unit_price_czk')::integer
  from jsonb_array_elements(v_lines) as x;

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

-- Kostičky se připíší při doručení, při zrušení se vrátí uplatněné a odepíší připsané.
create or replace function loyalty_on_status()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.customer_id is null then return new; end if;
  if new.status = 'doruceno' and old.status <> 'doruceno' and new.points_earned > 0 then
    update customers set points = points + new.points_earned where id = new.customer_id;
    insert into loyalty_transactions (customer_id, order_id, points, reason)
    values (new.customer_id, new.id, new.points_earned, 'Za objednávku ' || new.order_number);
  elsif old.status = 'doruceno' and new.status <> 'doruceno' and new.points_earned > 0 then
    update customers set points = greatest(points - new.points_earned, 0) where id = new.customer_id;
    insert into loyalty_transactions (customer_id, order_id, points, reason)
    values (new.customer_id, new.id, -new.points_earned, 'Storno připsání, objednávka ' || new.order_number);
  end if;
  if new.status = 'zrusena' and old.status <> 'zrusena' then
    if new.points_redeemed > 0 then
      update customers set points = points + new.points_redeemed where id = new.customer_id;
      insert into loyalty_transactions (customer_id, order_id, points, reason)
      values (new.customer_id, new.id, new.points_redeemed, 'Vráceno, zrušená objednávka ' || new.order_number);
    end if;
    if new.coupon_code is not null then
      update coupons set used_count = greatest(used_count - 1, 0) where code = new.coupon_code;
    end if;
  end if;
  return new;
end $$;
create trigger orders_loyalty after update of status on orders for each row execute function loyalty_on_status();
