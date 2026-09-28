-- Pohlaví a březost/kojení u zvířat: kvůli oslovení („Kolik je Báře“) a výpočtu dávky.
alter table pets add column if not exists sex text check (sex in ('samec', 'samice'));
alter table pets add column if not exists reproduction text check (reproduction in ('brezi', 'kojici'));
alter table pets add column if not exists pregnancy_week int check (pregnancy_week between 1 and 9);
