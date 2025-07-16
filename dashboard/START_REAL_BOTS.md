# Starting Real Instagram/TikTok Bots

## Quick Start

1. **Install Backend Dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Set Up Environment Variables**
   ```bash
   cd backend
   cp ../.env.example .env
   ```
   
   Edit `.env` and add:
   - Your Supabase credentials
   - Instagram username/password
   - TikTok username/password

3. **Start Backend Server**
   ```bash
   cd backend
   npm run dev
   ```

4. **Open Dashboard**
   - Open `index.html` in your browser
   - Go to Bot Control section
   - Select profile and platform
   - Click "Start Bot Session"

## What Happens When You Start a Bot

1. **Real Browser Opens**: A Chrome browser window will open automatically
2. **Platform Login**: Bot logs into Instagram or TikTok with your credentials
3. **Content Browsing**: Bot scrolls through content based on the selected profile
4. **Data Collection**: All viewed content is saved to Supabase
5. **Live Updates**: Dashboard shows real-time activity

## Important Notes

- The browser window will be visible (not headless) so you can watch the bot
- Don't interact with the browser window while bot is running
- Bot will run for the selected duration then stop automatically
- All data is saved to your Supabase database

## Troubleshooting

If bots don't start:
1. Check backend server is running (`npm run dev` in backend folder)
2. Verify `.env` file has correct credentials
3. Check browser console for errors
4. Ensure Puppeteer can launch Chrome (may need to install Chrome)

## Security

- Never commit `.env` file
- Use test accounts for bots
- Be aware of platform rate limits
- This is for research/analytics only