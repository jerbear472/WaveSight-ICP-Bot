# ICPScope Instagram Bot - Updated Behavior

## What the Bot Now Does:

1. **Opens Instagram.com directly** (not Meta/Facebook login pages)
   - Navigates to `https://www.instagram.com/`
   - Detects if Facebook/Meta login options appear and avoids them
   - Uses Instagram native login only

2. **Instagram Native Login**
   - If login is required, navigates directly to `https://www.instagram.com/accounts/login/`
   - Fills username and password fields
   - Avoids "Continue with Facebook" or "Log in with Facebook" options
   - Handles all Instagram popups by clicking X buttons

3. **Starts Scrolling Immediately**
   - After successful login and popup handling
   - Uses natural human-like scrolling patterns:
     - Normal scrolls: 300-800 pixels (70% of the time)
     - Quick double scrolls: 150-300 pixels (15% of the time)
     - Long scrolls: 1000-1500 pixels (15% of the time)
     - Variable timing: 1-2.5 seconds between scrolls
     - Micro-pauses for reading content

4. **Desktop Mode**
   - Forces 1920x1080 viewport
   - Uses Windows Chrome user agent
   - Prevents mobile Instagram detection

## How to Start the Bot:

1. Open file:///Users/JeremyUys_1/Desktop/ICPScope/verify-bot-system.html
2. Select "Instagram" as platform
3. Choose any profile type
4. Set duration (default 30 seconds for testing)
5. Click "Start Bot"

The bot will:
- Open a new Chrome window
- Navigate to instagram.com
- Handle login if needed (using Instagram credentials, not Facebook)
- Close any popups
- Start scrolling through the feed naturally

## Credentials:

The bot uses the credentials configured in the environment or defaults:
- Username: mindmatterlife
- Password: L0ngStr@ngeTr!p

## Stop the Bot:

Click the "Stop Bot Session" button at any time to immediately stop scrolling and close the browser.