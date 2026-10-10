-- Napříč: plán směn, poslední nákup zákazníka (péče o zákazníky), anonymizace (GDPR), dárkové poukazy
-- jako slevové kódy, denní souhrn pro e-mail.

-- 1) Plán směn: kdo má kdy být v prodejně (dopředu). Skutečnost je docházka.
create table if not exists shift_plans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references employees (id) on delete cascade,
  day date not null,
  starts time not null default '08:00',
  ends time not null default '16:00',
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends > starts)
);
create index if not exists shift_plans_day_idx on shift_plans (day);
alter table shift_plans enable row level security;
create policy "managers manage shift plans" on shift_plans for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff read shift plans" on shift_plans for select to authenticated using (is_admin());

-- 2) Poslední nákup zákazníka (web i kasa) pro péči o zákazníky: koho ztrácíme.
alter table customers add column if not exists last_order_at timestamptz;
update customers c set last_order_at = greatest(
  (select max(o.created_at) from orders o where o.customer_id = c.id and o.status <> 'zrusena'),
  (select max(s.created_at) from pos_sales s where s.customer_id = c.id and s.status = 'zaplaceno')
) where last_order_at is null;
create or replace function customer_last_order()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.customer_id is not null then
    update customers set last_order_at = greatest(coalesce(last_order_at, new.created_at), new.created_at) where id = new.customer_id;
  end if;
  return new;
end
$fn$;
create trigger orders_last_order after insert on orders for each row execute function customer_last_order();
create trigger pos_sales_last_order after insert on pos_sales for each row execute function customer_last_order();

-- 3) Anonymizace zákazníka (GDPR): osobní údaje se přepíší, doklady a čísla zůstanou. Nevratné.
create or replace function anonymize_customer(p_id uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare v_anon text := 'anon-' || replace(p_id::text, '-', '') || '@anonymizovano.local';
begin
  if not is_manager() then raise exception 'not manager'; end if;
  update customers set name = 'Anonymizovaný zákazník', email = v_anon, phone = '', street = '', city = '', zip = '', note = '',
    card_code = null, user_id = null, consent_marketing_email_at = null, consent_marketing_sms_at = null, heard_from = '', updated_at = now()
  where id = p_id;
  update orders set customer_name = 'Anonymizováno', customer_email = v_anon, customer_phone = '', street = '', city = '', zip = '', note = '' where customer_id = p_id;
  update subscriptions set customer_name = 'Anonymizováno', customer_email = v_anon, customer_phone = '', street = '', city = '', zip = '', note = '', status = 'zrusene' where customer_id = p_id and status = 'aktivni';
  update pets set name = '', note = '', data = '{}'::jsonb where customer_id = p_id;
  update cards set status = 'blokovana', customer_id = null, note = 'anonymizováno' where customer_id = p_id;
end
$fn$;
revoke all on function anonymize_customer(uuid) from public, anon;
grant execute on function anonymize_customer(uuid) to authenticated;

-- 4) Dárkové poukazy = slevové kódy na částku, jedno použití, s příjemcem.
alter table coupons add column if not exists kind text not null default 'sleva' check (kind in ('sleva', 'poukaz'));
alter table coupons add column if not exists recipient text not null default '';
alter table coupons add column if not exists issued_by uuid references auth.users (id) on delete set null;
alter table coupons add column if not exists sold_czk int;

-- 5) Denní souhrn pro e-mail správci (cron se secretem). Čísla, ne texty: e-mail si je poskládá.
create or replace function daily_digest(p_secret text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare v_today date := (now() at time zone 'Europe/Prague')::date; v_yday date; r jsonb;
begin
  if not (is_manager() or (p_secret is not null and exists (select 1 from secrets where key = 'cron' and value = p_secret))) then
    raise exception 'forbidden';
  end if;
  v_yday := v_today - 1;
  select jsonb_build_object(
    'today', v_today,
    'revenue_yesterday', (select coalesce(sum(total_czk), 0) from pos_sales where status = 'zaplaceno' and order_id is null and (created_at at time zone 'Europe/Prague')::date = v_yday)
      + (select coalesce(sum(total_czk), 0) from orders where status <> 'zrusena' and (created_at at time zone 'Europe/Prague')::date = v_yday),
    'open_orders', (select count(*) from orders where status in ('nova', 'potvrzena', 'pripravena')),
    'new_orders', (select count(*) from orders where status = 'nova'),
    'today_deliveries', (select count(*) from orders where status in ('nova', 'potvrzena', 'pripravena') and shipping_method = 'rozvoz' and delivery_date = v_today),
    'today_pickups', (select count(*) from orders where status in ('nova', 'potvrzena', 'pripravena') and shipping_method = 'odber' and delivery_date = v_today),
    'unpaid_transfers', (select count(*) from orders where payment_method = 'prevod' and paid_at is null and status in ('nova', 'potvrzena', 'pripravena') and created_at < now() - interval '3 days'),
    'expiring_batches', (select count(*) from stock_batches where qty > 0 and expires_on <= v_today + 14),
    'low_stock', (select count(*) from products where stock_qty is not null and stock_qty <= low_stock_threshold),
    'overdue_tasks', (select coalesce(jsonb_agg(title order by due_on), '[]'::jsonb) from (select title, due_on from tasks where done_at is null and due_on < v_today order by due_on limit 8) t),
    'due_tasks_today', (select count(*) from tasks where done_at is null and due_on = v_today),
    'expiring_docs', (select coalesce(jsonb_agg(title || ' (do ' || to_char(valid_to, 'DD.MM.') || ')' order by valid_to), '[]'::jsonb) from (select title, valid_to from documents where archived_at is null and valid_to is not null and valid_to <= v_today + 30 order by valid_to limit 8) d),
    'expenses_due', (select coalesce(sum(amount_czk), 0) from expenses where paid_at is null and due_on is not null and due_on <= v_today + 3),
    'expenses_overdue', (select coalesce(sum(amount_czk), 0) from expenses where paid_at is null and due_on is not null and due_on < v_today),
    'temps_yesterday', (select count(*) from temperature_log where (measured_at at time zone 'Europe/Prague')::date = v_yday),
    'temps_bad_yesterday', (select count(*) from temperature_log where (measured_at at time zone 'Europe/Prague')::date = v_yday and not ok),
    'shifts_today', (select coalesce(jsonb_agg(e.name || ' ' || to_char(p.starts, 'HH24:MI') || '–' || to_char(p.ends, 'HH24:MI') order by p.starts), '[]'::jsonb) from shift_plans p join employees e on e.id = p.employee_id where p.day = v_today),
    'inquiries', (select count(*) from inquiries where answered = false)
  ) into r;
  return r;
end
$fn$;
revoke all on function daily_digest(text) from public;
grant execute on function daily_digest(text) to anon, authenticated, service_role;
