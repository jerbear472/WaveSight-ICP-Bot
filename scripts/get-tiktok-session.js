/**
 * TikTok Session Extractor
 * Run this script to get your TikTok session ID
 */

const puppeteer = require('puppeteer');

async function getTikTokSession() {
  console.log('🔍 Starting TikTok session extraction...');
  
  const browser = await puppeteer.launch({
    headless: false, // Show browser so you can log in
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  
  try {
    // Navigate to TikTok
    await page.goto('https://www.tiktok.com/', {
      waitUntil: 'networkidle2'
    });

    console.log('📱 Please log into your mindmatterlife account in the browser window');
    console.log('⏰ Waiting for login completion...');

    // Wait for user to log in (detect profile page or feed)
    await page.waitForFunction(
      () => {
        return document.querySelector('[data-e2e="profile-icon"]') ||
               document.querySelector('[data-e2e="user-avatar"]') ||
               document.querySelector('[data-e2e="browse-video"]') ||
               window.location.pathname.includes('/following') ||
               window.location.pathname.includes('/foryou');
      },
      { timeout: 120000 }
    );

    console.log('✅ Login detected! Extracting session...');

    // Get all cookies
    const cookies = await page.cookies();
    
    // TikTok uses different session cookie names
    const possibleSessionNames = [
      'sessionid',
      'sessionid_ss',
      'sid_tt',
      'sid_guard',
      'store-idc',
      'store-country-code',
      'passport_csrf_token',
      'passport_csrf_token_default'
    ];

    console.log('🍪 Found cookies:', cookies.map(c => c.name).join(', '));

    const sessionCookies = cookies.filter(cookie => 
      possibleSessionNames.includes(cookie.name)
    );

    if (sessionCookies.length > 0) {
      console.log('🎉 Session cookies extracted successfully!');
      console.log('📋 Add these to your .env file:');
      
      sessionCookies.forEach(cookie => {
        console.log(`TIKTOK_${cookie.name.toUpperCase()}=${cookie.value}`);
      });
      
      console.log(`TIKTOK_USERNAME=mindmatterlife`);
      
      return sessionCookies;
    } else {
      console.log('❌ No session cookies found. Please make sure you are logged in.');
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
getTikTokSession().then(cookies => {
  if (cookies) {
    console.log('\n🚀 Next steps:');
    console.log('1. Copy the session cookies to your .env file');
    console.log('2. Run: node test-tiktok-bot.js to test');
    console.log('3. The bot will now use your mindmatterlife TikTok account');
  } else {
    console.log('\n❌ Session extraction failed. Please try again.');
  }
  process.exit(0);
}).catch(console.error);