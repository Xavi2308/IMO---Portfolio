-- Fix RLS infinite recursion in user_companies table
-- The error "infinite recursion detected in policy for relation user_companies" 
-- indicates a policy that references itself or creates a circular dependency

-- First, let's disable RLS temporarily to examine the policies
ALTER TABLE public.user_companies DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies for user_companies to start fresh
DROP POLICY IF EXISTS "Users can view their own company relationships" ON public.user_companies;
DROP POLICY IF EXISTS "Users can insert their own company relationships" ON public.user_companies;
DROP POLICY IF EXISTS "Users can update their own company relationships" ON public.user_companies;
DROP POLICY IF EXISTS "Users can delete their own company relationships" ON public.user_companies;
DROP POLICY IF EXISTS "Enable read access for own user_companies" ON public.user_companies;
DROP POLICY IF EXISTS "Enable insert for own user_companies" ON public.user_companies;
DROP POLICY IF EXISTS "Enable update for own user_companies" ON public.user_companies;
DROP POLICY IF EXISTS "Enable delete for own user_companies" ON public.user_companies;

-- Create simple, non-recursive policies
-- Users can only see their own records
CREATE POLICY "user_companies_select_policy" ON public.user_companies
    FOR SELECT USING (
        user_id = auth.uid()
    );

-- Users can insert records for themselves
CREATE POLICY "user_companies_insert_policy" ON public.user_companies
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
    );

-- Users can update their own records
CREATE POLICY "user_companies_update_policy" ON public.user_companies
    FOR UPDATE USING (
        user_id = auth.uid()
    );

-- Users can delete their own records
CREATE POLICY "user_companies_delete_policy" ON public.user_companies
    FOR DELETE USING (
        user_id = auth.uid()
    );

-- Re-enable RLS
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Test the fix
SELECT 'RLS policies fixed for user_companies' as status;