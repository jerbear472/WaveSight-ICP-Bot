/**
 * Test script to verify bot-engine login functionality
 */

const ICPProfileGenerator = require('../../bot-engine/icp-profile-generator');
const InstagramBot = require('../../bot-engine/instagram-bot');
const TikTokBot = require('../../bot-engine/tiktok-bot');

async function testInstagramLogin() {
  console.log('\n🔍 Testing Instagram Bot Login...');
  
  const profileGen = new ICPProfileGenerator();
  const profile = profileGen.generateProfile('gen_z_tech_enthusiast');
  
  const bot = new InstagramBot(profile, {
    headless: false, // Show browser
    credentials: {
      username: 'mindmatterlife',
      password: 'L0ngStr@ngeTr!p'
    }
  });

  try {
    await bot.initialize();
    await bot.navigateToFeed();
    console.log('✅ Instagram login successful!');
    
    // Take screenshot as proof
    await bot.screenshot('instagram-login-success');
    
    await bot.cleanup();
  } catch (error) {
    console.error('❌ Instagram login failed:', error.message);
    await bot.cleanup();
  }
}

async function testTikTokLogin() {
  console.log('\n🔍 Testing TikTok Bot Login...');
  
  const profileGen = new ICPProfileGenerator();
  const profile = profileGen.generateProfile('gen_z_content_creator');
  
  const bot = new TikTokBot(profile, {
    headless: false, // Show browser
    credentials: {
      email: 'mindmattermarket@gmail.com',
      password: 'L0ngStr@ngeTr!p'
    }
  });

  try {
    await bot.initialize();
    await bot.navigateToFeed();
    console.log('✅ TikTok login successful!');
    
    // Take screenshot as proof
    await bot.screenshot('tiktok-login-success');
    
    await bot.cleanup();
  } catch (error) {
    console.error('❌ TikTok login failed:', error.message);
    await bot.cleanup();
  }
}

async function runTests() {
  console.log('🚀 Starting bot login tests...\n');
  
  // Test Instagram
  await testInstagramLogin();
  
  // Wait a bit between tests
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Test TikTok
  await testTikTokLogin();
  
  console.log('\n✨ Login tests complete!');
  process.exit(0);
}

// Run the tests
runTests().catch(error => {
  console.error('Test error:', error);
  process.exit(1);
});