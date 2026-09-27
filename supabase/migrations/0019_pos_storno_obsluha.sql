-- Storno účtenky: správce kdykoli, obsluha jen vlastní účtenku do 10 minut od prodeje.
-- Storno výdeje objednávky vrátí objednávku mezi připravené k výdeji.
create or replace function pos_cancel_sale(p_sale_id uuid, p_reason text default '')
returns void language plpgsql security definer set search_path = public as $$
declare s pos_sales;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select * into s from pos_sales where id = p_sale_id for update;
  if not found or s.status = 'storno' then return; end if;
  if not is_manager() and (s.cashier is distinct from auth.uid() or s.created_at < now() - interval '10 minutes') then
    raise exception 'storno not allowed';
  end if;
  update pos_sales set status = 'storno', cancelled_at = now(), cancelled_by = auth.uid(), cancel_reason = left(coalesce(p_reason, ''), 200) where id = p_sale_id;
  if s.order_id is null then
    insert into stock_movements (product_id, kind, qty, pos_sale_id, note, created_by)
    select i.product_id, 'storno', i.qty, s.id, 'Storno účtenky ' || s.number, auth.uid()
    from pos_sale_items i join products p on p.id = i.product_id where i.sale_id = s.id and p.stock_qty is not null;
  else
    update orders set status = 'pripravena' where id = s.order_id and status = 'doruceno';
  end if;
  if s.customer_id is not null then
    if s.points_earned > 0 then
      update customers set points = greatest(points - s.points_earned, 0) where id = s.customer_id;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (s.customer_id, s.id, -s.points_earned, 'Storno účtenky ' || s.number);
    end if;
    if s.points_redeemed > 0 then
      update customers set points = points + s.points_redeemed where id = s.customer_id;
      insert into loyalty_transactions (customer_id, pos_sale_id, points, reason) values (s.customer_id, s.id, s.points_redeemed, 'Vráceno, storno účtenky ' || s.number);
    end if;
    update customers set orders_count = greatest(orders_count - 1, 0), total_spent_czk = greatest(total_spent_czk - s.total_czk, 0) where id = s.customer_id;
  end if;
  if s.coupon_code is not null then update coupons set used_count = greatest(used_count - 1, 0) where code = s.coupon_code; end if;
end $$;
