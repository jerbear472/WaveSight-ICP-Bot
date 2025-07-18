/**
 * Test Instagram Bot Scrolling Behavior
 */

const InstagramBot = require('./bot-engine/instagram-bot');

async function testScrolling() {
  console.log('🧪 Testing Instagram Bot Scrolling Behavior\n');
  
  const bot = new InstagramBot({
    username: 'test_user',
    password: 'test_pass'
  });
  
  // Mock the scroll method to log behavior
  const scrollTimes = [];
  const scrollDistances = [];
  
  bot.smoothScroll = async function(distance, duration) {
    console.log(`📜 Scroll: ${distance}px over ${(duration/1000).toFixed(1)}s`);
    scrollTimes.push(duration);
    scrollDistances.push(distance);
    
    // Simulate the scroll
    return new Promise(resolve => setTimeout(resolve, 100));
  };
  
  bot.page = {
    evaluate: async () => ({ scrollY: 0, innerHeight: 800 }),
    mouse: { wheel: async () => {} }
  };
  
  bot.sleep = async (ms) => {
    console.log(`⏱️  Wait: ${(ms/1000).toFixed(1)}s`);
    return new Promise(resolve => setTimeout(resolve, 100));
  };
  
  // Test 10 scrolls
  console.log('Simulating 10 scroll actions:\n');
  bot.isActive = true;
  
  for (let i = 0; i < 10; i++) {
    console.log(`--- Scroll ${i + 1} ---`);
    await bot.naturalScroll();
    console.log('');
  }
  
  // Analyze results
  console.log('\n📊 Scroll Analysis:');
  console.log('==================');
  
  const avgScrollTime = scrollTimes.reduce((a, b) => a + b, 0) / scrollTimes.length;
  const avgScrollDistance = scrollDistances.reduce((a, b) => a + b, 0) / scrollDistances.length;
  
  console.log(`Average scroll time: ${(avgScrollTime/1000).toFixed(1)}s`);
  console.log(`Average scroll distance: ${avgScrollDistance.toFixed(0)}px`);
  console.log(`Time range: ${(Math.min(...scrollTimes)/1000).toFixed(1)}s - ${(Math.max(...scrollTimes)/1000).toFixed(1)}s`);
  console.log(`Distance range: ${Math.min(...scrollDistances)}px - ${Math.max(...scrollDistances)}px`);
  
  // Count scroll types
  const normalScrolls = scrollDistances.filter(d => d >= 300 && d <= 800).length;
  const quickScrolls = scrollDistances.filter(d => d >= 150 && d < 300).length;
  const longScrolls = scrollDistances.filter(d => d > 800).length;
  
  console.log(`\nScroll Types:`);
  console.log(`Normal (300-800px): ${normalScrolls} (${(normalScrolls/10*100).toFixed(0)}%)`);
  console.log(`Quick (150-300px): ${quickScrolls} (${(quickScrolls/10*100).toFixed(0)}%)`);
  console.log(`Long (800px+): ${longScrolls} (${(longScrolls/10*100).toFixed(0)}%)`);
}

testScrolling().catch(console.error);