#!/usr/bin/env node

/**
 * Bot Monitor - Real-time monitoring of ICPScope bot activity
 */

const io = require('socket.io-client');
const chalk = require('chalk');

console.log(chalk.cyan('🔍 ICPScope Bot Monitor'));
console.log(chalk.gray('Connecting to backend...'));

const socket = io('http://localhost:3001', {
  transports: ['websocket', 'polling']
});

let sessionStartTime = null;
let currentSession = null;
let stats = {
  contentViewed: 0,
  popupsHandled: 0,
  scrolls: 0,
  errors: 0
};

socket.on('connect', () => {
  console.log(chalk.green('✅ Connected to backend'));
  console.log(chalk.gray('Waiting for bot activity...\n'));
});

socket.on('bot-started', (data) => {
  currentSession = data.sessionId;
  sessionStartTime = Date.now();
  stats = { contentViewed: 0, popupsHandled: 0, scrolls: 0, errors: 0 };
  console.log(chalk.bgGreen.black(' BOT STARTED '), chalk.green(`Session: ${data.sessionId}`));
});

socket.on('bot-status', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  let statusColor = chalk.blue;
  let icon = '📊';
  
  switch(data.status) {
    case 'navigating':
      icon = '🌐';
      statusColor = chalk.yellow;
      break;
    case 'logged_in':
      icon = '✅';
      statusColor = chalk.green;
      break;
    case 'scrolling':
      icon = '📜';
      statusColor = chalk.cyan;
      stats.scrolls++;
      break;
    case 'popup_handled':
      icon = '❌';
      statusColor = chalk.magenta;
      stats.popupsHandled++;
      break;
    case 'error':
      icon = '⚠️';
      statusColor = chalk.red;
      stats.errors++;
      break;
    case 'stopped':
      icon = '🛑';
      statusColor = chalk.gray;
      break;
  }
  
  console.log(
    chalk.gray(`[${timestamp}]`),
    icon,
    statusColor(data.status.toUpperCase()),
    data.message || ''
  );
});

socket.on('content-discovered', (data) => {
  stats.contentViewed++;
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    chalk.gray(`[${timestamp}]`),
    '📱',
    chalk.green('CONTENT'),
    chalk.white(`@${data.username || 'unknown'}`),
    chalk.gray(data.caption ? data.caption.substring(0, 50) + '...' : '')
  );
});

socket.on('bot-engagement', (data) => {
  const timestamp = new Date().toLocaleTimeString();
  console.log(
    chalk.gray(`[${timestamp}]`),
    '💫',
    chalk.yellow('ENGAGEMENT'),
    data.engagement.type
  );
});

socket.on('bot-error', (error) => {
  stats.errors++;
  console.log(chalk.red('❌ ERROR:'), error.message || error);
});

socket.on('bot-stopped', (data) => {
  const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  console.log(chalk.bgRed.white(' BOT STOPPED '), data.message || '');
  printStats(duration);
});

socket.on('session-complete', (data) => {
  const duration = sessionStartTime ? Math.floor((Date.now() - sessionStartTime) / 1000) : 0;
  console.log(chalk.bgGreen.black(' SESSION COMPLETE '));
  printStats(duration);
});

function printStats(duration) {
  console.log('\n' + chalk.cyan('📊 Session Statistics:'));
  console.log(chalk.gray('─'.repeat(30)));
  console.log(chalk.white('Duration:'), chalk.yellow(`${duration}s`));
  console.log(chalk.white('Content Viewed:'), chalk.green(stats.contentViewed));
  console.log(chalk.white('Scrolls:'), chalk.blue(stats.scrolls));
  console.log(chalk.white('Popups Handled:'), chalk.magenta(stats.popupsHandled));
  console.log(chalk.white('Errors:'), chalk.red(stats.errors));
  console.log(chalk.gray('─'.repeat(30)));
  console.log();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n' + chalk.yellow('👋 Closing monitor...'));
  socket.disconnect();
  process.exit(0);
});

// Keep process alive
process.stdin.resume();