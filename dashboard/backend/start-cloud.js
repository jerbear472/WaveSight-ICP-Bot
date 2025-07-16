#!/usr/bin/env node

/**
 * Cloud startup script with proper initialization
 */

const envConfig = require('./config/environment');

console.log('🚀 Starting WaveSight Bot Backend in Cloud Mode');
console.log('📋 Environment:', envConfig.getEnvironmentInfo());

// Ensure required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('❌ Missing required environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

// Install browser dependencies if on Render
if (envConfig.isRender) {
  console.log('📦 Installing browser dependencies for Render...');
  try {
    const { execSync } = require('child_process');
    execSync('npx playwright install-deps chromium', { stdio: 'inherit' });
    execSync('npx playwright install chromium', { stdio: 'inherit' });
    console.log('✅ Browser dependencies installed');
  } catch (error) {
    console.error('⚠️ Failed to install browser dependencies:', error.message);
    // Continue anyway - they might already be installed
  }
}

// Start the server
require('./server.js');