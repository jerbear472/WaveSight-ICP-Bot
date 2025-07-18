/**
 * Unified Server Entry Point for Production
 * This runs the unified WaveSight server with dashboard and bot backend
 */

// Run the unified server
console.log('Starting WaveSight unified server on port:', process.env.PORT || 3000);
require('./unified-server.js');