#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m'
};

// Kill processes on ports
function killPort(port) {
  return new Promise((resolve) => {
    exec(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, (error) => {
      // Ignore errors (port might not be in use)
      resolve();
    });
  });
}

// Wait for port to be available
function waitForPort(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const checkPort = () => {
      exec(`lsof -i:${port}`, (error) => {
        if (error) {
          // Port is free
          resolve();
        } else if (attempts < maxAttempts) {
          attempts++;
          setTimeout(checkPort, 1000);
        } else {
          reject(new Error(`Port ${port} is still in use after ${maxAttempts} attempts`));
        }
      });
    };
    checkPort();
  });
}

// Start a server
function startServer(name, scriptPath, port, color) {
  return new Promise((resolve, reject) => {
    console.log(`${color}🚀 Starting ${name} on port ${port}...${colors.reset}`);
    
    const server = spawn('node', [scriptPath], {
      env: { ...process.env, NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;
    const timeout = setTimeout(() => {
      if (!started) {
        server.kill();
        reject(new Error(`${name} failed to start within 30 seconds`));
      }
    }, 30000);

    server.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`${color}[${name}]${colors.reset} ${output.trim()}`);
      
      // Check if server started successfully
      if (output.includes(`port ${port}`) || output.includes('running')) {
        started = true;
        clearTimeout(timeout);
        setTimeout(() => resolve(server), 1000); // Give it a second to fully initialize
      }
    });

    server.stderr.on('data', (data) => {
      console.error(`${colors.red}[${name} ERROR]${colors.reset} ${data.toString().trim()}`);
    });

    server.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    server.on('exit', (code) => {
      if (!started) {
        clearTimeout(timeout);
        reject(new Error(`${name} exited with code ${code}`));
      }
    });
  });
}

// Check server health
function checkHealth(port, path = '/health') {
  return new Promise((resolve) => {
    exec(`curl -s http://localhost:${port}${path}`, (error, stdout) => {
      if (error) {
        resolve(false);
      } else {
        try {
          const response = JSON.parse(stdout);
          resolve(response.status === 'healthy');
        } catch {
          resolve(false);
        }
      }
    });
  });
}

// Main startup sequence
async function main() {
  console.log(`${colors.bright}${colors.blue}🔧 ICPScope Server Startup${colors.reset}\n`);

  try {
    // Step 1: Clean up existing processes
    console.log(`${colors.yellow}📋 Cleaning up existing processes...${colors.reset}`);
    await killPort(3000);
    await killPort(3001);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for ports to be released

    // Step 2: Ensure ports are available
    console.log(`${colors.yellow}📋 Checking port availability...${colors.reset}`);
    await waitForPort(3000, 5);
    await waitForPort(3001, 5);
    console.log(`${colors.green}✅ Ports are available${colors.reset}\n`);

    // Step 3: Start backend server
    const backendPath = path.join(__dirname, 'dashboard', 'backend', 'server.js');
    const backend = await startServer('Backend', backendPath, 3001, colors.magenta);
    
    // Step 4: Wait for backend to be healthy
    console.log(`${colors.yellow}📋 Waiting for backend health check...${colors.reset}`);
    let backendHealthy = false;
    for (let i = 0; i < 10; i++) {
      backendHealthy = await checkHealth(3001);
      if (backendHealthy) break;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    if (!backendHealthy) {
      throw new Error('Backend server failed health check');
    }
    console.log(`${colors.green}✅ Backend is healthy${colors.reset}\n`);

    // Step 5: Start dashboard server
    const dashboardPath = path.join(__dirname, 'dashboard', 'server.js');
    const dashboard = await startServer('Dashboard', dashboardPath, 3000, colors.blue);

    // Step 6: Final status
    console.log(`\n${colors.bright}${colors.green}✅ All servers started successfully!${colors.reset}`);
    console.log(`\n${colors.bright}📱 Access your dashboard at: ${colors.blue}http://localhost:3000${colors.reset}`);
    console.log(`${colors.bright}🔌 Backend API available at: ${colors.magenta}http://localhost:3001${colors.reset}\n`);

    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log(`\n${colors.yellow}⏹️  Shutting down servers...${colors.reset}`);
      backend.kill();
      dashboard.kill();
      process.exit(0);
    });

    // Keep the script running
    process.stdin.resume();

  } catch (error) {
    console.error(`\n${colors.red}❌ Startup failed: ${error.message}${colors.reset}`);
    process.exit(1);
  }
}

// Run the startup sequence
main().catch(console.error);