-- Omezit přístup k údajům objednávek a zápisu do e-mailového logu na serverové volání.
-- CRON_SECRET už existuje jako tajná proměnná Vercelu a chráněná hodnota v public.secrets.

drop function if exists public.order_for_email(text);
create function public.order_for_email(p_order_number text, p_secret text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_secret is null or not exists (select 1 from secrets where key = 'cron' and value = p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  return (
    select jsonb_build_object(
      'id', o.id, 'order_number', o.order_number, 'status', o.status,
      'customer_name', o.customer_name, 'customer_email', o.customer_email, 'customer_phone', o.customer_phone,
      'street', o.street, 'city', o.city, 'zip', o.zip, 'note', o.note,
      'shipping_method', o.shipping_method, 'payment_method', o.payment_method, 'delivery_date', o.delivery_date,
      'subtotal_czk', o.subtotal_czk, 'shipping_czk', o.shipping_czk, 'total_czk', o.total_czk,
      'coupon_code', o.coupon_code, 'discount_czk', o.discount_czk, 'points_discount_czk', o.points_discount_czk,
      'points_earned', o.points_earned, 'paid_at', o.paid_at, 'created_at', o.created_at,
      'items', coalesce((
        select jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'unit_price_czk', i.unit_price_czk))
        from order_items i where i.order_id = o.id
      ), '[]'::jsonb)
    )
    from orders o where o.order_number = p_order_number and o.created_at > now() - interval '10 minutes'
  );
end
$$;
revoke all on function public.order_for_email(text, text) from public;
grant execute on function public.order_for_email(text, text) to anon, authenticated, service_role;

drop function if exists public.log_email(text, text, text, text, text, uuid, public.email_status, text, text);
create function public.log_email(
  p_to text, p_subject text, p_html text, p_text text, p_kind text, p_order_id uuid,
  p_status public.email_status, p_error text, p_provider_id text, p_secret text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare v_id uuid;
begin
  if p_secret is null or not exists (select 1 from secrets where key = 'cron' and value = p_secret) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  insert into email_log (to_email, subject, html, text, kind, order_id, status, error, provider_id, sent_at)
  values (p_to, p_subject, p_html, p_text, p_kind, p_order_id, p_status, p_error, p_provider_id,
          case when p_status = 'odeslano' then now() end)
  returning id into v_id;
  return v_id;
end
$$;
revoke all on function public.log_email(text, text, text, text, text, uuid, public.email_status, text, text, text) from public;
grant execute on function public.log_email(text, text, text, text, text, uuid, public.email_status, text, text, text) to anon, authenticated, service_role;

-- Payload registrace se ukládá až po OTP ověření do řádku vlastního auth.uid().
-- Staré RPC přijímající libovolný e-mail a payload už nemá být vystavené.
drop function if exists public.club_register_pending_email(text, jsonb);

-- Přihlášený zákazník smí ukládat rozpracovanou registraci pouze pro svůj účet.
create or replace function public.club_register_pending(p_user_id uuid, p_data jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or p_user_id is distinct from auth.uid() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  insert into club_registrations (user_id, data) values (p_user_id, p_data)
  on conflict (user_id) do update set data = excluded.data, created_at = now()
  where club_registrations.completed_at is null;
end
$$;
revoke all on function public.club_register_pending(uuid, jsonb) from public, anon, authenticated;
grant execute on function public.club_register_pending(uuid, jsonb) to authenticated;

-- Zůstatek bodů se odvozuje od ověřeného e-mailu přihlášeného uživatele, ne od
-- e-mailu zadaného v pokladně.
drop function if exists public.loyalty_balance(text);
create function public.loyalty_balance()
returns integer
language sql
security definer
set search_path = public
as $$
  select coalesce((
    select points from customers
    where auth.uid() is not null and email = lower(auth.jwt() ->> 'email')
  ), 0);
$$;
revoke all on function public.loyalty_balance() from public, anon, authenticated;
grant execute on function public.loyalty_balance() to authenticated;

-- Body lze uplatnit pouze v objednávce přihlášeného zákazníka s ověřeným
-- e-mailem účtu. Administrativní objednávky zůstávají řízené rolí v is_admin().
create or replace function public.enforce_order_points_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.points_redeemed, 0) > 0 and not is_admin() then
    if auth.uid() is null or lower(coalesce(auth.jwt() ->> 'email', '')) is distinct from lower(coalesce(new.customer_email, '')) then
      raise exception 'loyalty login required' using errcode = '42501';
    end if;
  end if;
  return new;
end
$$;
drop trigger if exists orders_points_owner on public.orders;
create trigger orders_points_owner
before insert or update on public.orders
for each row execute function public.enforce_order_points_owner();
revoke all on function public.enforce_order_points_owner() from public, anon, authenticated;

-- Zabrání dvojímu souběžnému uplatnění stejného zůstatku v e-shopu a kase.
alter table public.customers
  add constraint customers_points_nonnegative check (points >= 0) not valid;
alter table public.customers validate constraint customers_points_nonnegative;

-- E-commerce points can only be checked/redeemed by the signed-in account owner.
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
    if auth.uid() is null or lower(coalesce(auth.jwt() ->> 'email', '')) is distinct from v_email then
      raise exception 'loyalty login required' using errcode = '42501';
    end if;
    select points into v_points_balance from customers where email = v_email for update;
    v_points_balance := coalesce(v_points_balance, 0);
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
revoke all on function public.create_order(jsonb, jsonb) from public;
grant execute on function public.create_order(jsonb, jsonb) to anon, authenticated, service_role;
