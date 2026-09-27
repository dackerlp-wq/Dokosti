-- Objednávka za zákazníka z adminu (telefonická), příznak zaplaceno předem, ruční sleva u objednávky.
alter table orders add column paid_at timestamptz;
alter table orders add column discount_note text not null default '';
alter table orders add column created_by uuid;
comment on column orders.created_by is 'Správce nebo obsluha, kdo objednávku založil v adminu. NULL = z webu.';

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
      'name', (case v_product.line when 'zaklad' then 'Základ' when 'kosti' then 'Kosti' when 'navic' then 'Navíc'
                                   when 'mlsky' then 'Mlsky' when 'granule' then 'Granule' end) || ' · ' || v_product.variant,
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
revoke all on function admin_create_order(jsonb, jsonb) from public, anon;
grant execute on function admin_create_order(jsonb, jsonb) to authenticated;

-- Výdej u pultu: objednávka zaplacená předem se jen vydá.
create or replace function pos_settle_order(p_order_id uuid, p_payment text, p_cash_received integer default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare o orders; v_id uuid; v_number text; v_shift uuid := pos_current_shift(); v_payment pos_payment; v_change integer;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if v_shift is null then raise exception 'no shift'; end if;
  select * into o from orders where id = p_order_id for update;
  if not found then raise exception 'unknown order'; end if;
  if o.status in ('doruceno', 'zrusena') then raise exception 'order closed'; end if;
  v_payment := case when o.paid_at is not null or o.payment_method in ('prevod', 'karta') then 'prevod' else p_payment end::pos_payment;
  if v_payment = 'hotove' then
    if coalesce(p_cash_received, o.total_czk) < o.total_czk then raise exception 'cash short'; end if;
    v_change := coalesce(p_cash_received, o.total_czk) - o.total_czk;
  end if;
  v_number := 'U' || to_char(now(), 'YYYY') || lpad(nextval('pos_seq')::text, 5, '0');
  insert into pos_sales (number, shift_id, customer_id, order_id, subtotal_czk, discount_czk, coupon_code, points_redeemed, points_discount_czk, points_earned, total_czk, payment, cash_received_czk, change_czk, note, cashier)
  values (v_number, v_shift, o.customer_id, o.id, o.subtotal_czk + o.shipping_czk, o.discount_czk, o.coupon_code, o.points_redeemed, o.points_discount_czk, 0, o.total_czk, v_payment,
    case when v_payment = 'hotove' then coalesce(p_cash_received, o.total_czk) end, v_change, 'Výdej objednávky ' || o.order_number, auth.uid())
  returning id into v_id;
  update orders set status = 'doruceno', paid_at = coalesce(paid_at, now()) where id = o.id;
  return jsonb_build_object('id', v_id, 'number', v_number, 'total_czk', o.total_czk, 'change_czk', v_change, 'order_number', o.order_number);
end $$;

-- E-mailová data objednávky včetně příznaku zaplaceno.
create or replace function order_for_email(p_order_number text)
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status,
    'customer_name', o.customer_name, 'customer_email', o.customer_email, 'customer_phone', o.customer_phone,
    'street', o.street, 'city', o.city, 'zip', o.zip, 'note', o.note,
    'shipping_method', o.shipping_method, 'payment_method', o.payment_method, 'delivery_date', o.delivery_date,
    'subtotal_czk', o.subtotal_czk, 'shipping_czk', o.shipping_czk, 'total_czk', o.total_czk,
    'coupon_code', o.coupon_code, 'discount_czk', o.discount_czk, 'points_discount_czk', o.points_discount_czk,
    'points_earned', o.points_earned, 'paid_at', o.paid_at, 'created_at', o.created_at,
    'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'unit_price_czk', i.unit_price_czk)) from order_items i where i.order_id = o.id), '[]'::jsonb)
  ) from orders o where o.order_number = p_order_number and o.created_at > now() - interval '10 minutes';
$$;
