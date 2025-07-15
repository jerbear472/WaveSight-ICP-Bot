/**
 * Debug TikTok Connection
 * Simple test to verify TikTok session works
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function debugTikTok() {
  console.log('🔍 Debugging TikTok connection...');
  console.log('Session ID:', process.env.TIKTOK_SESSION_ID ? 'Present' : 'Missing');
  
  const browser = await chromium.launch({
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    console.log('🌐 Loading TikTok...');
    await page.goto('https://www.tiktok.com/');
    
    console.log('⏰ Waiting 3 seconds...');
    await page.waitForTimeout(3000);
    
    console.log('🍪 Adding session cookie...');
    await context.addCookies([{
      name: 'sessionid',
      value: process.env.TIKTOK_SESSION_ID,
      domain: '.tiktok.com',
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
    
    // Look for login form (means not logged in)
    const loginButton = await page.locator('[data-e2e="login-button"]').count();
    console.log('🔐 Login button found:', loginButton > 0);
    
    // Look for profile icon (means logged in)
    const profileIcon = await page.locator('[data-e2e="profile-icon"]').count();
    console.log('👤 Profile icon found:', profileIcon > 0);
    
    // Look for videos
    const videos = await page.locator('[data-e2e="recommend-list-item"]').count();
    console.log('📹 Videos found:', videos);
    
    // Look for For You page
    const forYouTab = await page.locator('[data-e2e="recommend-list-item"]').count();
    console.log('🎯 For You content:', forYouTab > 0);
    
    if (loginButton > 0) {
      console.log('❌ Not logged in - login button still visible');
    } else if (profileIcon > 0) {
      console.log('✅ Appears to be logged in with profile icon visible');
    } else if (videos > 0) {
      console.log('✅ Content is visible - likely logged in');
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

debugTikTok().catch(console.error);