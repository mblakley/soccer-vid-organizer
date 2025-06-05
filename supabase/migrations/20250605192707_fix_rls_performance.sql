-- Update RLS policies to use subqueries for auth.role() to prevent re-evaluation per row

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
        -- Drop the existing policy
        EXECUTE format('DROP POLICY IF EXISTS "Allow API access only via service_role" ON public.%I;', table_record.tablename);
        
        -- Create the policy with subquery to prevent re-evaluation per row
        EXECUTE format('
            CREATE POLICY "Allow API access only via service_role"
            ON public.%I
            FOR ALL
            USING ((SELECT auth.role()) = ''service_role'')
            WITH CHECK ((SELECT auth.role()) = ''service_role'');',
            table_record.tablename
        );
    END LOOP;
END $$;
