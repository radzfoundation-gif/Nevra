-- Fix chat_sessions.user_id type from UUID to TEXT
-- This is required because Clerk user IDs are TEXT format (user_xxx), not UUID
-- Run this in Supabase SQL Editor

-- =====================================================
-- STEP 1: CHECK CURRENT TYPE
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'chat_sessions'
    AND column_name = 'user_id';

-- =====================================================
-- STEP 2: DROP ALL POLICIES THAT DEPEND ON chat_sessions.user_id
-- =====================================================
-- Drop policies on chat_sessions table
DROP POLICY IF EXISTS "Users can view own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can create own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can update own sessions" ON public.chat_sessions;
DROP POLICY IF EXISTS "Users can delete own sessions" ON public.chat_sessions;

-- Drop policies on messages table that reference chat_sessions.user_id
DROP POLICY IF EXISTS "Users can view messages in own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can create messages in own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can update messages in own sessions" ON public.messages;
DROP POLICY IF EXISTS "Users can delete messages in own sessions" ON public.messages;

-- =====================================================
-- STEP 3: DROP FOREIGN KEY AND INDEXES
-- =====================================================
-- Drop foreign key constraint
ALTER TABLE IF EXISTS public.chat_sessions 
DROP CONSTRAINT IF EXISTS chat_sessions_user_id_fkey;

-- Drop indexes that might depend on user_id
DROP INDEX IF EXISTS idx_chat_sessions_user_id;

-- =====================================================
-- STEP 4: ALTER COLUMN TYPE
-- =====================================================
-- Convert user_id from UUID to TEXT
-- This preserves existing UUID data by converting to text format
ALTER TABLE public.chat_sessions 
ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- =====================================================
-- STEP 5: RECREATE FOREIGN KEY
-- =====================================================
-- Recreate foreign key constraint (users.id should already be TEXT)
ALTER TABLE public.chat_sessions
ADD CONSTRAINT chat_sessions_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

-- =====================================================
-- STEP 6: RECREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_created_at ON public.chat_sessions(created_at DESC);

-- =====================================================
-- STEP 7: RECREATE POLICIES
-- =====================================================
-- Recreate chat_sessions policies
CREATE POLICY "Users can view own sessions" ON public.chat_sessions
    FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create own sessions" ON public.chat_sessions
    FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own sessions" ON public.chat_sessions
    FOR UPDATE USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own sessions" ON public.chat_sessions
    FOR DELETE USING (auth.uid()::text = user_id);

-- Recreate messages policies that reference chat_sessions.user_id
CREATE POLICY "Users can view messages in own sessions" ON public.messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create messages in own sessions" ON public.messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can update messages in own sessions" ON public.messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete messages in own sessions" ON public.messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM public.chat_sessions
            WHERE chat_sessions.id = messages.session_id
            AND chat_sessions.user_id = auth.uid()::text
        )
    );

-- =====================================================
-- STEP 8: VERIFY
-- =====================================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
    AND table_name = 'chat_sessions'
    AND column_name = 'user_id';
