# 🚨 HOW TO GET REAL INSTAGRAM/TIKTOK DATA INTO SUPABASE 🚨

## The Truth About Current Implementation

The bots ARE configured to collect REAL data, but they need to be RUNNING. The "Surfer Bot Live View" currently shows SIMULATED data because the backend server isn't running.

## Step-by-Step to Get REAL Data

### 1. Set Up Your Environment Variables

Create `/backend/.env` file:
```env
# Supabase (REQUIRED)
SUPABASE_URL=your_actual_supabase_url
SUPABASE_ANON_KEY=your_actual_anon_key
SUPABASE_SERVICE_KEY=your_actual_service_key

# Instagram (REQUIRED for Instagram bot)
INSTAGRAM_USERNAME=your_instagram_username
INSTAGRAM_PASSWORD=your_instagram_password

# TikTok (REQUIRED for TikTok bot)
TIKTOK_USERNAME=your_tiktok_username
TIKTOK_PASSWORD=your_tiktok_password

# Optional - Competitors to track
COMPETITORS=competitor1,competitor2,competitor3
```

### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

If you get errors, you may need to install:
- Node.js 16+ 
- Chrome/Chromium browser

### 3. Update Frontend Supabase Config

Edit `/public/js/supabase-client.js`:
```javascript
const SUPABASE_URL = 'your_actual_supabase_url';
const SUPABASE_ANON_KEY = 'your_actual_anon_key';
```

### 4. START THE BACKEND SERVER (CRITICAL!)

```bash
cd backend
npm run dev
```

You should see:
```
Backend server running on http://localhost:3001
Connected to Supabase
```

### 5. Open the Dashboard

1. Open `index.html` in your browser
2. Go to "Bot Control" section
3. Select a profile and platform
4. Click "Start Bot Session"

### 6. What Happens with REAL Bots

When you click "Start Bot Session":

1. **A Chrome browser window opens** - You'll see it!
2. **Bot navigates to Instagram/TikTok** - Real website
3. **Bot logs in** (if needed) - Using your credentials
4. **Bot starts scrolling** - Through real content
5. **Data flows to Supabase** - In real-time!

You'll see in the browser window:
- Instagram/TikTok website loading
- Automatic scrolling through reels/videos
- Bot pausing to "watch" content
- Occasional likes (based on profile)

### 7. Check Your Supabase Tables

While bot is running, check Supabase:

1. Go to your Supabase dashboard
2. Check these tables:
   - `content_impressions` - Every post/video viewed
   - `creator_profiles` - Every creator discovered
   - `engagement_events` - Every like/follow
   - `trend_metrics` - Hashtags and sounds
   - `bot_sessions` - Session tracking

## 🚨 COMMON ISSUES 🚨

### "Bot not starting"
- Is backend server running? (`npm run dev`)
- Check backend console for errors
- Verify .env file has credentials

### "No browser window opens"
- Install Chrome/Chromium
- Check Puppeteer can find Chrome
- Try: `npx puppeteer browsers install chrome`

### "Login fails"
- Check Instagram/TikTok credentials
- Account may need verification
- Try logging in manually first

### "No data in Supabase"
- Check Supabase credentials
- Verify tables exist (run schema.sql)
- Check backend console for database errors

## Testing Real Data Collection

1. Start backend: `cd backend && npm run dev`
2. Open dashboard in browser
3. Start a 2-minute bot session
4. Watch the Chrome window open and scroll
5. Check Supabase tables for new rows
6. Go to "Database" page to see collected data

## What Real Data Looks Like

In `content_impressions` table:
```
content_id: ig_reel_1234567890
creator_username: fitness.goals
caption: "Morning workout routine 💪 #fitness #motivation"
likes_count: 45231
comments_count: 892
engagement_rate: 12.4
is_viral: true
viewed_at: 2024-01-15 10:23:45
```

## The Bot is REAL - You Just Need to RUN It!

The infrastructure is there. The code will:
- Open REAL browser windows
- Navigate REAL websites
- Extract REAL data
- Save to REAL Supabase

You just need to:
1. Configure credentials
2. Start the backend server
3. Click "Start Bot Session"
4. Watch the magic happen!

## Need Help?

If bots aren't collecting real data:
1. Check backend console for errors
2. Verify Chrome window opens
3. Check network tab for Supabase requests
4. Look at bot session logs

Remember: The "Live View" simulation is just a fallback when the backend isn't running. With the backend running, you get REAL Instagram/TikTok data!