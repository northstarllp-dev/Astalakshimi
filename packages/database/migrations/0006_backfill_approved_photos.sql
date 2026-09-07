-- Idempotent backfill for photo moderation.
--
-- Photo moderation was never wired up: every photo was inserted as 'pending'
-- and nothing ever transitioned it. Reads now filter on status='approved', so
-- existing pending photos would vanish from the site.
--
-- Safe to run repeatedly: only touches rows still in 'pending'.
-- Rejected photos are left alone.
UPDATE profile_photos SET status = 'approved' WHERE status = 'pending';
