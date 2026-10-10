-- Provoz: zaměstnanci, docházka (ze směn v kase + ručně), dokumenty a smlouvy (soukromý bucket, verze, podpisy),
-- zařízení a teplotní deník, checklisty, denní úkoly z platností dokumentů.

-- 1) Zaměstnanci. Vazba na přihlášení (admins.user_id) je volitelná: brigádník bez přístupu do systému může existovat.
create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users (id) on delete set null,
  name text not null,
  position text not null default '',
  contract_type text not null default 'dpp' check (contract_type in ('hpp', 'dpp', 'dpc', 'jednatel', 'osvc')),
  hourly_rate_czk numeric(10,2),
  monthly_salary_czk numeric(10,2),
  weekly_hours numeric(5,2),
  started_on date,
  ended_on date,
  phone text not null default '',
  email text not null default '',
  birth_date date,
  address text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);
alter table employees enable row level security;
create policy "managers manage employees" on employees for all to authenticated using (is_manager()) with check (is_manager());
create policy "employee reads self" on employees for select to authenticated using (user_id = auth.uid());

-- 2) Docházka: jeden řádek = jeden blok práce (nebo dovolená, nemoc, svátek). Ze směny v kase vzniká sama.
create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees (id) on delete set null,
  user_id uuid references auth.users (id) on delete set null,
  day date not null,
  started_at timestamptz,
  ended_at timestamptz,
  -- hodiny: u práce z času (minus pauza), u dovolené/nemoci zadané ručně
  hours numeric(5,2),
  break_minutes int not null default 0,
  kind text not null default 'prace' check (kind in ('prace', 'dovolena', 'nemoc', 'svatek', 'volno', 'jine')),
  source text not null default 'rucne' check (source in ('kasa', 'rucne')),
  shift_id uuid unique references pos_shifts (id) on delete set null,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists attendance_day_idx on attendance (day desc);
create index if not exists attendance_employee_idx on attendance (employee_id, day desc);
alter table attendance enable row level security;
create policy "managers manage attendance" on attendance for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff reads own attendance" on attendance for select to authenticated using (user_id = auth.uid());
create policy "staff adds own attendance" on attendance for insert to authenticated with check (is_admin() and user_id = auth.uid() and source = 'rucne');

-- Hodiny z času: (konec − začátek) − pauza, na čtvrthodiny.
create or replace function attendance_hours()
returns trigger language plpgsql as $fn$
begin
  if new.started_at is not null and new.ended_at is not null then
    new.hours := round((greatest(extract(epoch from (new.ended_at - new.started_at)) / 3600 - new.break_minutes / 60.0, 0))::numeric * 4) / 4;
  end if;
  return new;
end
$fn$;
create trigger attendance_hours_trg before insert or update on attendance for each row execute function attendance_hours();

-- Směna v kase → docházka: otevření vytvoří blok, uzávěrka ho zavře (pauza 30 minut nad 6 hodin).
create or replace function attendance_from_shift()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare v_emp uuid; v_break int;
begin
  if tg_op = 'INSERT' then
    select id into v_emp from employees where user_id = new.opened_by;
    insert into attendance (employee_id, user_id, day, started_at, kind, source, shift_id, created_by)
    values (v_emp, new.opened_by, (new.opened_at at time zone 'Europe/Prague')::date, new.opened_at, 'prace', 'kasa', new.id, new.opened_by)
    on conflict (shift_id) do nothing;
  elsif new.closed_at is not null and (old.closed_at is null or old.closed_at <> new.closed_at) then
    v_break := case when extract(epoch from (new.closed_at - new.opened_at)) / 3600 > 6 then 30 else 0 end;
    update attendance set ended_at = new.closed_at, break_minutes = v_break where shift_id = new.id;
  end if;
  return new;
end
$fn$;
create trigger pos_shifts_attendance after insert or update of closed_at on pos_shifts for each row execute function attendance_from_shift();

-- 3) Dokumenty: metadata v tabulce, soubory v soukromém bucketu `dokumenty` (verze), podpisy k verzi.
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'ostatni' check (category in ('smlouvy', 'zamestnanci', 'faktury', 'najem', 'revize', 'haccp', 'urady', 'ostatni')),
  -- k čemu se váže: employee, supplier, receipt, order, device, firma
  linked_type text,
  linked_id text,
  valid_from date,
  valid_to date,
  remind_days int not null default 30,
  note text not null default '',
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists documents_valid_idx on documents (valid_to) where archived_at is null;
create index if not exists documents_link_idx on documents (linked_type, linked_id);
create table if not exists document_versions (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references documents (id) on delete cascade,
  version int not null,
  storage_path text not null,
  file_name text not null,
  mime text not null default '',
  size_bytes bigint not null default 0,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (document_id, version)
);
create table if not exists document_signatures (
  id uuid primary key default gen_random_uuid(),
  version_id uuid not null references document_versions (id) on delete cascade,
  signer_name text not null,
  signer_user uuid references auth.users (id) on delete set null,
  method text not null default 'tablet' check (method in ('tablet', 'sken', 'externi')),
  signature_path text,
  signed_at timestamptz not null default now(),
  user_agent text not null default ''
);
alter table documents enable row level security;
alter table document_versions enable row level security;
alter table document_signatures enable row level security;
create policy "managers manage documents" on documents for all to authenticated using (is_manager()) with check (is_manager());
create policy "employee reads own documents" on documents for select to authenticated
  using (linked_type = 'employee' and exists (select 1 from employees e where e.id::text = documents.linked_id and e.user_id = auth.uid()));
create policy "managers manage versions" on document_versions for all to authenticated using (is_manager()) with check (is_manager());
create policy "employee reads own versions" on document_versions for select to authenticated
  using (exists (select 1 from documents d join employees e on e.id::text = d.linked_id where d.id = document_versions.document_id and d.linked_type = 'employee' and e.user_id = auth.uid()));
create policy "managers manage signatures" on document_signatures for all to authenticated using (is_manager()) with check (is_manager());
create policy "employee signs own" on document_signatures for insert to authenticated
  with check (signer_user = auth.uid() and exists (select 1 from document_versions v join documents d on d.id = v.document_id join employees e on e.id::text = d.linked_id where v.id = document_signatures.version_id and d.linked_type = 'employee' and e.user_id = auth.uid()));
create policy "employee reads own signatures" on document_signatures for select to authenticated
  using (exists (select 1 from document_versions v join documents d on d.id = v.document_id join employees e on e.id::text = d.linked_id where v.id = document_signatures.version_id and d.linked_type = 'employee' and e.user_id = auth.uid()));

insert into storage.buckets (id, name, public, file_size_limit)
values ('dokumenty', 'dokumenty', false, 26214400)
on conflict (id) do nothing;
create policy "managers read dokumenty" on storage.objects for select to authenticated using (bucket_id = 'dokumenty' and is_manager());
create policy "managers write dokumenty" on storage.objects for insert to authenticated with check (bucket_id = 'dokumenty' and is_manager());
create policy "managers update dokumenty" on storage.objects for update to authenticated using (bucket_id = 'dokumenty' and is_manager());
-- podpis na tabletu ukládá i obsluha (jen do složky podpisy)
create policy "staff write signatures" on storage.objects for insert to authenticated with check (bucket_id = 'dokumenty' and is_admin() and name like 'podpisy/%');
-- zaměstnanec si stáhne vlastní smlouvu (a svůj podpis), nic jiného
create policy "employee reads own dokumenty files" on storage.objects for select to authenticated
  using (bucket_id = 'dokumenty' and (
    exists (select 1 from document_versions v join documents d on d.id = v.document_id join employees e on e.id::text = d.linked_id where v.storage_path = storage.objects.name and d.linked_type = 'employee' and e.user_id = auth.uid())
    or exists (select 1 from document_signatures s join document_versions v on v.id = s.version_id join documents d on d.id = v.document_id join employees e on e.id::text = d.linked_id where s.signature_path = storage.objects.name and d.linked_type = 'employee' and e.user_id = auth.uid())
  ));

-- 4) Zařízení a teplotní deník (HACCP): zapisuje kdokoli z týmu, mimo rozsah se označí.
create table if not exists devices (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text not null default 'mrazak' check (kind in ('mrazak', 'chladnicka', 'jine')),
  min_c numeric(5,1) not null default -25,
  max_c numeric(5,1) not null default -18,
  active boolean not null default true,
  sort_order int not null default 0
);
create table if not exists temperature_log (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices (id) on delete cascade,
  measured_at timestamptz not null default now(),
  value_c numeric(5,1) not null,
  ok boolean not null default true,
  note text not null default '',
  created_by uuid references auth.users (id) on delete set null,
  created_by_name text not null default ''
);
create index if not exists temperature_log_idx on temperature_log (device_id, measured_at desc);
alter table devices enable row level security;
alter table temperature_log enable row level security;
create policy "managers manage devices" on devices for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff reads devices" on devices for select to authenticated using (is_admin());
create policy "staff logs temperature" on temperature_log for all to authenticated using (is_admin()) with check (is_admin());

-- 5) Checklisty: šablona (položky) a její splnění za období (den, týden, měsíc, nebo zaškolení zaměstnance).
create table if not exists checklists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  period text not null default 'denne' check (period in ('denne', 'tydne', 'mesicne', 'nastup')),
  items jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  sort_order int not null default 0
);
create table if not exists checklist_runs (
  id uuid primary key default gen_random_uuid(),
  checklist_id uuid not null references checklists (id) on delete cascade,
  period_key text not null,
  done jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (checklist_id, period_key)
);
alter table checklists enable row level security;
alter table checklist_runs enable row level security;
create policy "managers manage checklists" on checklists for all to authenticated using (is_manager()) with check (is_manager());
create policy "staff reads checklists" on checklists for select to authenticated using (is_admin());
create policy "staff manages runs" on checklist_runs for all to authenticated using (is_admin()) with check (is_admin());

insert into checklists (name, period, items, sort_order)
select * from (values
  ('Otevření prodejny', 'denne', '[{"id":"teploty","text":"Zapsat teploty mrazáků a chladniček"},{"id":"hotovost","text":"Zkontrolovat hotovost v kase a otevřít směnu"},{"id":"expirace","text":"Projít šarže s expirací do 14 dnů"},{"id":"pult","text":"Sanitace pultu, vah a čtečky"}]'::jsonb, 1),
  ('Zavření prodejny', 'denne', '[{"id":"teploty","text":"Zapsat večerní teploty"},{"id":"uzaverka","text":"Uzávěrka směny a vzkaz pro další"},{"id":"zbozi","text":"Rozpracované zboží zpět do mrazáku"},{"id":"odpad","text":"Odpad a vedlejší živočišné produkty"},{"id":"zamek","text":"Zamknout, alarm, zhasnout"}]'::jsonb, 2),
  ('Týdenní úklid', 'tydne', '[{"id":"mrazak","text":"Odmrazit a umýt jeden mrazák (střídat)"},{"id":"prepravky","text":"Umýt přepravky z rozvozu"},{"id":"podlaha","text":"Podlaha a regály"},{"id":"lednice","text":"Chladnička na chlazené: vymýt"}]'::jsonb, 3),
  ('Měsíční kontrola', 'mesicne', '[{"id":"deratizace","text":"Kontrola pastí a deratizace"},{"id":"suche","text":"Expirace suchého zboží a granulí"},{"id":"lekarnicka","text":"Lékárnička a hasicí přístroje"},{"id":"dokumenty","text":"Projít dokumenty s blížícím se koncem platnosti"}]'::jsonb, 4),
  ('Zaškolení nového člověka', 'nastup', '[{"id":"kasa","text":"Kasa: prodej, výdej objednávky, storno"},{"id":"prijem","text":"Příjem zboží a šarže"},{"id":"denik","text":"Zápis teplot a provozní deník"},{"id":"hygiena","text":"Hygiena při práci se syrovým masem"},{"id":"reklamace","text":"Reklamace a vratky"},{"id":"poradna","text":"Poradna: na co odpovídat a kdy odkázat na veterináře"}]'::jsonb, 5)
) as v(name, period, items, sort_order)
where not exists (select 1 from checklists);

-- 6) Denní úkoly z platností dokumentů (volá cron se secretem, nebo správce bez něj).
create or replace function provoz_daily(p_secret text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare d record; v_tasks int := 0; v_today date := (now() at time zone 'Europe/Prague')::date;
begin
  if not (is_manager() or (p_secret is not null and exists (select 1 from secrets where key = 'cron' and value = p_secret))) then
    raise exception 'forbidden';
  end if;
  for d in select * from documents where archived_at is null and valid_to is not null and valid_to - remind_days <= v_today loop
    if not exists (select 1 from tasks where auto_key = 'doc-expiry:' || d.id) then
      insert into tasks (kind, auto_key, title, detail, href, due_on, source_type, source_id)
      values ('auto', 'doc-expiry:' || d.id, 'Končí platnost: ' || d.title, 'platí do ' || to_char(d.valid_to, 'DD.MM.YYYY'), '/admin/dokumenty/' || d.id, d.valid_to, 'document', d.id::text);
      v_tasks := v_tasks + 1;
    end if;
  end loop;
  return jsonb_build_object('tasks', v_tasks);
end
$fn$;
revoke all on function provoz_daily(text) from public;
grant execute on function provoz_daily(text) to anon, authenticated, service_role;
