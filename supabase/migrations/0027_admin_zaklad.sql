-- Základ interního systému: deník změn, úkoly, jména správců, role brigáda, správa uživatelů.

-- 1) Správci: jméno pro deník a docházku, třetí role „brigáda“ (jen kasa a deník).
alter table admins add column if not exists name text not null default '';
alter table admins drop constraint if exists admins_role_check;
alter table admins add constraint admins_role_check check (role in ('spravce', 'obsluha', 'brigada'));

-- Vlastní jméno si nastaví každý sám (přes RPC, aby obsluha nemohla měnit roli).
create or replace function admin_set_name(p_name text)
returns void language sql security definer set search_path = public as $$
  update admins set name = left(trim(coalesce(p_name, '')), 60) where user_id = auth.uid();
$$;
revoke all on function admin_set_name(text) from public, anon;
grant execute on function admin_set_name(text) to authenticated;

-- Seznam uživatelů administrace s e-mailem z auth.users (jen správce).
create or replace function admin_list()
returns table (user_id uuid, email text, name text, role text, created_at timestamptz, last_sign_in_at timestamptz)
language sql security definer set search_path = public as $$
  select a.user_id, u.email::text, a.name, a.role, a.created_at, u.last_sign_in_at
  from admins a join auth.users u on u.id = a.user_id
  where is_manager() and a.removed_at is null
  order by a.created_at;
$$;
revoke all on function admin_list() from public, anon;
grant execute on function admin_list() to authenticated;

-- Změna role (jen správce, ne sám sobě, aby nezůstal admin bez správce).
create or replace function admin_set_role(p_user_id uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'not manager'; end if;
  if p_user_id = auth.uid() then raise exception 'own role'; end if;
  if p_role not in ('spravce', 'obsluha', 'brigada') then raise exception 'bad role'; end if;
  update admins set role = p_role where user_id = p_user_id;
end $$;
revoke all on function admin_set_role(uuid, text) from public, anon;
grant execute on function admin_set_role(uuid, text) to authenticated;

-- Odebrání přístupu (jen správce, ne sám sobě): řádek zůstane kvůli historii, jen dostane removed_at.
-- is_admin / is_manager / admin_role odebrané ignorují.
alter table admins add column if not exists removed_at timestamptz;
create or replace function is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and removed_at is null);
$$;
create or replace function is_manager()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from admins where user_id = auth.uid() and role = 'spravce' and removed_at is null);
$$;
create or replace function admin_role()
returns text language sql stable security definer set search_path = public as $$
  select role from admins where user_id = auth.uid() and removed_at is null;
$$;
create or replace function admin_remove(p_user_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_manager() then raise exception 'not manager'; end if;
  if p_user_id = auth.uid() then raise exception 'own role'; end if;
  update admins set removed_at = now() where user_id = p_user_id;
end $$;
revoke all on function admin_remove(uuid) from public, anon;
grant execute on function admin_remove(uuid) to authenticated;

-- 2) Deník změn: kdo, kdy, co, u čeho. Zapisují všechny akce v adminu, čtou ho detaily a Dnes.
create table activity_log (
  id bigserial primary key,
  actor uuid references auth.users (id) on delete set null,
  actor_name text not null default '',
  -- druh události, např. objednavka.stav, sklad.odpis, produkt.ulozen, nastaveni.ulozeno
  kind text not null,
  -- k čemu se váže: order, product, customer, receipt, coupon, settings, card, inquiry, task, shift, sale
  subject_type text not null,
  subject_id text not null default '',
  text text not null,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index activity_log_subject_idx on activity_log (subject_type, subject_id, created_at desc);
create index activity_log_created_idx on activity_log (created_at desc);
alter table activity_log enable row level security;
create policy "admins read activity" on activity_log for select to authenticated using (is_admin());
create policy "admins write activity" on activity_log for insert to authenticated with check (is_admin() and actor = auth.uid());

-- 3) Úkoly: ruční i automatické (auto_key zajistí, že automatický úkol vznikne jen jednou).
create table tasks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  detail text not null default '',
  kind text not null default 'rucni' check (kind in ('rucni', 'auto')),
  auto_key text unique,
  source_type text,
  source_id text,
  href text,
  due_on date,
  assigned_to uuid references auth.users (id) on delete set null,
  created_by uuid references auth.users (id) on delete set null,
  done_at timestamptz,
  done_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);
create index tasks_open_idx on tasks (due_on) where done_at is null;
alter table tasks enable row level security;
create policy "admins manage tasks" on tasks for all to authenticated using (is_admin()) with check (is_admin());

-- 4) Interní poznámka k objednávce (zákazník ji nevidí).
alter table orders add column if not exists internal_note text not null default '';
