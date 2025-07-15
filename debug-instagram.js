/**
 * Debug Instagram Login
 * Visual test to see what's happening with the session
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function debugInstagram() {
  console.log('🔍 Debugging Instagram connection...');
  
  const browser = await chromium.launch({
    headless: false, // Show browser
    slowMo: 1000
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
    viewport: { width: 1920, height: 1080 }
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🌐 Navigating to Instagram...');
    await page.goto('https://www.instagram.com/', { waitUntil: 'networkidle' });
    
    console.log('🍪 Adding session cookie...');
    await context.addCookies([{
      name: 'sessionid',
      value: process.env.INSTAGRAM_SESSION_ID,
      domain: '.instagram.com',
      path: '/'
    }]);
    
    console.log('🔄 Refreshing page with session...');
    await page.reload({ waitUntil: 'networkidle' });
    
    // Check if we're logged in
    console.log('⏰ Waiting 5 seconds to see what happens...');
    await page.waitForTimeout(5000);
    
    const currentUrl = page.url();
    console.log('📍 Current URL:', currentUrl);
    
    // Try to find login indicators
    const loginForm = await page.locator('input[name="username"]').count();
    const feedPosts = await page.locator('article[role="presentation"]').count();
    const profileLink = await page.locator('a[href="/mindmatterlife/"]').count();
    
    console.log('🔍 Page Analysis:');
    console.log('   Login form present:', loginForm > 0);
    console.log('   Feed posts visible:', feedPosts > 0);
    console.log('   Profile link found:', profileLink > 0);
    
    if (loginForm > 0) {
      console.log('❌ Still showing login form - session may be invalid');
      console.log('💡 Try getting a fresh session ID from Instagram');
    } else if (feedPosts > 0) {
      console.log('✅ Successfully logged in and seeing feed!');
    } else {
      console.log('⚠️ Logged in but no feed posts visible');
    }
    
    // Take screenshot
    await page.screenshot({ path: 'instagram-debug.png' });
    console.log('📸 Screenshot saved as instagram-debug.png');
    
    console.log('👀 Browser will stay open for 30 seconds for inspection...');
    await page.waitForTimeout(30000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

debugInstagram().catch(console.error);