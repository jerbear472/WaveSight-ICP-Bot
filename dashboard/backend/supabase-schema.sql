-- WaveSight Bot Data Schema for Supabase
-- Run this SQL in your Supabase SQL Editor

-- Enable RLS (Row Level Security)
-- You can disable this for testing, but enable for production
-- ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM anon, authenticated;

-- Bot Sessions Table
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT UNIQUE NOT NULL,
    bot_type TEXT DEFAULT 'surfer_bot',
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    profile_type TEXT NOT NULL,
    start_time TIMESTAMPTZ DEFAULT NOW(),
    end_time TIMESTAMPTZ,
    duration_ms INTEGER,
    content_viewed INTEGER DEFAULT 0,
    engagements INTEGER DEFAULT 0,
    trends_found INTEGER DEFAULT 0,
    status TEXT DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'stopped')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Impressions Table (Main content discovery)
CREATE TABLE IF NOT EXISTS content_impressions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT REFERENCES bot_sessions(session_id),
    content_id TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'video', 'post', 'story')),
    creator_username TEXT NOT NULL,
    creator_id TEXT,
    caption TEXT,
    hashtags TEXT[],
    mentions TEXT[],
    url TEXT,
    thumbnail_url TEXT,
    music_title TEXT,
    views_count INTEGER DEFAULT 0,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    saves_count INTEGER DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    is_sponsored BOOLEAN DEFAULT FALSE,
    is_viral BOOLEAN DEFAULT FALSE,
    dwell_time_seconds INTEGER DEFAULT 0,
    viewed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Creator Profiles Table
CREATE TABLE IF NOT EXISTS creator_profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    display_name TEXT,
    bio TEXT,
    follower_count INTEGER DEFAULT 0,
    following_count INTEGER DEFAULT 0,
    post_count INTEGER DEFAULT 0,
    is_verified BOOLEAN DEFAULT FALSE,
    is_business BOOLEAN DEFAULT FALSE,
    profile_pic_url TEXT,
    external_url TEXT,
    category TEXT,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    total_content_discovered INTEGER DEFAULT 0,
    first_discovered TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Engagement Events Table
CREATE TABLE IF NOT EXISTS engagement_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    session_id TEXT REFERENCES bot_sessions(session_id),
    content_id TEXT NOT NULL,
    creator_username TEXT NOT NULL,
    engagement_type TEXT NOT NULL CHECK (engagement_type IN ('like', 'comment', 'share', 'save', 'follow', 'view')),
    engagement_value TEXT, -- For comment text, etc.
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trend Metrics Table
CREATE TABLE IF NOT EXISTS trend_metrics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    trend_type TEXT NOT NULL CHECK (trend_type IN ('hashtag', 'music', 'effect', 'challenge', 'keyword')),
    trend_name TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'all')),
    usage_count INTEGER DEFAULT 1,
    engagement_score DECIMAL(10,2) DEFAULT 0,
    viral_score DECIMAL(5,2) DEFAULT 0,
    growth_rate DECIMAL(5,2) DEFAULT 0,
    momentum DECIMAL(5,2) DEFAULT 0,
    first_seen TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW(),
    peak_usage_date TIMESTAMPTZ,
    related_content TEXT[],
    is_trending BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(trend_name, platform, trend_type)
);

-- Competitor Analysis Table
CREATE TABLE IF NOT EXISTS competitor_analysis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    competitor_username TEXT NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok')),
    content_id TEXT NOT NULL,
    performance_score DECIMAL(5,2) DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    reach_estimate INTEGER DEFAULT 0,
    content_type TEXT,
    posting_frequency DECIMAL(5,2) DEFAULT 0,
    hashtag_strategy TEXT[],
    analyzed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Content Analytics Table (Aggregated stats)
CREATE TABLE IF NOT EXISTS content_analytics (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    platform TEXT NOT NULL CHECK (platform IN ('instagram', 'tiktok', 'all')),
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    average_engagement_rate DECIMAL(5,2) DEFAULT 0,
    viral_content_count INTEGER DEFAULT 0,
    trending_hashtags_count INTEGER DEFAULT 0,
    new_creators_discovered INTEGER DEFAULT 0,
    top_performing_content TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(date, platform)
);

-- Performance Insights Table
CREATE TABLE IF NOT EXISTS performance_insights (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    insight_type TEXT NOT NULL CHECK (insight_type IN ('trend_prediction', 'viral_potential', 'audience_shift', 'content_gap', 'opportunity')),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    confidence_score DECIMAL(5,2) DEFAULT 0,
    impact_level TEXT CHECK (impact_level IN ('low', 'medium', 'high', 'critical')),
    platform TEXT CHECK (platform IN ('instagram', 'tiktok', 'all')),
    supporting_data JSONB,
    action_items TEXT[],
    is_actionable BOOLEAN DEFAULT TRUE,
    priority INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_content_impressions_session_id ON content_impressions(session_id);
CREATE INDEX IF NOT EXISTS idx_content_impressions_creator ON content_impressions(creator_username);
CREATE INDEX IF NOT EXISTS idx_content_impressions_platform ON content_impressions(platform);
CREATE INDEX IF NOT EXISTS idx_content_impressions_viewed_at ON content_impressions(viewed_at);
CREATE INDEX IF NOT EXISTS idx_content_impressions_viral ON content_impressions(is_viral);

CREATE INDEX IF NOT EXISTS idx_creator_profiles_username ON creator_profiles(username);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_platform ON creator_profiles(platform);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_verified ON creator_profiles(is_verified);

CREATE INDEX IF NOT EXISTS idx_engagement_events_session_id ON engagement_events(session_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_content_id ON engagement_events(content_id);
CREATE INDEX IF NOT EXISTS idx_engagement_events_type ON engagement_events(engagement_type);

CREATE INDEX IF NOT EXISTS idx_trend_metrics_name ON trend_metrics(trend_name);
CREATE INDEX IF NOT EXISTS idx_trend_metrics_platform ON trend_metrics(platform);
CREATE INDEX IF NOT EXISTS idx_trend_metrics_trending ON trend_metrics(is_trending);
CREATE INDEX IF NOT EXISTS idx_trend_metrics_viral_score ON trend_metrics(viral_score);

CREATE INDEX IF NOT EXISTS idx_bot_sessions_platform ON bot_sessions(platform);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_status ON bot_sessions(status);
CREATE INDEX IF NOT EXISTS idx_bot_sessions_start_time ON bot_sessions(start_time);

-- Enable Row Level Security (Optional - comment out for testing)
-- ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE content_impressions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE creator_profiles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE trend_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies (Optional - comment out for testing)
-- CREATE POLICY "Public read access" ON bot_sessions FOR SELECT USING (true);
-- CREATE POLICY "Public insert access" ON bot_sessions FOR INSERT WITH CHECK (true);
-- CREATE POLICY "Public update access" ON bot_sessions FOR UPDATE USING (true);

-- Add the same policies for other tables...

-- Insert some sample data for testing
INSERT INTO bot_sessions (session_id, platform, profile_type, status) 
VALUES ('sample_session_001', 'instagram', 'gen_z_tech_enthusiast', 'completed')
ON CONFLICT (session_id) DO NOTHING;

-- Create triggers for updated_at fields
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_bot_sessions_updated_at BEFORE UPDATE ON bot_sessions FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_creator_profiles_updated_at BEFORE UPDATE ON creator_profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_trend_metrics_updated_at BEFORE UPDATE ON trend_metrics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_content_analytics_updated_at BEFORE UPDATE ON content_analytics FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- Success message
SELECT 'WaveSight Bot database schema created successfully! 🚀' as result;