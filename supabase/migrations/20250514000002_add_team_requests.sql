-- Create team_requests table
CREATE TABLE team_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES auth.users(id),
    review_notes TEXT
);

-- Enable RLS
ALTER TABLE team_requests ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own team requests"
    ON team_requests FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create team requests"
    ON team_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all team requests"
    ON team_requests FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

CREATE POLICY "Admins can update team requests"
    ON team_requests FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid()
            AND is_admin = true
        )
    );

-- Create updated_at trigger
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON team_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert default "pending" team
INSERT INTO teams (id, name, club_affiliation, season, age_group)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    'Pending',
    'System',
    '2025',
    'All'
);

-- Grant access to authenticated users
GRANT ALL ON team_requests TO authenticated;

-- Function to check if a user has a specific role for a team
CREATE OR REPLACE FUNCTION public.user_has_team_role(team_id uuid, role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the user has the given role for the specified team
  RETURN EXISTS (
    SELECT 1
    FROM team_members
    WHERE user_id = auth.uid()
      AND team_id = team_id
      AND role = ANY(roles)
      AND is_active = true
  );
END;
$$; 