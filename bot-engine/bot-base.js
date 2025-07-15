/**
 * Base Bot Class
 * Core functionality for all platform-specific bots
 */

const { chromium } = require('playwright');
const winston = require('winston');
const { v4: uuidv4 } = require('uuid');
const UserAgent = require('user-agents');

class BotBase {
  constructor(icpProfile, config = {}) {
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
        profile: this.icpProfile.profileName 
      });

      // Launch browser with anti-detection measures
      const launchOptions = {
        headless: this.config.headless,
        slowMo: this.config.slowMo,
        args: [
          '--disable-blink-features=AutomationControlled',
          '--disable-features=IsolateOrigins,site-per-process',
          '--disable-site-isolation-trials',
          '--disable-web-security',
          '--disable-features=BlockInsecurePrivateNetworkRequests'
        ]
      };

      if (this.config.proxyUrl) {
        launchOptions.proxy = {
          server: this.config.proxyUrl,
          username: process.env.PROXY_USERNAME,
          password: process.env.PROXY_PASSWORD
        };
      }

      this.browser = await chromium.launch(launchOptions);

      // Create context with device emulation
      const userAgent = new UserAgent({ 
        deviceCategory: this.icpProfile.deviceType.includes('mobile') ? 'mobile' : 'desktop',
        platform: this.icpProfile.deviceInfo.platform 
      });

      this.context = await this.browser.newContext({
        userAgent: userAgent.toString(),
        viewport: this.icpProfile.deviceInfo.screenSize,
        deviceScaleFactor: 2,
        hasTouch: this.icpProfile.deviceType.includes('mobile'),
        isMobile: this.icpProfile.deviceType.includes('mobile'),
        locale: this.icpProfile.language || 'en-US',
        timezoneId: this.icpProfile.timezone || 'America/New_York',
        permissions: ['geolocation'],
        geolocation: this.generateGeolocation()
      });

      // Add stealth scripts
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
    const steps = 10 + Math.floor(Math.random() * 10);
    const stepSize = actualDistance / steps;

    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, stepSize);
      await this.sleep(20 + Math.random() * 50);
    }
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
    
    return engagement;
  }

  /**
   * Utility sleep function
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Random sleep within range
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
      
      if (this.page) await this.page.close();
      if (this.context) await this.context.close();
      if (this.browser) await this.browser.close();
      
      this.logger.info('Bot cleanup completed', { 
        sessionId: this.sessionId,
        totalImpressions: this.impressions.length,
        totalEngagements: this.engagements.length
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