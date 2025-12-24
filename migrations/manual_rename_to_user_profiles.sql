-- Migration to rename vendor_profiles to user_profiles and add new fields
-- Run this on your Neon database

-- Step 1: Create the type_of_buyer enum if it doesn't exist
DO $$ BEGIN
    CREATE TYPE type_of_buyer AS ENUM (
        'individual',
        'business',
        'government',
        'reseller',
        'manufacturer',
        'distributor',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Rename the table
ALTER TABLE IF EXISTS vendor_profiles RENAME TO user_profiles;

-- Step 3: Add new columns
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS type_of_buyer type_of_buyer,
ADD COLUMN IF NOT EXISTS compliance_registration TEXT;

-- Step 4: Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_type_of_buyer ON user_profiles(type_of_buyer);

-- Done!
