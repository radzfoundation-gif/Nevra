-- Optional: Update existing users.id to match Clerk user IDs
-- Run this AFTER migrate-uuid-to-text-safe.sql
-- Only needed if you have existing users that need to sync with Clerk

-- =====================================================
-- STEP 1: Check current users
-- =====================================================
SELECT id, email, full_name FROM public.users;

-- =====================================================
-- STEP 2: Update users.id to match Clerk IDs
-- =====================================================
-- IMPORTANT: Replace with actual Clerk user IDs
-- Format: 'user_xxx' (from Clerk)

-- Example (replace with your actual data):
-- UPDATE public.users 
-- SET id = 'user_36aUWzGZ3wfC30vKNgnezhpx89j'
-- WHERE email = 'user@example.com';

-- Or if you have a mapping table:
-- UPDATE public.users u
-- SET id = m.clerk_id
-- FROM user_mapping m
-- WHERE u.email = m.email;

-- =====================================================
-- STEP 3: Verify updates
-- =====================================================
SELECT id, email FROM public.users;
-- All IDs should now be in format 'user_xxx'

-- =====================================================
-- NOTES:
-- =====================================================
-- If you're starting fresh with Clerk:
-- - Users will be created automatically via syncUser() function
-- - No need to run this script
--
-- If you have existing users:
-- - You need to map UUID -> Clerk ID
-- - Update users.id to match Clerk user IDs
-- - Or let Clerk create new users and migrate data






















