#!/usr/bin/env node
/**
 * Test Bot Control System
 * Quick test to verify bot start/stop functionality
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🧪 Testing Bot Control System...\n');

// Start the dashboard server
console.log('📡 Starting dashboard server on port 3000...');
const dashboardServer = spawn('node', [
  path.join(__dirname, 'dashboard/server.js')
], {
  env: { ...process.env, PORT: 3000 },
  stdio: 'inherit'
});

// Start the backend server
console.log('🤖 Starting bot backend server on port 3001...');
const backendServer = spawn('node', [
  path.join(__dirname, 'dashboard/backend/server.js')
], {
  env: { ...process.env, PORT: 3001 },
  stdio: 'inherit'
});

// Handle cleanup
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  dashboardServer.kill();
  backendServer.kill();
  process.exit(0);
});

console.log('\n✅ Servers started!');
console.log('🌐 Dashboard: http://localhost:3000');
console.log('🔧 Backend API: http://localhost:3001');
console.log('\n📝 Instructions:');
console.log('1. Open http://localhost:3000 in your browser');
console.log('2. Click on "Bot Control" section');
console.log('3. Select Instagram or TikTok');
console.log('4. Click "Start Bot Session" - the bot browser should open');
console.log('5. Click "Stop Bot Session" - the bot should stop immediately');
console.log('\nPress Ctrl+C to stop the servers');