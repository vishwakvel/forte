-- Individual artist names for collab tracks (e.g. Future + The Weeknd)
ALTER TABLE songs ADD COLUMN IF NOT EXISTS artists text[];

-- Backfill from comma-separated display string where possible
UPDATE songs SET artists = string_to_array(artist, ', ')
WHERE artists IS NULL AND artist IS NOT NULL;
