-- Výplatní pásky: k položce mezd se generuje PDF (uzavřený měsíc). Číslo pásky, soubor v bucketu dokumenty
-- (složka pasky/RRRR-MM), kdy a kdo generoval, a dokument navázaný na zaměstnance, aby si pásku našel
-- mezi svými dokumenty (přístup k souboru hlídá stávající politika přes document_versions).
alter table payroll_items add column if not exists payslip_no text;
alter table payroll_items add column if not exists payslip_path text;
alter table payroll_items add column if not exists payslip_generated_at timestamptz;
alter table payroll_items add column if not exists payslip_generated_by uuid references auth.users (id) on delete set null;
alter table payroll_items add column if not exists payslip_document_id uuid references documents (id) on delete set null;
create unique index if not exists payroll_items_payslip_no_idx on payroll_items (payslip_no) where payslip_no is not null;
