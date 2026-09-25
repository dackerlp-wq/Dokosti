-- Kalkulačka dávky: výživové údaje produktů z etikety výrobce a uložené profily zvířat.

-- Údaje z etikety. Bez nich kalkulačka počítá orientačně procentem hmotnosti; nikdy se nedopočítávají.
alter table products
  add column kcal_per_100g numeric(6,1) check (kcal_per_100g is null or kcal_per_100g > 0),
  add column bone_pct numeric(5,1) check (bone_pct is null or (bone_pct >= 0 and bone_pct <= 100)),
  add column organ_pct numeric(5,1) check (organ_pct is null or (organ_pct >= 0 and organ_pct <= 100)),
  add column liver_pct numeric(5,1) check (liver_pct is null or (liver_pct >= 0 and liver_pct <= 100)),
  add column taurine_mg_per_kg numeric(7,1) check (taurine_mg_per_kg is null or taurine_mg_per_kg >= 0),
  -- jedlá kost do dávky, nebo rekreační (nosné kosti velkých zvířat) jen na okusování
  add column bone_class text check (bone_class is null or bone_class in ('jedla', 'rekreacni')),
  -- kompletní krmivo podle nařízení 767/2009; výchozí doplňkové
  add column is_complete boolean not null default false;

-- Profily zvířat přihlášených zákazníků (vstupy kalkulačky jako JSON).
create table pets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null default '',
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pets_user_idx on pets (user_id);
alter table pets enable row level security;
create policy "owner manages pets" on pets for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
