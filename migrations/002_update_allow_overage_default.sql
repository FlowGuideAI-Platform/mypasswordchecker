-- Migration: Update allow_overage default to 1 (block overages by default)
-- Date: November 5, 2025
-- Purpose: Change overage behavior - default to blocking overages to prevent unexpected charges

-- Update existing records to block overages by default (set to 1)
-- Note: allow_overage = 1 means "block overages" (prevent charges)
--       allow_overage = 0 means "allow overages" (charge for usage over quota)
UPDATE api_keys
SET allow_overage = 1
WHERE allow_overage = 0;

-- Note: SQLite doesn't support ALTER COLUMN DEFAULT directly
-- The default is already set to 0 in the schema
-- We'll handle the default value of 1 in the application code when creating new API keys
