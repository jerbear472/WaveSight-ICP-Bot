-- WaveSight Bot Data Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Bot Sessions Table
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    bot_type VARCHAR(50) NOT NULL, -- 'surfer_bot', 'scraper_bot'
    platform VARCHAR(50) NOT NULL, -- 'instagram', 'tiktok'
    profile_type VARCHAR(100) NOT NULL, -- 'gen_z_tech_enthusiast', etc.
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    content_viewed INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    trends_found INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'error'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Discovered Content Table
CREATE TABLE IF NOT EXISTS discovered_content (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    content_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL,
    content_type VARCHAR(50) NOT NULL, -- 'video', 'image', 'carousel', 'reel', 'story'
    creator_username VARCHAR(255) NOT NULL,
    creator_id VARCHAR(255),
    caption TEXT,
    hashtags TEXT[], -- Array of hashtags
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    
    -- Metrics
    views BIGINT DEFAULT 0,
    likes BIGINT DEFAULT 0,
    comments BIGINT DEFAULT 0,
    shares BIGINT DEFAULT 0,
    saves BIGINT DEFAULT 0,
    engagement_rate DECIMAL(5,2),
    
    -- Flags
    is_sponsored BOOLEAN DEFAULT FALSE,
    is_viral BOOLEAN DEFAULT FALSE,
    is_trending BOOLEAN DEFAULT FALSE,
    
    -- Bot behavior
    discovered_at TIMESTAMP WITH TIME ZONE NOT NULL,
    dwell_time INTEGER DEFAULT 0, -- milliseconds
    bot_engaged BOOLEAN DEFAULT FALSE,
    bot_action VARCHAR(50), -- 'liked', 'commented', 'shared', 'saved', 'followed'
    
    -- Metadata
    audio_id VARCHAR(255), -- For TikTok
    audio_name TEXT, -- For TikTok
    effect_id VARCHAR(255), -- For TikTok/Instagram
    effect_name TEXT,
    location_id VARCHAR(255),
    location_name TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(content_id, platform)
);

-- Bot Interactions Table
CREATE TABLE IF NOT EXISTS bot_interactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL, -- 'like', 'comment', 'share', 'follow', 'save', 'view'
    interaction_time TIMESTAMP WITH TIME ZONE NOT NULL,
    dwell_time_ms INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Detected Trends Table
CREATE TABLE IF NOT EXISTS detected_trends (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    trend_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    trend_type VARCHAR(50) NOT NULL, -- 'hashtag', 'audio', 'effect', 'challenge', 'topic'
    trend_name TEXT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    viral_score DECIMAL(5,2),
    reach BIGINT,
    engagement_rate DECIMAL(5,2),
    growth_rate DECIMAL(5,2),
    detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
    related_content TEXT[], -- Array of content IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(trend_id, platform, DATE(detected_at))
);

-- Creator Profiles Table (for tracking discovered creators)
CREATE TABLE IF NOT EXISTS creator_profiles (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    creator_id VARCHAR(255),
    platform VARCHAR(50) NOT NULL,
    display_name TEXT,
    bio TEXT,
    follower_count BIGINT,
    following_count BIGINT,
    post_count INTEGER,
    avg_engagement_rate DECIMAL(5,2),
    is_verified BOOLEAN DEFAULT FALSE,
    is_business BOOLEAN DEFAULT FALSE,
    category VARCHAR(100),
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(username, platform)
);

-- Aggregated Stats View
CREATE OR REPLACE VIEW content_stats AS
SELECT 
    platform,
    DATE(discovered_at) as date,
    COUNT(*) as content_count,
    SUM(views) as total_views,
    SUM(likes) as total_likes,
    SUM(comments) as total_comments,
    SUM(shares) as total_shares,
    AVG(engagement_rate) as avg_engagement_rate,
    COUNT(CASE WHEN is_viral THEN 1 END) as viral_count,
    COUNT(CASE WHEN is_sponsored THEN 1 END) as sponsored_count
FROM discovered_content
GROUP BY platform, DATE(discovered_at);

-- Trending Hashtags View
CREATE OR REPLACE VIEW trending_hashtags AS
SELECT 
    hashtag,
    platform,
    COUNT(*) as usage_count,
    AVG(engagement_rate) as avg_engagement,
    SUM(views) as total_reach,
    DATE(discovered_at) as date
FROM discovered_content
CROSS JOIN UNNEST(hashtags) AS hashtag
GROUP BY hashtag, platform, DATE(discovered_at)
ORDER BY usage_count DESC;

-- Indexes for performance
CREATE INDEX idx_bot_sessions_status ON bot_sessions(status);
CREATE INDEX idx_bot_sessions_platform ON bot_sessions(platform);
CREATE INDEX idx_discovered_content_session ON discovered_content(session_id);
CREATE INDEX idx_discovered_content_platform ON discovered_content(platform);
CREATE INDEX idx_discovered_content_viral ON discovered_content(is_viral);
CREATE INDEX idx_discovered_content_discovered_at ON discovered_content(discovered_at);
CREATE INDEX idx_discovered_content_creator ON discovered_content(creator_username);
CREATE INDEX idx_bot_interactions_session ON bot_interactions(session_id);
CREATE INDEX idx_detected_trends_platform ON detected_trends(platform);
CREATE INDEX idx_creator_profiles_username ON creator_profiles(username, platform);

-- Row Level Security (RLS) Policies
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE discovered_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE detected_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read access" ON bot_sessions FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON discovered_content FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON bot_interactions FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON detected_trends FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON creator_profiles FOR SELECT USING (true);

-- Allow insert for service role (bot operations)
CREATE POLICY "Allow insert for service" ON bot_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service" ON discovered_content FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service" ON bot_interactions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service" ON detected_trends FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert for service" ON creator_profiles FOR INSERT WITH CHECK (true);

-- Update triggers
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_sessions_updated_at BEFORE UPDATE ON bot_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();