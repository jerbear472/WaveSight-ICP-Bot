/**
 * Instagram Bot Test Script
 * Tests the Instagram bot with mindmatterlife account
 */

require('dotenv').config();
const InstagramBot = require('./bot-engine/instagram-bot');
const ICPProfileGenerator = require('./bot-engine/icp-profile-generator');

async function testInstagramBot() {
  console.log('🤖 Testing Instagram Bot with mindmatterlife account...\n');
  
  // Generate a test ICP profile
  const profileGenerator = new ICPProfileGenerator();
  const icpProfile = profileGenerator.generateProfile('gen_z_tech_enthusiast', {
    profileName: 'Test Profile for mindmatterlife'
  });
  
  console.log('👤 Generated ICP Profile:');
  console.log(`   Name: ${icpProfile.profileName}`);
  console.log(`   Age: ${icpProfile.ageRange}`);
  console.log(`   Interests: ${icpProfile.interests.join(', ')}`);
  console.log(`   Region: ${icpProfile.region}\n`);
  
  // Initialize Instagram bot
  const bot = new InstagramBot(icpProfile);
  
  try {
    console.log('🔗 Initializing Instagram bot...');
    await bot.initialize();
    console.log('✅ Bot initialized successfully\n');
    
    console.log('🏃 Starting bot session...');
    await bot.start();
    console.log('✅ Bot session started\n');
    
    console.log('📱 Navigating to Instagram feed...');
    await bot.navigateToFeed();
    console.log('✅ Successfully navigated to feed\n');
    
    console.log('👀 Monitoring content for 30 seconds...');
    
    // Monitor for 30 seconds
    const monitoringPromise = bot.monitorContent();
    
    setTimeout(async () => {
      console.log('⏰ 30 seconds completed, stopping bot...');
      await bot.stop();
      console.log('✅ Bot stopped successfully\n');
      
      // Show session summary
      const sessionData = bot.getSessionData();
      console.log('📊 Session Summary:');
      console.log(`   Session ID: ${sessionData.id}`);
      console.log(`   Duration: ${sessionData.duration}ms`);
      console.log(`   Content viewed: ${sessionData.contentViewed.length} posts`);
      console.log(`   Engagements: ${sessionData.engagements.length} interactions`);
      
      if (sessionData.contentViewed.length > 0) {
        console.log('\n📋 Content Examples:');
        sessionData.contentViewed.slice(0, 3).forEach((content, index) => {
          console.log(`   ${index + 1}. @${content.creator} - ${content.type}`);
          console.log(`      Caption: ${content.caption?.substring(0, 50) || 'No caption'}...`);
        });
      }
      
      process.exit(0);
    }, 30000);
    
    await monitoringPromise;
    
  } catch (error) {
    console.error('❌ Bot test failed:', error.message);
    
    if (error.message.includes('session')) {
      console.log('\n💡 Troubleshooting tips:');
      console.log('   - Check if your Instagram session ID is still valid');
      console.log('   - Try logging out and back into Instagram');
      console.log('   - Extract a fresh session ID');
    }
    
    process.exit(1);
  }
}

// Run the test
testInstagramBot().catch(console.error);