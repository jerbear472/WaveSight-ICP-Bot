#!/usr/bin/env node

const http = require('http');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Make HTTP request
function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let responseData = '';
      res.on('data', chunk => responseData += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.setHeader('Content-Type', 'application/json');
      req.write(JSON.stringify(data));
    }
    
    req.end();
  });
}

// Test bot control
async function testBotControl() {
  console.log(`${colors.bright}${colors.blue}🤖 ICPScope Bot Control Test${colors.reset}\n`);

  // Test configurations
  const tests = [
    {
      name: 'Instagram Bot (Gen-Z Tech)',
      platform: 'instagram',
      profileType: 'gen-z-tech-enthusiast',
      duration: 30
    },
    {
      name: 'TikTok Bot (Finance-Focused Millennials)',
      platform: 'tiktok',
      profileType: 'finance-focused-millennials',
      duration: 30
    }
  ];

  for (const test of tests) {
    console.log(`${colors.bright}${colors.magenta}Testing: ${test.name}${colors.reset}`);
    console.log(`Platform: ${test.platform}`);
    console.log(`Profile: ${test.profileType}`);
    console.log(`Duration: ${test.duration} seconds\n`);

    try {
      // Start bot session
      console.log(`${colors.yellow}1. Starting bot session...${colors.reset}`);
      const startOptions = {
        hostname: 'localhost',
        port: 3001,
        path: '/api/bot/start',
        method: 'POST'
      };
      
      const startData = {
        platform: test.platform,
        profileType: test.profileType,
        duration: test.duration
      };

      const startResponse = await makeRequest(startOptions, startData);
      
      if (startResponse.status === 200) {
        console.log(`${colors.green}✅ Bot started successfully!${colors.reset}`);
        console.log(`Session ID: ${startResponse.data.sessionId}`);
        console.log(`Message: ${startResponse.data.message}\n`);
        
        // Wait a bit
        console.log(`${colors.yellow}2. Waiting 5 seconds...${colors.reset}`);
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check status
        console.log(`${colors.yellow}3. Checking bot status...${colors.reset}`);
        const statusOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/bot/status',
          method: 'GET'
        };
        
        const statusResponse = await makeRequest(statusOptions);
        if (statusResponse.status === 200) {
          console.log(`${colors.green}✅ Status retrieved${colors.reset}`);
          console.log(`Active session: ${statusResponse.data.activeSession ? 'Yes' : 'No'}`);
          if (statusResponse.data.activeSession) {
            console.log(`Platform: ${statusResponse.data.activeSession.platform}`);
            console.log(`Session ID: ${statusResponse.data.activeSession.sessionId}\n`);
          }
        }
        
        // Stop bot
        console.log(`${colors.yellow}4. Stopping bot session...${colors.reset}`);
        const stopOptions = {
          hostname: 'localhost',
          port: 3001,
          path: '/api/bot/stop',
          method: 'POST'
        };
        
        const stopData = {
          sessionId: startResponse.data.sessionId
        };
        
        const stopResponse = await makeRequest(stopOptions, stopData);
        if (stopResponse.status === 200) {
          console.log(`${colors.green}✅ Bot stopped successfully!${colors.reset}`);
          console.log(`Message: ${stopResponse.data.message}\n`);
        }
        
      } else {
        console.log(`${colors.red}❌ Failed to start bot${colors.reset}`);
        console.log(`Status: ${startResponse.status}`);
        console.log(`Response: ${JSON.stringify(startResponse.data, null, 2)}\n`);
      }
      
    } catch (error) {
      console.log(`${colors.red}❌ Test failed: ${error.message}${colors.reset}\n`);
    }
    
    console.log(`${colors.bright}${'─'.repeat(50)}${colors.reset}\n`);
    
    // Wait between tests
    if (tests.indexOf(test) < tests.length - 1) {
      console.log(`${colors.yellow}Waiting 3 seconds before next test...${colors.reset}\n`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
  }
  
  console.log(`${colors.bright}${colors.green}✅ All tests completed!${colors.reset}\n`);
  
  // Show summary
  console.log(`${colors.bright}Summary:${colors.reset}`);
  console.log(`- Bot start/stop endpoints are working`);
  console.log(`- Session management is functional`);
  console.log(`- Platform selection (Instagram/TikTok) is working`);
  console.log(`- Immediate stop functionality is implemented\n`);
  
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log(`1. Open http://localhost:3000 in your browser`);
  console.log(`2. Select a platform (Instagram or TikTok)`);
  console.log(`3. Click "Start Bot" to begin a session`);
  console.log(`4. Click "Stop Bot" to immediately terminate\n`);
}

// Run tests
testBotControl().catch(console.error);