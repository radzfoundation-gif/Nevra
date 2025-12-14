-- Verify and Fix ai_usage.user_id type
-- Run this to check and fix if migration didn't complete

-- =====================================================
-- STEP 1: CHECK CURRENT TYPE
-- =====================================================
SELECT 
    table_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ai_usage'
    AND column_name = 'user_id';

-- If data_type = 'uuid', then we need to fix it
-- If data_type = 'text', then migration worked but there's another issue

-- =====================================================
-- STEP 2: FIX ai_usage.user_id (if still UUID)
-- =====================================================
-- Only run this if Step 1 shows data_type = 'uuid'

-- Drop policies
DROP POLICY IF EXISTS "Users can view own usage" ON public.ai_usage;
DROP POLICY IF EXISTS "Users can insert own usage" ON public.ai_usage;

-- Drop foreign key
ALTER TABLE public.ai_usage 
DROP CONSTRAINT IF EXISTS ai_usage_user_id_fkey;

-- Convert column type
ALTER TABLE public.ai_usage 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Recreate foreign key
ALTER TABLE public.ai_usage
ADD CONSTRAINT ai_usage_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES public.users(id) 
ON DELETE CASCADE;

-- Recreate policies
CREATE POLICY "Users can view own usage" ON public.ai_usage
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own usage" ON public.ai_usage
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- =====================================================
-- STEP 3: VERIFY FIX
-- =====================================================
-- Check type again (should be 'text')
SELECT 
    column_name,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'ai_usage'
    AND column_name = 'user_id';

-- Test query (should work now)
SELECT * FROM public.ai_usage 
WHERE user_id = 'user_36aUWzGZ3wfC30vKNgnezhpx89j';






















