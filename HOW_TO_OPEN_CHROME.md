# How to Make Chrome Open When Starting Bot Session

## Quick Start

1. **Kill any running servers**:
   ```bash
   pkill -f "node server"
   ```

2. **Start server with visible Chrome**:
   ```bash
   cd dashboard/backend
   npm run start:visible
   ```

3. **Open dashboard** in browser:
   ```
   http://localhost:3000
   ```

4. **Click "Start Bot Session"**
   - Chrome will open!
   - Bot will log into Instagram/TikTok
   - You'll see it scrolling

## What's Happening

When you run `npm run start:visible`:
- Sets `FORCE_VISIBLE=true` 
- Overrides headless mode
- Chrome opens in a window you can see

## Troubleshooting

### Chrome doesn't open?

1. Check server is running:
   ```bash
   curl http://localhost:3001/health
   ```

2. Check for errors in terminal where server is running

3. Try the direct test:
   ```bash
   node test-instagram-direct.js
   ```

### "Cannot connect to backend"?

1. Make sure server started successfully
2. Check no other process on port 3001:
   ```bash
   lsof -i:3001
   ```

### Chrome opens but doesn't log in?

1. Check credentials in bot-engine bots:
   - Instagram: mindmatterlife / L0ngStr@ngeTr!p
   - TikTok: mindmattermarket@gmail.com / L0ngStr@ngeTr!p

## Different Start Modes

- `npm start` - Normal mode (headless on cloud, visible locally)
- `npm run start:visible` - Force Chrome to be visible
- `npm run start:cloud` - Cloud mode (always headless)

## The Bot is Working!

I've tested it and Chrome DOES open. The issue was configuration. Now:

1. Chrome opens visibly
2. Bot logs into social media
3. Scrolls and collects real data
4. Sends updates to dashboard

Just use `npm run start:visible` to ensure Chrome is visible!