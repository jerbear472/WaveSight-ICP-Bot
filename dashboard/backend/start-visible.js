#!/usr/bin/env node

/**
 * Start server with Chrome visible for local development
 */

console.log('🚀 Starting WaveSight with VISIBLE Chrome Browser');
console.log('✅ When you click "Start Bot Session", Chrome will open!\n');

// Force visible Chrome
process.env.FORCE_VISIBLE = 'true';
process.env.NODE_ENV = 'development';

// Load and run server
require('./server.js');