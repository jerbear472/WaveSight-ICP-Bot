#!/usr/bin/env node

const BotOrchestrator = require('./bot-engine/orchestrator');

async function testBotStart() {
  console.log('🧪 Testing Bot Start Functionality\n');
  
  try {
    // Initialize orchestrator
    console.log('1. Initializing orchestrator...');
    const orchestrator = new BotOrchestrator({
      maxConcurrentBots: 1,
      sessionDuration: 30000, // 30 seconds for test
      restPeriod: 5000
    });
    
    await orchestrator.initialize();
    console.log('✅ Orchestrator initialized\n');
    
    // Test credentials
    const testCredentials = {
      username: 'mindmatterlife',
      password: 'L0ngStr@ngeTr!p'
    };
    
    // Listen for events
    orchestrator.on('bot-content-discovered', (data) => {
      console.log('📱 Content discovered:', data);
    });
    
    orchestrator.on('bot-error', (error) => {
      console.error('❌ Bot error:', error);
    });
    
    orchestrator.on('bot-status-update', (status) => {
      console.log('📊 Status update:', status);
    });
    
    // Try to start a session
    console.log('2. Starting manual bot session...');
    console.log('   Platform: Instagram');
    console.log('   Profile: gen-z-tech-enthusiast');
    console.log('   Duration: 30 seconds\n');
    
    const sessionId = await orchestrator.runManualSession({
      profileType: 'gen-z-tech-enthusiast',
      platform: 'instagram',
      duration: 30000,
      credentials: testCredentials
    });
    
    console.log(`✅ Session started with ID: ${sessionId}\n`);
    
    // Wait for session to complete or error
    console.log('Waiting for session to complete...');
    await new Promise(resolve => setTimeout(resolve, 35000));
    
    // Get final status
    const status = await orchestrator.getStatus();
    console.log('\nFinal status:', status);
    
  } catch (error) {
    console.error('\n❌ Test failed with error:');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Stack trace:', error.stack);
  }
  
  process.exit(0);
}

// Run the test
testBotStart();