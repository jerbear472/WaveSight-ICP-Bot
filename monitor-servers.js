#!/usr/bin/env node

const { exec } = require('child_process');
const http = require('http');

// Configuration
const SERVERS = [
  { name: 'Backend', port: 3001, healthPath: '/health' },
  { name: 'Dashboard', port: 3000, healthPath: '/api/health' }
];

const CHECK_INTERVAL = 5000; // Check every 5 seconds
const RESTART_DELAY = 3000; // Wait 3 seconds before restart attempt

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Check if server is healthy
function checkServer(server) {
  return new Promise((resolve) => {
    const options = {
      hostname: 'localhost',
      port: server.port,
      path: server.healthPath,
      method: 'GET',
      timeout: 3000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          resolve(response.status === 'healthy');
        } catch {
          resolve(false);
        }
      });
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

// Get process info for a port
function getProcessInfo(port) {
  return new Promise((resolve) => {
    exec(`lsof -i:${port} -P -n | grep LISTEN`, (error, stdout) => {
      if (error || !stdout) {
        resolve(null);
      } else {
        const lines = stdout.trim().split('\n');
        const processInfo = lines[0]?.split(/\s+/);
        if (processInfo && processInfo.length > 1) {
          resolve({
            pid: processInfo[1],
            command: processInfo[0]
          });
        } else {
          resolve(null);
        }
      }
    });
  });
}

// Monitor servers
async function monitorServers() {
  console.log(`${colors.blue}🔍 ICPScope Server Monitor${colors.reset}`);
  console.log(`Checking servers every ${CHECK_INTERVAL/1000} seconds...\n`);

  // Server status tracking
  const serverStatus = {};
  SERVERS.forEach(server => {
    serverStatus[server.name] = { healthy: false, lastCheck: null };
  });

  // Main monitoring loop
  setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString();
    
    for (const server of SERVERS) {
      const isHealthy = await checkServer(server);
      const processInfo = await getProcessInfo(server.port);
      const status = serverStatus[server.name];
      
      // Status changed
      if (isHealthy !== status.healthy) {
        if (isHealthy) {
          console.log(`${colors.green}✅ [${timestamp}] ${server.name} is healthy (port ${server.port})${colors.reset}`);
        } else {
          console.log(`${colors.red}❌ [${timestamp}] ${server.name} is down or unhealthy!${colors.reset}`);
          
          // Attempt to restart
          console.log(`${colors.yellow}🔄 Attempting to restart ${server.name}...${colors.reset}`);
          
          // Kill existing process if any
          if (processInfo && processInfo.pid) {
            exec(`kill -9 ${processInfo.pid}`, () => {});
          }
          
          // Wait before restart
          await new Promise(resolve => setTimeout(resolve, RESTART_DELAY));
          
          // Restart server
          const scriptPath = server.name === 'Backend' 
            ? 'dashboard/backend/server.js' 
            : 'dashboard/server.js';
            
          exec(`node ${scriptPath} &`, (error) => {
            if (error) {
              console.log(`${colors.red}Failed to restart ${server.name}: ${error.message}${colors.reset}`);
            } else {
              console.log(`${colors.yellow}Restart command sent for ${server.name}${colors.reset}`);
            }
          });
        }
        
        status.healthy = isHealthy;
        status.lastCheck = timestamp;
      }
      
      // Show process info if running
      if (processInfo && isHealthy) {
        process.stdout.write(`\r${colors.green}✓${colors.reset} ${server.name} (PID: ${processInfo.pid}) - Last check: ${timestamp}`);
      }
    }
  }, CHECK_INTERVAL);

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log(`\n${colors.yellow}Monitor shutting down...${colors.reset}`);
    process.exit(0);
  });
}

// Start monitoring
monitorServers().catch(console.error);