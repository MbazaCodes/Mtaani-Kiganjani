-- ================================================
-- E-MTAA DATABASE SEED DATA
-- ================================================
-- Run AFTER E-MTAA_FULL_SETUP.sql
-- Seeds: service_categories, services, locations, offices, office_registry
-- ================================================

-- ================================================
-- PART 1: SERVICE CATEGORIES
-- ================================================
INSERT INTO public.service_categories (name, name_sw, description, icon, "order", active) VALUES
('Permits',      'Vibali',              'Official permits for events, construction, burial etc.',        'file-badge',       1, TRUE),
('Documents',    'Nyaraka',             'Identity letters, certificates and official documents.',         'file-text',        2, TRUE),
('Agreements',   'Makubaliano',         'Sales and rental agreements between verified parties.',          'handshake',        3, TRUE),
('Payments',     'Malipo & Michango',   'Fines, fees, contributions and community payments.',              'receipt',          4, TRUE),
('Disputes',     'Migogoro na Mashauri', 'Citizen disputes and community issue reporting.',                'scale',            5, TRUE)
ON CONFLICT DO NOTHING;

-- ================================================
-- PART 2: SERVICES (9 ward-level services)
-- ================================================
INSERT INTO public.services (id, name, name_en, description, description_en, form_schema, fee, active, validity_months, document_template) VALUES

-- 1. Utambulisho wa Mkazi (Resident Identity)
('a1b2c3d4-0001-4000-8000-000000000001',
 'Utambulisho wa Mkazi', 'Resident Identity',
 'Pata uthibitisho rasmi wa makazi yako kwenye mtaa wako.',
 'Get official confirmation of your residence in your street.',
 '[
   {"name":"section_header","label":"TAARIFA ZA HALMASHAURI","type":"header"},
   {"name":"council","label":"Halmashauri","type":"select","required":true,"options":[{"label":"HALMASHAURI YA MANISPAA YA ARUSHA","value":"ARUSHA"},{"label":"HALMASHAURI YA MANISPAA YA KINONDONI","value":"KINONDONI"},{"label":"HALMASHAURI YA MANISPAA YA ILALA","value":"ILALA"},{"label":"HALMASHAURI YA MANISPAA YA TEMEKE","value":"TEMEKE"},{"label":"HALMASHAURI YA MANISPAA YA UBUNGO","value":"UBUNGO"},{"label":"HALMASHAURI YA MANISPAA YA KIGAMBONI","value":"KIGAMBONI"},{"label":"HALMASHAURI YA MANISPAA YA DODOMA","value":"DODOMA"},{"label":"HALMASHAURI YA MANISPAA YA MBEYA","value":"MBEYA"},{"label":"HALMASHAURI YA MANISPAA YA MWANZA","value":"MWANZA"},{"label":"HALMASHAURI YA MANISPAA YA MOROGORO","value":"MOROGORO"},{"label":"HALMASHAURI YA MANISPAA YA IRINGA","value":"IRINGA"},{"label":"HALMASHAURI YA MANISPAA YA TANGA","value":"TANGA"},{"label":"HALMASHAURI YA MANISPAA YA MOSHI","value":"MOSHI"},{"label":"NYINGINE","value":"NYINGINE"}]},
   {"name":"section_personal","label":"TAARIFA BINAFSI (Zilizohakikiwa na NIDA)","type":"header"},
   {"name":"occupation","label":"Kazi/Shughuli","type":"text","required":true},
   {"name":"section_marital","label":"TAARIFA ZA NDOA","type":"header"},
   {"name":"marital_status","label":"Hali ya Ndoa","type":"select","required":true,"options":[{"label":"SIJAOA/SIJAOLEWA","value":"SINGLE"},{"label":"NIMEOA/NIMEOLEWA","value":"MARRIED"},{"label":"TALAKA","value":"DIVORCED"},{"label":"MJANE","value":"WIDOWED"}]},
   {"name":"section_children","label":"TAARIFA ZA WATOTO","type":"header"},
   {"name":"has_children","label":"Je, una watoto?","type":"select","required":true,"options":[{"label":"HAPANA","value":"NO"},{"label":"NDIYO","value":"YES"}]},
   {"name":"number_of_children","label":"Idadi ya Watoto","type":"number","showIf":{"field":"has_children","value":"YES"}},
   {"name":"child_1_name","label":"Jina Kamili la Mtoto wa 1","type":"text","showIf":{"field":"has_children","value":"YES"}},
   {"name":"child_1_dob","label":"Tarehe ya Kuzaliwa - Mtoto wa 1","type":"date","showIf":{"field":"has_children","value":"YES"}},
   {"name":"section_residence","label":"TAARIFA ZA MAKAZI","type":"header"},
   {"name":"neighborhood","label":"Kitongoji","type":"text","required":true},
   {"name":"house_number","label":"Nyumba No.","type":"text"},
   {"name":"housing_status","label":"Hali ya Nyumba","type":"select","required":true,"options":[{"label":"NIMEPANGA (Tenant)","value":"RENTING"},{"label":"NIMEJENGA/NINAMILIKI (Owner)","value":"OWNER"},{"label":"NINAISHI NA NDUGU","value":"WITH_RELATIVES"}]},
   {"name":"section_purpose","label":"SABABU YA MAOMBI","type":"header"},
   {"name":"purpose","label":"Sababu ya Maombi","type":"select","required":true,"options":[{"label":"UTAMBULISHO WA MTAA","value":"UTAMBULISHO"},{"label":"KUSOMA","value":"KUSOMA"},{"label":"AJIRA","value":"AJIRA"},{"label":"BIASHARA","value":"BIASHARA"},{"label":"HUDUMA YA AFYA","value":"HUDUMA_YA_AFYA"},{"label":"HATI YA KUSAFIRI","value":"HATI_YA_KUSAFIRI"},{"label":"KUFUNGUA AKAUNTI YA BENKI","value":"BENKI"},{"label":"NYINGINEZO","value":"NYINGINEZO"}]}
 ]'::jsonb,
 5000.00, TRUE, 12,
 '{"document_type":"UTAMBULISHO WA MKAZI","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Cheti hiki ni rasmi na kinaweza kuthibitishwa kwa kuchanganua QR code."}'::jsonb
),

-- 2. Kibari cha Mazishi (Burial Permit)
('a1b2c3d4-0001-4000-8000-000000000002',
 'Kibari cha Mazishi', 'Burial Permit',
 'Kibali rasmi cha mazishi.',
 'Official burial permit.',
 '[
   {"name":"section_deceased","label":"TAARIFA ZA MAREHEMU","type":"header"},
   {"name":"deceased_full_name","label":"Jina Kamili la Marehemu","type":"text","required":true},
   {"name":"date_of_death","label":"Tarehe ya Kufariki","type":"date","required":true},
   {"name":"burial_location","label":"Mahala pa Kuzika","type":"text","required":true},
   {"name":"family_representative","label":"Mwakilishi wa Familia","type":"text","required":true},
   {"name":"representative_phone","label":"Simu ya Mwakilishi","type":"phone","required":true}
 ]'::jsonb,
 2000.00, TRUE, NULL,
 '{"document_type":"KIBARI CHA MAZISHI","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Mwenyezi Mungu ailaze roho ya marehemu mahala pema peponi. Amina."}'::jsonb
),

-- 3. Kibari cha Sherehe (Celebration Permit)
('a1b2c3d4-0001-4000-8000-000000000003',
 'Kibari cha Sherehe', 'Celebration Permit',
 'Vibali vya matukio na sherehe za mtaani.',
 'Permits for events and street celebrations.',
 '[
   {"name":"section_event","label":"TAARIFA ZA SHEREHE","type":"header"},
   {"name":"event_type","label":"Aina ya Sherehe","type":"select","required":true,"options":[{"label":"SHEREHE YA HARUSI","value":"HARUSI"},{"label":"SHEREHE YA KUZALIWA","value":"KUZALIWA"},{"label":"SHEREHE YA GRADUATION","value":"GRADUATION"},{"label":"SHEREHE YA DINI","value":"DINI"},{"label":"NYINGINEZO","value":"NYINGINEZO"}]},
   {"name":"event_date","label":"Tarehe ya Sherehe","type":"date","required":true},
   {"name":"event_location","label":"Mahali pa Sherehe","type":"text","required":true},
   {"name":"expected_guests","label":"Idadi ya Wageni","type":"number"},
   {"name":"event_duration","label":"Muda wa Sherehe (masaa)","type":"number","required":true},
   {"name":"organizer_phone","label":"Namba ya Simu ya Mpangaji","type":"phone","required":true}
 ]'::jsonb,
 10000.00, TRUE, NULL,
 '{"document_type":"KIBARI CHA SHEREHE","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Kibali hiki kinapaswa kuonyeshwa kwa mamlaka za usalama pindi kikihitajika."}'::jsonb
),

-- 4. Kibari cha Ujezi Mdogo (Minor Construction Permit)
('a1b2c3d4-0001-4000-8000-000000000004',
 'Kibari cha Ujezi Mdogo', 'Minor Construction Permit',
 'Kibali cha ujenzi mdogo kama uzio, barabara ndogo, au marekebisho ya nyumba.',
 'Permit for minor construction such as fences, small roads, or house renovations.',
 '[
   {"name":"section_construction","label":"TAARIFA ZA UJENZI","type":"header"},
   {"name":"construction_type","label":"Aina ya Ujenzi","type":"select","required":true,"options":[{"label":"UZIO / UKUTA (Fence/Wall)","value":"UZIO"},{"label":"BARABAKA NDOGO","value":"BARABAKA"},{"label":"MAREKEBISHO YA NYUMBA","value":"MAREKEBISHO"},{"label":"CHUMBA CHA ZIADA","value":"CHUMBA"},{"label":"BWAWA / KISIMA","value":"BWAWA"},{"label":"NYINGINEZO","value":"NYINGINEZO"}]},
   {"name":"construction_description","label":"Maelezo ya Ujenzi","type":"textarea","required":true},
   {"name":"construction_location","label":"Mahali pa Ujenzi","type":"text","required":true},
   {"name":"estimated_cost","label":"Gharama Inayokadiriwa (TZS)","type":"number","required":true},
   {"name":"start_date","label":"Tarehe ya Kuanza","type":"date","required":true},
   {"name":"end_date","label":"Tarehe ya Kukamilika","type":"date","required":true},
   {"name":"contractor_name","label":"Jina la Fundi/Mkandarasi","type":"text","required":true},
   {"name":"contractor_phone","label":"Simu ya Fundi","type":"phone","required":true},
   {"name":"neighbors_notified","label":"Je, majirani wamearifiwa?","type":"select","required":true,"options":[{"label":"NDIYO","value":"YES"},{"label":"HAPANA","value":"NO"}]}
 ]'::jsonb,
 15000.00, TRUE, NULL,
 '{"document_type":"KIBARI CHA UJEZI MDOGO","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Kibali hiki kinapaswa kuonyeshwa pale kitakipohitajika na mamlaka husika."}'::jsonb
),

-- 5. Barua ya Utambulisho (Introduction Letter)
('a1b2c3d4-0001-4000-8000-000000000005',
 'Barua ya Utambulisho', 'Introduction Letter',
 'Barua rasmi kwa ajili ya kazi, shule, na huduma nyingine.',
 'Official letter for work, school, and other services.',
 '[
   {"name":"section_mkazi","label":"HATI YA MKAZI","type":"header"},
   {"name":"has_residence_certificate","label":"Je, una Hati ya Mkazi?","type":"select","options":[{"label":"NDIYO","value":"YES"},{"label":"HAPANA","value":"NO"}]},
   {"name":"mkazi_certificate_number","label":"Namba ya Hati ya Mkazi","type":"text","showIf":{"field":"has_residence_certificate","value":"YES"}},
   {"name":"section_purpose","label":"SABABU YA UTAMBULISHO","type":"header"},
   {"name":"purpose","label":"Sababu ya Barua","type":"select","required":true,"options":[{"label":"KUFUNGUA AKAUNTI YA BENKI","value":"BENKI"},{"label":"MAOMBI YA AJIRA","value":"AJIRA"},{"label":"MAOMBI YA CHUO/SHULE","value":"CHUO"},{"label":"KUPATA HUDUMA ZA AFYA","value":"AFYA"},{"label":"KUOMBA LESENI YA BIASHARA","value":"LESENI_BIASHARA"},{"label":"KUOMBA LESENI YA UDEREVA","value":"LESENI_UDEREVA"},{"label":"KUSAJILI SIMU","value":"SIMU"},{"label":"KUOMBA PASSPORT/VISA","value":"PASSPORT"},{"label":"KUPATA HUDUMA ZA TRA","value":"TRA"},{"label":"KUSAJILI MTOTO SHULENI","value":"KUSAJILI_MTOTO"},{"label":"NYINGINEZO","value":"NYINGINEZO"}]},
   {"name":"institution_1_name","label":"Jina la Taasisi","type":"text","required":true},
   {"name":"institution_1_address","label":"Anwani ya Taasisi","type":"text"},
   {"name":"additional_info","label":"Maelezo ya Ziada","type":"textarea"}
 ]'::jsonb,
 3000.00, TRUE, NULL,
 '{"document_type":"BARUA YA UTAMBULISHO","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Barua hii ni ya matumizi maalumu kwa taasisi iliyoainishwa hapo juu pekee."}'::jsonb
),

-- 6. Makubaliano ya Mauzo (Sales Agreement)
('a1b2c3d4-0001-4000-8000-000000000006',
 'Makubaliano ya Mauzo', 'Sales Agreement',
 'Makubaliano rasmi ya mauzo ya mali kati ya muuzaji na mnunuzi waliohakikishwa.',
 'Official sales agreement between verified seller and buyer.',
 '[]'::jsonb,
 0.00, TRUE, NULL,
 '{"document_type":"MAKUBALIANO YA MAUZO","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Makubaliano haya ni rasmi baada ya kuthibitishwa na Ofisi ya Serikali ya Mtaa."}'::jsonb
),

-- 7. Makubaliano ya Pango (Rental Agreement)
('a1b2c3d4-0001-4000-8000-000000000007',
 'Makubaliano ya Pango', 'Rental Agreement',
 'Mkataba rasmi wa kukodi nyumba kati ya mpangishaji na mpangaji waliohakikishwa.',
 'Official rental agreement between verified landlord and tenant.',
 '[]'::jsonb,
 10000.00, TRUE, NULL,
 '{"document_type":"MAKUBALIANO YA PANGO","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Mkataba huu ni rasmi baada ya kuthibitishwa na Ofisi ya Serikali ya Mtaa."}'::jsonb
),

-- 8. Malipo na Michango (Payments & Contributions)
('a1b2c3d4-0001-4000-8000-000000000008',
 'Malipo na Michango', 'Payments & Contributions',
 'Lipa faini, ada ya usafi, michango ya maendeleo, na malipo mengine kwa Serikali ya Mtaa.',
 'Pay fines, sanitation fees, development contributions, and other payments.',
 '[]'::jsonb,
 0.00, TRUE, NULL,
 '{"document_type":"RISITI YA MALIPO","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Risiti rasmi ya malipo kwa Serikali ya Mtaa."}'::jsonb
),

-- 9. Migogoro na Mashauri (Disputes & Local Issues)
('a1b2c3d4-0001-4000-8000-000000000009',
 'Migogoro na Mashauri', 'Disputes & Local Issues',
 'Wasilisha mgogoro wa kati ya raia au ripoti tatizo la kijamii.',
 'File a citizen dispute or report a community issue.',
 '[]'::jsonb,
 0.00, TRUE, NULL,
 '{"document_type":"TAARIFA YA SHAURI","header":{"country":"JAMHURI YA MUUNGANO WA TANZANIA","office":"OFISI YA RAIS - TAMISEMI"},"footer":"Shauri hili lipo chini ya uchunguzi wa Ofisi ya Serikali ya Mtaa."}'::jsonb
)
ON CONFLICT (name) DO NOTHING;

-- ================================================
-- PART 3: LOCATIONS (Tanzania Regions + Sample Districts)
-- ================================================
-- Regions
INSERT INTO public.locations (id, name, level, code) VALUES
('loc-reg-01', 'Dar es Salaam',    'region', 'DSM'),
('loc-reg-02', 'Dodoma',           'region', 'DOD'),
('loc-reg-03', 'Arusha',           'region', 'ARU'),
('loc-reg-04', 'Mwanza',           'region', 'MWA'),
('loc-reg-05', 'Mbeya',            'region', 'MBY'),
('loc-reg-06', 'Morogoro',         'region', 'MRG'),
('loc-reg-07', 'Tanga',            'region', 'TNG'),
('loc-reg-08', 'Iringa',           'region', 'IRG'),
('loc-reg-09', 'Moshi',            'region', 'MSH'),
('loc-reg-10', 'Kilimanjaro',      'region', 'KLM'),
('loc-reg-11', 'Geita',            'region', 'GEI'),
('loc-reg-12', 'Mara',             'region', 'MAR'),
('loc-reg-13', 'Kagera',           'region', 'KGR'),
('loc-reg-14', 'Kigoma',           'region', 'KGM'),
('loc-reg-15', 'Tabora',           'region', 'TAB'),
('loc-reg-16', 'Rukwa',            'region', 'RKW'),
('loc-reg-17', 'Katavi',           'region', 'KTV'),
('loc-reg-18', 'Singida',          'region', 'SNG'),
('loc-reg-19', 'Njombe',           'region', 'NJB'),
('loc-reg-20', 'Lindi',            'region', 'LND'),
('loc-reg-21', 'Mtwara',           'region', 'MTW'),
('loc-reg-22', 'Ruvuma',           'region', 'RVM'),
('loc-reg-23', 'Pwani',            'region', 'PWN'),
('loc-reg-24', 'Kaskazini Unguja', 'region', 'KUJ'),
('loc-reg-25', 'Kusini Unguja',    'region', 'KSU'),
('loc-reg-26', 'Mjini Magharibi',  'region', 'MJM'),
('loc-reg-27', 'Kaskazini Pemba',  'region', 'KPM'),
('loc-reg-28', 'Kusini Pemba',     'region', 'KSP'),
('loc-reg-29', 'Simiyu',           'region', 'SMY'),
('loc-reg-30', 'Songwe',           'region', 'SGW'),
('loc-reg-31', 'Shinyanga',        'region', 'SHN')
ON CONFLICT DO NOTHING;

-- Districts (Dar es Salaam municipalities)
INSERT INTO public.locations (id, name, level, parent_id, code) VALUES
('loc-dsm-01', 'Ilala',             'district', 'loc-reg-01', 'DSM-ILA'),
('loc-dsm-02', 'Kinondoni',         'district', 'loc-reg-01', 'DSM-KIN'),
('loc-dsm-03', 'Temeke',            'district', 'loc-reg-01', 'DSM-TEM'),
('loc-dsm-04', 'Ubungo',            'district', 'loc-reg-01', 'DSM-UBG'),
('loc-dsm-05', 'Kigamboni',         'district', 'loc-reg-01', 'DSM-KIG'),
('loc-dsm-06', 'Kivukoni',          'district', 'loc-reg-01', 'DSM-KVK'),
('loc-dsm-07', 'Ndugumbi',          'district', 'loc-reg-01', 'DSM-NDG'),
-- Dodoma districts
('loc-dod-01', 'Dodoma Mjini',      'district', 'loc-reg-02', 'DOD-MJN'),
('loc-dod-02', 'Dodoma Vijijini',   'district', 'loc-reg-02', 'DOD-VIJ'),
('loc-dod-03', 'Bahi',              'district', 'loc-reg-02', 'DOD-BAH'),
('loc-dod-04', 'Kondoa',            'district', 'loc-reg-02', 'DOD-KND'),
-- Arusha districts
('loc-aru-01', 'Arusha Mjini',      'district', 'loc-reg-03', 'ARU-MJN'),
('loc-aru-02', 'Arusha Vijijini',   'district', 'loc-reg-03', 'ARU-VIJ'),
('loc-aru-03', 'Meru',              'district', 'loc-reg-03', 'ARU-MER'),
('loc-aru-04', 'Karatu',            'district', 'loc-reg-03', 'ARU-KRT'),
-- Mwanza districts
('loc-mwa-01', 'Ilemela',           'district', 'loc-reg-04', 'MWA-ILE'),
('loc-mwa-02', 'Nyamagana',         'district', 'loc-reg-04', 'MWA-NYM'),
('loc-mwa-03', 'Kwimba',            'district', 'loc-reg-04', 'MWA-KWM'),
-- Mbeya districts
('loc-mby-01', 'Mbeya Mjini',       'district', 'loc-reg-05', 'MBY-MJN'),
('loc-mby-02', 'Mbeya Vijijini',    'district', 'loc-reg-05', 'MBY-VIJ'),
-- Morogoro districts
('loc-mrg-01', 'Morogoro Mjini',    'district', 'loc-reg-06', 'MRG-MJN'),
('loc-mrg-02', 'Morogoro Vijijini', 'district', 'loc-reg-06', 'MRG-VIJ'),
-- Tanga districts
('loc-tng-01', 'Tanga Mjini',       'district', 'loc-reg-07', 'TNG-MJN'),
('loc-tng-02', 'Tanga Vijijini',    'district', 'loc-reg-07', 'TNG-VIJ'),
-- Iringa districts
('loc-irg-01', 'Iringa Mjini',      'district', 'loc-reg-08', 'IRG-MJN'),
('loc-irg-02', 'Iringa Vijijini',   'district', 'loc-reg-08', 'IRG-VIJ')
ON CONFLICT DO NOTHING;

-- ================================================
-- PART 4: OFFICES (sample ward offices)
-- ================================================
INSERT INTO public.offices (name, code, region, district, ward, phone, email, address, active) VALUES
('Ofisi ya Mtaa Kariakoo',     'DSM-ILA-KAR-001', 'Dar es Salaam', 'Ilala',     'Kariakoo',       '+255222700100', 'kariakoo@tamisemi.go.tz', 'Kariakoo, Ilala, Dar es Salaam',          TRUE),
('Ofisi ya Mtaa Upanga',       'DSM-ILA-UPA-001', 'Dar es Salaam', 'Ilala',     'Upanga',         '+255222700200', 'upanga@tamisemi.go.tz',    'Upanga, Ilala, Dar es Salaam',              TRUE),
('Ofisi ya Mtaa Kinondoni',    'DSM-KIN-KND-001', 'Dar es Salaam', 'Kinondoni', 'Kinondoni',      '+255222700300', 'kinondoni@tamisemi.go.tz', 'Kinondoni, Dar es Salaam',                  TRUE),
('Ofisi ya Mtaa Mbezi',        'DSM-KIN-MBE-001', 'Dar es Salaam', 'Kinondoni', 'Mbezi',          '+255222700400', 'mbezi@tamisemi.go.tz',     'Mbezi, Kinondoni, Dar es Salaam',           TRUE),
('Ofisi ya Mtaa Temeke',       'DSM-TEM-TEM-001', 'Dar es Salaam', 'Temeke',    'Temeke',         '+255222700500', 'temeke@tamisemi.go.tz',    'Temeke, Dar es Salaam',                    TRUE),
('Ofisi ya Mtaa Mbagala',      'DSM-TEM-MBA-001', 'Dar es Salaam', 'Temeke',    'Mbagala',        '+255222700600', 'mbagala@tamisemi.go.tz',   'Mbagala, Temeke, Dar es Salaam',            TRUE),
('Ofisi ya Mtaa Ubungo',       'DSM-UBG-UBG-001', 'Dar es Salaam', 'Ubungo',    'Ubungo',         '+255222700700', 'ubungo@tamisemi.go.tz',    'Ubungo, Dar es Salaam',                    TRUE),
('Ofisi ya Mtaa Kigamboni',     'DSM-KIG-KIG-001', 'Dar es Salaam', 'Kigamboni', 'Kigamboni',      '+255222700800', 'kigamboni@tamisemi.go.tz', 'Kigamboni, Dar es Salaam',                 TRUE),
('Ofisi ya Mtaa Dodoma Mjini',  'DOD-MJN-DOD-001', 'Dodoma',        'Dodoma Mjini','Dodoma Mjini',  '+255262320100', 'dodoma.mjini@tamisemi.go.tz','Dodoma Mjini, Dodoma',                     TRUE),
('Ofisi ya Mtaa Arusha Mjini',  'ARU-MJN-ARU-001', 'Arusha',        'Arusha Mjini','Arusha Mjini',  '+255272520100', 'arusha.mjini@tamisemi.go.tz','Arusha Mjini, Arusha',                     TRUE),
('Ofisi ya Mtaa Ilemela',       'MWA-ILE-ILE-001', 'Mwanza',        'Ilemela',   'Ilemela',        '+255282520100', 'ilemela@tamisemi.go.tz',   'Ilemela, Mwanza',                         TRUE),
('Ofisi ya Mtaa Mbeya Mjini',   'MBY-MJN-MBY-001', 'Mbeya',         'Mbeya Mjini','Mbeya Mjini',    '+255292520100', 'mbeya.mjini@tamisemi.go.tz','Mbeya Mjini, Mbeya',                      TRUE),
('Ofisi ya Mtaa Morogoro Mjini','MRG-MJN-MRG-001', 'Morogoro',      'Morogoro Mjini','Morogoro Mjini', '+255232520100','morogoro.mjini@tamisemi.go.tz','Morogoro Mjini, Morogoro',               TRUE),
('Ofisi ya Mtaa Tanga Mjini',   'TNG-MJN-TNG-001', 'Tanga',         'Tanga Mjini','Tanga Mjini',   '+255272620100', 'tanga.mjini@tamisemi.go.tz','Tanga Mjini, Tanga',                      TRUE),
('Ofisi ya Mtaa Iringa Mjini',  'IRG-MJN-IRG-001', 'Iringa',        'Iringa Mjini','Iringa Mjini',  '+255272720100', 'iringa.mjini@tamisemi.go.tz','Iringa Mjini, Iringa',                    TRUE)
ON CONFLICT (code) DO NOTHING;

-- ================================================
-- PART 5: OFFICE REGISTRY (hierarchical)
-- ================================================
INSERT INTO public.office_registry (office_code, name, name_sw, name_en, office_type, region, district, ward, mtaa, department_type, phone, email, active) VALUES
-- Regional offices
('REG-DSM', 'Dar es Salaam Regional Office',   'Ofisi Mkoa wa Dar es Salaam',   'Dar es Salaam Regional Office',   'regional',   'Dar es Salaam', NULL, NULL, NULL, NULL, '+255222710000', 'dsm@tamisemi.go.tz',     TRUE),
('REG-DOD', 'Dodoma Regional Office',          'Ofisi Mkoa wa Dodoma',           'Dodoma Regional Office',          'regional',   'Dodoma',        NULL, NULL, NULL, NULL, '+255262310000', 'dod@tamisemi.go.tz',     TRUE),
('REG-ARU', 'Arusha Regional Office',          'Ofisi Mkoa wa Arusha',           'Arusha Regional Office',          'regional',   'Arusha',        NULL, NULL, NULL, NULL, '+255272510000', 'aru@tamisemi.go.tz',     TRUE),
('REG-MWA', 'Mwanza Regional Office',          'Ofisi Mkoa wa Mwanza',           'Mwanza Regional Office',          'regional',   'Mwanza',        NULL, NULL, NULL, NULL, '+255282510000', 'mwa@tamisemi.go.tz',     TRUE),
('REG-MBY', 'Mbeya Regional Office',           'Ofisi Mkoa wa Mbeya',            'Mbeya Regional Office',           'regional',   'Mbeya',         NULL, NULL, NULL, NULL, '+255292510000', 'mby@tamisemi.go.tz',     TRUE),
('REG-MRG', 'Morogoro Regional Office',       'Ofisi Mkoa wa Morogoro',         'Morogoro Regional Office',        'regional',   'Morogoro',      NULL, NULL, NULL, NULL, '+255232510000', 'mrg@tamisemi.go.tz',     TRUE),
-- District offices (sample)
('DIS-DSM-ILA', 'Ilala District Office',       'Ofisi Wilaya ya Ilala',          'Ilala District Office',           'district',   'Dar es Salaam', 'Ilala',     NULL, NULL, NULL, '+255222701000', 'ilala@tamisemi.go.tz',  TRUE),
('DIS-DSM-KIN', 'Kinondoni District Office',   'Ofisi Wilaya ya Kinondoni',      'Kinondoni District Office',       'district',   'Dar es Salaam', 'Kinondoni', NULL, NULL, NULL, '+255222702000', 'kinondoni@tamisemi.go.tz', TRUE),
('DIS-DSM-TEM', 'Temeke District Office',      'Ofisi Wilaya ya Temeke',         'Temeke District Office',          'district',   'Dar es Salaam', 'Temeke',    NULL, NULL, NULL, '+255222703000', 'temeke@tamisemi.go.tz',  TRUE),
('DIS-DSM-UBG', 'Ubungo District Office',      'Ofisi Wilaya ya Ubungo',         'Ubungo District Office',          'district',   'Dar es Salaam', 'Ubungo',    NULL, NULL, NULL, '+255222704000', 'ubungo@tamisemi.go.tz',  TRUE),
('DIS-DSM-KIG', 'Kigamboni District Office',    'Ofisi Wilaya ya Kigamboni',       'Kigamboni District Office',        'district',   'Dar es Salaam', 'Kigamboni', NULL, NULL, NULL, '+255222705000', 'kigamboni@tamisemi.go.tz', TRUE),
('DIS-DOD-MJN', 'Dodoma Mjini District Office','Ofisi Wilaya ya Dodoma Mjini',   'Dodoma Mjini District Office',    'district',   'Dodoma',        'Dodoma Mjini', NULL, NULL, NULL, '+255262301000', 'dod.mjini@tamisemi.go.tz', TRUE),
('DIS-ARU-MJN', 'Arusha Mjini District Office','Ofisi Wilaya ya Arusha Mjini',   'Arusha Mjini District Office',    'district',   'Arusha',        'Arusha Mjini', NULL, NULL, NULL, '+255272501000', 'aru.mjini@tamisemi.go.tz', TRUE),
('DIS-MWA-ILE', 'Ilemela District Office',      'Ofisi Wilaya ya Ilemela',        'Ilemela District Office',         'district',   'Mwanza',        'Ilemela',   NULL, NULL, NULL, '+255282501000', 'ilemela@tamisemi.go.tz',  TRUE),
('DIS-MBY-MJN', 'Mbeya Mjini District Office', 'Ofisi Wilaya ya Mbeya Mjini',    'Mbeya Mjini District Office',     'district',   'Mbeya',         'Mbeya Mjini', NULL, NULL, NULL, '+255292501000', 'mby.mjini@tamisemi.go.tz', TRUE),
('DIS-MRG-MJN', 'Morogoro Mjini District Office','Ofisi Wilaya ya Morogoro Mjini','Morogoro Mjini District Office',    'district',   'Morogoro',      'Morogoro Mjini', NULL, NULL, NULL, '+255232501000', 'mrg.mjini@tamisemi.go.tz', TRUE),
-- Ward offices (sample)
('WRD-DSM-ILA-KAR', 'Kariakoo Ward Office',   'Ofisi Kata ya Kariakoo',         'Kariakoo Ward Office',            'ward',       'Dar es Salaam', 'Ilala',     'Kariakoo', NULL, NULL, '+255222700100', 'kariakoo@tamisemi.go.tz', TRUE),
('WRD-DSM-ILA-UPA', 'Upanga Ward Office',     'Ofisi Kata ya Upanga',           'Upanga Ward Office',              'ward',       'Dar es Salaam', 'Ilala',     'Upanga',   NULL, NULL, '+255222700200', 'upanga@tamisemi.go.tz',    TRUE),
('WRD-DSM-KIN-KND', 'Kinondoni Ward Office',  'Ofisi Kata ya Kinondoni',        'Kinondoni Ward Office',           'ward',       'Dar es Salaam', 'Kinondoni', 'Kinondoni',NULL, NULL, '+255222700300', 'kinondoni@tamisemi.go.tz', TRUE),
('WRD-DSM-KIN-MBE', 'Mbezi Ward Office',      'Ofisi Kata ya Mbezi',            'Mbezi Ward Office',               'ward',       'Dar es Salaam', 'Kinondoni', 'Mbezi',    NULL, NULL, '+255222700400', 'mbezi@tamisemi.go.tz',     TRUE),
('WRD-DSM-TEM-TEM', 'Temeke Ward Office',     'Ofisi Kata ya Temeke',           'Temeke Ward Office',              'ward',       'Dar es Salaam', 'Temeke',    'Temeke',   NULL, NULL, '+255222700500', 'temeke@tamisemi.go.tz',    TRUE),
('WRD-DSM-TEM-MBA', 'Mbagala Ward Office',    'Ofisi Kata ya Mbagala',          'Mbagala Ward Office',             'ward',       'Dar es Salaam', 'Temeke',    'Mbagala',  NULL, NULL, '+255222700600', 'mbagala@tamisemi.go.tz',   TRUE),
('WRD-DSM-UBG-UBG', 'Ubungo Ward Office',     'Ofisi Kata ya Ubungo',           'Ubungo Ward Office',              'ward',       'Dar es Salaam', 'Ubungo',    'Ubungo',   NULL, NULL, '+255222700700', 'ubungo@tamisemi.go.tz',    TRUE),
('WRD-DSM-KIG-KIG', 'Kigamboni Ward Office',   'Ofisi Kata ya Kigamboni',        'Kigamboni Ward Office',           'ward',       'Dar es Salaam', 'Kigamboni', 'Kigamboni', NULL, NULL, '+255222700800', 'kigamboni@tamisemi.go.tz', TRUE),
('WRD-DOD-MJN-DOD', 'Dodoma Mjini Ward Office','Ofisi Kata ya Dodoma Mjini',    'Dodoma Mjini Ward Office',        'ward',       'Dodoma',        'Dodoma Mjini','Dodoma Mjini',NULL, NULL,'+255262320100', 'dodoma.mjini@tamisemi.go.tz', TRUE),
('WRD-ARU-MJN-ARU', 'Arusha Mjini Ward Office','Ofisi Kata ya Arusha Mjini',     'Arusha Mjini Ward Office',        'ward',       'Arusha',        'Arusha Mjini','Arusha Mjini',NULL, NULL,'+255272520100', 'arusha.mjini@tamisemi.go.tz', TRUE),
('WRD-MWA-ILE-ILE', 'Ilemela Ward Office',    'Ofisi Kata ya Ilemela',          'Ilemela Ward Office',             'ward',       'Mwanza',        'Ilemela',   'Ilemela',  NULL, NULL, '+255282520100', 'ilemela@tamisemi.go.tz',   TRUE),
('WRD-MBY-MJN-MBY', 'Mbeya Mjini Ward Office','Ofisi Kata ya Mbeya Mjini',      'Mbeya Mjini Ward Office',         'ward',       'Mbeya',         'Mbeya Mjini','Mbeya Mjini',NULL, NULL,'+255292520100', 'mbeya.mjini@tamisemi.go.tz', TRUE),
('WRD-MRG-MJN-MRG', 'Morogoro Mjini Ward Office','Ofisi Kata ya Morogoro Mjini','Morogoro Mjini Ward Office',        'ward',       'Morogoro',      'Morogoro Mjini','Morogoro Mjini',NULL,NULL,'+255232520100','morogoro.mjini@tamisemi.go.tz', TRUE),
('WRD-TNG-MJN-TNG', 'Tanga Mjini Ward Office','Ofisi Kata ya Tanga Mjini',      'Tanga Mjini Ward Office',         'ward',       'Tanga',         'Tanga Mjini','Tanga Mjini',NULL, NULL,'+255272620100', 'tanga.mjini@tamisemi.go.tz', TRUE),
('WRD-IRG-MJN-IRG', 'Iringa Mjini Ward Office','Ofisi Kata ya Iringa Mjini',     'Iringa Mjini Ward Office',        'ward',       'Iringa',        'Iringa Mjini','Iringa Mjini',NULL, NULL,'+255272720100', 'iringa.mjini@tamisemi.go.tz', TRUE)
ON CONFLICT (office_code) DO NOTHING;

-- ================================================
-- PART 6: STORAGE BUCKETS
-- ================================================
-- Create storage buckets for document uploads
-- The app uploads to storage.from("documents") in Agreement.tsx
-- We also need: avatars, receipts, agreements, generated-documents

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('documents',          'documents',          TRUE,  10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('avatars',            'avatars',            FALSE, 5242880,   ARRAY['image/jpeg','image/png','image/webp']),
  ('receipts',           'receipts',           TRUE,  10485760,  ARRAY['image/jpeg','image/png','application/pdf']),
  ('agreements',         'agreements',         TRUE,  10485760,  ARRAY['image/jpeg','image/png','image/webp','application/pdf']),
  ('generated-documents','generated-documents', TRUE,  10485760,  ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Storage policies for the documents bucket (public read, authenticated write)
CREATE POLICY "documents_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "documents_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.role() = 'authenticated');

CREATE POLICY "documents_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "documents_auth_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'documents' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Storage policies for avatars (owner only)
CREATE POLICY "avatars_owner_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]));

CREATE POLICY "avatars_owner_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "avatars_owner_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND (auth.uid()::text = (storage.foldername(name))[1]));

-- Storage policies for receipts (public read, authenticated write)
CREATE POLICY "receipts_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'receipts');

CREATE POLICY "receipts_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'receipts' AND auth.role() = 'authenticated');

-- Storage policies for agreements (public read, authenticated write)
CREATE POLICY "agreements_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'agreements');

CREATE POLICY "agreements_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'agreements' AND auth.role() = 'authenticated');

CREATE POLICY "agreements_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'agreements' AND auth.role() = 'authenticated');

-- Storage policies for generated-documents (public read, system insert)
CREATE POLICY "gen_docs_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'generated-documents');

CREATE POLICY "gen_docs_auth_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'generated-documents' AND auth.role() = 'authenticated');

CREATE POLICY "gen_docs_auth_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'generated-documents' AND auth.role() = 'authenticated');

-- ================================================
-- VERIFICATION
-- ================================================
SELECT 'service_categories' AS tbl, count(*) AS rows FROM public.service_categories
UNION ALL SELECT 'services', count(*) FROM public.services
UNION ALL SELECT 'locations', count(*) FROM public.locations
UNION ALL SELECT 'offices', count(*) FROM public.offices
UNION ALL SELECT 'office_registry', count(*) FROM public.office_registry
UNION ALL SELECT 'storage.buckets', count(*) FROM storage.buckets;
