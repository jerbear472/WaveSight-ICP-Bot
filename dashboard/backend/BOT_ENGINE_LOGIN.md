# Bot Engine Login System

## Overview
The bot-engine now supports automatic login to Instagram and TikTok accounts. When you click "Start Bot Session" in the dashboard, the system will:

1. Open Chrome browser (visible, not headless)
2. Navigate to the selected platform (Instagram or TikTok)
3. Automatically log in using the configured credentials
4. Start scrolling and collecting data

## Credentials Configuration

### Instagram
- Username: `mindmatterlife`
- Password: `L0ngStr@ngeTr!p`

### TikTok
- Email: `mindmattermarket@gmail.com`
- Password: `L0ngStr@ngeTr!p`

## How It Works

1. **Dashboard Button Click**: When you click "Start Bot Session", the frontend sends a request to the backend with the platform and profile type.

2. **Bot Engine Connector**: The connector service retrieves the appropriate credentials for the selected platform and passes them to the orchestrator.

3. **Orchestrator**: Creates a bot session with the credentials included in the configuration.

4. **Platform Bot**: The Instagram or TikTok bot:
   - Checks if login is required when navigating to the feed
   - If login is needed, uses the `performLogin()` method
   - Fills in credentials and submits the login form
   - Handles any post-login popups
   - Starts scrolling and collecting data

## Key Changes Made

1. **Instagram Bot** (`bot-engine/instagram-bot.js`):
   - Added `performLogin()` method
   - Added `getCredentials()` method
   - Modified `navigateToFeed()` to check for and perform login

2. **TikTok Bot** (`bot-engine/tiktok-bot.js`):
   - Added `performLogin()` method
   - Added `getCredentials()` method
   - Modified `navigateToFeed()` to check for and perform login

3. **Bot Engine Connector** (`dashboard/backend/services/bot-engine-connector.js`):
   - Added `getCredentialsForPlatform()` method
   - Modified `startSession()` to include credentials

4. **Orchestrator** (`bot-engine/orchestrator.js`):
   - Modified to accept and pass credentials to bots

5. **Bot Base** (`bot-engine/bot-base.js`):
   - Forces `headless: false` when credentials are provided for debugging

## Testing
To test the login functionality:

```bash
cd dashboard/backend
node test-bot-login.js
```

This will open browsers and test login for both platforms.

## Troubleshooting

1. **Login fails**: Make sure the credentials are correct and the accounts are not locked
2. **Browser doesn't open**: Check that Playwright is properly installed
3. **Popups block login**: The bots handle common popups, but new ones may need to be added

## Security Note
Credentials are currently hardcoded for testing. In production:
- Use environment variables
- Store encrypted credentials in a secure vault
- Implement proper credential rotation