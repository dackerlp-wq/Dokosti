-- Administrátoři: uživatelé Supabase Auth, kteří smí spravovat produkty a objednávky.
create table admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table admins enable row level security;

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admins where user_id = auth.uid());
$$;
revoke all on function is_admin() from public;
grant execute on function is_admin() to authenticated;

create policy "admins read admins" on admins for select to authenticated using (is_admin());

create policy "admins manage products" on products for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "admins manage orders" on orders for all to authenticated
  using (is_admin()) with check (is_admin());
create policy "admins manage order_items" on order_items for all to authenticated
  using (is_admin()) with check (is_admin());

-- Fotky produktů: veřejné čtení, zápis jen admin.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

create policy "public read product images" on storage.objects for select
  using (bucket_id = 'product-images');
create policy "admins write product images" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and is_admin());
create policy "admins update product images" on storage.objects for update to authenticated
  using (bucket_id = 'product-images' and is_admin());
create policy "admins delete product images" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and is_admin());
