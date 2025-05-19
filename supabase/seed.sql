-- Insert default "pending" team
INSERT INTO teams (id, name, club_affiliation, season, age_group, gender)
SELECT 
    '00000000-0000-0000-0000-000000000000',
    'Pending',
    'System',
    '2025',
    'All',
    'Unknown'
WHERE NOT EXISTS (
    SELECT 1 FROM teams WHERE id = '00000000-0000-0000-0000-000000000000'
); 