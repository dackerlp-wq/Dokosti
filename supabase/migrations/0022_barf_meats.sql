-- Řada „Základ“ se přejmenovává na „BARF mixy“ (slug barf), produkty dostávají druhy masa (meats) pro filtry
-- a podkategorie, název položky v dokladech je jen druh („Kuřecí mix“), řada je štítek.

-- 1) Druhy masa u produktu, odvozené z názvu varianty (v adminu jde upravit).
alter table products add column meats text[] not null default '{}';
create index products_meats_idx on products using gin (meats);
with f as (
  select id, translate(lower(variant || ' ' || coalesce(composition, '')), 'áčďéěíňóřšťúůýž', 'acdeeinorstuuyz') as t from products
)
update products p set meats = coalesce((
  select array_agg(k) from unnest(array['kureci','kruti','kachni','hovezi','jehneci','veprove','kralici','ryby','kone','zverina']) as k
  where (k = 'kureci' and f.t ~ 'kurec') or (k = 'kruti' and f.t ~ 'krut') or (k = 'kachni' and f.t ~ 'kachn')
     or (k = 'hovezi' and f.t ~ 'hovez') or (k = 'jehneci' and f.t ~ 'jehne') or (k = 'veprove' and f.t ~ 'veprov')
     or (k = 'kralici' and f.t ~ 'kralic') or (k = 'ryby' and f.t ~ '(ryb|losos|sled|makrel|tresk)') or (k = 'kone' and f.t ~ '(kun|konsk|konin)')
     or (k = 'zverina' and f.t ~ '(zverin|jelen|srn)')
), '{}') from f where f.id = p.id;
-- U drůbežího mixu bez konkrétního druhu: kuřecí.
update products set meats = array['kureci'] where meats = '{}' and translate(lower(variant), 'áčďéěíňóřšťúůýž', 'acdeeinorstuuyz') ~ 'drubez';

-- 2) Řada zaklad → barf (enum i slugy produktů a odkazy na ně).
alter type product_line rename value 'zaklad' to 'barf';
update products set slug = 'barf-' || substr(slug, 8) where slug like 'zaklad-%';
update products set upsell_slugs = array(select case when x like 'zaklad-%' then 'barf-' || substr(x, 8) else x end from unnest(upsell_slugs) x),
  crosssell_slugs = array(select case when x like 'zaklad-%' then 'barf-' || substr(x, 8) else x end from unnest(crosssell_slugs) x);
update order_items set product_slug = 'barf-' || substr(product_slug, 8) where product_slug like 'zaklad-%';
update subscription_items set product_slug = 'barf-' || substr(product_slug, 8) where product_slug like 'zaklad-%';
update pos_sale_items set product_slug = 'barf-' || substr(product_slug, 8) where product_slug like 'zaklad-%';

-- 3) Název položky v dokladech: druh s velkým písmenem („Kuřecí mix“).
create or replace function product_display_name(p_variant text)
returns text language sql immutable as $$
  select upper(left(coalesce(p_variant, ''), 1)) || substr(coalesce(p_variant, ''), 2);
$$;

-- create_order: název položky bez řady
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
      'name', product_display_name(v_product.variant),
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

-- pos_checkout: název položky bez řady
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
      'name', product_display_name(v_product.variant),
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

-- admin_create_order: název položky bez řady
create or replace function admin_create_order(p_order jsonb, p_items jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_id uuid; v_number text; v_customer uuid := nullif(p_order->>'customer_id', '')::uuid;
  v_email text := nullif(lower(trim(coalesce(p_order->>'customer_email', ''))), '');
  v_item jsonb; v_product products; v_qty numeric; v_subtotal integer := 0;
  v_shipping jsonb; v_method jsonb; v_ship_czk integer := 0; v_free integer;
  v_coupon jsonb; v_discount integer := 0; v_coupon_code text := null;
  v_manual integer := 0; v_note text := left(coalesce(p_order->>'discount_note', ''), 120);
  v_loyalty jsonb; v_points_redeem integer := coalesce((p_order->>'points_redeem')::integer, 0);
  v_points_czk integer := 0; v_points_earned integer := 0; v_total integer; v_lines jsonb := '[]'::jsonb;
  v_name text := trim(coalesce(p_order->>'customer_name', '')); v_phone text := trim(coalesce(p_order->>'customer_phone', ''));
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if v_name = '' then raise exception 'name required'; end if;
  if jsonb_array_length(p_items) = 0 then raise exception 'empty order'; end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty is null or v_qty <= 0 then continue; end if;
    select * into v_product from products where slug = v_item->>'product_slug';
    if not found or not v_product.in_stock then raise exception 'unavailable: %', v_item->>'product_slug'; end if;
    if v_product.unit = 'ks' then v_qty := floor(v_qty); if v_qty < 1 then continue; end if; end if;
    if v_product.stock_qty is not null and v_product.stock_qty < v_qty then raise exception 'out of stock: %', v_product.slug; end if;
    v_subtotal := v_subtotal + round(v_qty * v_product.price_czk)::integer;
    v_lines := v_lines || jsonb_build_object(
      'product_id', v_product.id, 'product_slug', v_product.slug,
      'name', product_display_name(v_product.variant),
      'qty', v_qty, 'unit_price_czk', v_product.price_czk, 'unit_cost_czk', v_product.purchase_price_czk, 'tracked', v_product.stock_qty is not null);
  end loop;
  if jsonb_array_length(v_lines) = 0 then raise exception 'empty order'; end if;

  -- Doprava podle nastavení; minimální objednávku admin nemusí dodržet (rozhoduje sám).
  select value into v_shipping from settings where key = 'shipping';
  v_method := coalesce(v_shipping -> (p_order->>'shipping_method'), '{}'::jsonb);
  v_ship_czk := coalesce((v_method->>'priceCzk')::integer, case p_order->>'shipping_method' when 'odber' then 0 when 'rozvoz' then 79 when 'prepravce' then 249 end);
  v_free := coalesce((v_method->>'freeFromCzk')::integer, case p_order->>'shipping_method' when 'rozvoz' then 1500 when 'prepravce' then 3000 else null end);
  if v_free is not null and v_subtotal >= v_free then v_ship_czk := 0; end if;

  if coalesce(p_order->>'coupon_code', '') <> '' then
    v_coupon := check_coupon(p_order->>'coupon_code', v_subtotal);
    if v_coupon ? 'error' then raise exception 'coupon: %', v_coupon->>'error'; end if;
    v_discount := (v_coupon->>'discount')::integer;
    v_coupon_code := v_coupon->>'code';
    update coupons set used_count = used_count + 1 where code = v_coupon_code;
  end if;

  -- Ruční sleva jen správce (Kč nebo procenta z ceny zboží po kódu).
  if coalesce((p_order->>'discount_czk')::integer, 0) > 0 or coalesce((p_order->>'discount_pct')::integer, 0) > 0 then
    if not is_manager() then raise exception 'discount not allowed'; end if;
    v_manual := coalesce((p_order->>'discount_czk')::integer, 0) + round((v_subtotal - v_discount) * coalesce((p_order->>'discount_pct')::integer, 0) / 100.0)::integer;
    v_manual := least(greatest(v_manual, 0), v_subtotal - v_discount);
    v_discount := v_discount + v_manual;
  end if;

  -- Zákazník: existující podle id, jinak podle e-mailu, jinak nový (e-mail nepovinný).
  if v_customer is not null then
    update customers set
      name = case when v_name <> '' then v_name else name end,
      phone = case when v_phone <> '' then v_phone else phone end,
      email = coalesce(email, v_email),
      street = case when coalesce(p_order->>'street', '') <> '' then p_order->>'street' else street end,
      city = case when coalesce(p_order->>'city', '') <> '' then p_order->>'city' else city end,
      zip = case when coalesce(p_order->>'zip', '') <> '' then p_order->>'zip' else zip end
    where id = v_customer;
    if not found then raise exception 'unknown customer'; end if;
  elsif v_email is not null and exists (select 1 from customers where email = v_email) then
    update customers set name = v_name, phone = case when v_phone <> '' then v_phone else phone end where email = v_email returning id into v_customer;
  else
    insert into customers (email, name, phone, street, city, zip)
    values (v_email, v_name, v_phone, coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''))
    returning id into v_customer;
  end if;

  select value into v_loyalty from settings where key = 'loyalty';
  if v_loyalty is null then v_loyalty := '{"enabled": true, "czkPerPoint": 10, "redeemStep": 100, "redeemValueCzk": 50}'::jsonb; end if;
  if (v_loyalty->>'enabled')::boolean = false then v_points_redeem := 0; end if;
  if v_points_redeem > 0 then
    if v_points_redeem % (v_loyalty->>'redeemStep')::integer <> 0 then raise exception 'points step'; end if;
    if v_points_redeem > coalesce((select points from customers where id = v_customer), 0) then raise exception 'points balance'; end if;
    v_points_czk := v_points_redeem / (v_loyalty->>'redeemStep')::integer * (v_loyalty->>'redeemValueCzk')::integer;
    v_points_czk := least(v_points_czk, v_subtotal - v_discount);
  end if;

  v_total := v_subtotal - v_discount - v_points_czk + v_ship_czk;
  if (v_loyalty->>'enabled')::boolean then
    v_points_earned := floor((v_subtotal - v_discount - v_points_czk) / (v_loyalty->>'czkPerPoint')::numeric);
  end if;

  v_number := 'DK' || to_char(now(), 'YYMMDD') || lpad((floor(random() * 10000))::text, 4, '0');
  insert into orders (
    order_number, customer_id, customer_name, customer_email, customer_phone, street, city, zip, note,
    shipping_method, payment_method, delivery_date, subtotal_czk, shipping_czk, total_czk,
    coupon_code, discount_czk, discount_note, points_redeemed, points_discount_czk, points_earned, paid_at, created_by
  ) values (
    v_number, v_customer, v_name, coalesce(v_email, ''), v_phone,
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), left(coalesce(p_order->>'note', ''), 500),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method, nullif(p_order->>'delivery_date', '')::date,
    v_subtotal, v_ship_czk, v_total,
    v_coupon_code, v_discount, case when v_manual > 0 then v_note else '' end, v_points_redeem, v_points_czk, v_points_earned,
    case when coalesce((p_order->>'paid')::boolean, false) then now() end, auth.uid()
  ) returning id into v_id;

  insert into order_items (order_id, product_slug, name, qty, unit_price_czk, unit_cost_czk)
  select v_id, x->>'product_slug', x->>'name', (x->>'qty')::numeric, (x->>'unit_price_czk')::integer, (x->>'unit_cost_czk')::numeric
  from jsonb_array_elements(v_lines) as x;

  insert into stock_movements (product_id, kind, qty, unit_cost_czk, order_id, note, created_by)
  select (x->>'product_id')::uuid, 'prodej_web', -(x->>'qty')::numeric, (x->>'unit_cost_czk')::numeric, v_id, 'Objednávka ' || v_number || ' (z adminu)', auth.uid()
  from jsonb_array_elements(v_lines) as x where (x->>'tracked')::boolean;

  if v_points_redeem > 0 then
    update customers set points = points - v_points_redeem where id = v_customer;
    insert into loyalty_transactions (customer_id, order_id, points, reason) values (v_customer, v_id, -v_points_redeem, 'Uplatněno v objednávce ' || v_number);
  end if;
  update customers set orders_count = orders_count + 1, total_spent_czk = total_spent_czk + v_total where id = v_customer;

  return jsonb_build_object('id', v_id, 'order_number', v_number, 'total_czk', v_total, 'points_earned', v_points_earned);
end $$;

-- subscription_by_token: název položky bez řady
create or replace function subscription_by_token(p_token text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', s.id, 'token', s.token, 'customer_name', s.customer_name, 'customer_email', s.customer_email, 'customer_phone', s.customer_phone,
    'shipping_method', s.shipping_method, 'payment_method', s.payment_method,
    'street', s.street, 'city', s.city, 'zip', s.zip, 'note', s.note,
    'interval_days', s.interval_days, 'weekday', s.weekday, 'next_date', s.next_date, 'skip_next', s.skip_next,
    'status', s.status, 'created_at', s.created_at, 'last_error', s.last_error,
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'product_slug', i.product_slug, 'qty', i.qty,
        'name', product_display_name(p.variant),
        'price_czk', p.price_czk, 'weight_grams', p.weight_grams, 'available', (p.is_published and p.in_stock)
      ) order by i.id), '[]'::jsonb)
      from subscription_items i left join products p on p.slug = i.product_slug where i.subscription_id = s.id)
  )
  from subscriptions s where s.token = p_token and length(p_token) = 32;
$$;
