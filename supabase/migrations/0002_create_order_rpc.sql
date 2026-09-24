-- Objednávku zakládá server action přes RPC. Funkce běží jako vlastník
-- (security definer), takže e-shop nepotřebuje service role klíč.
create or replace function create_order(p_order jsonb, p_items jsonb)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_number text;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'empty order';
  end if;

  insert into orders (
    order_number, customer_name, customer_email, customer_phone,
    street, city, zip, note, shipping_method, payment_method,
    subtotal_czk, shipping_czk, total_czk
  ) values (
    p_order->>'order_number', p_order->>'customer_name', p_order->>'customer_email', p_order->>'customer_phone',
    coalesce(p_order->>'street', ''), coalesce(p_order->>'city', ''), coalesce(p_order->>'zip', ''), coalesce(p_order->>'note', ''),
    (p_order->>'shipping_method')::shipping_method, (p_order->>'payment_method')::payment_method,
    (p_order->>'subtotal_czk')::integer, (p_order->>'shipping_czk')::integer, (p_order->>'total_czk')::integer
  )
  returning id, order_number into v_id, v_number;

  insert into order_items (order_id, product_slug, name, qty, unit_price_czk)
  select v_id, i->>'product_slug', i->>'name', (i->>'qty')::integer, (i->>'unit_price_czk')::integer
  from jsonb_array_elements(p_items) as i;

  return v_number;
end $$;

revoke all on function create_order(jsonb, jsonb) from public;
grant execute on function create_order(jsonb, jsonb) to anon, authenticated, service_role;
