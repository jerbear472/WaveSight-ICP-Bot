#!/usr/bin/env node

const http = require('http');
const { exec } = require('child_process');

// Colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

// Server configurations
const SERVERS = [
  { 
    name: 'Dashboard', 
    port: 3000, 
    url: 'http://localhost:3000',
    healthPath: '/api/health',
    color: colors.blue 
  },
  { 
    name: 'Backend API', 
    port: 3001, 
    url: 'http://localhost:3001',
    healthPath: '/health',
    color: colors.magenta 
  }
];

// Check if port is in use
function checkPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -i:${port} -P -n | grep LISTEN`, (error, stdout) => {
      if (error || !stdout) {
        resolve({ inUse: false });
      } else {
        const lines = stdout.trim().split('\n');
        const processInfo = lines[0]?.split(/\s+/);
        if (processInfo && processInfo.length > 1) {
          resolve({
            inUse: true,
            pid: processInfo[1],
            command: processInfo[0]
          });
        } else {
          resolve({ inUse: false });
        }
      }
    });
  });
}

// Check server health
function checkHealth(server) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: server.port,
      path: server.healthPath,
      method: 'GET',
      timeout: 5000
    };

    const startTime = Date.now();
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const responseTime = Date.now() - startTime;
        try {
          const response = JSON.parse(data);
          resolve({
            healthy: response.status === 'healthy',
            response: response,
            responseTime: responseTime,
            statusCode: res.statusCode
          });
        } catch (e) {
          resolve({
            healthy: false,
            error: 'Invalid JSON response',
            responseTime: responseTime,
            statusCode: res.statusCode
          });
        }
      });
    });

    req.on('error', (error) => {
      resolve({
        healthy: false,
        error: error.message,
        responseTime: Date.now() - startTime
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        healthy: false,
        error: 'Request timeout',
        responseTime: Date.now() - startTime
      });
    });

    req.end();
  });
}

// Check bot engine status
async function checkBotEngine() {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/bot/status',
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const status = JSON.parse(data);
          resolve(status);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.end();
  });
}

// Main status check
async function checkStatus() {
  console.clear();
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}        ICPScope System Status Check${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}\n`);

  const timestamp = new Date().toISOString();
  console.log(`${colors.bright}📅 Timestamp:${colors.reset} ${timestamp}\n`);

  // Check each server
  for (const server of SERVERS) {
    console.log(`${server.color}${colors.bright}【 ${server.name} 】${colors.reset}`);
    console.log(`${colors.bright}URL:${colors.reset} ${server.url}`);
    console.log(`${colors.bright}Port:${colors.reset} ${server.port}`);
    
    // Check port status
    const portInfo = await checkPort(server.port);
    if (portInfo.inUse) {
      console.log(`${colors.green}✓ Port Status:${colors.reset} In use (PID: ${portInfo.pid})`);
      
      // Check health
      const health = await checkHealth(server);
      if (health.healthy) {
        console.log(`${colors.green}✓ Health Check:${colors.reset} Healthy (${health.responseTime}ms)`);
        if (health.response.timestamp) {
          console.log(`${colors.bright}  Server Time:${colors.reset} ${health.response.timestamp}`);
        }
      } else {
        console.log(`${colors.red}✗ Health Check:${colors.reset} Failed - ${health.error || 'Unknown error'}`);
      }
    } else {
      console.log(`${colors.red}✗ Port Status:${colors.reset} Not in use`);
      console.log(`${colors.yellow}  ⚠️  Server is not running${colors.reset}`);
    }
    
    console.log('');
  }

  // Check Bot Engine Status
  console.log(`${colors.cyan}${colors.bright}【 Bot Engine Status 】${colors.reset}`);
  const botStatus = await checkBotEngine();
  if (botStatus) {
    console.log(`${colors.green}✓ Bot Engine:${colors.reset} Connected`);
    if (botStatus.activeSession) {
      console.log(`${colors.yellow}  🤖 Active Session:${colors.reset} ${botStatus.activeSession.platform} (${botStatus.activeSession.sessionId})`);
      console.log(`${colors.bright}  Duration:${colors.reset} ${botStatus.activeSession.duration || 'Not specified'}`);
    } else {
      console.log(`${colors.bright}  Status:${colors.reset} Idle (no active sessions)`);
    }
  } else {
    console.log(`${colors.yellow}⚠️  Bot Engine:${colors.reset} Not responding or not configured`);
  }

  // Quick start commands
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}        Quick Commands${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════${colors.reset}`);
  
  console.log(`\n${colors.bright}🚀 Start all servers:${colors.reset}`);
  console.log(`   ${colors.yellow}node start-servers.js${colors.reset}`);
  
  console.log(`\n${colors.bright}🔍 Monitor servers:${colors.reset}`);
  console.log(`   ${colors.yellow}node monitor-servers.js${colors.reset}`);
  
  console.log(`\n${colors.bright}🌐 Open dashboard:${colors.reset}`);
  console.log(`   ${colors.yellow}open http://localhost:3000${colors.reset}`);
  
  console.log(`\n${colors.bright}🛑 Kill all servers:${colors.reset}`);
  console.log(`   ${colors.yellow}lsof -ti:3000,3001 | xargs kill -9${colors.reset}\n`);
}

// Run status check
checkStatus().catch(console.error);