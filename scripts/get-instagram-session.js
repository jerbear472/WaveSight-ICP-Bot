/**
 * Instagram Session Extractor
 * Run this script to get your Instagram session ID
 */

const puppeteer = require('puppeteer');

async function getInstagramSession() {
  console.log('🔍 Starting Instagram session extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser so you can log in
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    // Navigate to Instagram
    await page.goto('https://www.instagram.com/accounts/login/', {
      waitUntil: 'networkidle2'
    });

    console.log('📱 Please log into your mindmatterlife account in the browser window');
    console.log('⏰ Waiting for login completion...');

    // Wait for user to log in (detect redirect to feed)
    await page.waitForFunction(
      () => window.location.pathname === '/' || window.location.pathname.includes('/feed/'),
      { timeout: 120000 }
    );

    console.log('✅ Login detected! Extracting session...');

    // Get all cookies
    const cookies = await page.cookies();
    const sessionCookie = cookies.find(cookie => cookie.name === 'sessionid');

    if (sessionCookie) {
      console.log('🎉 Session ID extracted successfully!');
      console.log('📋 Add this to your .env file:');
      console.log(`INSTAGRAM_SESSION_ID=${sessionCookie.value}`);
      console.log(`INSTAGRAM_USERNAME=mindmatterlife`);
      
      return sessionCookie.value;
    } else {
      console.log('❌ Session ID not found. Please make sure you are logged in.');
      return null;
    }

  } catch (error) {
    console.error('❌ Error extracting session:', error.message);
    return null;
  } finally {
    await browser.close();
  }
}

// Run the extraction
getInstagramSession().then(sessionId => {
  if (sessionId) {
    console.log('\n🚀 Next steps:');
    console.log('1. Copy the session ID to your .env file');
    console.log('2. Run: node bot-engine/instagram-bot.js to test');
    console.log('3. The bot will now use your mindmatterlife account');
  } else {
    console.log('\n❌ Session extraction failed. Please try again.');
  }
  process.exit(0);
}).catch(console.error);