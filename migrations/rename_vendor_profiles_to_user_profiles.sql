-- Migration: Rename vendor_profiles to user_profiles and add new fields
-- This migration renames the vendor_profiles table to user_profiles and adds type_of_buyer and compliance_registration fields

-- Step 1: Create type_of_buyer enum
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
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Rename the table
ALTER TABLE IF EXISTS vendor_profiles RENAME TO user_profiles;

-- Step 3: Add new columns to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS type_of_buyer type_of_buyer,
ADD COLUMN IF NOT EXISTS compliance_registration TEXT;

-- Step 4: Add comments for documentation
COMMENT ON COLUMN user_profiles.type_of_buyer IS 'Type of buyer/user (individual, business, government, etc.)';
COMMENT ON COLUMN user_profiles.compliance_registration IS 'Compliance registration document URL (supports jpeg, png, pdf, mp4 formats)';

-- Step 5: Update any foreign key constraints or indexes if needed
-- (Add any specific constraint updates here if needed)

-- Optional: Create an index on type_of_buyer for faster queries
CREATE INDEX IF NOT EXISTS idx_user_profiles_type_of_buyer ON user_profiles(type_of_buyer);

-- Migration complete
-- Note: After running this migration, update your application code to use:
-- - user_profiles instead of vendor_profiles
-- - getUserProfile() instead of getVendorProfile()
-- - createUserProfile() instead of createVendorProfile()
-- - updateUserProfile() instead of updateVendorProfile()
