-- Masité kosti se slučují do řady Maso (podkategorie kosti). Řada „kosti“ zůstává v enumu, ale nepoužívá se.
-- Pořadí v řadě odpovídá skladbě misky: svalovina, masité kosti, vnitřnosti, ryby.

alter table products drop constraint if exists products_kind_check;

update products set line = 'maso', kind = 'kosti' where line = 'kosti';

alter table products add constraint products_kind_check check (
  kind is null
  or (line = 'navic' and kind in ('oleje', 'mineraly', 'vitaminy', 'prilohy', 'klouby', 'ostatni'))
  or (line = 'maso' and kind in ('svalovina', 'kosti', 'vnitrnosti', 'ryby'))
  or (line = 'mlsky' and kind in ('pamlsky', 'zvykani'))
  or (line = 'granule' and kind in ('granule', 'konzervy'))
);
comment on column products.kind is 'Podkategorie řady: navic (účel), maso (svalovina/kosti/vnitrnosti/ryby), mlsky (pamlsky/zvykani), granule (granule/konzervy). U barf prázdné, dělí se podle meats.';

-- Pořadí: svalovina (malá balení, srdce, žaludky a dršťky, zvěřina), kosti (od nejmenších), vnitřnosti (játra, ledvinky, droby), ryby.
update products p set sort_order = v.ord
from (values
  ('barf-svalovina-kureci-300g', 200),
  ('barf-svalovina-kruti-s-chrupavkou-300g', 201),
  ('barf-svalovina-hovezi-krajena-300g', 202),
  ('barf-svalovina-hovezi-jemne-krajena-300g', 203),
  ('barf-svalovina-hovezi-s-chrupavkou-300g', 204),
  ('barf-svalovina-hovezi-a-veprova-300g', 205),
  ('barf-srdce-kureci-1kg', 210),
  ('barf-srdce-kachni-500g', 211),
  ('barf-srdce-veprove-1kg', 212),
  ('barf-srdce-hovezi-krajene-1kg', 213),
  ('barf-zaludky-kureci-1kg', 214),
  ('barf-drstky-prane-krajene-1kg', 215),
  ('barf-vemeno-krajene-1kg', 216),
  ('barf-srnec-danek-jelen-500g', 217),
  ('barf-zverina-1kg', 218),
  ('kosti-krky-kureci-1kg', 230),
  ('kosti-kridla-kureci-1kg', 231),
  ('kosti-krky-kachni-1kg', 232),
  ('kosti-kure-sekane-1kg', 233),
  ('kosti-stehna-kureci-1kg', 234),
  ('barf-jatra-kureci-1kg', 250),
  ('barf-jatra-hovezi-1kg', 251),
  ('barf-ledvinky-hovezi-1kg', 252),
  ('barf-droby-a-orez-special-1kg', 253),
  ('barf-sproty-cele-500g', 270),
  ('barf-losos-orez-500g', 271),
  ('barf-losos-mlety-1kg', 272),
  ('barf-ryby-cele-morske-1kg', 273)
) as v(slug, ord)
where p.slug = v.slug;
