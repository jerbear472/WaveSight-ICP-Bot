/**
 * Simple TikTok Test
 * Manual session extraction for TikTok
 */

require('dotenv').config();
const { chromium } = require('playwright');

async function simpleTikTokTest() {
  console.log('🔍 Simple TikTok test...');
  
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
    
    console.log('⏰ Waiting 5 seconds...');
    await page.waitForTimeout(5000);
    
    console.log('🍪 Please log into your mindmatterlife account manually');
    console.log('👆 After logging in, check the console for instructions');
    
    // Wait for login - look for common logged-in elements
    let isLoggedIn = false;
    let attempts = 0;
    const maxAttempts = 30; // 30 seconds
    
    while (!isLoggedIn && attempts < maxAttempts) {
      try {
        // Check for profile icon or user avatar
        const profileIcon = await page.locator('[data-e2e="profile-icon"]').count();
        const userAvatar = await page.locator('[data-e2e="user-avatar"]').count();
        const browseVideo = await page.locator('[data-e2e="browse-video"]').count();
        
        if (profileIcon > 0 || userAvatar > 0 || browseVideo > 0) {
          isLoggedIn = true;
          console.log('✅ Login detected!');
          break;
        }
        
        await page.waitForTimeout(1000);
        attempts++;
      } catch (e) {
        // Continue waiting
      }
    }
    
    if (!isLoggedIn) {
      console.log('⚠️ Please log in manually and run the script again');
      console.log('👀 Keeping browser open for 60 seconds...');
      await page.waitForTimeout(60000);
      return;
    }
    
    console.log('🔍 Extracting session information...');
    
    // Get all cookies
    const cookies = await context.cookies();
    console.log('🍪 Found cookies:', cookies.length);
    
    // Filter for important TikTok cookies
    const importantCookies = cookies.filter(cookie => 
      cookie.name.includes('session') ||
      cookie.name.includes('sid') ||
      cookie.name.includes('passport') ||
      cookie.name === 'store-idc' ||
      cookie.name === 'store-country-code'
    );
    
    if (importantCookies.length > 0) {
      console.log('🎉 Found TikTok session cookies!');
      console.log('📋 Add these to your .env file:');
      console.log('');
      
      importantCookies.forEach(cookie => {
        console.log(`TIKTOK_${cookie.name.toUpperCase()}=${cookie.value}`);
      });
      
      console.log(`TIKTOK_USERNAME=mindmatterlife`);
      console.log('');
      
      // Save to a file for easy copying
      const cookieData = importantCookies.map(cookie => 
        `TIKTOK_${cookie.name.toUpperCase()}=${cookie.value}`
      ).join('\n') + '\nTIKTOK_USERNAME=mindmatterlife';
      
      require('fs').writeFileSync('tiktok-cookies.txt', cookieData);
      console.log('💾 Cookies saved to tiktok-cookies.txt');
      
    } else {
      console.log('❌ No session cookies found');
    }
    
    console.log('📍 Current URL:', page.url());
    console.log('👀 Keeping browser open for 20 seconds...');
    await page.waitForTimeout(20000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

simpleTikTokTest().catch(console.error);