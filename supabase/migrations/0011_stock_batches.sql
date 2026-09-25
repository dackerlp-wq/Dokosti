-- Šarže a expirace u mraženého a chlazeného zboží. Evidence vedle stock_qty (informativní).
create table stock_batches (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products (id) on delete cascade,
  batch_no text not null default '',
  expires_on date not null,
  qty integer not null check (qty >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);
create index stock_batches_product_idx on stock_batches (product_id, expires_on);
create index stock_batches_expiry_idx on stock_batches (expires_on) where qty > 0;
alter table stock_batches enable row level security;
create policy "admins manage batches" on stock_batches for all to authenticated
  using (is_admin()) with check (is_admin());
