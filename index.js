/**
 * ICPScope Entry Point for Render Deployment
 * This runs the appropriate service based on environment
 */

// Check if we're on Render and need specific service
if (process.env.RENDER) {
  // On Render, we need to run the bot backend on the assigned PORT
  console.log('Running on Render, starting bot backend...');
  require('./start-backend.js');
} else if (process.env.SERVICE_TYPE === 'frontend') {
  // Run the dashboard frontend
  require('./render-deploy.js');
} else {
  // Default: Run the bot backend
  require('./dashboard/backend/server.js');
}