-- Mzdy a Finance: parametry roku, mzdový měsíc (podklady z docházky, orientační páska), výdaje (z příjemek,
-- z uzavřených mezd, opakované, ruční), opakované výdaje, denní cron financí.

-- 1) Zaměstnanec: podepsané prohlášení poplatníka (sleva na dani) a účet pro výplatu.
alter table employees add column if not exists tax_declaration boolean not null default false;
alter table employees add column if not exists bank_account text not null default '';

-- 2) Parametry roku pro orientační výpočet mezd. Výchozí hodnoty jsou orientační, správce je potvrdí s účetní.
create table if not exists payroll_params (
  year int primary key,
  min_wage_czk numeric(10,2) not null,
  -- rozhodná částka pro odvody u DPP (měsíčně) a u DPČ (zaměstnání malého rozsahu)
  dpp_limit_czk numeric(10,2) not null,
  dpc_limit_czk numeric(10,2) not null,
  tax_rate_pct numeric(5,2) not null default 15,
  -- měsíční sleva na poplatníka (jen při podepsaném prohlášení)
  tax_credit_czk numeric(10,2) not null,
  emp_social_pct numeric(5,2) not null default 7.1,
  emp_health_pct numeric(5,2) not null default 4.5,
  er_social_pct numeric(5,2) not null default 24.8,
  er_health_pct numeric(5,2) not null default 9,
  verified boolean not null default false,
  note text not null default '',
  updated_at timestamptz not null default now()
);
alter table payroll_params enable row level security;
create policy "managers manage payroll params" on payroll_params for all to authenticated using (is_manager()) with check (is_manager());
insert into payroll_params (year, min_wage_czk, dpp_limit_czk, dpc_limit_czk, tax_credit_czk, note)
values
  (2025, 20800, 11500, 4500, 2570, 'Výchozí hodnoty, ověřit s účetní.'),
  (2026, 22400, 12500, 5000, 2570, 'Výchozí hodnoty, ověřit s účetní.')
on conflict (year) do nothing;

-- 3) Mzdový měsíc a položky po lidech. Otevřený měsíc se přepočítává z docházky, uzavřený je zmrazený
-- a zapsal výdaje (mzdy, odvody). Nic se nemaže.
create table if not exists payroll_months (
  month text primary key check (month ~ '^\d{4}-\d{2}$'),
  status text not null default 'otevreny' check (status in ('otevreny', 'uzavreny')),
  closed_at timestamptz,
  closed_by uuid references auth.users (id) on delete set null,
  note text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists payroll_items (
  id uuid primary key default gen_random_uuid(),
  month text not null references payroll_months (month) on delete cascade,
  employee_id uuid not null references employees (id) on delete restrict,
  employee_name text not null,
  contract_type text not null,
  hours_work numeric(7,2) not null default 0,
  hours_vacation numeric(7,2) not null default 0,
  hours_sick numeric(7,2) not null default 0,
  hours_holiday numeric(7,2) not null default 0,
  hourly_rate_czk numeric(10,2),
  monthly_salary_czk numeric(10,2),
  bonus_czk numeric(10,2) not null default 0,
  deduction_czk numeric(10,2) not null default 0,
  gross_czk numeric(10,2) not null default 0,
  emp_levies_czk numeric(10,2) not null default 0,
  tax_czk numeric(10,2) not null default 0,
  net_czk numeric(10,2) not null default 0,
  er_levies_czk numeric(10,2) not null default 0,
  employer_cost_czk numeric(10,2) not null default 0,
  -- rozpis výpočtu pro pásku (řádky: popis, částka)
  breakdown jsonb not null default '[]'::jsonb,
  note text not null default '',
  updated_at timestamptz not null default now(),
  unique (month, employee_id)
);
create index if not exists payroll_items_employee_idx on payroll_items (employee_id, month desc);
alter table payroll_months enable row level security;
alter table payroll_items enable row level security;
create policy "managers manage payroll months" on payroll_months for all to authenticated using (is_manager()) with check (is_manager());
create policy "managers manage payroll items" on payroll_items for all to authenticated using (is_manager()) with check (is_manager());
-- zaměstnanec vidí svou pásku, až když je měsíc uzavřený
create policy "employee reads own closed payroll" on payroll_items for select to authenticated
  using (exists (select 1 from employees e join payroll_months m on m.month = payroll_items.month where e.id = payroll_items.employee_id and e.user_id = auth.uid() and m.status = 'uzavreny'));
create policy "employee reads closed months" on payroll_months for select to authenticated
  using (status = 'uzavreny' and exists (select 1 from payroll_items i join employees e on e.id = i.employee_id where i.month = payroll_months.month and e.user_id = auth.uid()));

-- 4) Výdaje: jedna tabulka, vznikají z příjemek (trigger), z uzavřených mezd, z opakovaných výdajů (cron) a ručně.
create table if not exists recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null default 'najem',
  amount_czk numeric(12,2) not null check (amount_czk >= 0),
  day_of_month int not null default 1 check (day_of_month between 1 and 28),
  supplier text not null default '',
  note text not null default '',
  active boolean not null default true,
  last_generated_month text,
  created_at timestamptz not null default now()
);
create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  day date not null default (now() at time zone 'Europe/Prague')::date,
  category text not null default 'ostatni' check (category in ('zbozi', 'mzdy', 'odvody', 'najem', 'energie', 'sluzby', 'doprava', 'marketing', 'vybaveni', 'dane', 'ostatni')),
  description text not null,
  amount_czk numeric(12,2) not null check (amount_czk >= 0),
  supplier text not null default '',
  document_no text not null default '',
  source_type text not null default 'rucne' check (source_type in ('receipt', 'payroll', 'recurring', 'rucne')),
  source_id text,
  recurring_id uuid references recurring_expenses (id) on delete set null,
  due_on date,
  paid_at timestamptz,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create unique index if not exists expenses_source_idx on expenses (source_type, source_id) where source_id is not null;
create index if not exists expenses_day_idx on expenses (day desc);
create index if not exists expenses_unpaid_idx on expenses (due_on) where paid_at is null;
alter table expenses enable row level security;
alter table recurring_expenses enable row level security;
create policy "managers manage expenses" on expenses for all to authenticated using (is_manager()) with check (is_manager());
create policy "managers manage recurring expenses" on recurring_expenses for all to authenticated using (is_manager()) with check (is_manager());

-- Příjemka = výdaj za zboží (částka faktury, jinak součet položek). Zaplacení příjemky se propíše.
create or replace function expense_from_receipt()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into expenses (day, category, description, amount_czk, supplier, document_no, source_type, source_id, due_on, paid_at, created_by)
  values ((new.created_at at time zone 'Europe/Prague')::date, 'zbozi', 'Příjemka ' || new.number, coalesce(new.invoice_total_czk, new.total_czk), coalesce(new.supplier, ''), coalesce(new.doc_no, ''), 'receipt', new.id::text, new.due_on, new.paid_at, new.created_by)
  on conflict (source_type, source_id) where source_id is not null do update
    set amount_czk = excluded.amount_czk, supplier = excluded.supplier, document_no = excluded.document_no, due_on = excluded.due_on, paid_at = excluded.paid_at;
  return new;
end
$fn$;
create trigger stock_receipts_expense after insert or update on stock_receipts for each row execute function expense_from_receipt();
-- Starší příjemky doplnit.
insert into expenses (day, category, description, amount_czk, supplier, document_no, source_type, source_id, due_on, paid_at, created_by)
select (r.created_at at time zone 'Europe/Prague')::date, 'zbozi', 'Příjemka ' || r.number, coalesce(r.invoice_total_czk, r.total_czk), coalesce(r.supplier, ''), coalesce(r.doc_no, ''), 'receipt', r.id::text, r.due_on, r.paid_at, r.created_by
from stock_receipts r
on conflict (source_type, source_id) where source_id is not null do nothing;

-- 5) Denní cron financí: opakované výdaje za aktuální měsíc (v den splatnosti). Volá cron se secretem nebo správce.
create or replace function finance_daily(p_secret text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare r record; v_today date := (now() at time zone 'Europe/Prague')::date; v_month text := to_char(now() at time zone 'Europe/Prague', 'YYYY-MM'); v_created int := 0;
begin
  if not (is_manager() or (p_secret is not null and exists (select 1 from secrets where key = 'cron' and value = p_secret))) then
    raise exception 'forbidden';
  end if;
  for r in select * from recurring_expenses where active and extract(day from v_today) >= day_of_month and coalesce(last_generated_month, '') <> v_month loop
    insert into expenses (day, category, description, amount_czk, supplier, source_type, source_id, recurring_id, due_on, note)
    values (make_date(extract(year from v_today)::int, extract(month from v_today)::int, r.day_of_month), r.category, r.name, r.amount_czk, r.supplier, 'recurring', r.id::text || ':' || v_month, r.id, make_date(extract(year from v_today)::int, extract(month from v_today)::int, r.day_of_month), r.note)
    on conflict (source_type, source_id) where source_id is not null do nothing;
    update recurring_expenses set last_generated_month = v_month where id = r.id;
    v_created := v_created + 1;
  end loop;
  return jsonb_build_object('recurring_created', v_created);
end
$fn$;
revoke all on function finance_daily(text) from public;
grant execute on function finance_daily(text) to anon, authenticated, service_role;

-- 6) Měsíční souhrny pro Finance: tržby a náklady na zboží z kasy i webu, odpisy, výdaje po kategoriích.
create or replace view finance_months with (security_invoker = true) as
with months as (
  select to_char(created_at at time zone 'Europe/Prague', 'YYYY-MM') as month from pos_sales
  union select to_char(created_at at time zone 'Europe/Prague', 'YYYY-MM') from orders
  union select to_char(day, 'YYYY-MM') from expenses
  union select to_char(created_at at time zone 'Europe/Prague', 'YYYY-MM') from stock_movements where kind in ('odpis', 'interni')
),
pos as (
  select to_char(s.created_at at time zone 'Europe/Prague', 'YYYY-MM') as month, sum(s.total_czk) as revenue, count(*) as cnt,
         coalesce(sum((select sum(i.qty * coalesce(i.unit_cost_czk, 0)) from pos_sale_items i where i.sale_id = s.id)), 0) as cost
  from pos_sales s where s.status = 'zaplaceno' and s.order_id is null group by 1
),
web as (
  select to_char(o.created_at at time zone 'Europe/Prague', 'YYYY-MM') as month, sum(o.total_czk) as revenue, count(*) as cnt,
         coalesce(sum((select sum(i.qty * coalesce(i.unit_cost_czk, 0)) from order_items i where i.order_id = o.id)), 0) as cost,
         sum(case when o.paid_at is null and o.status <> 'zrusena' then o.total_czk else 0 end) as unpaid
  from orders o where o.status <> 'zrusena' group by 1
),
wo as (
  select to_char(m.created_at at time zone 'Europe/Prague', 'YYYY-MM') as month,
         sum(case when m.kind = 'odpis' then -m.qty * coalesce(m.unit_cost_czk, p.purchase_price_czk, 0) else 0 end) as writeoff,
         sum(case when m.kind = 'interni' then -m.qty * coalesce(m.unit_cost_czk, p.purchase_price_czk, 0) else 0 end) as internal
  from stock_movements m join products p on p.id = m.product_id where m.kind in ('odpis', 'interni') group by 1
),
ex as (
  select to_char(day, 'YYYY-MM') as month, category, sum(amount_czk) as amount, sum(case when paid_at is not null then amount_czk else 0 end) as paid
  from expenses group by 1, 2
)
select m.month,
       coalesce(pos.revenue, 0) as pos_revenue_czk, coalesce(pos.cnt, 0) as pos_count, coalesce(pos.cost, 0) as pos_cost_czk,
       coalesce(web.revenue, 0) as web_revenue_czk, coalesce(web.cnt, 0) as web_count, coalesce(web.cost, 0) as web_cost_czk, coalesce(web.unpaid, 0) as web_unpaid_czk,
       coalesce(wo.writeoff, 0) as writeoff_czk, coalesce(wo.internal, 0) as internal_czk,
       coalesce((select jsonb_object_agg(category, amount) from ex where ex.month = m.month), '{}'::jsonb) as expenses,
       coalesce((select sum(amount) from ex where ex.month = m.month), 0) as expenses_czk,
       coalesce((select sum(paid) from ex where ex.month = m.month), 0) as expenses_paid_czk
from months m
left join pos on pos.month = m.month
left join web on web.month = m.month
left join wo on wo.month = m.month
where m.month is not null;
