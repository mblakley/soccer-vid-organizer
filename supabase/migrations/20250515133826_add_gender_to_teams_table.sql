ALTER TABLE public.teams
ADD COLUMN gender TEXT CHECK (gender IN ('Male', 'Female', 'Co-ed', 'Other'));

COMMENT ON COLUMN public.teams.gender IS 'The gender category of the team, e.g., Male, Female, Co-ed, or Other.';
