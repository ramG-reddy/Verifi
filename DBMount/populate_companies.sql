-- Script to populate companies table from CSV file

-- Create a temporary table to load CSV data
CREATE TEMP TABLE temp_companies (
    registrationId TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    companyType TEXT,
    status TEXT,
    website TEXT
);

-- Copy data from CSV file
\COPY temp_companies FROM '/data/companies.csv' WITH CSV HEADER;

-- Insert data into the main companies table
INSERT INTO companies (
    "registrationId",
    "name",
    "email",
    "phone",
    "address", 
    "companyType",
    "status",
    "website",
    "createdAt",
    "updatedAt"
)
SELECT 
    "registrationId",
    "name",
    NULLIF("email", ''),
    NULLIF("phone", ''),
    NULLIF("address", ''),
    NULLIF("companyType", ''),
    COALESCE(NULLIF("status", ''), 'ACTIVE'),
    NULLIF("website", ''),
    NOW(),
    NOW()
FROM temp_companies
WHERE "registrationId" IS NOT NULL AND "registrationId" != ''
ON CONFLICT ("registrationId") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "address" = EXCLUDED."address",
    "companyType" = EXCLUDED."companyType",
    "status" = EXCLUDED."status",
    "website" = EXCLUDED."website",
    "updatedAt" = NOW();

-- Clean up
DROP TABLE temp_companies;

-- Display count of inserted records
SELECT COUNT(*) as total_companies FROM companies;
