-- Oprava: ruční změna stavu v adminu se zapsala jako pohyb „oprava“, který se pak
-- znovu přičetl ke stavu (dvojnásobek). Pohyb z auditu se do stavu nepromítá.
create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dokosti.audit', true), '0') = '1' then return new; end if;
  perform set_config('dokosti.movement', '1', true);
  update products set
    stock_qty = greatest(coalesce(stock_qty, 0) + new.qty, 0),
    in_stock = case when greatest(coalesce(stock_qty, 0) + new.qty, 0) > 0 then true else in_stock end
  where id = new.product_id;
  update products set in_stock = false where id = new.product_id and stock_qty = 0 and in_stock;
  perform set_config('dokosti.movement', '0', true);
  return new;
end $$;

create or replace function audit_stock_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(current_setting('dokosti.movement', true), '0') = '1' then return new; end if;
  if new.stock_qty is distinct from old.stock_qty and new.stock_qty is not null and coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0) <> 0 then
    perform set_config('dokosti.audit', '1', true);
    insert into stock_movements (product_id, kind, qty, note, created_by)
    values (new.id, 'oprava', coalesce(new.stock_qty, 0) - coalesce(old.stock_qty, 0), 'Ruční změna stavu v adminu', auth.uid());
    perform set_config('dokosti.audit', '0', true);
  end if;
  return new;
end $$;

-- Oprava: částečný unikátní index na e-mailu neodpovídá `on conflict (email)` v create_order
-- (objednávky z webu selhávaly). Obyčejný unikátní index víc NULL hodnot dovolí.
drop index if exists customers_email_idx;
create unique index customers_email_idx on customers (email);
