/**
 * Test bot duration handling
 */

const InstagramBot = require('./instagram-bot');
const ICPProfileGenerator = require('./icp-profile-generator');

async function testDuration() {
    console.log('🧪 Testing bot duration handling...');
    
    // Generate a test profile
    const profileGen = new ICPProfileGenerator();
    const profile = profileGen.generateProfile('gen_z_tech_enthusiast');
    
    // Create bot with 30-second duration
    const bot = new InstagramBot(profile, {
        headless: false,
        credentials: {
            username: 'mindmatterlife',
            password: 'L0ngStr@ngeTr!p'
        }
    });
    
    // Listen for session complete
    bot.on('session-complete', (data) => {
        console.log('✅ Session completed!', {
            duration: Math.round(data.duration / 1000) + ' seconds',
            reason: data.completionReason,
            impressions: data.impressions
        });
    });
    
    bot.on('status', (data) => {
        console.log(`📊 Status: ${data.status} - ${data.message}`);
    });
    
    bot.on('error', (data) => {
        console.error('❌ Error:', data);
    });
    
    try {
        // Start bot with 30-second duration
        console.log('🚀 Starting bot with 30-second duration...');
        const startTime = Date.now();
        
        const result = await bot.start({
            duration: 30000,  // 30 seconds
            includeStories: false,
            scrollFeed: true
        });
        
        const actualDuration = Date.now() - startTime;
        console.log(`\n📊 Test Results:`);
        console.log(`Expected duration: 30 seconds`);
        console.log(`Actual duration: ${Math.round(actualDuration / 1000)} seconds`);
        console.log(`Difference: ${Math.abs(30 - Math.round(actualDuration / 1000))} seconds`);
        console.log(`Impressions collected: ${result.impressions}`);
        console.log(`Engagements: ${result.engagements}`);
        
        if (Math.abs(30 - Math.round(actualDuration / 1000)) <= 5) {
            console.log('✅ Duration test PASSED - Bot stopped within 5 seconds of target');
        } else {
            console.log('❌ Duration test FAILED - Bot did not stop at expected time');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Test stop functionality
async function testStop() {
    console.log('\n🧪 Testing stop functionality...');
    
    const profileGen = new ICPProfileGenerator();
    const profile = profileGen.generateProfile('gen_z_tech_enthusiast');
    
    const bot = new InstagramBot(profile, {
        headless: false,
        credentials: {
            username: 'mindmatterlife',
            password: 'L0ngStr@ngeTr!p'
        }
    });
    
    bot.on('session-complete', (data) => {
        console.log('✅ Session stopped!', {
            reason: data.completionReason,
            duration: Math.round(data.duration / 1000) + ' seconds'
        });
    });
    
    try {
        console.log('🚀 Starting bot with 5-minute duration...');
        
        // Start bot in background
        const botPromise = bot.start({
            duration: 300000,  // 5 minutes
            includeStories: false,
            scrollFeed: true
        });
        
        // Wait 15 seconds then stop
        console.log('⏳ Waiting 15 seconds before stopping...');
        await new Promise(resolve => setTimeout(resolve, 15000));
        
        console.log('🛑 Stopping bot...');
        const stopTime = Date.now();
        bot.isActive = false;
        
        // Wait for bot to finish
        const result = await botPromise;
        const stopDuration = Date.now() - stopTime;
        
        console.log(`\n📊 Stop Test Results:`);
        console.log(`Time to stop: ${Math.round(stopDuration / 1000)} seconds`);
        console.log(`Total session time: ${Math.round(result.duration / 1000)} seconds`);
        
        if (stopDuration < 5000) {
            console.log('✅ Stop test PASSED - Bot stopped quickly');
        } else {
            console.log('❌ Stop test FAILED - Bot took too long to stop');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run tests
async function runTests() {
    await testDuration();
    await testStop();
    process.exit(0);
}

runTests();