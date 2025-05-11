-- Add pending_review field to user_roles table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'user_roles'
    AND column_name = 'pending_review'
  ) THEN
    ALTER TABLE user_roles 
    ADD COLUMN pending_review boolean NOT NULL DEFAULT true;
  END IF;
END $$;

-- Modify the JWT claims function to only include approved roles
CREATE OR REPLACE FUNCTION public.jwt_custom_claims(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SET search_path = 'public'
AS $$
  DECLARE
    claims jsonb;
    roles jsonb;
  BEGIN
    -- Fetch all roles for the user as a JSON array, but only include approved roles
    SELECT jsonb_agg(role) 
    INTO roles
    FROM public.user_roles 
    WHERE user_id = (event->>'user_id')::uuid
    AND pending_review = false;  -- Only include approved roles

    claims := event->'claims';

    -- Set the roles array or null if none
    IF roles IS NOT NULL THEN
      claims := jsonb_set(claims, '{user_roles}', roles);
    ELSE
      claims := jsonb_set(claims, '{user_roles}', 'null');
    END IF;

    -- Update the 'claims' object in the original event
    event := jsonb_set(event, '{claims}', claims);

    RETURN event;
  END;
$$;

-- Automatically approve all existing roles (set pending_review to false)
-- This ensures backward compatibility with existing user roles
UPDATE public.user_roles
SET pending_review = false
WHERE pending_review = true;
