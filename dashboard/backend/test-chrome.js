/**
 * Direct Chrome Test - Start Instagram Bot
 */

require('dotenv').config();
const InstagramBot = require('./bots/instagram-bot');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

console.log('🚀 Starting Instagram Bot Chrome Test...');
console.log('📱 Chrome browser window will open shortly...');

// Create mock session
const session = {
  id: 'test_session_' + Date.now(),
  session_id: 'test_session_' + Date.now(),
  platform: 'instagram',
  profileType: 'gen_z_tech_enthusiast',
  duration: 120000 // 2 minutes
};

// Create mock socket
const mockSocket = {
  emit: (event, data) => {
    console.log(`📡 Socket event: ${event}`, data);
  }
};

// Start the bot
async function startBot() {
  try {
    const bot = new InstagramBot(session, supabase, mockSocket);
    console.log('🌍 Opening Chrome browser...');
    await bot.start();
  } catch (error) {
    console.error('❌ Bot failed:', error);
  }
}

startBot();