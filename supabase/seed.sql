-- Seed (spec §7/§8). Spustit po 0001_init.sql.
-- VŠECHNY položky confirmed=false → agent je NEpustí do T-minus ani do newsletteru,
-- dokud člověk neověří datum z primárního zdroje a neodškrtne `confirmed` v admin UI.
-- effective_date je vyplněné JEN tam, kde ho brief jednoznačně uvádí; jinak NULL.

insert into tracker (id, title, effective_date, status, remediation_weight, confirmed, source_url) values
  ('eaa', 'EAA / zákon č. 424/2023 Sb. — přístupnost (WCAG 2.1 AA)', date '2025-06-28', 'vymáháno', 'těžká', false, null),
  ('eaa-2030', 'EAA — druhá vlna (na dnešní mikropodniky s výjimkou), ~2030', null, 'navrženo', 'těžká', false, null),
  ('omnibus-30d', 'Omnibus — sleva z nejnižší ceny za 30 dní (ČOI aktivně pokutuje)', null, 'vymáháno', 'lehká', false, null),
  ('recenze', 'Ověřování recenzí — ověřené vs. neověřené (ČOI aktivně pokutuje)', null, 'vymáháno', 'lehká', false, null),
  ('odstoupeni-tlacitko', 'Online odstoupení od smlouvy („tlačítko") — § 1829 OZ / 2023/2673; datum NEJISTÉ', null, 'navrženo', 'lehká', false, null),
  ('gpsr', 'GPSR — bezpečnost výrobků', null, 'účinné', 'lehká', false, null),
  ('dsa', 'DSA — pro weby s uživatelským obsahem (recenze, diskuze)', null, 'účinné', 'lehká', false, null)
on conflict (id) do nothing;

-- Zdroje (allowlist §5). active=false → neběží, dokud se nedoplní/neověří reálná feed URL
-- a zdroj se v admin UI neaktivuje. `group` A = smí spustit legislativní událost (§4 trigger 2).
insert into sources (name, url, "group", category, type, active) values
  ('ČOI', 'https://www.coi.cz/', 'A', 'regulatorni', 'html', false),
  ('e-Sbírka / Sbírka zákonů', 'https://www.e-sbirka.cz/', 'A', 'regulatorni', 'html', false),
  ('EUR-Lex', 'https://eur-lex.europa.eu/', 'A', 'regulatorni', 'html', false),
  ('ÚOOÚ', 'https://www.uoou.gov.cz/', 'A', 'regulatorni', 'html', false),
  ('Lupa.cz', 'https://www.lupa.cz/', 'B', 'trzni-kontext', 'html', false),
  ('CzechCrunch', 'https://cc.cz/', 'B', 'trzni-kontext', 'html', false),
  ('APEK', 'https://www.apek.cz/', 'B', 'trzni-kontext', 'html', false),
  ('Baymard Institute', 'https://baymard.com/blog', 'B', 'ux-vyzkum', 'html', false)
on conflict do nothing;
