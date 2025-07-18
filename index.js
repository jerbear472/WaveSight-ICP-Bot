/**
 * ICPScope Entry Point for Render Deployment
 * This runs the unified WaveSight server
 */

// Always run the unified server that includes both frontend and backend
console.log('Starting WaveSight unified server...');
require('./unified-server.js');