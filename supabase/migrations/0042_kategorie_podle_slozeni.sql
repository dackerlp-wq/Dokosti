-- Kategorie podle složení (2026-11).
--
-- BARF směsi (řada barf) jsou jen směsi masa a vnitřností, u většiny i s kostí. Mleté maso s kostí bez vnitřností
-- (kuře, krůta, kachna, jehně) patří do Maso, kosti a vnitřnosti › Maso s kostí, losos s kuřecím do Ryb.
-- Doplňky mají čtyři podkategorie: řasy a vitamíny jsou u minerálů, kolagen u ostatních.
-- Texty bez „kompletní“: mražené maso a směsi nejsou kompletní krmivo, co do misky patří zvlášť, ukazuje web podle složení.
-- Web do provedení této migrace převádí řady a podkategorie sám při čtení (src/lib/products.ts).

alter table products drop constraint if exists products_kind_check;

update products set kind = 'mineraly' where line = 'navic' and kind = 'vitaminy';
update products set kind = 'ostatni' where line = 'navic' and kind = 'klouby';

update products set line = 'maso', kind = 'kosti'
where slug in (
  'barf-kure-cele-mlete-1kg',
  'barf-kureci-1kg',
  'barf-kureci-500g',
  'barf-kruti-mlete-1kg',
  'barf-kruti-mlete-500g',
  'barf-kachna-mleta-1kg',
  'barf-kachna-mleta-500g',
  'barf-kachna-s-kurecim-1kg',
  'barf-jehne-mlete-500g'
);
update products set line = 'maso', kind = 'ryby' where slug = 'barf-losos-s-kurecim-1kg';

alter table products add constraint products_kind_check check (
  kind is null
  or (line = 'navic' and kind in ('oleje', 'mineraly', 'prilohy', 'ostatni'))
  or (line = 'maso' and kind in ('kosti', 'svalovina', 'vnitrnosti', 'ryby'))
  or (line = 'mlsky' and kind in ('pamlsky', 'zvykani'))
  or (line = 'granule' and kind in ('granule', 'konzervy'))
);
comment on column products.kind is 'Podkategorie řady: navic (oleje/mineraly/prilohy/ostatni), maso (kosti = maso s kostí/svalovina/vnitrnosti/ryby), mlsky (pamlsky/zvykani), granule (granule/konzervy). U barf prázdné, dělí se podle meats.';

-- Droby a ořez special: poměr podle e-shopu výrobce (falcokrmiva.com, kód 001.0541ab, ověřeno 10. 11. 2026).
update products set composition = 'Hovězí droby 55 %, hovězí maso (ořez, chrupavky) 45 %', organ_pct = 55
where slug = 'barf-droby-a-orez-special-1kg';

-- Úvodní věty bez „kompletní“.
update products set intro = 'Mleté kuře s kostí, hovězí droby a ořez. Nejlevnější směs v nabídce, játra a rybu nebo olej přidejte zvlášť.'
where slug = 'barf-drubez-s-hovezim-1kg';
update products set intro = 'Mleté kuře s kostí, hovězí droby a ořez v menším balení pro malé psy a kočky.'
where slug = 'barf-drubez-s-hovezim-500g';

-- Dávkování: co k masu patří zvlášť, bez tvrzení o úplnosti.
update products set dosage = 'Podávejte syrové, rozmražené. Dospělý pes sní obvykle 2–3 % své hmotnosti denně, podle aktivity a kondice. Do jídelníčku ke směsi patří ještě játra, ryba nebo olej a doplňky; kolik čeho, spočítá plán Krmení na míru.'
where line = 'barf';
update products set dosage = 'Podávejte syrové, rozmražené. Je to maso s kostí bez vnitřností: játra a další vnitřnosti, rybu nebo olej a doplňky přidejte zvlášť, kolik čeho, spočítá plán Krmení na míru. Druhy masa střídejte.'
where slug in (
  'barf-kure-cele-mlete-1kg',
  'barf-kureci-1kg',
  'barf-kureci-500g',
  'barf-kruti-mlete-1kg',
  'barf-kruti-mlete-500g',
  'barf-kachna-mleta-1kg',
  'barf-kachna-mleta-500g',
  'barf-kachna-s-kurecim-1kg',
  'barf-jehne-mlete-500g'
);
update products set dosage = 'Rybu zařazujte zhruba jednou týdně místo porce masa. Podávejte syrovou, rozmraženou.'
where slug = 'barf-losos-s-kurecim-1kg';

-- Mražené maso a směsi nejsou kompletní krmivo.
update products set is_complete = false where line in ('barf', 'maso');
