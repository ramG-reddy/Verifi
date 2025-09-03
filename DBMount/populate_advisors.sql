-- Script to populate advisors table from CSV file

-- Create a temporary table to load CSV data
CREATE TEMP TABLE temp_advisors (
    registrationId TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    status TEXT,
    category TEXT,
    qualifications TEXT,
    specialization TEXT
);

-- Copy data from CSV file
\COPY temp_advisors FROM '/data/advisors.csv' WITH CSV HEADER;

-- Insert data into the main advisors table
INSERT INTO advisors (
    "registrationId",
    "name",
    "email",
    "phone", 
    "address",
    "status",
    "category",
    "qualifications",
    "specialization",
    "createdAt",
    "updatedAt"
)
SELECT 
    "registrationId",
    "name",
    NULLIF("email", ''),
    NULLIF("phone", ''),
    NULLIF("address", ''),
    COALESCE(NULLIF("status", ''), 'ACTIVE'),
    NULLIF("category", ''),
    NULLIF("qualifications", ''),
    NULLIF("specialization", ''),
    NOW(),
    NOW()
FROM temp_advisors
WHERE "registrationId" IS NOT NULL AND "registrationId" != ''
ON CONFLICT ("registrationId") DO UPDATE SET
    "name" = EXCLUDED."name",
    "email" = EXCLUDED."email",
    "phone" = EXCLUDED."phone",
    "address" = EXCLUDED."address",
    "status" = EXCLUDED."status",
    "category" = EXCLUDED."category",
    "qualifications" = EXCLUDED."qualifications",
    "specialization" = EXCLUDED."specialization",
    "updatedAt" = NOW();

-- Clean up
DROP TABLE temp_advisors;

-- Display count of inserted records
SELECT COUNT(*) as total_advisors FROM advisors;
