/**
 * TikTok Bot
 * Specialized bot for TikTok feed and content interaction
 */

const BotBase = require('./bot-base');

class TikTokBot extends BotBase {
  constructor(icpProfile, config = {}) {
    super(icpProfile, {
      ...config,
      platform: 'tiktok'
    });

    this.baseUrl = 'https://www.tiktok.com';
    this.selectors = {
      // Feed selectors
      videoContainer: 'div[data-e2e="recommend-list-item-container"]',
      video: 'video',
      videoPlayer: 'div[data-e2e="video-player"]',
      
      // Interaction selectors
      likeButton: 'button[data-e2e="like-icon"]',
      commentButton: 'button[data-e2e="comment-icon"]',
      shareButton: 'button[data-e2e="share-icon"]',
      followButton: 'button[data-e2e="follow-button"]',
      
      // Metrics selectors
      likeCount: 'strong[data-e2e="like-count"]',
      commentCount: 'strong[data-e2e="comment-count"]',
      shareCount: 'strong[data-e2e="share-count"]',
      
      // Content selectors
      caption: 'div[data-e2e="video-desc"]',
      music: 'div[data-e2e="video-music"]',
      username: 'a[data-e2e="video-author-uniqueid"]',
      avatar: 'div[data-e2e="video-author-avatar"]',
      
      // Hashtags
      hashtag: 'a[href*="/tag/"]',
      
      // Sponsored
      adLabel: 'div:has-text("Sponsored")',
      
      // Navigation
      scrollContainer: 'div[data-e2e="recommend-list-item-container"]'
    };

    this.currentVideoIndex = 0;
    this.viewedVideos = new Set();
    this.videoWatchTimes = new Map();
  }

  /**
   * Navigate to TikTok and prepare for scraping
   */
  async navigateToFeed() {
    try {
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Handle any popups or cookie consent
      await this.handleInitialPopups();

      // Check if login is required
      const loginButton = await this.page.locator('[data-e2e="navbar-login-button"], button:has-text("Log in")').count();
      if (loginButton > 0) {
        await this.performLogin();
      }

      // Wait for video feed to load - try multiple selectors
      const feedSelectors = [
        'div[data-e2e="recommend-list-item-container"]',
        'div[data-e2e="recommend-list-item"]',
        'div[data-e2e="video-item"]',
        'div[class*="video-feed"]',
        'div[class*="recommend"]',
        'video'
      ];
      
      let feedFound = false;
      for (const selector of feedSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          this.logger.info(`Found TikTok feed content with selector: ${selector}`);
          feedFound = true;
          break;
        } catch (e) {
          this.logger.warn(`Selector not found: ${selector}`);
        }
      }
      
      if (!feedFound) {
        // Check for profile icon (means logged in)
        const profileIcon = await this.page.locator('[data-e2e="profile-icon"]').count();
        if (profileIcon > 0) {
          this.logger.warn('Logged in but no specific feed selectors found');
        } else {
          this.logger.warn('No specific feed selectors found and unclear login state');
        }
      }
      
      this.logger.info('Successfully navigated to TikTok feed');
      this.emit('status', {
        status: 'feed_loaded',
        message: 'TikTok feed loaded, starting to scroll'
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to TikTok', { error: error.message });
      this.emit('error', {
        error: 'navigation_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Handle initial popups and cookie consent
   */
  async handleInitialPopups() {
    try {
      // Close login popup if present
      const closeButton = await this.page.$('div[data-e2e="modal-close-inner-button"]');
      if (closeButton) {
        await closeButton.click();
        await this.sleep(1000);
      }

      // Accept cookies if prompted
      const acceptButton = await this.page.$('button:has-text("Accept all")');
      if (acceptButton) {
        await acceptButton.click();
        await this.sleep(1000);
      }
    } catch (error) {
      this.logger.warn('Error handling popups', { error: error.message });
    }
  }

  /**
   * Scroll through TikTok feed
   */
  async scrollFeed(duration = 300000) { // 5 minutes default
    const startTime = Date.now();
    const { behaviorPatterns, personalityTraits } = this.icpProfile;

    this.logger.info('Starting TikTok feed scroll', { 
      duration, 
      profile: this.icpProfile.profileName 
    });
    this.emit('status', {
      status: 'scrolling',
      message: `Scrolling TikTok feed as ${this.icpProfile.profileName}`
    });

    while (Date.now() - startTime < duration && this.isActive) {
      try {
        // Get current video
        const currentVideo = await this.getCurrentVideo();
        if (!currentVideo) {
          await this.scrollToNextVideo();
          continue;
        }

        // Extract video data
        const videoData = await this.extractVideoData();
        
        // Skip if already viewed
        if (this.viewedVideos.has(videoData.contentId)) {
          await this.scrollToNextVideo();
          continue;
        }

        this.viewedVideos.add(videoData.contentId);

        // Calculate watch time based on personality and content
        const watchPercentage = this.calculateWatchPercentage(videoData);
        const videoDuration = await this.getVideoDuration();
        const watchTime = videoDuration * watchPercentage;

        // Start watching
        const watchStartTime = Date.now();
        await this.watchVideo(watchTime);

        // Log impression
        const impression = await this.logImpression({
          ...videoData,
          viewDuration: Date.now() - watchStartTime,
          watchPercentage: watchPercentage * 100,
          platform: 'tiktok'
        });

        // Decide on engagement
        if (this.shouldEngage(videoData)) {
          await this.engageWithVideo(impression.id, videoData);
        }

        // Scroll to next video
        await this.scrollToNextVideo();
        
        // Random pause between videos
        await this.randomSleep(500, 2000);

      } catch (error) {
        this.logger.error('Error during TikTok scroll', { error: error.message });
        await this.screenshot('error-tiktok-scroll');
        await this.scrollToNextVideo();
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.info('TikTok scroll completed', { 
      duration: totalDuration,
      videosWatched: this.viewedVideos.size,
      engagements: this.engagements.length
    });
    this.emit('session-complete', {
      duration: totalDuration,
      impressions: this.impressions.length,
      engagements: this.engagements.length,
      videosWatched: this.viewedVideos.size
    });
  }

  /**
   * Get current video element
   */
  async getCurrentVideo() {
    try {
      const videos = await this.page.$$(this.selectors.video);
      
      // Find video that's currently in viewport
      for (const video of videos) {
        const isVisible = await video.isIntersectingViewport();
        if (isVisible) {
          return video;
        }
      }
      
      return null;
    } catch (error) {
      this.logger.error('Error getting current video', { error: error.message });
      return null;
    }
  }

  /**
   * Extract data from current video
   */
  async extractVideoData() {
    const data = {
      contentId: await this.extractVideoId(),
      contentType: 'video',
      creatorUsername: '',
      caption: '',
      hashtags: [],
      music: '',
      isSponsored: false,
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0
      }
    };

    try {
      // Get username
      const usernameElement = await this.page.$(this.selectors.username);
      if (usernameElement) {
        data.creatorUsername = await usernameElement.innerText();
      }

      // Get caption and hashtags
      const captionElement = await this.page.$(this.selectors.caption);
      if (captionElement) {
        data.caption = await captionElement.innerText();
        
        // Extract hashtags
        const hashtagElements = await this.page.$$(this.selectors.hashtag);
        for (const element of hashtagElements) {
          const text = await element.innerText();
          if (text.startsWith('#')) {
            data.hashtags.push(text.toLowerCase());
          }
        }
      }

      // Get music info
      const musicElement = await this.page.$(this.selectors.music);
      if (musicElement) {
        data.music = await musicElement.innerText();
      }

      // Check if sponsored
      const adElement = await this.page.$(this.selectors.adLabel);
      data.isSponsored = !!adElement;

      // Get metrics
      const likeElement = await this.page.$(this.selectors.likeCount);
      if (likeElement) {
        data.metrics.likes = this.parseMetricValue(await likeElement.innerText());
      }

      const commentElement = await this.page.$(this.selectors.commentCount);
      if (commentElement) {
        data.metrics.comments = this.parseMetricValue(await commentElement.innerText());
      }

      const shareElement = await this.page.$(this.selectors.shareCount);
      if (shareElement) {
        data.metrics.shares = this.parseMetricValue(await shareElement.innerText());
      }

    } catch (error) {
      this.logger.warn('Error extracting video data', { error: error.message });
    }

    return data;
  }

  /**
   * Extract unique video ID
   */
  async extractVideoId() {
    try {
      const url = this.page.url();
      const match = url.match(/video\/(\d+)/);
      if (match) return match[1];

      // Fallback to generated ID
      return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      return `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Get video duration
   */
  async getVideoDuration() {
    try {
      const duration = await this.page.evaluate(() => {
        const video = document.querySelector('video');
        return video ? video.duration * 1000 : 15000; // Default 15 seconds
      });
      return duration;
    } catch (error) {
      return 15000; // Default 15 seconds
    }
  }

  /**
   * Calculate watch percentage based on content and personality
   */
  calculateWatchPercentage(videoData) {
    const { personalityTraits, behaviorPatterns } = this.icpProfile;
    let watchPercentage = 0.5; // Base 50%

    // Adjust for content quality signals
    if (videoData.metrics.likes > 100000) {
      watchPercentage += 0.2 * personalityTraits.socialProof;
    }

    // Adjust for trending content
    if (videoData.hashtags.some(tag => tag.includes('viral') || tag.includes('trend'))) {
      watchPercentage += 0.15 * personalityTraits.trendSensitivity;
    }

    // Adjust for sponsored content
    if (videoData.isSponsored) {
      watchPercentage *= personalityTraits.adTolerance;
    }

    // Add personality-based variance
    watchPercentage *= (0.7 + Math.random() * 0.6);

    // Cap between 0.1 and 1.0
    return Math.max(0.1, Math.min(1.0, watchPercentage));
  }

  /**
   * Watch video for specified duration
   */
  async watchVideo(duration) {
    const startTime = Date.now();
    const checkInterval = 2000; // Check every 2 seconds

    // Play video if paused
    await this.page.evaluate(() => {
      const video = document.querySelector('video');
      if (video && video.paused) {
        video.play();
      }
    });

    while (Date.now() - startTime < duration && this.isActive) {
      // Simulate natural micro-movements
      if (Math.random() < 0.1) {
        const viewportSize = this.page.viewportSize();
        await this.humanMouseMove(
          Math.random() * viewportSize.width,
          Math.random() * viewportSize.height
        );
      }

      // Occasional pauses (simulate distraction)
      if (Math.random() < 0.05) {
        await this.page.evaluate(() => {
          const video = document.querySelector('video');
          if (video) video.pause();
        });
        
        await this.sleep(1000 + Math.random() * 2000);
        
        await this.page.evaluate(() => {
          const video = document.querySelector('video');
          if (video) video.play();
        });
      }

      await this.sleep(checkInterval);
    }
  }

  /**
   * Scroll to next video
   */
  async scrollToNextVideo() {
    try {
      // Swipe up gesture for mobile
      if ((this.icpProfile.deviceType || 'desktop').includes('mobile')) {
        const viewportSize = this.page.viewportSize();
        const startY = viewportSize.height * 0.8;
        const endY = viewportSize.height * 0.2;
        
        await this.page.mouse.move(viewportSize.width / 2, startY);
        await this.page.mouse.down();
        await this.page.mouse.move(viewportSize.width / 2, endY, { steps: 10 });
        await this.page.mouse.up();
      } else {
        // Mouse wheel for desktop
        await this.page.mouse.wheel(0, 800);
      }
      
      await this.sleep(1000); // Wait for animation
      this.currentVideoIndex++;
    } catch (error) {
      this.logger.error('Error scrolling to next video', { error: error.message });
    }
  }

  /**
   * Engage with video based on ICP behavior
   */
  async engageWithVideo(impressionId, videoData) {
    const { personalityTraits } = this.icpProfile;
    const engagementTypes = [];

    // Like decision
    const likeProb = this.calculateEngagementProbability('like', videoData);
    if (Math.random() < likeProb) {
      const likeButton = await this.page.$(this.selectors.likeButton);
      if (likeButton) {
        // Double tap for mobile-like behavior
        if ((this.icpProfile.deviceType || 'desktop').includes('mobile') && Math.random() < 0.5) {
          const viewportSize = this.page.viewportSize();
          await this.page.mouse.dblclick(viewportSize.width / 2, viewportSize.height / 2);
        } else {
          await likeButton.click();
        }
        
        engagementTypes.push('like');
        await this.logEngagement(impressionId, 'like', {
          method: 'button_click',
          contentId: videoData.contentId
        });
        
        await this.randomSleep(500, 1500);
      }
    }

    // Follow decision
    if (Math.random() < 0.03 && !videoData.isSponsored) {
      const followButton = await this.page.$(this.selectors.followButton);
      if (followButton) {
        const buttonText = await followButton.innerText();
        if (buttonText.toLowerCase().includes('follow')) {
          await followButton.click();
          engagementTypes.push('follow');
          
          await this.logEngagement(impressionId, 'follow', {
            creator: videoData.creatorUsername
          });
          
          await this.randomSleep(1000, 2000);
        }
      }
    }

    // Share decision (lower probability)
    if (Math.random() < personalityTraits.impulsiveness * 0.02) {
      const shareButton = await this.page.$(this.selectors.shareButton);
      if (shareButton) {
        await shareButton.click();
        await this.randomSleep(1000, 2000);
        
        // Close share menu
        await this.page.keyboard.press('Escape');
        
        engagementTypes.push('share_intent');
        await this.logEngagement(impressionId, 'share_intent', {
          contentId: videoData.contentId
        });
      }
    }

    if (engagementTypes.length > 0) {
      this.logger.info('Engaged with TikTok video', {
        contentId: videoData.contentId,
        engagements: engagementTypes
      });
    }
  }

  /**
   * Calculate engagement probability for specific action
   */
  calculateEngagementProbability(action, videoData) {
    const { personalityTraits, behaviorPatterns } = this.icpProfile;
    let baseProbability = behaviorPatterns.engagementProbability || 0.1;

    switch (action) {
      case 'like':
        // High engagement metrics increase like probability
        if (videoData.metrics.likes > 100000) {
          baseProbability *= (1 + personalityTraits.socialProof);
        }
        
        // Music/trend influence
        if (videoData.music && personalityTraits.trendSensitivity > 0.7) {
          baseProbability *= 1.3;
        }
        
        // Ad penalty
        if (videoData.isSponsored) {
          baseProbability *= 0.3;
        }
        break;
        
      case 'follow':
        baseProbability *= 0.1; // Following is rarer
        
        // Creator influence
        if (videoData.metrics.likes > 1000000) {
          baseProbability *= 2;
        }
        break;
    }

    return Math.min(baseProbability, 0.5); // Cap at 50%
  }

  /**
   * Perform TikTok login
   */
  async performLogin() {
    try {
      const credentials = this.getCredentials();
      if (!credentials || !credentials.email || !credentials.password) {
        throw new Error('TikTok credentials not configured');
      }

      this.logger.info('Performing TikTok login', { email: credentials.email });

      // Click login button
      const loginButton = await this.page.locator('[data-e2e="navbar-login-button"], button:has-text("Log in")').first();
      if (await loginButton.isVisible()) {
        await loginButton.click();
        await this.randomSleep(2000, 3000);
      }

      // Click "Use email/username" option
      const emailOption = await this.page.locator('div[role="link"]:has-text("Use email / username"), a:has-text("Use phone / email / username")').first();
      if (await emailOption.isVisible({ timeout: 5000 })) {
        await emailOption.click();
        await this.randomSleep(1000, 2000);
      }

      // Click "Log in with email or username" tab if needed
      const emailTab = await this.page.locator('a:has-text("Email / Username"), a:has-text("Log in with email or username")').first();
      if (await emailTab.isVisible({ timeout: 3000 })) {
        await emailTab.click();
        await this.randomSleep(500, 1000);
      }

      // Fill email
      await this.page.fill('input[name="username"], input[type="text"]', credentials.email);
      await this.randomSleep(500, 1000);

      // Fill password
      await this.page.fill('input[type="password"]', credentials.password);
      await this.randomSleep(500, 1000);

      // Click submit button
      await this.page.click('button[type="submit"], button[data-e2e="login-button"]');
      
      // Wait for navigation
      await this.page.waitForLoadState('networkidle');
      await this.randomSleep(3000, 5000);

      // Handle any post-login popups
      await this.handleInitialPopups();

      this.logger.info('TikTok login successful');
      this.emit('status', { 
        status: 'logged_in',
        message: 'Successfully logged into TikTok'
      });
    } catch (error) {
      this.logger.error('TikTok login failed', { error: error.message });
      this.emit('error', {
        error: 'login_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Get TikTok credentials from config or environment
   */
  getCredentials() {
    // Check if credentials are in config
    if (this.config.credentials && this.config.credentials.tiktok) {
      return this.config.credentials.tiktok;
    }

    // Check environment variables
    if (process.env.TIKTOK_EMAIL && process.env.TIKTOK_PASSWORD) {
      return {
        email: process.env.TIKTOK_EMAIL,
        password: process.env.TIKTOK_PASSWORD
      };
    }

    // Default credentials (from user's message)
    return {
      email: 'mindmattermarket@gmail.com',
      password: 'L0ngStr@ngeTr!p'
    };
  }

  /**
   * Parse TikTok metric values
   */
  parseMetricValue(text) {
    if (!text) return 0;
    
    text = text.toUpperCase();
    
    if (text.includes('K')) {
      return Math.floor(parseFloat(text) * 1000);
    } else if (text.includes('M')) {
      return Math.floor(parseFloat(text) * 1000000);
    } else if (text.includes('B')) {
      return Math.floor(parseFloat(text) * 1000000000);
    }
    
    return parseInt(text.replace(/[^0-9]/g, '')) || 0;
  }

  /**
   * Start TikTok bot session
   */
  async start(options = {}) {
    const {
      duration = 300000, // 5 minutes
      maxVideos = 50
    } = options;

    try {
      await this.initialize();
      await this.navigateToFeed();
      await this.scrollFeed(duration);

      return this.getMetrics();
    } catch (error) {
      this.logger.error('TikTok bot session failed', { error: error.message });
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = TikTokBot;