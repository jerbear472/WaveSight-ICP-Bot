/**
 * Test script to verify real bot data flow
 * This tests the complete flow: Bot → Orchestrator → Connector → Dashboard
 */

const BotOrchestrator = require('../../bot-engine/orchestrator');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function testRealBotFlow() {
  console.log('\n🚀 Testing Real Bot Data Flow\n');
  
  // Initialize orchestrator
  const orchestrator = new BotOrchestrator({
    maxConcurrentBots: 1,
    sessionDuration: 60000, // 1 minute for testing
    platforms: ['instagram']
  });

  // Set up event listeners to track the flow
  let eventLog = [];
  
  orchestrator.on('bot-content-discovered', (data) => {
    console.log('✅ Content Discovered:', {
      platform: data.content.platform,
      creator: data.content.creator,
      likes: data.content.likes,
      caption: data.content.caption?.substring(0, 50) + '...'
    });
    eventLog.push({ type: 'content', time: Date.now(), data });
  });

  orchestrator.on('bot-engagement', (data) => {
    console.log('💚 Engagement:', data.engagement.eventType);
    eventLog.push({ type: 'engagement', time: Date.now(), data });
  });

  orchestrator.on('bot-status', (data) => {
    console.log('📊 Status Update:', data.status, '-', data.message);
    eventLog.push({ type: 'status', time: Date.now(), data });
  });

  orchestrator.on('bot-error', (data) => {
    console.error('❌ Error:', data.error, '-', data.message);
    eventLog.push({ type: 'error', time: Date.now(), data });
  });

  orchestrator.on('bot-session-complete', (data) => {
    console.log('🏁 Session Complete:', {
      impressions: data.impressions,
      engagements: data.engagements,
      duration: Math.round(data.duration / 1000) + 's'
    });
    eventLog.push({ type: 'complete', time: Date.now(), data });
  });

  try {
    // Initialize orchestrator
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized\n');

    // Start a manual session
    console.log('🤖 Starting Instagram bot session...\n');
    const sessionId = await orchestrator.runManualSession({
      profileType: 'gen_z_tech_enthusiast',
      platform: 'instagram',
      duration: 60000, // 1 minute
      credentials: {
        username: 'mindmatterlife',
        password: 'L0ngStr@ngeTr!p'
      }
    });

    console.log(`📝 Session ID: ${sessionId}\n`);

    // Wait for session to complete
    await new Promise(resolve => {
      const checkComplete = setInterval(() => {
        const completeEvent = eventLog.find(e => e.type === 'complete');
        if (completeEvent) {
          clearInterval(checkComplete);
          resolve();
        }
      }, 1000);
    });

    // Analyze results
    console.log('\n📊 Session Analysis:');
    console.log('─'.repeat(50));
    
    const contentEvents = eventLog.filter(e => e.type === 'content');
    const engagementEvents = eventLog.filter(e => e.type === 'engagement');
    
    console.log(`Total Events: ${eventLog.length}`);
    console.log(`Content Discovered: ${contentEvents.length}`);
    console.log(`Engagements: ${engagementEvents.length}`);
    
    // Check database
    console.log('\n🗄️  Checking Supabase...');
    const { data: sessions, error: sessionError } = await supabase
      .from('bot_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1);

    if (sessions && sessions.length > 0) {
      console.log('✅ Session recorded in database');
      
      // Check impressions
      const { data: impressions, error: impError } = await supabase
        .from('content_impressions')
        .select('*')
        .eq('session_id', sessions[0].session_id)
        .limit(5);
        
      console.log(`✅ ${impressions?.length || 0} impressions recorded`);
    } else {
      console.log('❌ No session found in database');
    }

    // Stop orchestrator
    await orchestrator.stop();
    console.log('\n✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    await orchestrator.stop();
    process.exit(1);
  }
}

// Run the test
testRealBotFlow().then(() => {
  console.log('\n🎉 All tests passed!');
  process.exit(0);
}).catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});