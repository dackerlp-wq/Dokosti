-- Trigger funkce a is_admin nemají být volatelné přes REST.
revoke execute on function restock_on_cancel() from public, anon, authenticated;
revoke execute on function loyalty_on_status() from public, anon, authenticated;
revoke execute on function set_updated_at() from public, anon, authenticated;
revoke execute on function is_admin() from public, anon;
revoke execute on function issue_invoice(uuid) from public, anon;
