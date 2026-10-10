-- Zboží: dodavatelé a objednávky u nich, sazba DPH a balení u produktu, interní výdej, odečet šarží při prodeji
-- (nejstarší expirace první), inventura v jedné transakci, plánované akční ceny.

-- 1) Dodavatelé (číselník). Obsluha čte, zapisuje správce i obsluha (příjem zboží).
create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text not null default '',
  email text not null default '',
  phone text not null default '',
  -- den v týdnu, kdy se objednává (0 = neděle), null = kdykoli
  order_weekday int check (order_weekday between 0 and 6),
  lead_days int not null default 3 check (lead_days >= 0),
  min_order_czk int not null default 0,
  note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table suppliers enable row level security;
create policy "admins manage suppliers" on suppliers for all to authenticated using (is_admin()) with check (is_admin());

alter table products add column if not exists supplier_id uuid references suppliers (id) on delete set null;
-- obvyklé balení od dodavatele (ks v kartonu, kg v bedně) pro doporučení doobjednání
alter table products add column if not exists pack_size numeric(10,3) check (pack_size is null or pack_size > 0);
-- sazba DPH pro doklady a účtenky (potvrdit s účetní)
alter table products add column if not exists vat_rate int not null default 12 check (vat_rate in (0, 12, 21));

-- 2) Objednávky u dodavatele: návrh → odeslaná → přijatá (příjemkou) / zrušená.
create sequence if not exists purchase_order_seq;
create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  number text not null unique default ('OBJ' || to_char(now(), 'YY') || lpad(nextval('purchase_order_seq')::text, 4, '0')),
  supplier_id uuid not null references suppliers (id) on delete restrict,
  status text not null default 'navrh' check (status in ('navrh', 'odeslana', 'prijata', 'zrusena')),
  note text not null default '',
  expected_on date,
  sent_at timestamptz,
  received_at timestamptz,
  receipt_id uuid references stock_receipts (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create table if not exists purchase_order_items (
  id uuid primary key default gen_random_uuid(),
  purchase_order_id uuid not null references purchase_orders (id) on delete cascade,
  product_id uuid not null references products (id) on delete restrict,
  qty numeric(10,3) not null check (qty > 0),
  unit_cost_czk numeric(10,2) not null default 0,
  received_qty numeric(10,3) not null default 0
);
create index if not exists purchase_order_items_po_idx on purchase_order_items (purchase_order_id);
alter table purchase_orders enable row level security;
alter table purchase_order_items enable row level security;
create policy "admins manage purchase orders" on purchase_orders for all to authenticated using (is_admin()) with check (is_admin());
create policy "admins manage purchase order items" on purchase_order_items for all to authenticated using (is_admin()) with check (is_admin());

-- Příjemka zná objednávku, ze které vznikla, splatnost a částku faktury (pro úkol „zaplatit“ a finance).
alter table stock_receipts add column if not exists purchase_order_id uuid references purchase_orders (id) on delete set null;
alter table stock_receipts add column if not exists due_on date;
alter table stock_receipts add column if not exists invoice_total_czk numeric(12,2);
alter table stock_receipts add column if not exists paid_at timestamptz;
alter table stock_receipt_items add column if not exists ordered_qty numeric(10,3);

-- 3) Interní výdej: ochutnávky, vzorky, vlastní spotřeba, dar. Odděleně od odpisu, aby neskresloval ležáky a marži.
-- (ALTER TYPE ... ADD VALUE běží samostatně, mimo transakci.)
alter type stock_kind add value if not exists 'interni';

-- Odpis (ubylo), inventura (nový stav), interní výdej (spotřebováno).
create or replace function adjust_stock(p_product_id uuid, p_kind text, p_qty numeric, p_note text default '')
returns numeric language plpgsql security definer set search_path = public as $fn$
declare v_current numeric; v_delta numeric;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select coalesce(stock_qty, 0) into v_current from products where id = p_product_id for update;
  if p_kind in ('odpis', 'interni') then
    if p_qty <= 0 then raise exception 'bad qty'; end if;
    v_delta := -least(p_qty, v_current);
  elsif p_kind = 'inventura' then
    if p_qty < 0 then raise exception 'bad qty'; end if;
    v_delta := p_qty - v_current;
  else
    raise exception 'bad kind';
  end if;
  if v_delta <> 0 then
    insert into stock_movements (product_id, kind, qty, note, created_by) values (p_product_id, p_kind::stock_kind, v_delta, left(coalesce(p_note, ''), 300), auth.uid());
  end if;
  return v_current + v_delta;
end
$fn$;

-- 4) Šarže: prodej, odpis a interní výdej odečítají z nejstarší expirace; storno vrací do nejstarší živé šarže.
-- Pohyb dostane batch_id první dotčené šarže (dohledatelnost: komu jsme ze které šarže prodali).
create or replace function apply_stock_movement()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_left numeric; v_take numeric; b record; v_first uuid;
begin
  if coalesce(current_setting('dokosti.audit', true), '0') = '1' then return new; end if;
  perform set_config('dokosti.movement', '1', true);
  update products set
    stock_qty = greatest(coalesce(stock_qty, 0) + new.qty, 0),
    in_stock = case when greatest(coalesce(stock_qty, 0) + new.qty, 0) > 0 then true else in_stock end
  where id = new.product_id;
  update products set in_stock = false where id = new.product_id and stock_qty = 0 and in_stock;
  perform set_config('dokosti.movement', '0', true);

  if new.qty < 0 and new.kind in ('prodej_web', 'prodej_kasa', 'odpis', 'interni') and new.batch_id is null then
    v_left := -new.qty;
    for b in select id, qty from stock_batches where product_id = new.product_id and qty > 0 order by expires_on, created_at loop
      exit when v_left <= 0;
      v_take := least(b.qty, v_left);
      update stock_batches set qty = qty - v_take where id = b.id;
      v_left := v_left - v_take;
      if v_first is null then v_first := b.id; end if;
    end loop;
    if v_first is not null then update stock_movements set batch_id = v_first where id = new.id; end if;
  elsif new.qty > 0 and new.kind = 'storno' then
    select id into v_first from stock_batches where product_id = new.product_id and qty > 0 order by expires_on, created_at limit 1;
    if v_first is null then select id into v_first from stock_batches where product_id = new.product_id order by expires_on desc limit 1; end if;
    if v_first is not null then
      update stock_batches set qty = qty + new.qty where id = v_first;
      update stock_movements set batch_id = v_first where id = new.id;
    end if;
  end if;
  return new;
end
$fn$;

-- 5) Inventura v jedné transakci: p_items = [{product_id, qty}], zapíše jen rozdíly. Vrací počet a hodnotu rozdílů.
create or replace function apply_inventory(p_items jsonb, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_item jsonb; v_current numeric; v_qty numeric; v_delta numeric; v_count int := 0; v_value numeric := 0; v_price numeric;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_qty := (v_item->>'qty')::numeric;
    if v_qty is null or v_qty < 0 then continue; end if;
    select coalesce(stock_qty, 0), price_czk into v_current, v_price from products where id = (v_item->>'product_id')::uuid for update;
    if not found then continue; end if;
    v_delta := v_qty - v_current;
    if v_delta <> 0 then
      insert into stock_movements (product_id, kind, qty, note, created_by)
      values ((v_item->>'product_id')::uuid, 'inventura', v_delta, left(coalesce(p_note, 'Inventura'), 300), auth.uid());
      v_count := v_count + 1;
      v_value := v_value + v_delta * v_price;
    end if;
  end loop;
  return jsonb_build_object('changed', v_count, 'value_czk', round(v_value));
end
$fn$;
revoke all on function apply_inventory(jsonb, text) from public, anon;
grant execute on function apply_inventory(jsonb, text) to authenticated;

-- 6) Akční ceny s platností: v den začátku se cena přepne (původní zůstane přeškrtnutá), po konci se vrátí.
create table if not exists price_actions (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  product_id uuid not null references products (id) on delete cascade,
  sale_price_czk int not null check (sale_price_czk >= 0),
  starts_on date not null,
  ends_on date not null check (ends_on >= starts_on),
  status text not null default 'planovana' check (status in ('planovana', 'aktivni', 'skoncena', 'zrusena')),
  -- cena před akcí, aby se po konci vrátila přesně
  original_price_czk int,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists price_actions_status_idx on price_actions (status, starts_on, ends_on);
alter table price_actions enable row level security;
create policy "managers manage price actions" on price_actions for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff read price actions" on price_actions for select to authenticated using (is_admin());

-- Spuštění a ukončení akcí podle data. Volá denní cron (se secretem) i správce z adminu.
create or replace function price_actions_run(p_secret text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare a record; v_started int := 0; v_ended int := 0; v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  if not (is_manager() or (p_secret is not null and exists (select 1 from secrets where key = 'cron' and value = p_secret))) then
    raise exception 'forbidden';
  end if;
  -- konec akcí (nejdřív, aby produkt s navazující akcí dostal správnou výchozí cenu)
  for a in select * from price_actions where status = 'aktivni' and ends_on < v_today loop
    update products set price_czk = coalesce(a.original_price_czk, price_czk), original_price_czk = null where id = a.product_id;
    update price_actions set status = 'skoncena' where id = a.id;
    v_ended := v_ended + 1;
  end loop;
  -- začátek akcí
  for a in select * from price_actions where status = 'planovana' and starts_on <= v_today and ends_on >= v_today order by starts_on loop
    update price_actions set original_price_czk = p.price_czk from products p where p.id = a.product_id and price_actions.id = a.id;
    update products set original_price_czk = price_czk, price_czk = a.sale_price_czk where id = a.product_id and price_czk > a.sale_price_czk;
    update price_actions set status = 'aktivni' where id = a.id;
    v_started := v_started + 1;
  end loop;
  -- zrušené akce, které už běžely, vrátí cenu
  for a in select * from price_actions where status = 'zrusena' and original_price_czk is not null loop
    update products set price_czk = a.original_price_czk, original_price_czk = null where id = a.product_id and price_czk = a.sale_price_czk;
    update price_actions set original_price_czk = null where id = a.id;
  end loop;
  return jsonb_build_object('started', v_started, 'ended', v_ended);
end
$fn$;
revoke all on function price_actions_run(text) from public;
grant execute on function price_actions_run(text) to anon, authenticated, service_role;
