-- Očekávaná dodávka pro e-shop: u zboží, které není skladem, ale je na něj nákup u dodavatele (návrh nebo odeslaný),
-- ukazuje web „Čekáme na dodávku“ a předpokládaný termín. Nákupy jsou jen pro administraci (RLS), proto funkce
-- security definer vrací jen slug produktu a nejbližší očekávané datum, nic dalšího o nákupu.
create or replace function product_restock()
returns table (slug text, expected_on date)
language sql
stable
security definer
set search_path = public
as $$
  select p.slug, min(o.expected_on) as expected_on
    from purchase_order_items i
    join purchase_orders o on o.id = i.purchase_order_id
    join products p on p.id = i.product_id
   where o.status in ('navrh', 'odeslana')
     and p.is_published
   group by p.slug;
$$;

revoke all on function product_restock() from public;
grant execute on function product_restock() to anon, authenticated;
