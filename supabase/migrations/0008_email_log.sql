-- Log odeslaných (nebo čekajících) e-mailů. Bez API klíče se e-maily jen ukládají,
-- admin je vidí v sekci E-maily a po nastavení domény se začnou odesílat.
create type email_status as enum ('ceka', 'odeslano', 'chyba');

create table email_log (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  html text not null,
  text text not null default '',
  kind text not null,
  order_id uuid references orders (id) on delete set null,
  status email_status not null default 'ceka',
  error text,
  provider_id text,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);
create index email_log_created_idx on email_log (created_at desc);
alter table email_log enable row level security;
create policy "admins read email log" on email_log for select to authenticated using (is_admin());

-- Zápis do logu jde přes funkci, aby ho mohl volat i web (anon) při objednávce.
create or replace function log_email(p_to text, p_subject text, p_html text, p_text text, p_kind text, p_order_id uuid, p_status email_status, p_error text, p_provider_id text)
returns uuid
language sql
security definer
set search_path = public
as $$
  insert into email_log (to_email, subject, html, text, kind, order_id, status, error, provider_id, sent_at)
  values (p_to, p_subject, p_html, p_text, p_kind, p_order_id, p_status, p_error, p_provider_id,
          case when p_status = 'odeslano' then now() end)
  returning id;
$$;
revoke all on function log_email(text, text, text, text, text, uuid, email_status, text, text) from public;
grant execute on function log_email(text, text, text, text, text, uuid, email_status, text, text) to anon, authenticated, service_role;

-- Detail objednávky pro e-mail (web po vytvoření objednávky zná jen číslo).
create or replace function order_for_email(p_order_number text)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'id', o.id, 'order_number', o.order_number, 'status', o.status,
    'customer_name', o.customer_name, 'customer_email', o.customer_email, 'customer_phone', o.customer_phone,
    'street', o.street, 'city', o.city, 'zip', o.zip, 'note', o.note,
    'shipping_method', o.shipping_method, 'payment_method', o.payment_method, 'delivery_date', o.delivery_date,
    'subtotal_czk', o.subtotal_czk, 'shipping_czk', o.shipping_czk, 'total_czk', o.total_czk,
    'coupon_code', o.coupon_code, 'discount_czk', o.discount_czk, 'points_discount_czk', o.points_discount_czk,
    'points_earned', o.points_earned, 'created_at', o.created_at,
    'items', (select coalesce(jsonb_agg(jsonb_build_object('name', i.name, 'qty', i.qty, 'unit_price_czk', i.unit_price_czk)), '[]'::jsonb)
              from order_items i where i.order_id = o.id)
  )
  from orders o where o.order_number = p_order_number and o.created_at > now() - interval '10 minutes';
$$;
revoke all on function order_for_email(text) from public;
grant execute on function order_for_email(text) to anon, authenticated, service_role;
