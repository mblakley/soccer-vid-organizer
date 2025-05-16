-- Film Review Sessions Table
CREATE TABLE film_review_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    tags TEXT[],
    creator_team_member_id UUID NOT NULL,
    team_id UUID NOT NULL,
    is_private BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (creator_team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
);

CREATE INDEX idx_film_review_sessions_creator ON film_review_sessions(creator_team_member_id);
CREATE INDEX idx_film_review_sessions_team ON film_review_sessions(team_id);
CREATE INDEX idx_film_review_sessions_tags ON film_review_sessions USING GIN (tags);

-- Film Review Session Clips Table (Join Table)
CREATE TABLE film_review_session_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    film_review_session_id UUID NOT NULL,
    clip_id UUID NOT NULL,
    display_order INTEGER NOT NULL,
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (film_review_session_id) REFERENCES film_review_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (clip_id) REFERENCES clips(id) ON DELETE CASCADE,
    UNIQUE (film_review_session_id, clip_id),
    UNIQUE (film_review_session_id, display_order)
);

CREATE INDEX idx_frsc_session_id ON film_review_session_clips(film_review_session_id);
CREATE INDEX idx_frsc_clip_id ON film_review_session_clips(clip_id);

-- Film Review Session Shares Table
CREATE TABLE film_review_session_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    film_review_session_id UUID NOT NULL,
    shared_with_team_member_id UUID REFERENCES team_members(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (film_review_session_id) REFERENCES film_review_sessions(id) ON DELETE CASCADE,
    FOREIGN KEY (shared_with_team_member_id) REFERENCES team_members(id) ON DELETE CASCADE,
    UNIQUE (film_review_session_id, shared_with_team_member_id)
);

CREATE INDEX idx_frss_session_id ON film_review_session_shares(film_review_session_id);
CREATE INDEX idx_frss_shared_with_team_member_id ON film_review_session_shares(shared_with_team_member_id);
