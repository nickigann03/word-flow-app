-- Add parent_id column to folders table for nested sub-folders
ALTER TABLE folders ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES folders(id) ON DELETE SET NULL;

-- Create an index for efficient parent-child lookups
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
