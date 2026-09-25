-- Doklady: číselná řada a číslo dokladu u objednávky. Statistiky: pohled na tržby.

create sequence if not exists invoice_seq;

alter table orders add column invoice_number text unique;
alter table orders add column invoice_issued_at timestamptz;

-- Přidělí číslo dokladu ve tvaru RRRRNNNN (číselná řada napříč roky, jednoduché pro účetní).
create or replace function issue_invoice(p_order_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_number text;
begin
  if not is_admin() then raise exception 'not admin'; end if;
  select invoice_number into v_number from orders where id = p_order_id;
  if v_number is not null then return v_number; end if;
  v_number := to_char(now(), 'YYYY') || lpad(nextval('invoice_seq')::text, 4, '0');
  update orders set invoice_number = v_number, invoice_issued_at = now() where id = p_order_id;
  return v_number;
end $$;
revoke all on function issue_invoice(uuid) from public;
grant execute on function issue_invoice(uuid) to authenticated;

-- Tržby po dnech (bez zrušených). Jen pro admina, view dědí RLS z orders.
create or replace view sales_by_day with (security_invoker = true) as
select date_trunc('day', created_at)::date as day,
       count(*) as orders,
       sum(total_czk) as revenue_czk,
       sum(case when shipping_method = 'odber' then 1 else 0 end) as odber,
       sum(case when shipping_method = 'rozvoz' then 1 else 0 end) as rozvoz,
       sum(case when shipping_method = 'prepravce' then 1 else 0 end) as prepravce
from orders where status <> 'zrusena'
group by 1;

create or replace view top_products with (security_invoker = true) as
select i.product_slug, i.name, sum(i.qty) as qty, sum(i.qty * i.unit_price_czk) as revenue_czk,
       max(o.created_at) as last_sold_at
from order_items i join orders o on o.id = i.order_id
where o.status <> 'zrusena'
group by 1, 2;
