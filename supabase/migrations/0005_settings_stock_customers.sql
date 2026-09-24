-- Nastavení e-shopu, sklad a zákazníci.

-- Nastavení: jeden řádek na klíč, hodnota jako JSON. Veřejnost čte, admin zapisuje.
create table settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
alter table settings enable row level security;
create policy "public read settings" on settings for select to anon, authenticated using (true);
create policy "admins manage settings" on settings for all to authenticated
  using (is_admin()) with check (is_admin());
create trigger settings_updated_at before update on settings for each row execute function set_updated_at();

-- Sklad: null = množství se neeviduje (řídí se jen in_stock). Jinak počet kusů.
alter table products
  add column stock_qty integer check (stock_qty is null or stock_qty >= 0),
  add column low_stock_threshold integer not null default 3 check (low_stock_threshold >= 0);

-- Zákazníci: podle e-mailu, doplní se při každé objednávce.
create table customers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null default '',
  phone text not null default '',
  street text not null default '',
  city text not null default '',
  zip text not null default '',
  note text not null default '',
  orders_count integer not null default 0,
  total_spent_czk integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table customers enable row level security;
create policy "admins manage customers" on customers for all to authenticated
  using (is_admin()) with check (is_admin());
create trigger customers_updated_at before update on customers for each row execute function set_updated_at();

alter table orders add column customer_id uuid references customers (id) on delete set null;
create index orders_customer_idx on orders (customer_id);
create index orders_created_idx on orders (created_at desc);

-- create_order: navíc odečte sklad, založí/aktualizuje zákazníka.
create or replace function create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text;
  v_customer uuid;
  v_email text := lower(trim(p_order->>'customer_email'));
  v_stock integer;
  v_item jsonb;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  -- sklad: kde se eviduje, ověřit množství a odečíst
  for v_item in select * from jsonb_array_elements(p_items) loop
    select stock_qty into v_stock from products where slug = v_item->>'product_slug';
    if v_stock is not null and v_stock < (v_item->>'qty')::integer then
      raise exception 'out of stock: %', v_item->>'product_slug';
    end if;
    update products set stock_qty = stock_qty - (v_item->>'qty')::integer
     where slug = v_item->>'product_slug' and stock_qty is not null;
  end loop;
  update products set in_stock = false where stock_qty = 0 and in_stock;

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

  insert into orders (
    order_number, customer_id, customer_name, customer_email, customer_phone,
    street, city, zip, note, shipping_method, payment_method,
    subtotal_czk, shipping_czk, total_czk
  ) values (
    p_order->>'order_number', v_customer, p_order->>'customer_name', v_email, p_order->>'customer_phone',
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), coalesce(p_order->>'note', ''),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method,
    (p_order->>'subtotal_czk')::integer, (p_order->>'shipping_czk')::integer, (p_order->>'total_czk')::integer
  )
  returning id, order_number into v_id, v_number;

  insert into order_items (order_id, product_slug, name, qty, unit_price_czk)
  select v_id, x->>'product_slug', x->>'name', (x->>'qty')::integer, (x->>'unit_price_czk')::integer
  from jsonb_array_elements(p_items) as x;

  update customers set orders_count = orders_count + 1,
    total_spent_czk = total_spent_czk + (p_order->>'total_czk')::integer
  where id = v_customer;

  return v_number;
end $$;

-- Zrušená objednávka vrátí zboží na sklad.
create or replace function restock_on_cancel()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'zrusena' and old.status <> 'zrusena' then
    update products p set stock_qty = p.stock_qty + oi.qty, in_stock = true
      from order_items oi where oi.order_id = new.id and oi.product_slug = p.slug and p.stock_qty is not null;
  elsif old.status = 'zrusena' and new.status <> 'zrusena' then
    update products p set stock_qty = greatest(p.stock_qty - oi.qty, 0)
      from order_items oi where oi.order_id = new.id and oi.product_slug = p.slug and p.stock_qty is not null;
  end if;
  return new;
end $$;
create trigger orders_restock after update of status on orders for each row execute function restock_on_cancel();
