-- Enable Row Level Security and apply service_role based policies to all relevant tables

DO $$
DECLARE
    table_record RECORD;
BEGIN
    -- Iterate over all tables in the public schema
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
          AND tablename NOT IN (
            -- Exclude Supabase internal tables or others not needing this RLS
            'pg_stat_statements', 'pg_stat_statements_info', 
            'schema_migrations', -- Supabase internal for migrations
            'versions' -- if you are using a versioning table for migrations like `dbmate`
            -- Add any other tables that should be excluded here
            -- e.g., tables managed directly by Supabase extensions
          )
    LOOP
        RAISE NOTICE 'Processing table: %', table_record.tablename;

        -- Enable RLS for the table
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_record.tablename);

        -- Drop any pre-existing overly permissive policies as a cleanup (optional, but good practice)
        -- For example, if you had a policy that allowed 'anon' or 'authenticated' roles broadly
        -- EXECUTE format('DROP POLICY IF EXISTS "Allow public read access" ON public.%I;', table_record.tablename);
        -- EXECUTE format('DROP POLICY IF EXISTS "Allow authenticated users full access" ON public.%I;', table_record.tablename);

        -- Drop the specific policy if it already exists to ensure it's up-to-date
        EXECUTE format('DROP POLICY IF EXISTS "Allow API access only via service_role" ON public.%I;', table_record.tablename);
        
        -- Create the policy to allow all actions if the role is service_role
        -- This is typical for backend/API access where you want full control
        EXECUTE format('
            CREATE POLICY "Allow API access only via service_role"
            ON public.%I
            FOR ALL
            USING (auth.role() = ''service_role'')
            WITH CHECK (auth.role() = ''service_role'');',
            table_record.tablename
        );
        
        RAISE NOTICE 'Applied service_role RLS policy to table: %', table_record.tablename;
    END LOOP;
END $$;

-- Special handling for user_roles if it requires different RLS.
-- For now, applying the same generic policy. If user_roles needs to be accessible
-- by users for their own roles, a more specific policy would be needed.
-- For example, allowing users to read their own entry.
-- Example (adjust as needed):
-- DROP POLICY IF EXISTS "Allow API access only via service_role" ON public.user_roles;
-- CREATE POLICY "Users can read their own role"
-- ON public.user_roles
-- FOR SELECT
-- USING (auth.uid() = user_id);
--
-- CREATE POLICY "Service role can manage all user roles"
-- ON public.user_roles
-- FOR ALL
-- USING (auth.role() = 'service_role')
-- WITH CHECK (auth.role() = 'service_role');


-- Note: The `placeholder_users_cleanup` table was previously set with
-- `ALTER TABLE placeholder_users_cleanup DISABLE ROW LEVEL SECURITY;`
-- and `GRANT ALL ON placeholder_users_cleanup TO authenticated;`
-- This new RLS will override that. If it needs to remain accessible by 'authenticated' role
-- for specific operations (like the cleanup function if it's not run as service_role),
-- it would need its own policy.
-- For now, it will also be restricted to service_role only.

-- RAISE NOTICE 'RLS setup for API access (service_role) completed for all public tables.';
