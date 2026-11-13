-- Odměna za profil zvířete: 50 Kostiček, nejvýš za petPointsMax (3) profilů na účet za celou dobu.
-- Dřív se počítaly jen profily, které v účtu pořád jsou, takže po smazání odměněného profilu dostal
-- zákazník Kostičky znovu za další. Teď se počítají připsané odměny v historii Kostiček.
update settings set value = jsonb_set(value, '{petPoints}', '50'::jsonb) where key = 'club';

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
  v_points := coalesce((v_club->>'petPoints')::integer, 50);
  v_max := coalesce((v_club->>'petPointsMax')::integer, 3);
  -- Kolik odměn za profil už zákazník kdy dostal (i za profily, které mezitím smazal).
  select count(*) into v_done from loyalty_transactions where customer_id = c.id and points > 0 and reason like 'Profil zvířete:%';
  if v_points <= 0 or v_done >= v_max then return 0; end if;
  update pets set rewarded_at = now() where id = p.id;
  update customers set points = points + v_points where id = c.id;
  insert into loyalty_transactions (customer_id, points, reason) values (c.id, v_points, 'Profil zvířete: ' || p.name);
  return v_points;
end $$;
revoke all on function club_reward_pet(uuid) from public, anon;
grant execute on function club_reward_pet(uuid) to authenticated;
