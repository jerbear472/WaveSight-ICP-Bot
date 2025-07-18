/**
 * Bot Backend Server Entry Point for Production
 * This ensures the bot backend runs on the correct port
 */

// Set the port to use Render's PORT or default to 3001
process.env.PORT = process.env.PORT || '3001';

// Run the bot backend server
console.log('Starting bot backend server on port:', process.env.PORT);
require('./dashboard/backend/server.js');