-- Předplatné: pravidelné objednávky každý týden, 14 dní nebo měsíc.
-- Objednávky vznikají automaticky (cron), platí se za každou zvlášť. Sleva podle settings.subscription.

insert into settings (key, value) values ('subscription', '{"enabled": true, "discountPct": 5, "reminderDaysBefore": 3, "cutoffDaysBefore": 1}')
on conflict (key) do nothing;

-- Tajemství pro cron (žádná policy = přes REST nečitelné, jen security definer funkce).
create table secrets (
  key text primary key,
  value text not null
);
alter table secrets enable row level security;

create type subscription_status as enum ('aktivni', 'pozastaveno', 'zruseno');

create table subscriptions (
  id uuid primary key default gen_random_uuid(),
  token text not null unique default encode(gen_random_bytes(16), 'hex'),
  customer_id uuid references customers (id) on delete set null,
  customer_email text not null,
  customer_name text not null,
  customer_phone text not null default '',
  street text not null default '',
  city text not null default '',
  zip text not null default '',
  note text not null default '',
  shipping_method shipping_method not null,
  payment_method payment_method not null,
  interval_days integer not null check (interval_days in (7, 14, 28)),
  -- den v týdnu 0 = neděle … 6 = sobota
  weekday integer not null check (weekday between 0 and 6),
  next_date date not null,
  skip_next boolean not null default false,
  status subscription_status not null default 'aktivni',
  reminder_sent_for date,
  last_order_id uuid references orders (id) on delete set null,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index subscriptions_next_idx on subscriptions (next_date) where status = 'aktivni';
create index subscriptions_email_idx on subscriptions (customer_email);
create trigger subscriptions_updated_at before update on subscriptions for each row execute function set_updated_at();

create table subscription_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references subscriptions (id) on delete cascade,
  product_slug text not null,
  qty integer not null check (qty > 0)
);
create index subscription_items_sub_idx on subscription_items (subscription_id);

alter table orders add column subscription_id uuid references subscriptions (id) on delete set null;

alter table subscriptions enable row level security;
alter table subscription_items enable row level security;
create policy "admins manage subscriptions" on subscriptions for all to authenticated using (is_admin()) with check (is_admin());
create policy "admins manage subscription items" on subscription_items for all to authenticated using (is_admin()) with check (is_admin());
create policy "customer reads own subscriptions" on subscriptions for select to authenticated
  using (customer_email = lower(auth.jwt() ->> 'email'));
create policy "customer reads own subscription items" on subscription_items for select to authenticated
  using (exists (select 1 from subscriptions s where s.id = subscription_items.subscription_id and s.customer_email = lower(auth.jwt() ->> 'email')));

-- Další datum se stejným dnem v týdnu po daném datu (min. +interval).
create or replace function subscription_next_date(p_from date, p_interval integer, p_weekday integer)
returns date language sql immutable as $$
  select d + ((p_weekday - extract(dow from d)::integer + 7) % 7)
  from (select p_from + p_interval as d) t;
$$;
revoke execute on function subscription_next_date(date, integer, integer) from public, anon, authenticated;

-- Založení předplatného po první objednávce (z pokladny, anon).
-- p_sub: customer_*, street, city, zip, note, shipping_method, payment_method, interval_days, weekday, first_date, order_number
create or replace function create_subscription(p_sub jsonb, p_items jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_token text;
  v_email text := lower(trim(p_sub->>'customer_email'));
  v_customer uuid;
  v_item jsonb;
  v_first date := (p_sub->>'first_date')::date;
  v_interval integer := (p_sub->>'interval_days')::integer;
  v_weekday integer := (p_sub->>'weekday')::integer;
  v_settings jsonb;
  v_count integer := 0;
begin
  select value into v_settings from settings where key = 'subscription';
  if v_settings is not null and (v_settings->>'enabled')::boolean = false then raise exception 'subscriptions disabled'; end if;
  if v_interval not in (7, 14, 28) or v_weekday not between 0 and 6 then raise exception 'bad interval'; end if;
  select id into v_customer from customers where email = v_email;

  insert into subscriptions (customer_id, customer_email, customer_name, customer_phone, street, city, zip, note,
    shipping_method, payment_method, interval_days, weekday, next_date)
  values (v_customer, v_email, p_sub->>'customer_name', coalesce(p_sub->>'customer_phone', ''),
    coalesce(p_sub->>'street', ''), coalesce(p_sub->>'city', ''), coalesce(p_sub->>'zip', ''), coalesce(p_sub->>'note', ''),
    (p_sub->>'shipping_method')::shipping_method, (p_sub->>'payment_method')::payment_method,
    v_interval, v_weekday, subscription_next_date(v_first, v_interval, v_weekday))
  returning id, token into v_id, v_token;

  for v_item in select * from jsonb_array_elements(p_items) loop
    if coalesce((v_item->>'qty')::integer, 0) < 1 then continue; end if;
    if not exists (select 1 from products where slug = v_item->>'product_slug' and is_published) then continue; end if;
    insert into subscription_items (subscription_id, product_slug, qty) values (v_id, v_item->>'product_slug', (v_item->>'qty')::integer);
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then raise exception 'empty subscription'; end if;

  -- první objednávka patří k předplatnému
  update orders set subscription_id = v_id where order_number = p_sub->>'order_number' and customer_email = v_email;
  return jsonb_build_object('id', v_id, 'token', v_token, 'next_date', (select next_date from subscriptions where id = v_id));
end $$;
revoke all on function create_subscription(jsonb, jsonb) from public;
grant execute on function create_subscription(jsonb, jsonb) to anon, authenticated, service_role;

-- Předplatné podle tokenu (správa bez přihlášení), s aktuálními cenami položek.
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
        'name', (case p.line when 'zaklad' then 'Základ' when 'kosti' then 'Kosti' when 'navic' then 'Navíc' when 'mlsky' then 'Mlsky' when 'granule' then 'Granule' end) || ' · ' || p.variant,
        'price_czk', p.price_czk, 'weight_grams', p.weight_grams, 'available', (p.is_published and p.in_stock)
      ) order by i.id), '[]'::jsonb)
      from subscription_items i left join products p on p.slug = i.product_slug where i.subscription_id = s.id)
  )
  from subscriptions s where s.token = p_token and length(p_token) = 32;
$$;
revoke all on function subscription_by_token(text) from public;
grant execute on function subscription_by_token(text) to anon, authenticated, service_role;

-- Správa předplatného tokenem: skip, unskip, pause, resume, cancel, interval, items.
create or replace function manage_subscription(p_token text, p_action text, p_payload jsonb default '{}'::jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  s subscriptions;
  v_item jsonb;
  v_interval integer;
  v_weekday integer;
  v_count integer := 0;
begin
  select * into s from subscriptions where token = p_token and length(p_token) = 32;
  if not found then raise exception 'not found'; end if;
  if s.status = 'zruseno' and p_action <> 'resume' then raise exception 'cancelled'; end if;

  case p_action
    when 'skip' then update subscriptions set skip_next = true where id = s.id;
    when 'unskip' then update subscriptions set skip_next = false where id = s.id;
    when 'pause' then update subscriptions set status = 'pozastaveno' where id = s.id;
    when 'resume' then
      update subscriptions set status = 'aktivni', skip_next = false, last_error = null,
        next_date = case when next_date > current_date + 1 then next_date else subscription_next_date(current_date, 1, weekday) end
      where id = s.id;
    when 'cancel' then update subscriptions set status = 'zruseno' where id = s.id;
    when 'interval' then
      v_interval := (p_payload->>'interval_days')::integer;
      v_weekday := (p_payload->>'weekday')::integer;
      if v_interval not in (7, 14, 28) or v_weekday not between 0 and 6 then raise exception 'bad interval'; end if;
      update subscriptions set interval_days = v_interval, weekday = v_weekday,
        next_date = subscription_next_date(current_date, 1, v_weekday), skip_next = false
      where id = s.id;
    when 'items' then
      delete from subscription_items where subscription_id = s.id;
      for v_item in select * from jsonb_array_elements(coalesce(p_payload->'items', '[]'::jsonb)) loop
        if coalesce((v_item->>'qty')::integer, 0) < 1 then continue; end if;
        if not exists (select 1 from products where slug = v_item->>'product_slug' and is_published) then continue; end if;
        insert into subscription_items (subscription_id, product_slug, qty) values (s.id, v_item->>'product_slug', least((v_item->>'qty')::integer, 99));
        v_count := v_count + 1;
      end loop;
      if v_count = 0 then raise exception 'empty subscription'; end if;
    when 'note' then update subscriptions set note = left(coalesce(p_payload->>'note', ''), 500) where id = s.id;
    else raise exception 'unknown action';
  end case;
  return subscription_by_token(p_token);
end $$;
revoke all on function manage_subscription(text, text, jsonb) from public;
grant execute on function manage_subscription(text, text, jsonb) to anon, authenticated, service_role;

-- Cron: co je dnes potřeba udělat. Vrací seznam {action: 'remind' | 'order', subscription}.
create or replace function subscriptions_due(p_secret text, p_today date)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settings jsonb;
  v_remind integer;
  v_cutoff integer;
begin
  if not exists (select 1 from secrets where key = 'cron' and value = p_secret) then raise exception 'forbidden'; end if;
  select value into v_settings from settings where key = 'subscription';
  if v_settings is not null and (v_settings->>'enabled')::boolean = false then return '[]'::jsonb; end if;
  v_remind := coalesce((v_settings->>'reminderDaysBefore')::integer, 3);
  v_cutoff := coalesce((v_settings->>'cutoffDaysBefore')::integer, 1);

  return coalesce((
    select jsonb_agg(jsonb_build_object('action', a.action, 'subscription', subscription_by_token(a.token)) order by a.next_date)
    from (
      select s.token, s.next_date, 'remind' as action from subscriptions s
       where s.status = 'aktivni' and s.next_date - v_remind <= p_today and s.next_date > p_today + v_cutoff
         and (s.reminder_sent_for is null or s.reminder_sent_for < s.next_date)
      union all
      select s.token, s.next_date, 'order' from subscriptions s
       where s.status = 'aktivni' and s.next_date - v_cutoff <= p_today
    ) a
  ), '[]'::jsonb);
end $$;
revoke all on function subscriptions_due(text, date) from public;
grant execute on function subscriptions_due(text, date) to anon, authenticated, service_role;

-- Cron: zapsat výsledek. p_action: 'reminded' | 'ordered' | 'skipped' | 'failed'.
create or replace function subscription_mark(p_secret text, p_id uuid, p_action text, p_order_number text default null, p_error text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare s subscriptions;
begin
  if not exists (select 1 from secrets where key = 'cron' and value = p_secret) then raise exception 'forbidden'; end if;
  select * into s from subscriptions where id = p_id;
  if not found then return; end if;
  case p_action
    when 'reminded' then update subscriptions set reminder_sent_for = next_date where id = p_id;
    when 'ordered' then
      update subscriptions set
        last_order_id = (select id from orders where order_number = p_order_number),
        last_error = null, skip_next = false,
        next_date = subscription_next_date(next_date, interval_days, weekday)
      where id = p_id;
      update orders set subscription_id = p_id where order_number = p_order_number;
    when 'skipped' then
      update subscriptions set skip_next = false, next_date = subscription_next_date(next_date, interval_days, weekday) where id = p_id;
    when 'failed' then
      -- neúspěšná objednávka: předplatné pozastavit, aby se cron nepokoušel každý den
      update subscriptions set last_error = left(coalesce(p_error, 'chyba'), 300), status = 'pozastaveno' where id = p_id;
    else raise exception 'unknown action';
  end case;
end $$;
revoke all on function subscription_mark(text, uuid, text, text, text) from public;
grant execute on function subscription_mark(text, uuid, text, text, text) to anon, authenticated, service_role;

-- create_order: sleva za předplatné (p_order.subscribe_interval) a vazba na předplatné (p_order.subscription_id).
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

  -- sleva za předplatné: procento ze zboží po slevovém kódu
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
