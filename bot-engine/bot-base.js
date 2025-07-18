/**
 * Base Bot Class
 * Core functionality for all platform-specific bots
 */

const { chromium, webkit } = require('playwright');
// Note: We'll use webkit for Safari or chromium for Chrome
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const UserAgent = require('user-agents');
const EventEmitter = require('events');

// Try to load environment config, fallback to defaults if not available
let envConfig;
try {
  envConfig = require('../dashboard/backend/config/environment');
} catch (e) {
  // Default config if environment.js doesn't exist
  envConfig = {
    botConfig: {
      headless: true,
      browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--start-maximized',
        '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ],
      viewport: { width: 1280, height: 720, deviceScaleFactor: 1 },
      slowMo: 0
    }
  };
}

class BotBase extends EventEmitter {
  constructor(icpProfile, config = {}) {
    super();
    this.icpProfile = icpProfile;
    this.sessionId = uuidv4();
    this.config = {
      headless: true,
      timeout: 300000, // 5 minutes
      proxyUrl: null,
      slowMo: 0,
      ...config
    };

    this.browser = null;
    this.context = null;
    this.page = null;
    this.isActive = false;
    this.impressions = [];
    this.engagements = [];

    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: `logs/bot-${this.sessionId}.log` 
        })
      ]
    });

    // Human-like behavior parameters
    this.humanBehavior = {
      mouseJitter: 3,
      scrollVariance: 0.2,
      typingSpeed: 100 + Math.random() * 200, // 100-300ms per char
      readingSpeed: 200 + Math.random() * 300, // words per minute
      decisionDelay: 500 + Math.random() * 1500 // 0.5-2s
    };
  }

  /**
   * Initialize browser with stealth settings
   */
  async initialize() {
    try {
      this.logger.info('Initializing bot', { 
        sessionId: this.sessionId,
        profile: this.icpProfile.profileName,
        browser: this.config.browser || 'chrome'
      });

      // Launch browser with anti-detection measures
      const launchOptions = {
        headless: false, // Force visible browser to ensure desktop mode
        slowMo: this.config.slowMo || envConfig.botConfig.slowMo,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-blink-features=AutomationControlled',
          '--window-size=1920,1080',
          '--start-maximized',
          '--force-device-scale-factor=1',
          '--high-dpi-support=1',
          '--disable-features=IsolateOrigins,site-per-process',
          '--flag-switches-begin',
          '--disable-site-isolation-trials',
          '--flag-switches-end'
        ]
      };
      
      // Check if we should use Safari
      const useSafari = this.config.browser === 'safari' || this.config.useSafari;
      
      this.logger.info('Browser selection', {
        configBrowser: this.config.browser,
        useSafari: useSafari,
        willUseBrowser: useSafari ? 'Safari' : 'Chrome'
      });
      
      if (useSafari) {
        // Remove Chrome-specific args for Safari
        launchOptions.args = [];
      } else {
        // Use Chrome instead of Chromium for better compatibility
        launchOptions.channel = 'chrome'; // This tells Playwright to use Chrome
      }

      if (this.config.proxyUrl) {
        launchOptions.proxy = {
          server: this.config.proxyUrl,
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD
        };
      }

      // Launch Safari or Chrome based on config
      if (useSafari) {
        this.logger.info('Launching Safari browser');
        this.browser = await webkit.launch(launchOptions);
      } else {
        this.logger.info('Launching Chrome browser');
        this.browser = await chromium.launch(launchOptions);
      }

      // FORCE DESKTOP MODE - ignore profile settings
      const deviceType = 'desktop'; // Always use desktop
      const isMobile = false; // Force desktop mode
      
      // Use appropriate user agent based on browser
      const userAgentString = useSafari 
        ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
        : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

      // Force larger desktop viewport to ensure desktop site
      const desktopViewport = { width: 1920, height: 1080 };

      this.context = await this.browser.newContext({
        userAgent: userAgentString,
        viewport: desktopViewport, // Always use desktop viewport
        screen: { width: 1920, height: 1080 }, // Set screen size
        deviceScaleFactor: 1, // Desktop scale
        hasTouch: false, // No touch for desktop
        isMobile: false, // Force desktop
        locale: 'en-US',
        timezoneId: 'America/New_York',
        permissions: ['geolocation'],
        geolocation: this.generateGeolocation(),
        // Additional headers to force desktop
        extraHTTPHeaders: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'sec-ch-ua': useSafari ? '' : '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
          'sec-ch-ua-mobile': '?0', // Explicitly not mobile
          'sec-ch-ua-platform': '"macOS"'
        }
      });

      // Add stealth scripts (only for Chrome, Safari doesn't need these)
      if (!useSafari) {
        await this.context.addInitScript(() => {
          // Override navigator properties
          Object.defineProperty(navigator, 'webdriver', { get: () => false });
          Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
          Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
          
          // Chrome specific
          window.chrome = { runtime: {} };
          
          // Permission API
          const originalQuery = window.navigator.permissions.query;
          window.navigator.permissions.query = (parameters) => (
            parameters.name === 'notifications' ?
              Promise.resolve({ state: Notification.permission }) :
              originalQuery(parameters)
          );
        });
      }

      this.page = await this.context.newPage();
      this.isActive = true;

      this.logger.info('Bot initialized successfully', { sessionId: this.sessionId });
      return true;
    } catch (error) {
      this.logger.error('Failed to initialize bot', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate realistic geolocation based on region
   */
  generateGeolocation() {
    const geolocations = {
      'US-CA': { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
      'US-NY': { latitude: 40.7128, longitude: -74.0060 }, // New York
      'US-TX': { latitude: 29.7604, longitude: -95.3698 }, // Houston
      'UK-LON': { latitude: 51.5074, longitude: -0.1278 }, // London
      'CA-ON': { latitude: 43.6532, longitude: -79.3832 } // Toronto
    };

    const base = geolocations[this.icpProfile.region] || geolocations['US-CA'];
    
    // Add small variance to make it realistic
    return {
      latitude: base.latitude + (Math.random() - 0.5) * 0.1,
      longitude: base.longitude + (Math.random() - 0.5) * 0.1
    };
  }

  /**
   * Simulate human-like mouse movement
   */
  async humanMouseMove(x, y) {
    const steps = 20 + Math.floor(Math.random() * 10);
    const currentPosition = await this.page.evaluate(() => ({
      x: window.mouseX || 0,
      y: window.mouseY || 0
    }));

    for (let i = 0; i <= steps; i++) {
      const progress = i / steps;
      const easedProgress = this.easeInOutCubic(progress);
      
      const targetX = currentPosition.x + (x - currentPosition.x) * easedProgress;
      const targetY = currentPosition.y + (y - currentPosition.y) * easedProgress;
      
      // Add jitter
      const jitterX = (Math.random() - 0.5) * this.humanBehavior.mouseJitter;
      const jitterY = (Math.random() - 0.5) * this.humanBehavior.mouseJitter;
      
      await this.page.mouse.move(
        targetX + jitterX,
        targetY + jitterY
      );
      
      await this.sleep(10 + Math.random() * 20);
    }
  }

  /**
   * Easing function for smooth movement
   */
  easeInOutCubic(t) {
    return t < 0.5 
      ? 4 * t * t * t 
      : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /**
   * Simulate human-like scrolling
   */
  async humanScroll(distance = 300) {
    const variance = this.humanBehavior.scrollVariance;
    const actualDistance = distance * (1 + (Math.random() - 0.5) * variance);
    
    // Use smooth scrolling via JavaScript for more natural behavior
    await this.page.evaluate(async (scrollDistance) => {
      // Smooth scroll implementation
      const scrollElement = document.scrollingElement || document.body;
      const startPosition = scrollElement.scrollTop;
      const targetPosition = startPosition + scrollDistance;
      const duration = 200 + Math.random() * 100; // 200-300ms for fast smooth scroll
      const startTime = performance.now();
      
      // Easing function for natural deceleration
      const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
      
      const animateScroll = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = easeOutCubic(progress);
        
        const currentPosition = startPosition + (targetPosition - startPosition) * easedProgress;
        scrollElement.scrollTop = currentPosition;
        
        if (progress < 1) {
          requestAnimationFrame(animateScroll);
        }
      };
      
      requestAnimationFrame(animateScroll);
      
      // Wait for scroll to complete
      await new Promise(resolve => setTimeout(resolve, duration + 100));
    }, actualDistance);
    
    // Add a small random pause after scrolling
    await this.sleep(100 + Math.random() * 200);
  }

  /**
   * Simulate human-like typing
   */
  async humanType(selector, text) {
    await this.page.click(selector);
    
    for (const char of text) {
      await this.page.keyboard.type(char);
      await this.sleep(this.humanBehavior.typingSpeed);
      
      // Occasional pauses
      if (Math.random() < 0.1) {
        await this.sleep(500 + Math.random() * 1000);
      }
    }
  }

  /**
   * Simulate reading/viewing time based on content
   */
  async simulateReading(wordCount = 100) {
    const wordsPerMinute = this.humanBehavior.readingSpeed;
    const readingTime = (wordCount / wordsPerMinute) * 60 * 1000;
    const variance = 0.3;
    const actualTime = readingTime * (1 + (Math.random() - 0.5) * variance);
    
    await this.sleep(actualTime);
  }

  /**
   * Make decisions based on ICP personality
   */
  shouldEngage(content) {
    const { personalityTraits, behaviorPatterns } = this.icpProfile;
    
    // Base engagement probability
    let probability = behaviorPatterns.engagementProbability || 0.1;
    
    // Adjust based on content metrics
    if (content.likes > 10000) {
      probability *= (1 + personalityTraits.socialProof * 0.5);
    }
    
    if (content.isSponsored && personalityTraits.adTolerance < 0.3) {
      probability *= 0.3;
    }
    
    if (content.isTrending && personalityTraits.trendSensitivity > 0.7) {
      probability *= 1.5;
    }
    
    // Random decision with personality-influenced probability
    return Math.random() < probability;
  }

  /**
   * Log impression data
   */
  async logImpression(contentData) {
    const impression = {
      id: uuidv4(),
      sessionId: this.sessionId,
      platform: contentData.platform,
      contentId: contentData.contentId,
      contentType: contentData.contentType,
      creatorUsername: contentData.creatorUsername,
      impressionTimestamp: new Date().toISOString(),
      viewDurationMs: contentData.viewDuration || 0,
      scrollDepth: contentData.scrollDepth || 0,
      isSponsored: contentData.isSponsored || false,
      hashtags: contentData.hashtags || [],
      caption: contentData.caption || '',
      engagementMetrics: contentData.metrics || {},
      icpProfileId: this.icpProfile.id
    };

    this.impressions.push(impression);
    this.logger.info('Impression logged', impression);
    
    // Emit real-time event
    this.emit('content-discovered', {
      sessionId: this.sessionId,
      content: {
        platform: contentData.platform,
        contentType: contentData.contentType,
        contentId: contentData.contentId,
        creator: contentData.creatorUsername,
        creatorHandle: contentData.creatorHandle || contentData.creatorUsername,
        caption: contentData.caption,
        hashtags: contentData.hashtags,
        music: contentData.music || 'Original audio',
        url: `https://www.${contentData.platform}.com/${contentData.contentId}`,
        likes: contentData.metrics?.likes || 0,
        comments: contentData.metrics?.comments || 0,
        shares: contentData.metrics?.shares || 0,
        saves: contentData.metrics?.saves || 0,
        thumbnailUrl: contentData.thumbnailUrl || null,
        isSponsored: contentData.isSponsored,
        timestamp: impression.impressionTimestamp,
        dwellTime: Math.round(contentData.viewDuration / 1000) || 3
      },
      impression
    });
    
    return impression;
  }

  /**
   * Log engagement event
   */
  async logEngagement(impressionId, eventType, eventData = {}) {
    const engagement = {
      id: uuidv4(),
      impressionId,
      sessionId: this.sessionId,
      eventType,
      eventTimestamp: new Date().toISOString(),
      eventData,
      icpProfileId: this.icpProfile.id
    };

    this.engagements.push(engagement);
    this.logger.info('Engagement logged', engagement);
    
    // Emit real-time event
    this.emit('engagement', {
      sessionId: this.sessionId,
      engagement
    });
    
    return engagement;
  }

  /**
   * Utility sleep function - now interruptible
   */
  async sleep(ms) {
    const interval = 100; // Check every 100ms
    const steps = Math.ceil(ms / interval);
    
    for (let i = 0; i < steps; i++) {
      if (!this.isActive) {
        this.logger.debug('Sleep interrupted - bot stopped');
        break;
      }
      await new Promise(resolve => setTimeout(resolve, Math.min(interval, ms - (i * interval))));
    }
  }

  /**
   * Random sleep within range - now interruptible
   */
  async randomSleep(min, max) {
    const duration = min + Math.random() * (max - min);
    await this.sleep(duration);
  }

  /**
   * Take screenshot for debugging
   */
  async screenshot(name = 'screenshot') {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const path = `screenshots/${this.sessionId}-${name}-${timestamp}.png`;
    await this.page.screenshot({ path, fullPage: true });
    this.logger.info('Screenshot saved', { path });
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    try {
      this.isActive = false;
      
      // Emit immediate stop status
      this.emit('status', {
        status: 'stopping',
        message: 'Bot is stopping...'
      });
      
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      
      this.logger.info('Bot cleanup completed', { 
        sessionId: this.sessionId,
        totalImpressions: this.impressions.length,
        totalEngagements: this.engagements.length
      });
      
      // Emit final stopped status
      this.emit('status', {
        status: 'stopped',
        message: 'Bot stopped successfully'
      });
    } catch (error) {
      this.logger.error('Error during cleanup', { error: error.message });
    }
  }

  /**
   * Get session metrics
   */
  getMetrics() {
    return {
      sessionId: this.sessionId,
      icpProfile: this.icpProfile.profileName,
      startTime: this.startTime,
      impressions: this.impressions.length,
      engagements: this.engagements.length,
      engagementRate: this.impressions.length > 0 
        ? this.engagements.length / this.impressions.length 
        : 0,
      isActive: this.isActive
    };
  }
}

module.exports = BotBase;