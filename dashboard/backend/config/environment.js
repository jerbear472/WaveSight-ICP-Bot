/**
 * Environment configuration for bot deployment
 */

const isProduction = process.env.NODE_ENV === 'production';
const isRender = process.env.RENDER === 'true' || process.env.IS_PULL_REQUEST === 'true';
const isLocal = !isProduction && !isRender;

// Force visible Chrome for debugging
const forceVisible = process.env.FORCE_VISIBLE === 'true';

module.exports = {
  // Environment detection
  isProduction,
  isRender,
  isLocal,
  
  // Bot configuration based on environment
  botConfig: {
    // Headless mode is REQUIRED on Render/cloud deployments
    // But can be overridden for debugging
    headless: forceVisible ? false : !isLocal,
    
    // Additional browser args for cloud compatibility
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      ...(isRender ? [
        '--single-process',
        '--no-zygote',
        '--disable-accelerated-2d-canvas',
        '--disable-webgl'
      ] : [])
    ],
    
    // Viewport settings
    viewport: {
      width: 1280,
      height: 720,
      deviceScaleFactor: 1
    },
    
    // Timeouts
    timeout: 60000, // 1 minute
    navigationTimeout: 30000, // 30 seconds
    
    // Performance settings for cloud
    slowMo: isRender ? 100 : 0,
    
    // Screenshot settings
    screenshotPath: isRender ? '/tmp' : 'screenshots'
  },
  
  // Logging configuration
  logging: {
    level: isProduction ? 'info' : 'debug',
    format: isRender ? 'json' : 'pretty'
  },
  
  // Display info for debugging
  getEnvironmentInfo() {
    return {
      environment: isProduction ? 'production' : 'development',
      platform: isRender ? 'render' : 'local',
      headless: this.botConfig.headless,
      nodeVersion: process.version,
      memoryLimit: process.env.MEMORY_LIMIT || 'default'
    };
  }
};