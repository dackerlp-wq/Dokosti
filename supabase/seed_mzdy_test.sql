-- Testovací záznamy pro výplatní pásky: Barbora Balážová (DPP, 180 Kč/h, prohlášení poplatníka),
-- docházka za říjen a listopad 2026 a podklady mezd (říjen uzavřený, listopad otevřený).
-- Částky spočítala computePayroll() ze src/lib/payroll.ts s parametry roku 2026 z migrace 0030
-- (říjen: 65 h práce + dovolená 8 h + svátek 8 h + odměna 500 Kč; listopad: 36 h + nemoc 6 h, u DPP neplacená). Lze spustit opakovaně.
-- Je to testovací sada, ne skutečné mzdy; před ostrým provozem záznamy smažte nebo přepočítejte.
do $$
declare
  v_emp uuid;
  v_closed timestamptz := now();
begin
  select id into v_emp from employees where name = 'Barbora Balážová' limit 1;
  if v_emp is null then
    insert into employees (name, position, contract_type, hourly_rate_czk, started_on, tax_declaration, bank_account, note)
    values ('Barbora Balážová', 'Prodavačka', 'dpp', 180, '2026-10-10', true, '123456789/0300', 'Testovací záznam pro výplatní pásky.')
    returning id into v_emp;
  else
    update employees
    set position = coalesce(nullif(position, ''), 'Prodavačka'),
        hourly_rate_czk = coalesce(hourly_rate_czk, 180),
        tax_declaration = true,
        bank_account = coalesce(nullif(bank_account, ''), '123456789/0300'),
        started_on = coalesce(started_on, '2026-10-10')
    where id = v_emp;
  end if;

  -- Docházka: testovací řádky se vloží znovu (poznávají se podle poznámky), ostatní zůstanou.
  delete from attendance where employee_id = v_emp and note = 'Testovací záznam';
  insert into attendance (employee_id, day, started_at, ended_at, break_minutes, hours, kind, source, note)
  select v_emp, d::date, (d || ' 08:00+02')::timestamptz, (d || ' 16:30+02')::timestamptz, 30, null, 'prace', 'rucne', 'Testovací záznam'
  from unnest(array['2026-10-12', '2026-10-14', '2026-10-16', '2026-10-19', '2026-10-21', '2026-10-23', '2026-10-26']) as d;
  insert into attendance (employee_id, day, started_at, ended_at, break_minutes, hours, kind, source, note)
  values (v_emp, '2026-10-28', null, null, 0, 8, 'svatek', 'rucne', 'Testovací záznam'),
         (v_emp, '2026-10-30', null, null, 0, 8, 'dovolena', 'rucne', 'Testovací záznam'),
         (v_emp, '2026-11-10', null, null, 0, 6, 'nemoc', 'rucne', 'Testovací záznam');
  -- 29. 10.: 9 h, jen pokud ten den ještě žádný záznam není (v databázi už ručně zapsaný bývá)
  insert into attendance (employee_id, day, started_at, ended_at, break_minutes, hours, kind, source, note)
  select v_emp, '2026-10-29', '2026-10-29 09:00+01', '2026-10-29 18:00+01', 0, null, 'prace', 'rucne', 'Testovací záznam'
  where not exists (select 1 from attendance where employee_id = v_emp and day = '2026-10-29');
  insert into attendance (employee_id, day, started_at, ended_at, break_minutes, hours, kind, source, note)
  select v_emp, d::date, (d || ' 09:00+01')::timestamptz, (d || ' 15:00+01')::timestamptz, 0, null, 'prace', 'rucne', 'Testovací záznam'
  from unnest(array['2026-11-02', '2026-11-04', '2026-11-06', '2026-11-09', '2026-11-11', '2026-11-13']) as d;

  -- Mzdové měsíce: říjen uzavřený (pásky se generují po uzavření), listopad otevřený.
  insert into payroll_months (month) values ('2026-10'), ('2026-11') on conflict (month) do nothing;
  update payroll_months set status = 'uzavreny', closed_at = coalesce(closed_at, v_closed), note = 'Testovací uzavření pro výplatní pásky.' where month = '2026-10';

  insert into payroll_items (month, employee_id, employee_name, contract_type, hours_work, hours_vacation, hours_sick, hours_holiday, hourly_rate_czk, monthly_salary_czk, bonus_czk, deduction_czk, gross_czk, emp_levies_czk, tax_czk, net_czk, er_levies_czk, employer_cost_czk, breakdown, note, updated_at)
  values
    ('2026-10', v_emp, 'Barbora Balážová', 'dpp', 65, 8, 0, 8, 180, null, 500, 0, 15080, 1750, 0, 13330, 5098, 20178,
     '[{"label":"Odpracováno 65 h × 180 Kč","amount":11700,"kind":"base"},{"label":"Dovolená 8 h","amount":1440,"kind":"plus"},{"label":"Svátek 8 h","amount":1440,"kind":"plus"},{"label":"Odměna / příplatek","amount":500,"kind":"plus"},{"label":"Hrubá mzda","amount":15080,"kind":"base"},{"label":"Sociální pojištění 7.1 %","amount":-1071,"kind":"minus"},{"label":"Zdravotní pojištění 4.5 %","amount":-679,"kind":"minus"},{"label":"Záloha na daň 15 % ze 15 100 Kč","amount":-2265,"kind":"minus"},{"label":"Sleva na poplatníka","amount":2265,"kind":"plus"},{"label":"Čistá mzda k výplatě","amount":13330,"kind":"base"},{"label":"Odvody zaměstnavatele 33.8 %","amount":5098,"kind":"info"},{"label":"Celkové náklady zaměstnavatele","amount":20178,"kind":"info"}]'::jsonb,
     'Odměna za zaškolení v prodejně (testovací záznam).', v_closed - interval '1 hour'),
    ('2026-11', v_emp, 'Barbora Balážová', 'dpp', 36, 0, 6, 0, 180, null, 0, 0, 6480, 0, 0, 6480, 0, 6480,
     '[{"label":"Odpracováno 36 h × 180 Kč","amount":6480,"kind":"base"},{"label":"Hrubá mzda","amount":6480,"kind":"base"},{"label":"Bez odvodů (DPP pod 12 500 Kč)","amount":0,"kind":"info"},{"label":"Záloha na daň 15 % ze 6 500 Kč","amount":-975,"kind":"minus"},{"label":"Sleva na poplatníka","amount":975,"kind":"plus"},{"label":"Čistá mzda k výplatě","amount":6480,"kind":"base"},{"label":"Celkové náklady zaměstnavatele","amount":6480,"kind":"info"}]'::jsonb,
     '', now())
  on conflict (month, employee_id) do update set
    employee_name = excluded.employee_name, contract_type = excluded.contract_type, hours_work = excluded.hours_work, hours_vacation = excluded.hours_vacation,
    hours_sick = excluded.hours_sick, hours_holiday = excluded.hours_holiday, hourly_rate_czk = excluded.hourly_rate_czk, monthly_salary_czk = excluded.monthly_salary_czk,
    bonus_czk = excluded.bonus_czk, deduction_czk = excluded.deduction_czk, gross_czk = excluded.gross_czk, emp_levies_czk = excluded.emp_levies_czk, tax_czk = excluded.tax_czk,
    net_czk = excluded.net_czk, er_levies_czk = excluded.er_levies_czk, employer_cost_czk = excluded.employer_cost_czk, breakdown = excluded.breakdown, note = excluded.note, updated_at = excluded.updated_at;

  -- Výdaje za uzavřený říjen, jako je zapisuje uzavření měsíce (hrubé mzdy a odvody zaměstnavatele).
  insert into expenses (day, category, description, amount_czk, source_type, source_id, due_on, note)
  select '2026-10-31', 'mzdy', 'Mzdy říjen 2026', 15080, 'payroll', '2026-10:mzdy', '2026-11-15', '1 lidí, hrubé mzdy (testovací záznam)'
  where not exists (select 1 from expenses where source_type = 'payroll' and source_id = '2026-10:mzdy');
  insert into expenses (day, category, description, amount_czk, source_type, source_id, due_on, note)
  select '2026-10-31', 'odvody', 'Odvody zaměstnavatele říjen 2026', 5098, 'payroll', '2026-10:odvody', '2026-11-15', 'Sociální a zdravotní pojištění za zaměstnavatele (testovací záznam)'
  where not exists (select 1 from expenses where source_type = 'payroll' and source_id = '2026-10:odvody');
  update expenses set amount_czk = 15080 where source_type = 'payroll' and source_id = '2026-10:mzdy' and note like '%testovací záznam%';
  update expenses set amount_czk = 5098 where source_type = 'payroll' and source_id = '2026-10:odvody' and note like '%testovací záznam%';
end $$;
