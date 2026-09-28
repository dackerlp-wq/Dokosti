-- Předplatné: položky, které vydrží déle než interval (olej, kosti navíc), jdou jen do každé N. dodávky.
-- every_nth = 1 každou dodávku, 4 = každou čtvrtou. První objednávka (z pokladny) má vždy vše; cron pak položku
-- zařadí, když počet dosavadních dodávek (orders_count, včetně první) je dělitelný every_nth: 1., 5., 9. dodávka.
alter table subscription_items add column every_nth integer not null default 1 check (every_nth between 1 and 12);

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
    insert into subscription_items (subscription_id, product_slug, qty, every_nth)
    values (v_id, v_item->>'product_slug', (v_item->>'qty')::integer, least(12, greatest(1, coalesce((v_item->>'every_nth')::integer, 1))));
    v_count := v_count + 1;
  end loop;
  if v_count = 0 then raise exception 'empty subscription'; end if;

  -- první objednávka patří k předplatnému
  update orders set subscription_id = v_id where order_number = p_sub->>'order_number' and customer_email = v_email;
  return jsonb_build_object('id', v_id, 'token', v_token, 'next_date', (select next_date from subscriptions where id = v_id));
end $$;

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
        insert into subscription_items (subscription_id, product_slug, qty, every_nth)
        values (s.id, v_item->>'product_slug', least((v_item->>'qty')::integer, 99), least(12, greatest(1, coalesce((v_item->>'every_nth')::integer, 1))));
        v_count := v_count + 1;
      end loop;
      if v_count = 0 then raise exception 'empty subscription'; end if;
    when 'note' then update subscriptions set note = left(coalesce(p_payload->>'note', ''), 500) where id = s.id;
    else raise exception 'unknown action';
  end case;
  return subscription_by_token(p_token);
end $$;

-- subscription_by_token: každou N. dodávku a počet dodávek z předplatného
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
    'orders_count', (select count(*) from orders o where o.subscription_id = s.id),
    'items', (select coalesce(jsonb_agg(jsonb_build_object(
        'product_slug', i.product_slug, 'qty', i.qty, 'every_nth', i.every_nth,
        'name', product_display_name(p.variant),
        'price_czk', p.price_czk, 'weight_grams', p.weight_grams, 'available', (p.is_published and p.in_stock)
      ) order by i.id), '[]'::jsonb)
      from subscription_items i left join products p on p.slug = i.product_slug where i.subscription_id = s.id)
  )
  from subscriptions s where s.token = p_token and length(p_token) = 32;
$$;
