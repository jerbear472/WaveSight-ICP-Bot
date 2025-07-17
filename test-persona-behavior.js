#!/usr/bin/env node

const BotOrchestrator = require('./bot-engine/orchestrator');

async function testPersonaBehavior() {
  console.log('🧪 Testing Persona-Based Bot Behavior\n');
  
  const testProfiles = [
    {
      type: 'gen-z-tech-enthusiast',
      duration: 60000, // 1 minute
      expectedBehavior: 'Fast scrolling, high engagement on tech content'
    },
    {
      type: 'finance-focused-millennials', 
      duration: 60000,
      expectedBehavior: 'Moderate scrolling, selective engagement on finance content'
    }
  ];
  
  try {
    // Initialize orchestrator
    console.log('Initializing orchestrator...');
    const orchestrator = new BotOrchestrator({
      maxConcurrentBots: 1,
      sessionDuration: 60000
    });
    
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized\n');
    
    // Test credentials
    const credentials = {
      username: 'mindmatterlife',
      password: 'L0ngStr@ngeTr!p'
    };
    
    for (const profile of testProfiles) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Testing Profile: ${profile.type}`);
      console.log(`Expected: ${profile.expectedBehavior}`);
      console.log(`Duration: ${profile.duration / 1000} seconds`);
      console.log(`${'='.repeat(60)}\n`);
      
      let engagementCount = 0;
      let contentCount = 0;
      let interestMatches = 0;
      
      // Listen for events
      orchestrator.on('bot-content-discovered', (data) => {
        contentCount++;
        console.log(`📱 [${profile.type}] Content #${contentCount}: ${data.username || 'Unknown'}`);
        if (data.caption) {
          console.log(`   Caption: ${data.caption.substring(0, 50)}...`);
        }
      });
      
      orchestrator.on('bot-engagement', (data) => {
        engagementCount++;
        console.log(`💟 [${profile.type}] Engaged! Type: ${data.type}, Reason: ${data.reason || 'N/A'}`);
        if (data.reason === 'interest_match') {
          interestMatches++;
        }
      });
      
      orchestrator.on('bot-status-update', (status) => {
        if (status.message && status.message.includes('scrolling')) {
          console.log(`🔄 [${profile.type}] ${status.message}`);
        }
      });
      
      // Start session
      console.log(`\nStarting ${profile.type} bot session...`);
      const sessionId = await orchestrator.runManualSession({
        profileType: profile.type,
        platform: 'instagram',
        duration: profile.duration,
        credentials
      });
      
      // Wait for session to complete
      await new Promise(resolve => setTimeout(resolve, profile.duration + 5000));
      
      // Summary
      console.log(`\n📊 Session Summary for ${profile.type}:`);
      console.log(`   Total content viewed: ${contentCount}`);
      console.log(`   Total engagements: ${engagementCount}`);
      console.log(`   Interest-based engagements: ${interestMatches}`);
      console.log(`   Engagement rate: ${contentCount > 0 ? ((engagementCount / contentCount) * 100).toFixed(1) : 0}%`);
      console.log(`   Interest match rate: ${engagementCount > 0 ? ((interestMatches / engagementCount) * 100).toFixed(1) : 0}%`);
      
      // Clear event listeners
      orchestrator.removeAllListeners('bot-content-discovered');
      orchestrator.removeAllListeners('bot-engagement');
      orchestrator.removeAllListeners('bot-status-update');
      
      // Wait between tests
      if (testProfiles.indexOf(profile) < testProfiles.length - 1) {
        console.log('\nWaiting 10 seconds before next test...');
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
    
    console.log('\n✅ All persona behavior tests completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error.stack);
  }
  
  process.exit(0);
}

// Run the test
testPersonaBehavior();