-- Termín rozvozu nebo odběru vybraný v pokladně (rozvoz: pevné dny z nastavení).
alter table orders add column delivery_date date;
create index orders_delivery_idx on orders (delivery_date) where delivery_date is not null;

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
    street, city, zip, note, shipping_method, payment_method, delivery_date,
    subtotal_czk, shipping_czk, total_czk
  ) values (
    p_order->>'order_number', v_customer, p_order->>'customer_name', v_email, p_order->>'customer_phone',
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), coalesce(p_order->>'note', ''),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method,
    nullif(p_order->>'delivery_date', '')::date,
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
