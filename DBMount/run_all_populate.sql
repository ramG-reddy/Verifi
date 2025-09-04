-- -- Ensure required extensions (UUID, etc.) if needed
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -- ================================
-- -- 1. Create Tables (matching Prisma schema)
-- -- ================================
-- CREATE TABLE IF NOT EXISTS advisors (
--     id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
--     registrationId  TEXT UNIQUE NOT NULL,
--     name            TEXT NOT NULL,
--     email           TEXT,
--     phone           TEXT,
--     address         TEXT,
--     status          TEXT DEFAULT 'ACTIVE',
--     registrationDate TIMESTAMP,
--     expiryDate      TIMESTAMP,
--     category        TEXT,
--     qualifications  TEXT,
--     specialization  TEXT,
--     createdAt       TIMESTAMP DEFAULT NOW(),
--     updatedAt       TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS companies (
--     id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
--     registrationId  TEXT UNIQUE NOT NULL,
--     name            TEXT NOT NULL,
--     email           TEXT,
--     phone           TEXT,
--     address         TEXT,
--     companyType     TEXT,
--     status          TEXT DEFAULT 'ACTIVE',
--     registrationDate TIMESTAMP,
--     expiryDate      TIMESTAMP,
--     website         TEXT,
--     createdAt       TIMESTAMP DEFAULT NOW(),
--     updatedAt       TIMESTAMP DEFAULT NOW()
-- );

-- CREATE TABLE IF NOT EXISTS ipos (
--     id              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
--     companyId       TEXT NOT NULL,
--     name            TEXT NOT NULL,
--     symbol          TEXT,
--     issueSize       NUMERIC,
--     priceRange      TEXT,
--     openDate        TIMESTAMP,
--     closeDate       TIMESTAMP,
--     listingDate     TIMESTAMP,
--     status          TEXT DEFAULT 'UPCOMING',
--     exchange        TEXT,
--     createdAt       TIMESTAMP DEFAULT NOW(),
--     updatedAt       TIMESTAMP DEFAULT NOW(),
--     CONSTRAINT fk_company FOREIGN KEY (companyId) REFERENCES companies(id)
-- );

-- ================================
-- 2. Import Data from CSVs
-- ================================

COPY advisors(registration_id, name, email, phone, address, status, registration_date, expiry_date, category, qualifications, specialization)
FROM '/data/advisors.csv'
DELIMITER ','
CSV HEADER
NULL '';

COPY companies(registration_id, name, email, phone, address, company_type, status, registration_date, expiry_date, website)
FROM '/data/companies.csv'
DELIMITER ','
CSV HEADER
NULL '';

COPY ipos(company_id, name, symbol, issue_size, price_range, open_date, close_date, listing_date, status, exchange)
FROM '/data/ipos.csv'
DELIMITER ','
CSV HEADER
NULL '';


-- ================================
-- 3. Verification / Summary Query
-- ================================
SELECT 
    (SELECT COUNT(*) FROM advisors)   AS total_advisors,
    (SELECT COUNT(*) FROM companies)  AS total_companies,
    (SELECT COUNT(*) FROM ipos)       AS total_ipos;
