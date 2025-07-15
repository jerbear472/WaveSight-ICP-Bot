/**
 * Simple Instagram Test
 * Basic test without complex waits
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function simpleInstagramTest() {
  console.log('🔍 Simple Instagram test...');
  console.log('Session ID:', process.env.INSTAGRAM_SESSION_ID ? 'Present' : 'Missing');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🌐 Loading Instagram...');
    await page.goto('https://www.instagram.com/');
    
    console.log('⏰ Waiting 3 seconds...');
    await page.waitForTimeout(3000);
    
    console.log('🍪 Adding session cookie...');
    await context.addCookies([{
      name: 'sessionid',
      value: process.env.INSTAGRAM_SESSION_ID,
      domain: '.instagram.com',
      path: '/'
    }]);
    
    console.log('🔄 Refreshing...');
    await page.reload();
    
    console.log('⏰ Waiting 5 seconds to check login...');
    await page.waitForTimeout(5000);
    
    console.log('📍 URL:', page.url());
    
    // Check what we can see
    const title = await page.title();
    console.log('📄 Page title:', title);
    
    // Look for username input (means not logged in)
    const usernameInput = await page.locator('input[name="username"]').count();
    console.log('👤 Username input found:', usernameInput > 0);
    
    // Look for story tray (means logged in)
    const storyTray = await page.locator('[role="button"][aria-label*="story"]').count();
    console.log('📚 Story elements found:', storyTray);
    
    // Look for posts
    const posts = await page.locator('article').count();
    console.log('📝 Article elements found:', posts);
    
    if (usernameInput > 0) {
      console.log('❌ Not logged in - need fresh session');
    } else if (posts > 0) {
      console.log('✅ Appears to be logged in with posts visible');
    } else {
      console.log('⚠️ Unclear login state');
    }
    
    console.log('👀 Keeping browser open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

simpleInstagramTest().catch(console.error);