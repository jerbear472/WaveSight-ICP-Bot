/**
 * Enhanced Bot Test - Demonstrates improved popup handling and data logging
 */

require('dotenv').config();
const InstagramBot = require('./bots/instagram-bot');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🚀 Testing Enhanced Instagram Bot...');
console.log('✨ Features:');
console.log('   - Advanced popup handling and window management');
console.log('   - Focused scrolling and data extraction');
console.log('   - Better error recovery and logging');
console.log('   - Human-like browsing patterns');
console.log('');

// Create test session
const session = {
  id: 'enhanced_test_' + Date.now(),
  session_id: 'enhanced_test_' + Date.now(),
  platform: 'instagram',
  profileType: 'gen_z_tech_enthusiast',
  duration: 180000 // 3 minutes for demo
};

// Enhanced mock socket with better logging
const mockSocket = {
  emit: (event, data) => {
    if (event === 'content-discovered') {
      console.log(`📱 CONTENT DISCOVERED:`);
      console.log(`   Creator: @${data.content.creator}`);
      console.log(`   Music: ${data.content.music}`);
      console.log(`   URL: ${data.content.url}`);
      console.log(`   Engagement: ${data.content.likes} likes, ${data.content.comments} comments`);
      console.log(`   Stats: ${data.stats.contentViewed} viewed, ${data.stats.engagements} engagements`);
      console.log('');
    } else if (event === 'bot-status') {
      console.log(`🤖 BOT STATUS: ${data.status} - ${data.progress || ''}`);
    } else {
      console.log(`📡 Socket event: ${event}`, data);
    }
  }
};

// Start the enhanced bot
async function startEnhancedBot() {
  try {
    console.log('🌍 Opening Chrome browser for Instagram...');
    const bot = new InstagramBot(session, supabase, mockSocket);
    await bot.start();
  } catch (error) {
    console.error('❌ Enhanced bot test failed:', error);
  }
}

// Run with timing info
const startTime = Date.now();
console.log(`⏰ Test started at: ${new Date().toLocaleTimeString()}`);
console.log('');

startEnhancedBot().then(() => {
  const endTime = Date.now();
  const duration = Math.floor((endTime - startTime) / 1000);
  console.log('');
  console.log(`✅ Enhanced bot test completed in ${duration} seconds`);
});