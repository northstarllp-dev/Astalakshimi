-- Denormalized discoverability flag: true when every Layer-B required field
-- is filled (mirrors requiredFieldsComplete + search/matches eligibility).
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS required_complete boolean NOT NULL DEFAULT false;

-- Backfill from current sibling rows + photos.
UPDATE profiles p
SET required_complete = (
  NULLIF(BTRIM(p.profile_for), '') IS NOT NULL
  AND NULLIF(BTRIM(p.full_name), '') IS NOT NULL
  AND NULLIF(BTRIM(p.gender::TEXT), '') IS NOT NULL
  AND p.dob IS NOT NULL
  AND NULLIF(BTRIM(p.marital_status::TEXT), '') IS NOT NULL
  AND NULLIF(BTRIM(p.city), '') IS NOT NULL
  AND p.height_cm IS NOT NULL
  AND NULLIF(BTRIM(p.religion), '') IS NOT NULL
  AND NULLIF(BTRIM(p.caste), '') IS NOT NULL
  AND NULLIF(BTRIM(p.mother_tongue), '') IS NOT NULL
  AND (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id) >= 1
  AND EXISTS (
    SELECT 1 FROM lifestyle_interests li
    WHERE li.profile_id = p.id
      AND NULLIF(BTRIM(li.diet::TEXT), '') IS NOT NULL
  )
  AND EXISTS (
    SELECT 1 FROM horoscopes h
    WHERE h.profile_id = p.id
      AND NULLIF(BTRIM(h.nakshatra), '') IS NOT NULL
      AND NULLIF(BTRIM(h.rashi), '') IS NOT NULL
      AND NULLIF(BTRIM(h.manglik::TEXT), '') IS NOT NULL
      AND NULLIF(BTRIM(h.birth_time), '') IS NOT NULL
      AND NULLIF(BTRIM(h.birth_place), '') IS NOT NULL
  )
  AND (
    NULLIF(BTRIM(p.education_level::TEXT), '') IS NOT NULL
    OR NULLIF(BTRIM(p.degree), '') IS NOT NULL
  )
  AND (
    NULLIF(BTRIM(p.employment_status::TEXT), '') IS NOT NULL
    OR NULLIF(BTRIM(p.profession), '') IS NOT NULL
  )
  AND NULLIF(BTRIM(p.annual_income), '') IS NOT NULL
),
updated_at = NOW();

CREATE INDEX IF NOT EXISTS profiles_required_complete_idx
  ON profiles (required_complete)
  WHERE required_complete = true;
