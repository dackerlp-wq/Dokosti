-- DoKosti BARF · základní schéma e-shopu
-- Katalog (products) odpovídá typu Product v src/lib/catalog.ts.

create type product_line as enum ('zaklad', 'kosti', 'navic', 'mlsky');
create type animal as enum ('pes', 'kocka');
create type storage_kind as enum ('mrazene', 'chlazene', 'suche');
create type order_status as enum ('nova', 'potvrzena', 'pripravena', 'doruceno', 'zrusena');
create type shipping_method as enum ('odber', 'rozvoz', 'prepravce');
create type payment_method as enum ('karta', 'prevod', 'hotove');

create table products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  line product_line not null,
  variant text not null,
  animals animal[] not null default '{}',
  storage storage_kind not null,
  weight_grams integer not null check (weight_grams > 0),
  price_czk integer not null check (price_czk >= 0),
  original_price_czk integer check (original_price_czk is null or original_price_czk > price_czk),
  producer text not null default '',
  intro text not null default '',
  composition text not null default '',
  storage_note text not null default '',
  dosage text not null default '',
  in_stock boolean not null default true,
  is_new boolean not null default false,
  image_url text,
  sort_order integer not null default 0,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_line_idx on products (line) where is_published;

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  status order_status not null default 'nova',
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  street text not null default '',
  city text not null default '',
  zip text not null default '',
  note text not null default '',
  shipping_method shipping_method not null,
  payment_method payment_method not null,
  subtotal_czk integer not null,
  shipping_czk integer not null,
  total_czk integer not null,
  created_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders (id) on delete cascade,
  product_slug text not null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price_czk integer not null
);

create index order_items_order_idx on order_items (order_id);

-- RLS: veřejnost čte jen publikované produkty. Objednávky zapisuje server
-- přes service role, zákazník do nich přímý přístup nemá.
alter table products enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;

create policy "public read published products"
  on products for select
  to anon, authenticated
  using (is_published);

create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger products_updated_at
  before update on products
  for each row execute function set_updated_at();
