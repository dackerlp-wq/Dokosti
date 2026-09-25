-- Poradna: dotazy z formuláře na stránce Jak začít. Zapisuje web (anon) přes RPC, čte admin.
create table inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  animal text not null default '',
  age_weight text not null default '',
  question text not null,
  answered boolean not null default false,
  note text not null default '',
  created_at timestamptz not null default now()
);
create index inquiries_created_idx on inquiries (created_at desc);
alter table inquiries enable row level security;
create policy "admins manage inquiries" on inquiries for all to authenticated
  using (is_admin()) with check (is_admin());

create or replace function submit_inquiry(p_name text, p_email text, p_animal text, p_age_weight text, p_question text)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into inquiries (name, email, animal, age_weight, question)
  values (left(trim(p_name), 120), left(lower(trim(p_email)), 200), left(trim(p_animal), 40), left(trim(p_age_weight), 120), left(trim(p_question), 4000))
  returning id;
$$;
revoke all on function submit_inquiry(text, text, text, text, text) from public;
grant execute on function submit_inquiry(text, text, text, text, text) to anon, authenticated, service_role;
