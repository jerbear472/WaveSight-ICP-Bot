# Viewing Bot-Recorded Data in Supabase

## Overview

The WaveSight bots save all discovered content, interactions, and session data to your Supabase database. You can view this data in two ways:

1. **Supabase Data Viewer** (Built-in Dashboard Page)
2. **Supabase Dashboard** (Direct Database Access)

## Method 1: Using the Built-in Data Viewer

### Access the Data Viewer
1. Open your WaveSight dashboard
2. Click on "Database" in the navigation menu
3. The Supabase Data Viewer will load

### Features
- **Table Selection**: Choose from:
  - `discovered_content` - All content viewed by bots
  - `bot_sessions` - Bot session history
  - `interactions` - Bot likes, follows, etc.
  - `trends` - Detected viral trends

- **Filters**:
  - Platform (Instagram/TikTok)
  - Time Range (1h, 24h, 7d, 30d, All)
  - Viral Only checkbox

- **Statistics**:
  - Total Records
  - Viral Content Count
  - Unique Creators
  - Average Engagement Rate

### Viewing Content Details
Each row in the discovered content table shows:
- Timestamp when discovered
- Platform badge
- Creator username (clickable link)
- Caption preview
- Likes and comments
- Engagement rate percentage
- Viral status badge

## Method 2: Using Supabase Dashboard

### Access Your Database Directly
1. Go to [supabase.com](https://supabase.com)
2. Sign in to your account
3. Select your project
4. Click "Table Editor" in the sidebar

### Database Tables

#### `discovered_content`
Stores all content discovered by bots:
- `content_id` - Unique identifier
- `session_id` - Links to bot session
- `platform` - Instagram or TikTok
- `creator_username` - Content creator
- `caption` - Post caption text
- `hashtags` - Array of hashtags
- `likes`, `comments` - Engagement metrics
- `engagement_rate` - Calculated percentage
- `is_viral` - Boolean flag
- `bot_engaged` - Whether bot liked/followed

#### `bot_sessions`
Tracks each bot surfing session:
- `session_id` - Unique session ID
- `platform` - Platform used
- `profile_type` - Wave Rider persona
- `status` - active/completed
- `content_viewed` - Total content seen
- `engagements` - Total interactions
- `trends_found` - Viral content count

#### `interactions`
Records bot engagement actions:
- `session_id` - Links to session
- `content_id` - Links to content
- `interaction_type` - like/follow/save
- `performed_at` - Timestamp

#### `trends`
Aggregated trending content:
- `trend_id` - Unique ID
- `platform` - Source platform
- `trend_type` - hashtag/sound/creator
- `trend_value` - The trending item
- `mention_count` - How many times seen
- `viral_count` - Viral content count

## Data Flow

1. **Bot Starts** → Creates session in `bot_sessions`
2. **Bot Views Content** → Saves to `discovered_content`
3. **Bot Likes/Follows** → Records in `interactions`
4. **Trend Detection** → Updates `trends` table
5. **Session Ends** → Updates final stats in `bot_sessions`

## Troubleshooting

### No Data Showing?
1. Check Supabase credentials in:
   - `/public/js/supabase-client.js` (frontend)
   - `/backend/.env` (backend)

2. Verify tables exist:
   - Run SQL from `/supabase/schema.sql`

3. Check bot is running:
   - Backend server must be active
   - Browser window should open
   - Check console for errors

### Connection Errors?
1. Verify Supabase project URL
2. Check anon/service keys
3. Ensure RLS policies allow access

### Missing Data?
- Bot must complete actions to save data
- Check browser console for save errors
- Verify session_id is being set correctly

## SQL Queries

### Find Most Viral Content
```sql
SELECT * FROM discovered_content 
WHERE is_viral = true 
ORDER BY likes DESC 
LIMIT 10;
```

### Get Session Summary
```sql
SELECT 
  platform,
  COUNT(*) as sessions,
  SUM(content_viewed) as total_content,
  SUM(engagements) as total_engagements
FROM bot_sessions
WHERE status = 'completed'
GROUP BY platform;
```

### Top Creators by Engagement
```sql
SELECT 
  creator_username,
  platform,
  COUNT(*) as appearances,
  AVG(engagement_rate) as avg_engagement
FROM discovered_content
GROUP BY creator_username, platform
ORDER BY avg_engagement DESC
LIMIT 20;
```

## Next Steps

1. **Export Data**: Use Supabase's export features
2. **Build Analytics**: Create custom dashboards
3. **API Access**: Use Supabase client libraries
4. **Real-time Updates**: Subscribe to table changes
5. **Data Pipeline**: Connect to analytics tools