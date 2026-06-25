ALTER TABLE photo_comments DROP CONSTRAINT IF EXISTS photo_comments_created_by_fkey;
ALTER TABLE photo_comments ADD COLUMN IF NOT EXISTS author_name TEXT;
ALTER TABLE photo_comments ADD COLUMN IF NOT EXISTS from_studio BOOLEAN NOT NULL DEFAULT FALSE;
