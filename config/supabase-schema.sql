-- ICPScope Database Schema
-- Stores ICP bot interactions, content metadata, and trend analytics

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ICP Profiles Table
CREATE TABLE IF NOT EXISTS icp_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_name VARCHAR(255) NOT NULL,
    age_range VARCHAR(20),
    gender VARCHAR(20),
    interests TEXT[],
    device_type VARCHAR(50),
    region VARCHAR(100),
    language VARCHAR(10),
    income_bracket VARCHAR(50),
    behavior_patterns JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Bot Sessions Table
CREATE TABLE IF NOT EXISTS bot_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    icp_profile_id UUID REFERENCES icp_profiles(id),
    session_id VARCHAR(255) UNIQUE NOT NULL,
    platform VARCHAR(50) NOT NULL,
    proxy_info JSONB,
    user_agent TEXT,
    cookies JSONB,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    ended_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'active',
    error_log TEXT
);

-- Content Impressions Table
CREATE TABLE IF NOT EXISTS content_impressions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES bot_sessions(id),
    platform VARCHAR(50) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    content_type VARCHAR(50), -- post, reel, story, ad
    creator_username VARCHAR(255),
    creator_id VARCHAR(255),
    impression_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    view_duration_ms INTEGER,
    scroll_depth FLOAT,
    is_sponsored BOOLEAN DEFAULT false,
    hashtags TEXT[],
    caption TEXT,
    media_url TEXT,
    engagement_metrics JSONB, -- likes, comments, shares at time of viewing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Engagement Events Table
CREATE TABLE IF NOT EXISTS engagement_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    impression_id UUID REFERENCES content_impressions(id),
    session_id UUID REFERENCES bot_sessions(id),
    event_type VARCHAR(50), -- click, like, comment, share, follow, save
    event_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    event_data JSONB,
    dwell_time_ms INTEGER
);

-- Creator Profiles Table
CREATE TABLE IF NOT EXISTS creator_profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform VARCHAR(50) NOT NULL,
    creator_id VARCHAR(255) NOT NULL,
    username VARCHAR(255) NOT NULL,
    display_name VARCHAR(255),
    bio TEXT,
    follower_count INTEGER,
    following_count INTEGER,
    post_count INTEGER,
    verification_status BOOLEAN DEFAULT false,
    category VARCHAR(100),
    profile_data JSONB,
    first_seen TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(platform, creator_id)
);

-- Trend Metrics Table (Aggregated)
CREATE TABLE IF NOT EXISTS trend_metrics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_date DATE NOT NULL,
    metric_hour INTEGER,
    icp_profile_id UUID REFERENCES icp_profiles(id),
    platform VARCHAR(50),
    content_type VARCHAR(50),
    creator_id VARCHAR(255),
    hashtag VARCHAR(255),
    total_impressions INTEGER DEFAULT 0,
    total_engagements INTEGER DEFAULT 0,
    avg_view_duration_ms FLOAT,
    engagement_rate FLOAT,
    virality_score FLOAT,
    sentiment_score FLOAT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Campaign Tracking Table
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_name VARCHAR(255) NOT NULL,
    brand_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    target_hashtags TEXT[],
    target_creators TEXT[],
    competitor_brands TEXT[],
    icp_profiles UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT true
);

-- Competitor Analysis Table
CREATE TABLE IF NOT EXISTS competitor_content (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id),
    competitor_name VARCHAR(255),
    content_id VARCHAR(255),
    platform VARCHAR(50),
    content_type VARCHAR(50),
    performance_metrics JSONB,
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alerts Table
CREATE TABLE IF NOT EXISTS alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    alert_type VARCHAR(50), -- virality_spike, competitor_activity, creator_breakout
    severity VARCHAR(20), -- low, medium, high, critical
    icp_profile_id UUID REFERENCES icp_profiles(id),
    campaign_id UUID REFERENCES campaigns(id),
    alert_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    acknowledged BOOLEAN DEFAULT false,
    acknowledged_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for performance
CREATE INDEX idx_impressions_session ON content_impressions(session_id);
CREATE INDEX idx_impressions_platform_content ON content_impressions(platform, content_id);
CREATE INDEX idx_impressions_timestamp ON content_impressions(impression_timestamp);
CREATE INDEX idx_impressions_creator ON content_impressions(creator_username);
CREATE INDEX idx_impressions_sponsored ON content_impressions(is_sponsored);

CREATE INDEX idx_events_session ON engagement_events(session_id);
CREATE INDEX idx_events_type ON engagement_events(event_type);
CREATE INDEX idx_events_timestamp ON engagement_events(event_timestamp);

CREATE INDEX idx_metrics_date ON trend_metrics(metric_date, metric_hour);
CREATE INDEX idx_metrics_icp ON trend_metrics(icp_profile_id);
CREATE INDEX idx_metrics_platform ON trend_metrics(platform);
CREATE INDEX idx_metrics_hashtag ON trend_metrics(hashtag);

CREATE INDEX idx_creator_platform ON creator_profiles(platform, username);

-- Create views for analytics
CREATE OR REPLACE VIEW icp_engagement_summary AS
SELECT 
    ip.profile_name,
    ip.id as icp_profile_id,
    ci.platform,
    DATE(ci.impression_timestamp) as date,
    COUNT(DISTINCT ci.id) as total_impressions,
    COUNT(DISTINCT ee.id) as total_engagements,
    COUNT(DISTINCT ci.creator_username) as unique_creators,
    AVG(ci.view_duration_ms) as avg_view_duration,
    COUNT(DISTINCT ci.content_id) FILTER (WHERE ci.is_sponsored = true) as sponsored_content_count
FROM icp_profiles ip
JOIN bot_sessions bs ON ip.id = bs.icp_profile_id
JOIN content_impressions ci ON bs.id = ci.session_id
LEFT JOIN engagement_events ee ON ci.id = ee.impression_id
GROUP BY ip.profile_name, ip.id, ci.platform, DATE(ci.impression_timestamp);

CREATE OR REPLACE VIEW trending_creators_by_icp AS
SELECT 
    ip.profile_name,
    ci.platform,
    ci.creator_username,
    cp.follower_count,
    COUNT(DISTINCT ci.id) as impression_count,
    COUNT(DISTINCT ee.id) as engagement_count,
    AVG(ci.view_duration_ms) as avg_view_duration,
    COUNT(DISTINCT ee.id)::FLOAT / NULLIF(COUNT(DISTINCT ci.id), 0) as engagement_rate
FROM icp_profiles ip
JOIN bot_sessions bs ON ip.id = bs.icp_profile_id
JOIN content_impressions ci ON bs.id = ci.session_id
LEFT JOIN engagement_events ee ON ci.id = ee.impression_id
LEFT JOIN creator_profiles cp ON ci.creator_username = cp.username AND ci.platform = cp.platform
WHERE ci.impression_timestamp > NOW() - INTERVAL '7 days'
GROUP BY ip.profile_name, ci.platform, ci.creator_username, cp.follower_count
ORDER BY engagement_rate DESC, impression_count DESC;

-- Function to calculate virality score
CREATE OR REPLACE FUNCTION calculate_virality_score(
    impressions INTEGER,
    engagements INTEGER,
    avg_duration FLOAT,
    creator_followers INTEGER
) RETURNS FLOAT AS $$
DECLARE
    engagement_rate FLOAT;
    normalized_duration FLOAT;
    follower_factor FLOAT;
    virality FLOAT;
BEGIN
    -- Calculate engagement rate
    engagement_rate := CASE 
        WHEN impressions > 0 THEN engagements::FLOAT / impressions 
        ELSE 0 
    END;
    
    -- Normalize duration (assuming 30 seconds is optimal)
    normalized_duration := LEAST(avg_duration / 30000.0, 1.0);
    
    -- Calculate follower factor (smaller creators get boost)
    follower_factor := CASE
        WHEN creator_followers < 10000 THEN 1.5
        WHEN creator_followers < 100000 THEN 1.2
        WHEN creator_followers < 1000000 THEN 1.0
        ELSE 0.8
    END;
    
    -- Calculate virality score
    virality := (engagement_rate * 0.4 + normalized_duration * 0.3 + 0.3) * follower_factor * 100;
    
    RETURN ROUND(virality::NUMERIC, 2);
END;
$$ LANGUAGE plpgsql;

-- Trigger to update trend metrics
CREATE OR REPLACE FUNCTION update_trend_metrics() RETURNS TRIGGER AS $$
BEGIN
    -- This would be called by a scheduled job in production
    -- Placeholder for trend calculation logic
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS)
ALTER TABLE icp_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE content_impressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE engagement_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE trend_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;