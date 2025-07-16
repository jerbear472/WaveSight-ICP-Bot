/**
 * Force Chrome to be visible for local development
 * This overrides the headless configuration
 */

// Set environment variable
process.env.FORCE_VISIBLE = 'true';
process.env.NODE_ENV = 'development';

console.log('🎯 Chrome Visibility Override Active!');
console.log('✅ Chrome will open in a visible window');
console.log('');

// Start the server
require('./server.js');