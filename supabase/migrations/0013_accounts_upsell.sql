-- Zákaznické účty (Supabase Auth) a upsell / cross-sell u produktů.

-- Zákazník vidí své objednávky a profil podle e-mailu svého účtu.
create policy "customer reads own orders" on orders for select to authenticated
  using (customer_email = lower(auth.jwt() ->> 'email'));
create policy "customer reads own order items" on order_items for select to authenticated
  using (exists (select 1 from orders o where o.id = order_items.order_id and o.customer_email = lower(auth.jwt() ->> 'email')));
create policy "customer reads own profile" on customers for select to authenticated
  using (email = lower(auth.jwt() ->> 'email'));
create policy "customer reads own loyalty" on loyalty_transactions for select to authenticated
  using (exists (select 1 from customers c where c.id = loyalty_transactions.customer_id and c.email = lower(auth.jwt() ->> 'email')));

-- Upsell (lepší nebo větší varianta) a cross-sell (hodí se k tomu), slugy produktů.
alter table products
  add column upsell_slugs text[] not null default '{}',
  add column crosssell_slugs text[] not null default '{}';
