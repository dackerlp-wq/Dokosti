-- Předplatné: Kostičky navíc místo slevy. Nastavení subscription.pointsBonusPct (výchozí 5 %),
-- discountPct se vypne (0). Dodávka z předplatného dostane body navíc v hodnotě pointsBonusPct % z ceny zboží.
update settings set value = value || '{"pointsBonusPct": 5, "discountPct": 0}'::jsonb where key = 'subscription';

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
    -- Dodávka z předplatného: Kostičky navíc v hodnotě pointsBonusPct % z ceny zboží.
    -- Platí i pro první dodávku z pokladny (subscribe_interval), předplatné vzniká až po objednávce.
    if nullif(p_order->>'subscription_id', '') is not null or coalesce(p_order->>'subscribe_interval', '') <> '' then
      if v_sub_settings is null then select value into v_sub_settings from settings where key = 'subscription'; end if;
      v_points_earned := v_points_earned + round((v_subtotal - v_discount - v_points_czk) * coalesce((v_sub_settings->>'pointsBonusPct')::numeric, 0) / 100.0
        * (v_loyalty->>'redeemStep')::numeric / nullif((v_loyalty->>'redeemValueCzk')::numeric, 0))::integer;
    end if;
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

