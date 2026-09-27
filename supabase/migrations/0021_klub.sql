-- Klub DoKosti: účet, karta, zvířata a souhlasy na jednom zákazníkovi. Registrace přes /registrace.

-- 1) Zákazník: vazba na účet, zdroj, souhlasy.
alter table customers add column user_id uuid unique references auth.users (id) on delete set null;
alter table customers add column source text not null default 'web';
alter table customers add column registered_at timestamptz;
alter table customers add column terms_accepted_at timestamptz;
alter table customers add column consent_marketing_email_at timestamptz;
alter table customers add column consent_marketing_sms_at timestamptz;
alter table customers add column heard_from text not null default '';
alter table customers add column welcome_points_at timestamptz;
comment on column customers.source is 'web, prodejna, admin';
update customers c set user_id = u.id from auth.users u where lower(u.email) = c.email and c.user_id is null;

create policy "customer reads own profile by user" on customers for select to authenticated using (user_id = auth.uid());
create policy "customer reads own loyalty by user" on loyalty_transactions for select to authenticated
  using (exists (select 1 from customers c where c.id = loyalty_transactions.customer_id and c.user_id = auth.uid()));
create policy "customer reads own orders by user" on orders for select to authenticated
  using (customer_id in (select id from customers where user_id = auth.uid()));
create policy "customer reads own order items by user" on order_items for select to authenticated
  using (exists (select 1 from orders o join customers c on c.id = o.customer_id where o.id = order_items.order_id and c.user_id = auth.uid()));

-- 2) Zvířata patří zákazníkovi, strukturovaně (kalkulačka dál používá `data`).
alter table pets alter column user_id drop not null;
alter table pets add column customer_id uuid references customers (id) on delete cascade;
alter table pets add column species text;
alter table pets add column breed text not null default '';
alter table pets add column born_on date;
alter table pets add column weight_kg numeric(6,2);
alter table pets add column neutered boolean;
alter table pets add column activity text;
alter table pets add column condition text;
alter table pets add column feeding_now text not null default '';
alter table pets add column current_food text not null default '';
alter table pets add column exclude text[] not null default '{}';
alter table pets add column note text not null default '';
alter table pets add column rewarded_at timestamptz;
create index pets_customer_idx on pets (customer_id);
update pets p set customer_id = c.id from customers c where c.user_id = p.user_id and p.customer_id is null;
update pets set
  species = coalesce(species, data->>'species'),
  weight_kg = coalesce(weight_kg, case when (data->>'weightKg') ~ '^[0-9.]+$' then (data->>'weightKg')::numeric end),
  neutered = coalesce(neutered, case when data->>'neutered' in ('true', 'false') then (data->>'neutered')::boolean end),
  activity = coalesce(activity, data->>'activity'),
  condition = coalesce(condition, data->>'condition');

drop policy "owner manages pets" on pets;
create policy "owner manages pets" on pets for all to authenticated
  using (user_id = auth.uid() or customer_id in (select id from customers where user_id = auth.uid()))
  with check (user_id = auth.uid() or customer_id in (select id from customers where user_id = auth.uid()));
create policy "admins manage pets" on pets for all to authenticated using (is_admin()) with check (is_admin());

-- 3) Doklad o souhlasech.
create table consent_log (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers (id) on delete cascade,
  kind text not null,
  granted boolean not null,
  source text not null default 'web',
  text_version text not null default '',
  created_at timestamptz not null default now()
);
create index consent_log_customer_idx on consent_log (customer_id);
alter table consent_log enable row level security;
create policy "admins read consents" on consent_log for select to authenticated using (is_admin());
create policy "customer reads own consents" on consent_log for select to authenticated
  using (customer_id in (select id from customers where user_id = auth.uid()));

-- 4) Rozpracovaná registrace: uloží se hned po signUp, dokončí se po prvním přihlášení (po potvrzení e-mailu).
create table club_registrations (
  user_id uuid primary key,
  data jsonb not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
alter table club_registrations enable row level security;

create or replace function club_register_pending(p_user_id uuid, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into club_registrations (user_id, data) values (p_user_id, p_data)
  on conflict (user_id) do update set data = excluded.data, created_at = now() where club_registrations.completed_at is null;
$$;
revoke all on function club_register_pending(uuid, jsonb) from public;
grant execute on function club_register_pending(uuid, jsonb) to anon, authenticated;

insert into settings (key, value) values ('club', '{"registrationPoints": 50, "petPoints": 150, "petPointsMax": 3, "termsVersion": "2026-09"}'::jsonb)
on conflict (key) do nothing;

-- 5) Odměna za vyplněný profil zvířete (jen úplný profil, nejvýš petPointsMax profilů na zákazníka).
create or replace function club_reward_pet(p_pet_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare p pets; c customers; v_club jsonb; v_points integer; v_max integer; v_done integer;
begin
  select * into p from pets where id = p_pet_id;
  if not found or p.rewarded_at is not null or p.customer_id is null then return 0; end if;
  select * into c from customers where id = p.customer_id;
  if not found or c.user_id is null or c.user_id <> auth.uid() then return 0; end if;
  if p.species is null or coalesce(p.name, '') = '' or coalesce(p.weight_kg, 0) <= 0 or p.born_on is null then return 0; end if;
  select value into v_club from settings where key = 'club';
  v_points := coalesce((v_club->>'petPoints')::integer, 150);
  v_max := coalesce((v_club->>'petPointsMax')::integer, 3);
  select count(*) into v_done from pets where customer_id = c.id and rewarded_at is not null;
  if v_points <= 0 or v_done >= v_max then return 0; end if;
  update pets set rewarded_at = now() where id = p.id;
  update customers set points = points + v_points where id = c.id;
  insert into loyalty_transactions (customer_id, points, reason) values (c.id, v_points, 'Profil zvířete: ' || p.name);
  return v_points;
end $$;
revoke all on function club_reward_pet(uuid) from public, anon;
grant execute on function club_reward_pet(uuid) to authenticated;

-- 6) Dokončení registrace přihlášeným uživatelem: spojí účet se zákazníkem (e-mail, karta, telefon),
-- uloží souhlasy, zvířata a připíše uvítací Kostičky. Bezpečné opakovat.
create or replace function club_complete_registration()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email'); r club_registrations; c customers;
  v_card text; v_phone text; v_name text; v_src text; v_ver text; v_club jsonb; v_awarded integer := 0; v_pet jsonb; v_pet_id uuid;
  v_mail boolean; v_sms boolean; v_found boolean := false;
begin
  if v_uid is null or v_email is null then raise exception 'not signed in'; end if;
  select * into r from club_registrations where user_id = v_uid and completed_at is null;
  if not found then return jsonb_build_object('done', false); end if;
  v_card := nullif(upper(trim(coalesce(r.data->>'card_code', ''))), '');
  v_phone := nullif(trim(coalesce(r.data->>'phone', '')), '');
  v_name := nullif(trim(coalesce(r.data->>'name', '')), '');
  v_src := coalesce(nullif(r.data->>'source', ''), 'web');
  v_ver := coalesce(r.data->>'terms_version', '');
  v_mail := coalesce((r.data->>'marketing_email')::boolean, false);
  v_sms := coalesce((r.data->>'marketing_sms')::boolean, false);

  select * into c from customers where user_id = v_uid; v_found := found;
  if not v_found then select * into c from customers where email = v_email; v_found := found; end if;
  if not v_found and v_card is not null then select * into c from customers where card_code = v_card; v_found := found; end if;
  if not v_found and v_phone is not null then
    select * into c from customers where phone = v_phone and email is null and user_id is null order by created_at limit 1; v_found := found;
  end if;
  if v_found then
    if c.user_id is not null and c.user_id <> v_uid then raise exception 'account conflict'; end if;
    if c.email is not null and c.email <> v_email then raise exception 'email conflict'; end if;
  end if;
  if v_card is not null and exists (select 1 from customers where card_code = v_card and (not v_found or id <> c.id)) then
    raise exception 'card conflict';
  end if;

  if v_found then
    update customers set
      user_id = v_uid, email = v_email,
      name = coalesce(v_name, name), phone = coalesce(v_phone, phone), card_code = coalesce(card_code, v_card),
      registered_at = coalesce(registered_at, now()), terms_accepted_at = now(),
      consent_marketing_email_at = case when v_mail then now() else null end,
      consent_marketing_sms_at = case when v_sms then now() else null end,
      heard_from = coalesce(nullif(r.data->>'heard_from', ''), heard_from)
    where id = c.id returning * into c;
  else
    insert into customers (email, user_id, name, phone, card_code, source, registered_at, terms_accepted_at, consent_marketing_email_at, consent_marketing_sms_at, heard_from)
    values (v_email, v_uid, coalesce(v_name, ''), coalesce(v_phone, ''), v_card, v_src, now(), now(),
      case when v_mail then now() end, case when v_sms then now() end, coalesce(r.data->>'heard_from', ''))
    returning * into c;
  end if;

  insert into consent_log (customer_id, kind, granted, source, text_version) values
    (c.id, 'terms', true, v_src, v_ver), (c.id, 'marketing_email', v_mail, v_src, v_ver), (c.id, 'marketing_sms', v_sms, v_src, v_ver);

  -- Zvířata z kalkulačky uložená před registrací.
  update pets set customer_id = c.id where user_id = v_uid and customer_id is null;

  select value into v_club from settings where key = 'club';
  if c.welcome_points_at is null and coalesce((v_club->>'registrationPoints')::integer, 50) > 0 then
    v_awarded := coalesce((v_club->>'registrationPoints')::integer, 50);
    update customers set points = points + v_awarded, welcome_points_at = now() where id = c.id;
    insert into loyalty_transactions (customer_id, points, reason) values (c.id, v_awarded, 'Vítejte v klubu DoKosti');
  end if;

  for v_pet in select * from jsonb_array_elements(coalesce(r.data->'pets', '[]'::jsonb)) loop
    insert into pets (user_id, customer_id, name, data, species, breed, born_on, weight_kg, neutered, activity, condition, feeding_now, current_food, exclude, note)
    values (v_uid, c.id, left(coalesce(v_pet->>'name', ''), 60), coalesce(v_pet->'data', '{}'::jsonb), v_pet->>'species', left(coalesce(v_pet->>'breed', ''), 80),
      nullif(v_pet->>'born_on', '')::date, nullif(v_pet->>'weight_kg', '')::numeric, (v_pet->>'neutered')::boolean, v_pet->>'activity', v_pet->>'condition',
      coalesce(v_pet->>'feeding_now', ''), left(coalesce(v_pet->>'current_food', ''), 120),
      coalesce((select array_agg(x) from jsonb_array_elements_text(coalesce(v_pet->'exclude', '[]'::jsonb)) x), '{}'), left(coalesce(v_pet->>'note', ''), 300))
    returning id into v_pet_id;
    v_awarded := v_awarded + club_reward_pet(v_pet_id);
  end loop;

  update club_registrations set completed_at = now() where user_id = v_uid;
  return jsonb_build_object('done', true, 'customer_id', c.id, 'awarded', v_awarded, 'name', c.name);
end $$;
revoke all on function club_complete_registration() from public, anon;
grant execute on function club_complete_registration() to authenticated;

-- 7) Úprava profilu v účtu (kontakt, adresa, souhlasy).
create or replace function club_update_profile(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare c customers; v_mail boolean; v_sms boolean;
begin
  select * into c from customers where user_id = auth.uid();
  if not found then raise exception 'no customer'; end if;
  v_mail := coalesce((p->>'marketing_email')::boolean, c.consent_marketing_email_at is not null);
  v_sms := coalesce((p->>'marketing_sms')::boolean, c.consent_marketing_sms_at is not null);
  update customers set
    name = coalesce(nullif(trim(p->>'name'), ''), name),
    phone = coalesce(trim(p->>'phone'), phone),
    street = coalesce(trim(p->>'street'), street), city = coalesce(trim(p->>'city'), city), zip = coalesce(trim(p->>'zip'), zip),
    consent_marketing_email_at = case when v_mail then coalesce(consent_marketing_email_at, now()) else null end,
    consent_marketing_sms_at = case when v_sms then coalesce(consent_marketing_sms_at, now()) else null end,
    updated_at = now()
  where id = c.id;
  if v_mail <> (c.consent_marketing_email_at is not null) then insert into consent_log (customer_id, kind, granted, source) values (c.id, 'marketing_email', v_mail, 'ucet'); end if;
  if v_sms <> (c.consent_marketing_sms_at is not null) then insert into consent_log (customer_id, kind, granted, source) values (c.id, 'marketing_sms', v_sms, 'ucet'); end if;
end $$;
revoke all on function club_update_profile(jsonb) from public, anon;
grant execute on function club_update_profile(jsonb) to authenticated;

-- 8) Zákazník založený u kasy má zdroj „prodejna“.
create or replace function pos_assign_card(p_code text, p_customer_id uuid default null, p_name text default null, p_phone text default null, p_email text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text := upper(trim(p_code));
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if length(v_code) < 4 then raise exception 'bad code'; end if;
  if exists (select 1 from customers where card_code = v_code) then raise exception 'card taken'; end if;
  if p_customer_id is not null then
    update customers set card_code = v_code where id = p_customer_id returning id into v_id;
  else
    if coalesce(trim(p_name), '') = '' then raise exception 'name required'; end if;
    if nullif(lower(trim(p_email)), '') is not null and exists (select 1 from customers where email = lower(trim(p_email))) then
      update customers set card_code = v_code, name = case when name = '' then trim(p_name) else name end, phone = case when phone = '' then coalesce(trim(p_phone), '') else phone end
      where email = lower(trim(p_email)) returning id into v_id;
    else
      insert into customers (email, name, phone, card_code, source) values (nullif(lower(trim(p_email)), ''), trim(p_name), coalesce(trim(p_phone), ''), v_code, 'prodejna') returning id into v_id;
    end if;
  end if;
  return v_id;
end $$;
