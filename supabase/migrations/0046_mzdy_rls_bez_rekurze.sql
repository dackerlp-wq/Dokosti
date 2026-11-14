-- Oprava RLS u mezd: pravidla „employee reads own closed payroll“ (payroll_items → payroll_months)
-- a „employee reads closed months“ (payroll_months → payroll_items) se odkazovala navzájem, Postgres
-- hlásil „infinite recursion detected in policy“ a každý SELECT z obou tabulek padal, i správci.
-- Podmínky teď počítají pomocné funkce (security definer, bez RLS), pravidla se už nekříží.
create or replace function payroll_month_closed(p_month text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from payroll_months where month = p_month and status = 'uzavreny');
$$;
create or replace function payroll_month_has_me(p_month text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from payroll_items i join employees e on e.id = i.employee_id
    where i.month = p_month and e.user_id = auth.uid()
  );
$$;
revoke all on function payroll_month_closed(text) from public;
revoke all on function payroll_month_has_me(text) from public;
grant execute on function payroll_month_closed(text) to authenticated;
grant execute on function payroll_month_has_me(text) to authenticated;

drop policy if exists "employee reads own closed payroll" on payroll_items;
create policy "employee reads own closed payroll" on payroll_items for select to authenticated
  using (payroll_month_closed(month) and exists (select 1 from employees e where e.id = payroll_items.employee_id and e.user_id = auth.uid()));
drop policy if exists "employee reads closed months" on payroll_months;
create policy "employee reads closed months" on payroll_months for select to authenticated
  using (status = 'uzavreny' and payroll_month_has_me(month));
