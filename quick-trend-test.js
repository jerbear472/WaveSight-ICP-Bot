/**
 * Quick Trend Test
 * Shows real-time bot data collection in action
 */

require('dotenv').config();
const TechSavvyBotRunner = require('./run-tech-savvy-bot');

async function quickTest() {
  console.log('🚀 QUICK TECH-SAVVY BOT DEMO');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('👤 Persona: Tech-savvy 18-24 year old');
  console.log('🎯 Hunting: AI, crypto, viral trends');
  console.log('📊 Logging: Real-time to console + Supabase');
  console.log('⏱️  Duration: 30 seconds per platform\n');

  const runner = new TechSavvyBotRunner();
  
  try {
    await runner.initialize();
    
    console.log('📱 INSTAGRAM SCAN (30 seconds):');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Short Instagram run
    setTimeout(() => {
      console.log('\n🎵 TIKTOK SCAN (30 seconds):');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    }, 30000);
    
    // Run for just 1 minute total
    await runner.runBothPlatforms(60 * 1000);
    
    console.log('\n✅ DEMO COMPLETE!');
    console.log('🔍 Check your Supabase database for collected trend data');
    console.log('📊 View the dashboard to see analytics');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    runner.stop();
  }
}

quickTest().catch(console.error);