-- Cena pro kamennou prodejnu.
-- products.store_price_czk: když je vyplněná, pokladna účtuje ji. Když je prázdná, platí e-shopová price_czk.
-- Běží-li cenová akce (original_price_czk není null), platí akční price_czk i v prodejně.

alter table products add column if not exists store_price_czk integer check (store_price_czk is null or store_price_czk > 0);

comment on column products.store_price_czk is 'Cena v kamenné prodejně (Kč). Prázdná = stejná jako na e-shopu. Během akce platí akční cena.';

create or replace function pos_unit_price(p products) returns integer
language sql immutable as $$
  select case when p.original_price_czk is null and p.store_price_czk is not null then p.store_price_czk else p.price_czk end
$$;

create or replace function public.pos_checkout(p_sale jsonb, p_items jsonb)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  v_id uuid; v_number text; v_shift uuid := pos_current_shift(); v_customer uuid := nullif(p_sale->>'customer_id', '')::uuid;
  v_item jsonb; v_product products; v_qty numeric; v_price integer; v_subtotal integer := 0; v_lines jsonb := '[]'::jsonb;
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
    v_price := pos_unit_price(v_product);
    v_subtotal := v_subtotal + round(v_qty * v_price)::integer;
    v_lines := v_lines || jsonb_build_object('product_id', v_product.id, 'product_slug', v_product.slug,
      'name', product_display_name(v_product.variant),
      'qty', v_qty, 'unit', v_product.unit, 'unit_price_czk', v_price, 'unit_cost_czk', v_product.purchase_price_czk,
      'line_total_czk', round(v_qty * v_price)::integer, 'tracked', v_product.stock_qty is not null);
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
end $function$;

-- Marže produktu i pro prodejnu (nové sloupce na konci pohledu)
create or replace view product_margins as
 select id, slug, line, variant, unit, price_czk, purchase_price_czk, stock_qty,
    case when purchase_price_czk is not null and purchase_price_czk > 0 then round((price_czk::numeric - purchase_price_czk) / price_czk::numeric * 100, 1) else null::numeric end as margin_pct,
    (select avg(m.unit_cost_czk) from stock_movements m where m.product_id = p.id and m.kind = 'prijem' and m.unit_cost_czk > 0) as avg_purchase_price_czk,
    (select max(m.created_at) from stock_movements m where m.product_id = p.id and m.kind = 'prijem') as last_receipt_at,
    store_price_czk,
    case when purchase_price_czk is not null and purchase_price_czk > 0 and store_price_czk is not null then round((store_price_czk::numeric - purchase_price_czk) / store_price_czk::numeric * 100, 1) else null::numeric end as store_margin_pct
   from products p;

-- Prodeje v prodejně po produktech (protějšek top_products pro e-shop)
create or replace view pos_top_products as
 select i.product_slug, i.name,
    sum(i.qty) as qty,
    sum(i.line_total_czk) as revenue_czk,
    sum(i.qty * coalesce(i.unit_cost_czk, 0)) as cost_czk,
    max(s.created_at) as last_sold_at
   from pos_sale_items i join pos_sales s on s.id = i.sale_id
  where s.status = 'zaplaceno' and s.order_id is null
  group by i.product_slug, i.name;

-- Pohledy čtou s právy volajícího (RLS), ne vlastníka: nákupní ceny a tržby prodejny nevidí anonym.
alter view pos_top_products set (security_invoker = true);
alter view product_margins set (security_invoker = true);
