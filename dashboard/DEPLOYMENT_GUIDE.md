# WaveSight Deployment Guide

## Overview
WaveSight consists of two parts that must be deployed separately:
1. **Frontend Dashboard** - The web interface (HTML/JS files)
2. **Backend Bot Service** - The Node.js server that controls the bots

## Backend Deployment (Must Deploy First)

### Deploy to Render.com

1. **Create a new Web Service** on Render
   - Connect your GitHub repository
   - Name: `wavesight-backend` (or similar)
   - Environment: `Node`
   - Build Command: `cd dashboard/backend && npm install`
   - Start Command: `cd dashboard/backend && node server.js`

2. **Add Environment Variables**:
   ```
   PORT=3001
   NODE_ENV=production
   SUPABASE_URL=your-supabase-url
   SUPABASE_SERVICE_KEY=your-supabase-service-key
   INSTAGRAM_USERNAME=your-instagram-username
   INSTAGRAM_PASSWORD=your-instagram-password
   TIKTOK_EMAIL=your-tiktok-email
   TIKTOK_PASSWORD=your-tiktok-password
   RENDER=true
   ```

3. **Note the Backend URL**
   - After deployment, you'll get a URL like: `https://wavesight-backend.onrender.com`
   - Save this URL - you'll need it for the frontend

## Frontend Deployment

### Option 1: Deploy to Render.com (Static Site)

1. **Create a new Static Site** on Render
   - Connect your GitHub repository
   - Name: `wavesight-dashboard`
   - Build Command: `echo "No build needed"`
   - Publish Directory: `dashboard/public`

2. **Update Backend URL**:
   Before deploying, update the backend URL in `dashboard/public/js/bot-client.js`:
   ```javascript
   // Replace this line:
   return window.location.protocol + '//' + window.location.hostname.replace('wavesight-dashboard', 'wavesight-backend');
   
   // With your actual backend URL:
   return 'https://your-backend-service.onrender.com';
   ```

### Option 2: Deploy to Vercel

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel dashboard/public`
3. Follow the prompts

## Important Notes

### Bot Functionality on Deployed Sites

- **Chrome Browser**: The bots use Playwright to control Chrome
- **On Render**: Chrome runs in headless mode (no visible window)
- **Locally**: Chrome opens visibly when using `npm run start:visible`

### Troubleshooting

1. **"Cannot connect to backend"**
   - Check that backend is deployed and running
   - Verify the backend URL in bot-client.js is correct
   - Check browser console for CORS errors

2. **Bots not starting**
   - Check backend logs on Render dashboard
   - Ensure all environment variables are set
   - Verify Instagram/TikTok credentials are correct

3. **No data appearing**
   - Check Supabase connection
   - Verify credentials are working
   - Look at backend logs for errors

### Testing the Deployment

1. Visit your frontend URL
2. Open browser Developer Console (F12)
3. Go to Bot Dashboard
4. Click "Start Bot Session"
5. Check console for connection status
6. Backend logs will show bot activity

## Local Development

For local development with visible Chrome:
```bash
# Terminal 1 - Start backend with visible Chrome
cd dashboard/backend
npm run start:visible

# Terminal 2 - Start frontend
cd dashboard
npm start
```

Then visit http://localhost:3000