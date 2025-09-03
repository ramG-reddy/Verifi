-- Script to populate ipos table from CSV file

-- Create a temporary table to load CSV data
CREATE TEMP TABLE temp_ipos (
    name TEXT,
    symbol TEXT,
    issueSize TEXT,
    priceRange TEXT,
    openDate TEXT,
    closeDate TEXT,
    listingDate TEXT,
    status TEXT,
    exchange TEXT
);

-- Copy data from CSV file
\COPY temp_ipos FROM '/data/ipos.csv' WITH CSV HEADER;

-- Insert data into the main ipos table
INSERT INTO ipos (
    "name",
    "symbol",
    "issueSize",
    "priceRange",
    "openDate",
    "closeDate",
    "listingDate",
    "status",
    "exchange",
    "createdAt",
    "updatedAt"
)
SELECT 
    "name",
    NULLIF("symbol", ''),
    CASE 
        WHEN "issueSize" = '' OR "issueSize" IS NULL THEN NULL
        ELSE CAST("issueSize" AS DECIMAL)
    END,
    NULLIF("priceRange", ''),
    CASE 
        WHEN "openDate" = '' OR "openDate" IS NULL THEN NULL
        ELSE TO_DATE("openDate", 'YYYY-MM-DD')
    END,
    CASE 
        WHEN "closeDate" = '' OR "closeDate" IS NULL THEN NULL
        ELSE TO_DATE("closeDate", 'YYYY-MM-DD')
    END,
    CASE 
        WHEN "listingDate" = '' OR "listingDate" IS NULL OR "listingDate" = 'Yet to list' THEN NULL
        ELSE TO_DATE("listingDate", 'YYYY-MM-DD')
    END,
    COALESCE(NULLIF("status", ''), 'UPCOMING'),
    NULLIF("exchange", ''),
    NOW(),
    NOW()
FROM temp_ipos
WHERE "name" IS NOT NULL AND "name" != '';

-- Clean up
DROP TABLE temp_ipos;

-- Display count of inserted records
SELECT COUNT(*) as total_ipos FROM ipos;
