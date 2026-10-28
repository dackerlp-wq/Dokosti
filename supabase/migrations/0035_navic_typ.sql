-- Podkategorie řady Navíc podle účelu (oleje, minerály, vitamíny, přílohy, klouby, ostatní).
-- Ostatní řady mají podkategorie podle druhu masa (products.meats).
alter table products add column if not exists kind text check (kind is null or kind in ('oleje', 'mineraly', 'vitaminy', 'prilohy', 'klouby', 'ostatni'));
comment on column products.kind is 'Podkategorie řady Navíc: oleje, mineraly, vitaminy, prilohy, klouby, ostatni. U ostatních řad prázdné.';

-- Zařazení startovního sortimentu (28. 10. 2026).
update products set kind = case
  when slug in ('navic-lososovy-olej-natural-extra','navic-lneny-olej','navic-olej-z-ostropestrce','navic-konopny-olej','navic-olej-z-trescich-jater') then 'oleje'
  when slug in ('navic-vajecne-skorapky','navic-vapnik-horcik-zinek') then 'mineraly'
  when slug in ('navic-kelpa-hneda-morska-rasa','navic-caulerpa-zelena-morska-rasa','navic-multivitamin-premium-sypky','navic-pivovarske-kvasnice') then 'vitaminy'
  when slug in ('navic-zeleninova-smes-s-ryzi','navic-barfex-s-kelpou','navic-pohanka-loupana','navic-instantni-ryzova-kase') then 'prilohy'
  when slug in ('navic-hydrolyzovany-kolagen','navic-kolagen-triplet-mix','navic-chondro-4dogs-plus') then 'klouby'
  when slug in ('navic-mleko-pro-stenata','navic-biochar-aktivni-uhli','navic-odmerka-50-ml') then 'ostatni'
end where line = 'navic';
