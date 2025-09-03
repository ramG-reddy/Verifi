-- Master script to populate all tables

\echo 'Starting database population...'

\echo 'Populating advisors table...'
-- \i /data/populate_advisors.sql
\copy advisors FROM '/data/advisors.csv' WITH CSV HEADER

\echo 'Populating companies table...'
-- \i /data/populate_companies.sql
\copy companies FROM '/data/companies.csv' WITH CSV HEADER

\echo 'Populating ipos table...'
-- \i /data/populate_ipos.sql
\copy ipos FROM '/data/ipos.csv' WITH CSV HEADER

\echo 'Database population completed!'
\echo 'Summary:'
SELECT 
    'advisors' as table_name, 
    COUNT(*) as record_count 
FROM advisors
UNION ALL
SELECT 
    'companies' as table_name, 
    COUNT(*) as record_count 
FROM companies
UNION ALL
SELECT 
    'ipos' as table_name, 
    COUNT(*) as record_count 
FROM ipos;
