-- Opakované výdaje podporují týdenní i měsíční plán. next_due_on je zdroj pravdy
-- pro další splatnost a dovoluje dennímu cron úkolu bezpečně dohnat vynechané běhy.
alter table recurring_expenses
  add column frequency text not null default 'monthly',
  add column day_of_week smallint,
  add column next_due_on date;

alter table recurring_expenses
  add constraint recurring_expenses_frequency_check check (frequency in ('weekly', 'monthly')),
  add constraint recurring_expenses_day_of_week_check check (day_of_week is null or day_of_week between 0 and 6),
  add constraint recurring_expenses_weekday_required check (frequency <> 'weekly' or day_of_week is not null);

-- Dosavadní pravidla byla měsíční. Jestli už se tento měsíc vytvořil výdaj,
-- další termín nastavíme na následující měsíc, aby se nevytvořil podruhé.
update recurring_expenses
set next_due_on = case
  when last_generated_month is not null then
    (to_date(last_generated_month || '-01', 'YYYY-MM-DD') + interval '1 month' + (day_of_month - 1) * interval '1 day')::date
  when day_of_month >= extract(day from (now() at time zone 'Europe/Prague'))::int then
    make_date(extract(year from (now() at time zone 'Europe/Prague'))::int, extract(month from (now() at time zone 'Europe/Prague'))::int, day_of_month)
  else
    (make_date(extract(year from (now() at time zone 'Europe/Prague'))::int, extract(month from (now() at time zone 'Europe/Prague'))::int, 1) + interval '1 month' + (day_of_month - 1) * interval '1 day')::date
end;

alter table recurring_expenses alter column next_due_on set not null;
create index recurring_expenses_due_idx on recurring_expenses (next_due_on) where active;

comment on column recurring_expenses.frequency is 'weekly nebo monthly';
comment on column recurring_expenses.day_of_week is 'Den v týdnu 0=neděle až 6=sobota, jen pro týdenní pravidla';
comment on column recurring_expenses.next_due_on is 'Nejbližší datum, kdy denní finance cron vytvoří výdaj';

-- Zachováme dosavadní měsíční identifikátor zdrojových výdajů. Týdenní položky
-- dostanou vlastní identifikátor podle konkrétního dne.
create or replace function finance_daily(p_secret text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  r record;
  v_today date := (now() at time zone 'Europe/Prague')::date;
  v_due date;
  v_last_due date;
  v_source_id text;
  v_created int := 0;
  v_inserted int;
begin
  if not (is_manager() or (p_secret is not null and exists (select 1 from secrets where key = 'cron' and value = p_secret))) then
    raise exception 'forbidden';
  end if;

  for r in
    select * from recurring_expenses
    where active and next_due_on <= v_today
    order by next_due_on
  loop
    v_due := r.next_due_on;
    v_last_due := null;

    while v_due <= v_today loop
      v_source_id := r.id::text || ':' || case
        when r.frequency = 'weekly' then to_char(v_due, 'YYYY-MM-DD')
        else to_char(v_due, 'YYYY-MM')
      end;

      insert into expenses (day, category, description, amount_czk, supplier, source_type, source_id, recurring_id, due_on, note)
      values (v_due, r.category, r.name, r.amount_czk, r.supplier, 'recurring', v_source_id, r.id, v_due, r.note)
      on conflict (source_type, source_id) where source_id is not null do nothing;

      get diagnostics v_inserted = row_count;
      v_created := v_created + v_inserted;
      v_last_due := v_due;
      v_due := case when r.frequency = 'weekly' then v_due + 7 else (v_due + interval '1 month')::date end;
    end loop;

    update recurring_expenses
    set next_due_on = v_due,
        last_generated_month = to_char(v_last_due, 'YYYY-MM')
    where id = r.id;
  end loop;

  return jsonb_build_object('recurring_created', v_created);
end
$fn$;
