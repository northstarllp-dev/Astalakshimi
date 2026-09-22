-- Backfill for the onboarding verification gate.
--
-- Before the gate, complete-registration auto-created verifications with
-- status='pending' even when the profile was incomplete, so those rows sit in
-- the admin review queue for profiles that could never have submitted.
-- The gate's state machine says pending requires every required field, so
-- demote those legacy rows back to 'idle' (ready_to_submit once complete).
--
-- Mirrors apps/api/src/profiles/required-fields-complete.ts field-for-field:
-- a row stays pending only when profile + lifestyle + horoscope + photo
-- requirements all hold. photoCount counts every photo row (same as the
-- service, which counts all profile_photos for the profile).
--
-- Safe to run repeatedly: only touches rows still in 'pending' that fail the
-- required check. reviewed_* columns are cleared so a stale rejection from
-- the pre-gate era cannot resurface.
UPDATE verifications v
SET status = 'idle',
    rejection_reason = NULL,
    reviewed_by = NULL,
    reviewed_at = NULL,
    updated_at = NOW()
FROM profiles p
LEFT JOIN lifestyle_interests li ON li.profile_id = p.id
LEFT JOIN horoscopes h ON h.profile_id = p.id
WHERE v.profile_id = p.id
  AND v.status = 'pending'
  AND (
    NULLIF(BTRIM(p.profile_for), '') IS NULL
    OR NULLIF(BTRIM(p.full_name), '') IS NULL
    OR NULLIF(BTRIM(p.gender::TEXT), '') IS NULL
    OR p.dob IS NULL
    OR NULLIF(BTRIM(p.marital_status::TEXT), '') IS NULL
    OR NULLIF(BTRIM(p.city), '') IS NULL
    OR p.height_cm IS NULL
    OR NULLIF(BTRIM(p.religion), '') IS NULL
    OR NULLIF(BTRIM(p.caste), '') IS NULL
    OR NULLIF(BTRIM(p.mother_tongue), '') IS NULL
    OR (SELECT COUNT(*) FROM profile_photos ph WHERE ph.profile_id = p.id) < 1
    OR NULLIF(BTRIM(li.diet::TEXT), '') IS NULL
    OR (NULLIF(BTRIM(h.nakshatra), '') IS NULL)
    OR NULLIF(BTRIM(h.rashi), '') IS NULL
    OR NULLIF(BTRIM(h.manglik::TEXT), '') IS NULL
    OR NULLIF(BTRIM(h.birth_time), '') IS NULL
    OR NULLIF(BTRIM(h.birth_place), '') IS NULL
    OR (NULLIF(BTRIM(p.education_level::TEXT), '') IS NULL AND NULLIF(BTRIM(p.degree), '') IS NULL)
    OR (NULLIF(BTRIM(p.employment_status::TEXT), '') IS NULL AND NULLIF(BTRIM(p.profession), '') IS NULL)
    OR NULLIF(BTRIM(p.annual_income), '') IS NULL
  );
