# Setting Up Real Bot Integration for WaveSight

This guide will help you set up the real Instagram and TikTok bot integration with Supabase.

## Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Instagram Account**: The account you want the bot to use (e.g., @mindmatterlife)
3. **TikTok Account**: The account you want the bot to use
4. **Node.js**: Version 16 or higher

## Step 1: Set Up Supabase

1. Create a new Supabase project
2. Go to SQL Editor in your Supabase dashboard
3. Copy and run the entire SQL schema from `/supabase/schema.sql`
4. Go to Settings > API and copy:
   - Project URL
   - Anon public key
   - Service role key (for backend)

## Step 2: Configure Environment Variables

1. Copy `.env.example` to `.env` in the backend folder:
```bash
cd backend
cp ../.env.example .env
```

2. Edit `.env` with your credentials:
```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_KEY=your_supabase_service_role_key

# Instagram Configuration
INSTAGRAM_USERNAME=mindmatterlife
INSTAGRAM_PASSWORD=your_instagram_password

# TikTok Configuration  
TIKTOK_USERNAME=mindmatterlife
TIKTOK_PASSWORD=your_tiktok_password
```

## Step 3: Update Frontend Configuration

1. Edit `/public/js/supabase-client.js`:
```javascript
const SUPABASE_URL = 'your_supabase_project_url';
const SUPABASE_ANON_KEY = 'your_supabase_anon_key';
```

2. Edit `/public/js/bot-client.js` if backend is not on localhost:3001:
```javascript
this.backendUrl = 'http://your-backend-url:3001';
```

## Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

## Step 5: Start the Backend Server

```bash
# Development mode with auto-restart
npm run dev

# Or production mode
npm start
```

## Step 6: Update Dashboard HTML Files

Add the script imports to all dashboard HTML files that need bot functionality:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="https://cdn.socket.io/4.6.1/socket.io.min.js"></script>
<script src="js/supabase-client.js"></script>
<script src="js/bot-client.js"></script>
```

## Step 7: Update Bot Controls

Replace the mock bot simulation in `dashboard.js` with real bot client calls:

```javascript
// Instead of mock simulation
async function startBot() {
    try {
        const profileType = document.getElementById('profileType').value;
        const platform = document.getElementById('platform').value;
        const duration = parseInt(document.getElementById('duration').value);
        
        // Connect to backend
        window.botClient.connect();
        
        // Set up callbacks
        window.botClient.onContentDiscovered((data) => {
            console.log('Content discovered:', data);
            // Update UI with real data
        });
        
        window.botClient.onSessionComplete((data) => {
            console.log('Session complete:', data);
            // Show session summary
        });
        
        // Start the bot
        const result = await window.botClient.startBot(platform, profileType, duration);
        console.log('Bot started:', result);
        
    } catch (error) {
        console.error('Error starting bot:', error);
    }
}
```

## Important Security Notes

1. **Never commit `.env` files** to version control
2. **Use environment variables** for all sensitive data
3. **Enable Row Level Security (RLS)** in Supabase for production
4. **Use HTTPS** in production for both frontend and backend
5. **Implement rate limiting** to avoid being detected as a bot

## Bot Behavior Notes

1. **Human-like delays**: The bots include random delays to mimic human behavior
2. **Profile-based engagement**: Different profiles have different engagement rates
3. **Content analysis**: All viewed content is saved with metrics
4. **Trend detection**: Automatic detection of viral content and trends
5. **Session limits**: Default 50 content items per session to avoid detection

## Monitoring and Analytics

1. **Real-time updates**: Content is saved as discovered via WebSocket
2. **Supabase Dashboard**: Monitor all data in real-time
3. **Marketing Insights**: Pulls real data from discovered content
4. **Trend Analysis**: Based on actual engagement metrics

## Troubleshooting

### Bot won't start
- Check backend server is running
- Verify credentials in `.env`
- Check browser console for errors
- Ensure Puppeteer dependencies are installed

### Can't connect to Instagram/TikTok
- Verify account credentials
- Check if account requires 2FA
- Try logging in manually first
- Check for account restrictions

### Data not saving to Supabase
- Verify Supabase credentials
- Check RLS policies
- Monitor Supabase logs
- Ensure tables were created correctly

## Production Deployment

1. Use headless mode for Puppeteer
2. Deploy backend to a server with good network
3. Use environment variables for all config
4. Set up monitoring and error logging
5. Implement session queuing to avoid overload

## Legal and Ethical Considerations

⚠️ **Important**: 
- Respect platform Terms of Service
- Don't spam or abuse the platforms
- Use reasonable delays and limits
- This is for research and analytics only
- Consider using official APIs when available