-- Věrnostní karty: předtištěné dávky, stav karty, aktivace z QR, jednokroková registrace s kódem z e-mailu.
-- Viz docs/KARTY.md.

-- 1) Kód karty: DK + 5 znaků z abecedy bez zaměnitelných písmen + kontrolní znak.
create or replace function card_alphabet() returns text language sql immutable as $$ select 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' $$;

create or replace function card_check_char(p_body text)
returns text language plpgsql immutable as $$
declare v_sum integer := 0; v_alpha text := card_alphabet(); i integer; v_pos integer;
begin
  for i in 1..length(p_body) loop
    v_pos := position(substr(p_body, i, 1) in v_alpha);
    if v_pos = 0 then return null; end if;
    v_sum := v_sum + (v_pos - 1) * i;
  end loop;
  return substr(v_alpha, (v_sum % 32) + 1, 1);
end $$;

/** Vypadá jako předtištěná karta a sedí kontrolní znak. Ručně zadané starší kódy tímhle neprocházejí, ale platí dál. */
create or replace function card_code_valid(p_code text)
returns boolean language sql immutable as $$
  select p_code ~ '^DK[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{6}$' and card_check_char(substr(p_code, 3, 5)) = substr(p_code, 8, 1)
$$;

-- 2) Tabulka karet. Stav se drží v souladu s customers.card_code triggerem níže.
create table cards (
  code text primary key,
  batch integer not null default 0,
  status text not null default 'volna' check (status in ('volna', 'prirazena', 'blokovana')),
  customer_id uuid references customers (id) on delete set null,
  assigned_at timestamptz,
  created_at timestamptz not null default now(),
  note text not null default ''
);
create index cards_batch_idx on cards (batch);
create index cards_customer_idx on cards (customer_id);
alter table cards enable row level security;
create policy "admins manage cards" on cards for all to authenticated using (is_admin()) with check (is_admin());

-- Karty, které už zákazníci mají (ručně zadané kódy), do dávky 0.
insert into cards (code, batch, status, customer_id, assigned_at)
select card_code, 0, 'prirazena', id, coalesce(registered_at, created_at) from customers where card_code is not null
on conflict (code) do nothing;

create or replace function cards_sync_from_customer()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'UPDATE' and old.card_code is not null and old.card_code is distinct from new.card_code then
    update cards set status = 'volna', customer_id = null, assigned_at = null where code = old.card_code and customer_id = old.id;
  end if;
  if new.card_code is not null and (tg_op = 'INSERT' or old.card_code is distinct from new.card_code) then
    insert into cards (code, batch, status, customer_id, assigned_at) values (new.card_code, 0, 'prirazena', new.id, now())
    on conflict (code) do update set status = 'prirazena', customer_id = excluded.customer_id, assigned_at = now();
  end if;
  return new;
end $$;
create trigger customers_card_sync after insert or update of card_code on customers
  for each row execute function cards_sync_from_customer();

-- 3) Nová dávka karet (jen správce). Vrátí číslo dávky.
create or replace function cards_generate(p_count integer)
returns integer language plpgsql security definer set search_path = public as $$
declare v_batch integer; v_made integer := 0; v_body text; v_alpha text := card_alphabet(); i integer;
begin
  if not is_manager() then raise exception 'not manager'; end if;
  if p_count < 1 or p_count > 1000 then raise exception 'bad count'; end if;
  select coalesce(max(batch), 0) + 1 into v_batch from cards;
  while v_made < p_count loop
    v_body := '';
    for i in 1..5 loop v_body := v_body || substr(v_alpha, 1 + floor(random() * 32)::integer, 1); end loop;
    begin
      insert into cards (code, batch) values ('DK' || v_body || card_check_char(v_body), v_batch);
      v_made := v_made + 1;
    exception when unique_violation then null;
    end;
  end loop;
  return v_batch;
end $$;
revoke all on function cards_generate(integer) from public, anon;
grant execute on function cards_generate(integer) to authenticated;

-- 4) Blokace / odblokování ztracené karty (obsluha i správce).
create or replace function card_set_blocked(p_code text, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not is_admin() then raise exception 'not admin'; end if;
  update cards set status = case when p_blocked then 'blokovana' when customer_id is not null then 'prirazena' else 'volna' end
  where code = upper(trim(p_code));
end $$;
revoke all on function card_set_blocked(text, boolean) from public, anon;
grant execute on function card_set_blocked(text, boolean) to authenticated;

-- 5) Stav karty pro stránku /k/KÓD (anonymně). Vrací jen to, co je bezpečné ukázat: stav, iniciály, jestli má účet, jestli je moje.
create or replace function card_state(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_code text := upper(trim(p_code)); k cards; c customers; v_initials text;
begin
  select * into k from cards where code = v_code;
  if not found then
    -- starší ručně zadaný kód bez řádku v cards
    select * into c from customers where card_code = v_code;
    if not found then return jsonb_build_object('state', 'neplatna'); end if;
  elsif k.status = 'blokovana' then
    return jsonb_build_object('state', 'blokovana');
  elsif k.customer_id is null then
    return jsonb_build_object('state', 'volna');
  else
    select * into c from customers where id = k.customer_id;
    if not found then return jsonb_build_object('state', 'volna'); end if;
  end if;
  v_initials := case when c.name = '' then '' else split_part(c.name, ' ', 1) || case when split_part(c.name, ' ', 2) <> '' then ' ' || left(split_part(c.name, ' ', 2), 1) || '.' else '' end end;
  return jsonb_build_object('state', 'prirazena', 'account', c.user_id is not null, 'initials', v_initials,
    'hasEmail', c.email is not null, 'mine', c.user_id is not null and c.user_id = auth.uid());
end $$;
revoke all on function card_state(text) from public;
grant execute on function card_state(text) to anon, authenticated;

-- 6) Připojení karty k přihlášenému účtu (volná karta, nebo karta zákazníka bez účtu se stejným či žádným e-mailem).
create or replace function card_claim(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email'); v_code text := upper(trim(p_code));
  k cards; owner customers; me customers; v_name text;
begin
  if v_uid is null or v_email is null then raise exception 'not signed in'; end if;
  select * into k from cards where code = v_code;
  if not found or k.status = 'blokovana' then raise exception 'card invalid'; end if;
  select * into me from customers where user_id = v_uid;
  if k.customer_id is not null then
    select * into owner from customers where id = k.customer_id;
    if owner.user_id = v_uid then return jsonb_build_object('done', true); end if;
    if owner.user_id is not null then raise exception 'card conflict'; end if;
    if owner.email is not null and owner.email <> v_email then raise exception 'card conflict'; end if;
    if me.id is not null then raise exception 'card conflict'; end if;
    -- zákazník založený u kasy bez účtu: připojit účet k němu
    update customers set user_id = v_uid, email = v_email, registered_at = coalesce(registered_at, now()) where id = owner.id;
    return jsonb_build_object('done', true, 'customer_id', owner.id);
  end if;
  if me.id is null then
    select * into me from customers where email = v_email;
    if found and me.user_id is not null and me.user_id <> v_uid then raise exception 'account conflict'; end if;
    if found then
      update customers set user_id = v_uid where id = me.id;
    else
      v_name := coalesce(auth.jwt() -> 'user_metadata' ->> 'full_name', auth.jwt() -> 'user_metadata' ->> 'name', '');
      insert into customers (email, user_id, name, source, registered_at) values (v_email, v_uid, v_name, 'web', now()) returning * into me;
    end if;
  end if;
  if me.card_code is not null and me.card_code <> v_code then raise exception 'has card'; end if;
  update customers set card_code = v_code where id = me.id;
  return jsonb_build_object('done', true, 'customer_id', me.id);
end $$;
revoke all on function card_claim(text) from public, anon;
grant execute on function card_claim(text) to authenticated;

-- 7) Přiřazení u kasy: blokovaná karta nejde, předtištěný kód musí sedět kontrolní znak.
create or replace function pos_assign_card(p_code text, p_customer_id uuid default null, p_name text default null, p_phone text default null, p_email text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid; v_code text := upper(trim(p_code)); k cards;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  if length(v_code) < 4 then raise exception 'bad code'; end if;
  if v_code like 'DK%' and length(v_code) = 8 and not card_code_valid(v_code) then raise exception 'bad code'; end if;
  select * into k from cards where code = v_code;
  if found and k.status = 'blokovana' then raise exception 'card blocked'; end if;
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

-- 8) Rozpracovaná registrace podle e-mailu (před vznikem účtu; potvrzení kódem z e-mailu účet teprve založí).
create table club_pending (
  email text primary key,
  data jsonb not null,
  created_at timestamptz not null default now()
);
alter table club_pending enable row level security;

create or replace function club_register_pending_email(p_email text, p_data jsonb)
returns void language sql security definer set search_path = public as $$
  insert into club_pending (email, data) values (lower(trim(p_email)), p_data)
  on conflict (email) do update set data = excluded.data, created_at = now();
$$;
revoke all on function club_register_pending_email(text, jsonb) from public;
grant execute on function club_register_pending_email(text, jsonb) to anon, authenticated;

-- 9) Dokončení registrace: vezme rozpracovanou registraci podle účtu, nebo podle e-mailu; blokovaná karta nejde.
create or replace function club_complete_registration()
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid(); v_email text := lower(auth.jwt() ->> 'email'); r club_registrations; c customers;
  v_card text; v_phone text; v_name text; v_src text; v_ver text; v_club jsonb; v_awarded integer := 0; v_pet jsonb; v_pet_id uuid;
  v_mail boolean; v_sms boolean; v_found boolean := false;
begin
  if v_uid is null or v_email is null then raise exception 'not signed in'; end if;
  if not exists (select 1 from club_registrations where user_id = v_uid) then
    insert into club_registrations (user_id, data) select v_uid, data from club_pending where email = v_email;
  end if;
  delete from club_pending where email = v_email;
  select * into r from club_registrations where user_id = v_uid and completed_at is null;
  if not found then return jsonb_build_object('done', false); end if;
  v_card := nullif(upper(trim(coalesce(r.data->>'card_code', ''))), '');
  v_phone := nullif(trim(coalesce(r.data->>'phone', '')), '');
  v_name := nullif(trim(coalesce(r.data->>'name', '')), '');
  v_src := coalesce(nullif(r.data->>'source', ''), 'web');
  v_ver := coalesce(r.data->>'terms_version', '');
  v_mail := coalesce((r.data->>'marketing_email')::boolean, false);
  v_sms := coalesce((r.data->>'marketing_sms')::boolean, false);
  if v_card is not null and exists (select 1 from cards where code = v_card and status = 'blokovana') then raise exception 'card blocked'; end if;

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
