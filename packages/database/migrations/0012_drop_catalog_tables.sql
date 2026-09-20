-- Drop redundant education/career catalog FK columns from profiles.
-- The flat columns (education_level, degree, college_name, employment_status,
-- profession, company_name, company_sector, annual_income) already hold the
-- human-readable values; the FK ids were legacy. The @astalakshimi/reference
-- package is now the source of truth for dropdowns (cities, communities,
-- religions, mother tongues). Education/occupation/company are enum + free text.

-- 1. Drop FK columns from profiles (constraints dropped via cascade).
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "education_id";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "specialization_id";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "occupation_id";
ALTER TABLE "profiles" DROP COLUMN IF EXISTS "company_id";

-- 2. Drop catalog tables (and their alias tables via CASCADE).
DROP TABLE IF EXISTS "education_aliases" CASCADE;
DROP TABLE IF EXISTS "specializations" CASCADE;
DROP TABLE IF EXISTS "education_levels" CASCADE;

DROP TABLE IF EXISTS "occupation_aliases" CASCADE;
DROP TABLE IF EXISTS "company_aliases" CASCADE;
DROP TABLE IF EXISTS "companies" CASCADE;
DROP TABLE IF EXISTS "occupations" CASCADE;

DROP TABLE IF EXISTS "subcaste_aliases" CASCADE;
DROP TABLE IF EXISTS "subcastes" CASCADE;
DROP TABLE IF EXISTS "gotra_aliases" CASCADE;
DROP TABLE IF EXISTS "gotras" CASCADE;
DROP TABLE IF EXISTS "community_aliases" CASCADE;
DROP TABLE IF EXISTS "communities" CASCADE;

DROP TABLE IF EXISTS "city_aliases" CASCADE;
DROP TABLE IF EXISTS "cities" CASCADE;
DROP TABLE IF EXISTS "states" CASCADE;

-- 3. Drop now-unused sequences (orphaned after table drops).
DROP SEQUENCE IF EXISTS "cities_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "city_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "communities_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "community_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "companies_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "company_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "education_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "education_levels_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "gotra_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "gotras_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "occupation_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "occupations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "specializations_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "states_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "subcaste_aliases_id_seq" CASCADE;
DROP SEQUENCE IF EXISTS "subcastes_id_seq" CASCADE;
