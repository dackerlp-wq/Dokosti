-- Nové kategorie e-shopu (menu): BARF mixy · Maso a vnitřnosti · Masité kosti · Pamlsky a žvýkání · Doplňky · Granule a konzervy.
-- Řada (line) je hlavní kategorie, kind je podkategorie u řad, které se nedělí podle masa:
--   maso:    svalovina, vnitrnosti, ryby       (dřív v řadě barf vedle hotových mixů)
--   mlsky:   pamlsky, zvykani                  (rohy, paroží, uši, kůže, dřevo)
--   navic:   oleje, mineraly, vitaminy, prilohy, klouby, ostatni (beze změny, na webu „Doplňky“)
--   granule: granule, konzervy                 (řada konzervy se slučuje do granulí)
-- Hodnota enumu 'konzervy' zůstává (z enumu nejde odebrat), nepoužívá se.
-- Nová hodnota enumu musí být potvrzená dřív, než se použije, proto se aplikovalo ve dvou krocích.

-- Krok 1
alter type product_line add value if not exists 'maso';

-- Krok 2
alter table products drop constraint if exists products_kind_check;

update products set line = 'granule', kind = 'konzervy' where line = 'konzervy';
update products set kind = 'granule' where line = 'granule' and kind is null;

update products set line = 'maso', kind = 'ryby'
  where line = 'barf' and slug in ('barf-losos-mlety-1kg', 'barf-losos-orez-500g', 'barf-ryby-cele-morske-1kg', 'barf-sproty-cele-500g');
update products set line = 'maso', kind = 'vnitrnosti'
  where line = 'barf' and slug in ('barf-droby-a-orez-special-1kg', 'barf-jatra-hovezi-1kg', 'barf-jatra-kureci-1kg', 'barf-ledvinky-hovezi-1kg');
update products set line = 'maso', kind = 'svalovina'
  where line = 'barf' and slug in (
    'barf-drstky-prane-krajene-1kg', 'barf-srdce-hovezi-krajene-1kg', 'barf-srdce-kachni-500g', 'barf-srdce-kureci-1kg',
    'barf-srdce-veprove-1kg', 'barf-srnec-danek-jelen-500g', 'barf-svalovina-hovezi-krajena-300g', 'barf-svalovina-hovezi-s-chrupavkou-300g',
    'barf-svalovina-kureci-300g', 'barf-vemeno-krajene-1kg', 'barf-zaludky-kureci-1kg', 'barf-zverina-1kg');

update products set kind = 'zvykani'
  where line = 'mlsky' and slug in (
    'mlsky-buvoli-roh-m', 'mlsky-buvoli-roh-s', 'mlsky-jeleni-parozi-m', 'mlsky-jeleni-parozi-s', 'mlsky-rolka-hovezi-kuze-natural-14cm',
    'mlsky-syrova-tycinka-l', 'mlsky-syrova-tycinka-s', 'mlsky-ucho-veprove-susene', 'mlsky-wooffee-kavove-drevo-m', 'mlsky-hardery-hovezi');
update products set kind = 'pamlsky' where line = 'mlsky' and kind is null;

alter table products add constraint products_kind_check check (
  kind is null
  or (line = 'navic' and kind in ('oleje', 'mineraly', 'vitaminy', 'prilohy', 'klouby', 'ostatni'))
  or (line = 'maso' and kind in ('svalovina', 'vnitrnosti', 'ryby'))
  or (line = 'mlsky' and kind in ('pamlsky', 'zvykani'))
  or (line = 'granule' and kind in ('granule', 'konzervy'))
);
alter table products add constraint products_line_not_konzervy check (line <> 'konzervy');
comment on column products.kind is 'Podkategorie řady: navic (účel), maso (svalovina/vnitrnosti/ryby), mlsky (pamlsky/zvykani), granule (granule/konzervy). U barf a kosti prázdné, dělí se podle meats.';
