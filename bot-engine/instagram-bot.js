/**
 * Instagram Bot
 * Specialized bot for Instagram feed and content interaction
 */

const BotBase = require('./bot-base');

class InstagramBot extends BotBase {
  constructor(icpProfile, config = {}) {
    super(icpProfile, {
      ...config,
      platform: 'instagram'
    });

    this.baseUrl = 'https://www.instagram.com';
    this.selectors = {
      // Feed selectors - Instagram may use different article structures
      feedPost: 'article',
      postImage: 'article img[srcset]',
      postVideo: 'article video',
      postCaption: 'article span[dir="auto"]',
      likeButton: 'article svg[aria-label="Like"]',
      likedButton: 'article svg[aria-label="Unlike"]',
      commentButton: 'article svg[aria-label="Comment"]',
      shareButton: 'article svg[aria-label="Share Post"]',
      saveButton: 'article svg[aria-label="Save"]',
      
      // Metrics selectors
      likeCount: 'article section > div > div > button > span',
      commentCount: 'article ul > li > div > button > span',
      
      // Story selectors
      storyItem: 'div[role="button"] canvas',
      storyNext: 'button[aria-label="Next"]',
      
      // Profile selectors
      username: 'article header a[role="link"]',
      followButton: 'article header button:has-text("Follow")',
      
      // Reel selectors
      reelVideo: 'video[type="video/mp4"]',
      reelMetrics: 'div[role="button"] span',
      
      // Sponsored indicator
      sponsoredLabel: 'article span:has-text("Sponsored")'
    };

    this.currentFeedIndex = 0;
    this.viewedPosts = new Set();
  }

  /**
   * Navigate to Instagram and prepare for scraping
   */
  async navigateToFeed() {
    try {
      // First check if we need to login by going directly to login page
      const loginUrl = 'https://www.instagram.com/accounts/login/';
      await this.page.goto(loginUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      this.logger.info('Navigated to Instagram login page');

      // Handle cookie consent if present
      const cookieButton = await this.page.$('button:has-text("Allow essential and optional cookies")');
      if (cookieButton) {
        await cookieButton.click();
        await this.sleep(1000);
      }

      // Check if login form is present
      const usernameInput = await this.page.locator('input[name="username"]').count();
      if (usernameInput > 0) {
        await this.performLogin();
        
        // After login, wait a bit for session to establish
        await this.sleep(2000);
        
        // After login, handle any remaining popups
        await this.handleAllLoginPopups();
      } else {
        // Already logged in
        this.logger.info('Already logged in, navigating to feed');
        await this.page.goto(this.baseUrl, { waitUntil: 'networkidle' });
      }

      // Wait for feed to load - try multiple selectors
      const feedSelectors = [
        'article[role="presentation"]',
        'article',
        'div[role="main"] article',
        'main article'
      ];
      
      let feedFound = false;
      for (const selector of feedSelectors) {
        try {
          await this.page.waitForSelector(selector, { timeout: 5000 });
          this.logger.info(`Found feed content with selector: ${selector}`);
          feedFound = true;
          break;
        } catch (e) {
          this.logger.warn(`Selector not found: ${selector}`);
        }
      }
      
      if (!feedFound) {
        this.logger.warn('No specific feed selectors found, but appears to be logged in');
      }
      
      this.logger.info('Successfully navigated to Instagram feed');
      this.emit('status', {
        status: 'feed_loaded',
        message: 'Instagram feed loaded, starting to scroll'
      });
      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to Instagram', { error: error.message });
      this.emit('error', {
        error: 'navigation_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Scroll through feed and interact with content
   */
  async scrollFeed(duration = 300000) { // 5 minutes default
    const startTime = Date.now();
    const { behaviorPatterns, personalityTraits } = this.icpProfile;

    // Set scroll behavior based on persona
    const scrollSpeedMap = {
      'fast': { pause: [1000, 3000], scrollAmount: [300, 600] },
      'moderate': { pause: [2000, 5000], scrollAmount: [200, 400] },
      'slow': { pause: [3000, 7000], scrollAmount: [150, 300] }
    };
    const scrollBehavior = scrollSpeedMap[behaviorPatterns.scrollSpeed] || scrollSpeedMap['moderate'];

    this.logger.info('Starting feed scroll', { 
      duration, 
      profile: this.icpProfile.profileName,
      scrollSpeed: behaviorPatterns.scrollSpeed,
      engagementRate: behaviorPatterns.engagementRate,
      interests: this.icpProfile.interests
    });
    
    this.emit('status', {
      status: 'scrolling',
      message: `Scrolling Instagram feed as ${this.icpProfile.profileName} (${behaviorPatterns.scrollSpeed} speed, ${behaviorPatterns.engagementRate} engagement)`
    });

    while (Date.now() - startTime < duration && this.isActive) {
      try {
        // Get visible posts - filter out non-feed articles
        const allArticles = await this.page.$$('article');
        const posts = [];
        
        // Filter to only get actual feed posts (not login prompts, etc)
        for (const article of allArticles) {
          // Check if this looks like a feed post (has time element or images)
          const hasTime = await article.$('time') !== null;
          const hasImage = await article.$('img[srcset], img[src*="instagram"]') !== null;
          const hasVideo = await article.$('video') !== null;
          
          if (hasTime || hasImage || hasVideo) {
            posts.push(article);
          }
        }
        
        this.logger.debug(`Found ${allArticles.length} articles, ${posts.length} are feed posts`);
        
        for (const post of posts) {
          // Check if post is in viewport
          const isVisible = await post.isVisible();
          if (!isVisible) continue;

          // Extract post data
          const postData = await this.extractPostData(post);
          
          // Skip if already viewed
          if (this.viewedPosts.has(postData.contentId)) continue;
          
          this.viewedPosts.add(postData.contentId);

          // Simulate viewing behavior
          const viewStartTime = Date.now();
          
          // Determine view duration based on content and personality
          const baseViewTime = behaviorPatterns.attentionSpanMs || 5000;
          const viewDuration = this.calculateViewDuration(postData, baseViewTime);
          
          // Simulate natural viewing
          await this.simulateContentViewing(post, viewDuration);
          
          // Log impression
          const impression = await this.logImpression({
            ...postData,
            viewDuration: Date.now() - viewStartTime,
            platform: 'instagram'
          });

          // Decide on engagement
          if (this.shouldEngage(postData)) {
            await this.engageWithPost(post, impression.id, postData);
          }

          // Pause between posts based on scroll speed
          await this.randomSleep(...scrollBehavior.pause);
        }

        // Scroll to load more content based on persona speed
        const scrollAmount = this.randomBetween(...scrollBehavior.scrollAmount);
        await this.humanScroll(scrollAmount);
        
        // Pause after scrolling based on persona
        await this.randomSleep(...scrollBehavior.pause);

      } catch (error) {
        this.logger.error('Error during feed scroll', { error: error.message });
        await this.screenshot('error-feed-scroll');
      }
    }

    const totalDuration = Date.now() - startTime;
    this.logger.info('Feed scroll completed', { 
      duration: totalDuration,
      impressions: this.impressions.length,
      engagements: this.engagements.length,
      reason: this.isActive ? 'Duration reached' : 'Stopped by user'
    });
    this.emit('session-complete', {
      duration: totalDuration,
      impressions: this.impressions.length,
      engagements: this.engagements.length,
      viewedPosts: this.viewedPosts.size,
      completionReason: this.isActive ? 'duration_reached' : 'user_stopped'
    });
  }

  /**
   * Extract data from a post element
   */
  async extractPostData(postElement) {
    const data = {
      contentId: await this.extractContentId(postElement),
      contentType: 'post',
      creatorUsername: '',
      caption: '',
      hashtags: [],
      isSponsored: false,
      metrics: {
        likes: 0,
        comments: 0
      },
      mediaType: 'unknown'
    };

    try {
      // Get username
      const usernameElement = await postElement.$(this.selectors.username);
      if (usernameElement) {
        data.creatorUsername = await usernameElement.innerText();
      }

      // Get caption and extract hashtags
      const captionElement = await postElement.$(this.selectors.postCaption);
      if (captionElement) {
        data.caption = await captionElement.innerText();
        data.hashtags = this.extractHashtags(data.caption);
      }

      // Check if sponsored
      const sponsoredElement = await postElement.$(this.selectors.sponsoredLabel);
      data.isSponsored = !!sponsoredElement;

      // Determine media type
      const hasVideo = await postElement.$(this.selectors.postVideo);
      const hasImage = await postElement.$(this.selectors.postImage);
      
      if (hasVideo) {
        data.mediaType = 'video';
        data.contentType = 'reel';
      } else if (hasImage) {
        data.mediaType = 'image';
      }

      // Get engagement metrics
      const likeElement = await postElement.$(this.selectors.likeCount);
      if (likeElement) {
        const likeText = await likeElement.innerText();
        data.metrics.likes = this.parseMetricValue(likeText);
      }

    } catch (error) {
      this.logger.warn('Error extracting post data', { error: error.message });
    }

    return data;
  }

  /**
   * Helper to dismiss popups with various button texts
   */
  async dismissPopup(buttonTexts) {
    try {
      for (const text of buttonTexts) {
        const button = await this.page.$(`button:has-text("${text}")`);
        if (button && await button.isVisible()) {
          this.logger.info(`Dismissing popup with "${text}" button`);
          await button.click();
          await this.sleep(1500);
          return true;
        }
      }
    } catch (e) {
      this.logger.debug('No popup found or error dismissing');
    }
    return false;
  }

  /**
   * Check for captcha and alert if found
   */
  async checkForCaptcha() {
    try {
      // Common captcha selectors
      const captchaSelectors = [
        'iframe[src*="recaptcha"]',
        'div[class*="recaptcha"]',
        '#recaptcha',
        'div[class*="captcha"]',
        'div[class*="challenge"]',
        'div[aria-label*="verify"]',
        'div[aria-label*="captcha"]'
      ];
      
      for (const selector of captchaSelectors) {
        const captchaElement = await this.page.$(selector);
        if (captchaElement) {
          this.logger.warn('CAPTCHA detected!');
          this.emit('status', {
            status: 'captcha_detected',
            message: 'CAPTCHA verification required'
          });
          
          // Wait for user to solve captcha (up to 2 minutes)
          this.logger.info('Waiting for user to solve captcha...');
          
          // Check every 2 seconds if captcha is gone
          let captchaSolved = false;
          const maxWaitTime = 120000; // 2 minutes
          const checkInterval = 2000; // 2 seconds
          const startTime = Date.now();
          
          while (!captchaSolved && (Date.now() - startTime) < maxWaitTime) {
            await this.sleep(checkInterval);
            const stillHasCaptcha = await this.page.$(selector);
            if (!stillHasCaptcha) {
              captchaSolved = true;
              this.logger.info('Captcha appears to be solved!');
              this.emit('status', {
                status: 'captcha_solved',
                message: 'Captcha solved, continuing...'
              });
            }
          }
          
          if (!captchaSolved) {
            throw new Error('Captcha was not solved within timeout period');
          }
          
          break;
        }
      }
      
      // Also check for Instagram's specific challenge
      const challengeElement = await this.page.$('button:has-text("Confirm")');
      if (challengeElement) {
        const pageText = await this.page.textContent('body');
        if (pageText && (pageText.includes('suspicious') || pageText.includes('verify') || pageText.includes('challenge'))) {
          this.logger.warn('Instagram security challenge detected!');
          this.emit('status', {
            status: 'captcha_detected',
            message: 'Instagram security verification required'
          });
          
          // Wait for user to complete challenge
          await this.page.waitForNavigation({ timeout: 120000 });
        }
      }
      
    } catch (error) {
      this.logger.error('Error checking for captcha:', error);
    }
  }

  /**
   * Extract unique content ID from post
   */
  async extractContentId(postElement) {
    try {
      // Try to get from post URL
      const linkElement = await postElement.$('a[href*="/p/"]');
      if (linkElement) {
        const href = await linkElement.getAttribute('href');
        const match = href.match(/\/p\/([^\/]+)/);
        if (match) return match[1];
      }

      // Fallback to timestamp-based ID
      return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    } catch (error) {
      return `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
  }

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }

  /**
   * Parse metric values (e.g., "1.2K" -> 1200)
   */
  parseMetricValue(text) {
    if (!text) return 0;
    
    const cleaned = text.replace(/,/g, '');
    
    if (cleaned.includes('K')) {
      return Math.floor(parseFloat(cleaned) * 1000);
    } else if (cleaned.includes('M')) {
      return Math.floor(parseFloat(cleaned) * 1000000);
    }
    
    return parseInt(cleaned) || 0;
  }

  /**
   * Calculate view duration based on content and personality
   */
  calculateViewDuration(postData, baseTime) {
    let duration = baseTime;
    
    // Adjust for media type
    if (postData.mediaType === 'video') {
      duration *= 2.5; // Videos get more time
    }
    
    // Adjust for sponsored content
    if (postData.isSponsored) {
      duration *= this.icpProfile.personalityTraits.adTolerance;
    }
    
    // Adjust for trending content
    if (postData.metrics.likes > 10000) {
      duration *= 1.2;
    }
    
    // Add randomness
    duration *= (0.8 + Math.random() * 0.4);
    
    return Math.floor(duration);
  }

  /**
   * Simulate natural content viewing behavior
   */
  async simulateContentViewing(postElement, duration) {
    const startTime = Date.now();
    const scrollPauses = Math.floor(duration / 3000); // Pause every ~3 seconds

    // Initial focus on content
    const boundingBox = await postElement.boundingBox();
    if (boundingBox) {
      await this.humanMouseMove(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );
    }

    // Simulate reading/viewing with micro-movements
    while (Date.now() - startTime < duration) {
      // Small scroll movements
      if (Math.random() < 0.3) {
        await this.page.mouse.wheel(0, 10 + Math.random() * 20);
      }

      // Occasional mouse movements
      if (Math.random() < 0.2 && boundingBox) {
        await this.humanMouseMove(
          boundingBox.x + Math.random() * boundingBox.width,
          boundingBox.y + Math.random() * boundingBox.height
        );
      }

      await this.sleep(500 + Math.random() * 1000);
    }
  }

  /**
   * Engage with post based on ICP behavior
   */
  async engageWithPost(postElement, impressionId, postData) {
    const { personalityTraits, behaviorPatterns } = this.icpProfile;
    const engagementTypes = [];

    // Get engagement rate based on profile type
    const engagementRateMap = {
      'high': 0.3,
      'very_high': 0.5,
      'moderate': 0.15,
      'selective': 0.08,
      'low': 0.05
    };
    const baseEngagementRate = engagementRateMap[behaviorPatterns.engagementRate] || 0.1;

    // Check if content matches persona interests
    const contentMatchesInterests = this.checkContentInterestMatch(postData);
    const adjustedEngagementRate = contentMatchesInterests 
      ? baseEngagementRate * 1.5 
      : baseEngagementRate * 0.7;

    // Like decision
    if (Math.random() < adjustedEngagementRate) {
      const likeButton = await postElement.$(this.selectors.likeButton);
      if (likeButton && await likeButton.isVisible()) {
        // Natural hesitation before liking
        await this.randomSleep(800, 2500);
        
        // Double-tap simulation for mobile behavior
        if (this.icpProfile.deviceType.includes('mobile') && Math.random() < 0.3) {
          await postElement.dblclick();
        } else {
          await likeButton.click();
        }
        
        engagementTypes.push('like');
        this.logger.info(`Liked post from ${postData.creatorUsername}`);
        
        await this.logEngagement(impressionId, 'like', {
          contentId: postData.contentId,
          reason: 'interest_match'
        });
      }
    }

    // Save decision (based on content value)
    if (contentMatchesInterests && Math.random() < adjustedEngagementRate * 0.3) {
      const saveButton = await postElement.$(this.selectors.saveButton);
      if (saveButton && await saveButton.isVisible()) {
        await this.randomSleep(1000, 2000);
        await saveButton.click();
        engagementTypes.push('save');
        
        await this.logEngagement(impressionId, 'save', {
          contentId: postData.contentId
        });
      }
    }

    // Follow decision (much lower probability, only for high-value content)
    const shouldFollow = !postData.isSponsored && 
                        contentMatchesInterests && 
                        Math.random() < 0.02 &&
                        (postData.metrics.likes > 5000 || postData.metrics.followers > 10000);
                        
    if (shouldFollow) {
      const followButton = await postElement.$(this.selectors.followButton);
      if (followButton && await followButton.isVisible()) {
        await this.randomSleep(2000, 4000);
        await followButton.click();
        engagementTypes.push('follow');
        
        await this.logEngagement(impressionId, 'follow', {
          creator: postData.creatorUsername,
          reason: 'high_value_content'
        });
      }
    }

    // Save decision (for high-quality content)
    if (Math.random() < personalityTraits.contentQualityThreshold * 0.1) {
      const saveButton = await postElement.$(this.selectors.saveButton);
      if (saveButton) {
        await this.randomSleep(500, 1000);
        await saveButton.click();
        engagementTypes.push('save');
        
        await this.logEngagement(impressionId, 'save', {
          contentId: postData.contentId
        });
      }
    }

    if (engagementTypes.length > 0) {
      this.logger.info('Engaged with post', {
        contentId: postData.contentId,
        engagements: engagementTypes
      });
    }
  }

  /**
   * Check if content matches persona interests
   */
  checkContentInterestMatch(postData) {
    const { interests } = this.icpProfile;
    const { caption = '', hashtags = [] } = postData;
    
    // Convert everything to lowercase for matching
    const contentText = `${caption} ${hashtags.join(' ')}`.toLowerCase();
    const interestsLower = interests.map(i => i.toLowerCase());
    
    // Check for direct interest matches
    for (const interest of interestsLower) {
      if (contentText.includes(interest)) {
        return true;
      }
    }
    
    // Check for related terms based on persona type
    const relatedTerms = this.getRelatedTerms();
    for (const term of relatedTerms) {
      if (contentText.includes(term)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get related terms based on persona type
   */
  getRelatedTerms() {
    const profileType = this.icpProfile.profileName.split('_')[0];
    
    const termMap = {
      'gen-z-tech-enthusiast': ['startup', 'code', 'programming', 'developer', 'blockchain', 'nft', 'metaverse', 'app'],
      'finance-focused-millennials': ['invest', 'stock', 'crypto', 'money', 'wealth', 'passive income', 'financial', 'trading'],
      'health-wellness-women': ['yoga', 'meditation', 'selfcare', 'wellness', 'healthy', 'organic', 'mindfulness', 'skincare'],
      'parenting': ['kids', 'baby', 'mom', 'dad', 'family', 'children', 'parenting', 'toddler'],
      'fitness': ['workout', 'gym', 'exercise', 'training', 'muscle', 'cardio', 'nutrition', 'protein'],
      'fashion': ['style', 'outfit', 'ootd', 'fashion', 'clothing', 'designer', 'trend', 'look']
    };
    
    return termMap[profileType] || [];
  }

  /**
   * Get random number between min and max
   */
  randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * Navigate to Stories section
   */
  async viewStories(maxStories = 10) {
    try {
      const storyItems = await this.page.$$(this.selectors.storyItem);
      const storiesToView = Math.min(storyItems.length, maxStories);

      for (let i = 0; i < storiesToView; i++) {
        await storyItems[i].click();
        await this.randomSleep(2000, 5000);

        // Random tap through stories
        const tapCount = Math.floor(Math.random() * 3) + 1;
        for (let j = 0; j < tapCount; j++) {
          const nextButton = await this.page.$(this.selectors.storyNext);
          if (nextButton) {
            await nextButton.click();
            await this.randomSleep(1500, 3500);
          }
        }

        // Exit stories
        await this.page.keyboard.press('Escape');
        await this.randomSleep(500, 1000);
      }

      this.logger.info('Viewed stories', { count: storiesToView });
    } catch (error) {
      this.logger.error('Error viewing stories', { error: error.message });
    }
  }

  /**
   * Perform Instagram login
   */
  async performLogin() {
    try {
      const credentials = this.getCredentials();
      if (!credentials || !credentials.username || !credentials.password) {
        throw new Error('Instagram credentials not configured');
      }

      this.logger.info('Performing Instagram login', { username: credentials.username });

      // Wait for login form to be visible
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
      
      // Fill username
      await this.page.fill('input[name="username"]', credentials.username);
      await this.randomSleep(300, 500);

      // Fill password  
      await this.page.fill('input[name="password"]', credentials.password);
      await this.randomSleep(300, 500);
      
      // Wait a bit for form validation
      await this.randomSleep(500, 1000);
      
      // Try to click the button multiple times until it works
      let clicked = false;
      for (let i = 0; i < 5; i++) {
        try {
          const loginButton = await this.page.$('button[type="submit"]');
          if (loginButton) {
            const isDisabled = await loginButton.getAttribute('disabled');
            if (!isDisabled) {
              await loginButton.click();
              clicked = true;
              break;
            }
          }
          await this.sleep(500);
        } catch (e) {
          // Try again
        }
      }
      
      if (!clicked) {
        // Fallback: press Enter
        this.logger.info('Button click failed, pressing Enter');
        await this.page.keyboard.press('Enter');
      }
      
      // Navigation and popup handling is done in the code above

      this.logger.info('Login form submitted, waiting for navigation');
      
      // Check for captcha
      await this.checkForCaptcha();
      
      // Wait longer for Instagram to process login and redirect
      await this.sleep(5000);
      
      // Check for captcha after login attempt
      await this.checkForCaptcha();
      
      // Check if we're on the onetap page
      const afterLoginUrl = this.page.url();
      this.logger.info(`After login URL: ${afterLoginUrl}`);
      
      // Handle various post-login redirects and popups
      if (afterLoginUrl.includes('onetap') || afterLoginUrl.includes('save')) {
        // Handle the "Save your login info?" page
        this.logger.info('On save login page, dismissing...');
        await this.dismissPopup(['Not Now', 'Not now', 'Skip']);
      }
      
      // Use comprehensive popup handler
      await this.handleAllLoginPopups();
      
      this.logger.info('Instagram login successful');
      this.emit('status', { 
        status: 'logged_in',
        message: 'Successfully logged into Instagram'
      });
    } catch (error) {
      this.logger.error('Instagram login failed', { error: error.message });
      this.emit('error', {
        error: 'login_failed',
        message: error.message
      });
      throw error;
    }
  }

  /**
   * Handle all Instagram popups comprehensively
   */
  async handleAllLoginPopups() {
    try {
      const maxAttempts = 7;
      let attempts = 0;
      
      while (attempts < maxAttempts) {
        attempts++;
        const currentUrl = this.page.url();
        this.logger.info(`Handling popups - Attempt ${attempts}, URL: ${currentUrl}`);
        
        let popupHandled = false;
        
        // Wait a bit for any popups to appear
        await this.sleep(1000);
        
        // 1. Handle "Save Your Login Info?" popup (most common)
        const saveLoginSelectors = [
          'button:has-text("Not Now")',
          'button:has-text("Not now")',
          'a:has-text("Not Now")',
          'a:has-text("Not now")',
          'button:has-text("Skip")',
          '[role="button"]:has-text("Not Now")',
          'button:has-text("Save")', // Sometimes we need to save to proceed
          '[type="button"]:has-text("Not Now")'
        ];
        
        for (const selector of saveLoginSelectors) {
          try {
            const elements = await this.page.$$(selector);
            for (const element of elements) {
              if (await element.isVisible()) {
                // Check if it's in a save login context
                const text = await this.page.evaluate(() => document.body.textContent);
                if (text.includes('Save Your Login') || text.includes('save your login') || 
                    text.includes('Save login') || currentUrl.includes('save')) {
                  await element.click();
                  this.logger.info(`Clicked "${selector}" on save login popup`);
                  await this.sleep(2000);
                  popupHandled = true;
                  break;
                }
              }
            }
            if (popupHandled) break;
          } catch (e) {
            // Continue
          }
        }
        
        // 2. Handle "Turn on Notifications" popup
        try {
          // Look for notification dialog
          const notificationDialog = await this.page.$('[role="dialog"]:has-text("Turn on Notifications")');
          if (notificationDialog) {
            const notNowBtn = await notificationDialog.$('button:has-text("Not Now")');
            if (notNowBtn) {
              await notNowBtn.click();
              this.logger.info('Dismissed notification popup');
              await this.sleep(2000);
              popupHandled = true;
            }
          }
        } catch (e) {
          // Continue
        }
        
        // 3. Handle "Add Instagram to your Home screen?" popup
        try {
          const addToHomeDialog = await this.page.$('[role="dialog"]:has-text("Add Instagram")');
          if (addToHomeDialog) {
            const cancelBtn = await addToHomeDialog.$('button:has-text("Cancel"), button:has-text("Not Now")');
            if (cancelBtn) {
              await cancelBtn.click();
              this.logger.info('Dismissed add to home screen popup');
              await this.sleep(2000);
              popupHandled = true;
            }
          }
        } catch (e) {
          // Continue
        }
        
        // 4. Handle any generic close buttons in dialogs
        try {
          const closeButtons = await this.page.$$('[role="dialog"] button[aria-label="Close"], [role="dialog"] [aria-label="Close"], [role="dialog"] svg[aria-label="Close"]');
          for (const button of closeButtons) {
            if (await button.isVisible()) {
              const parent = await button.evaluateHandle(el => el.closest('button') || el);
              await parent.click();
              this.logger.info('Closed a dialog using close button');
              await this.sleep(1000);
              popupHandled = true;
              break;
            }
          }
        } catch (e) {
          // Continue
        }
        
        // 5. Check if we're on the home feed
        await this.sleep(1000);
        const finalUrl = this.page.url();
        
        // Check for feed indicators
        const feedIndicators = await Promise.all([
          this.page.$('article'),
          this.page.$('[role="main"]'),
          this.page.$('div[data-testid="feeds-feed"]')
        ]);
        
        const onFeed = feedIndicators.some(el => el !== null) || 
                      finalUrl === 'https://www.instagram.com/' ||
                      finalUrl.endsWith('instagram.com/') ||
                      finalUrl.includes('/feed');
        
        if (onFeed && !popupHandled) {
          this.logger.info('Successfully reached Instagram feed');
          break;
        }
        
        // 6. If still stuck after 3 attempts, try direct navigation
        if (attempts >= 3 && !onFeed) {
          this.logger.info('Attempting direct navigation to home feed');
          await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
          await this.sleep(3000);
        }
        
        await this.sleep(1000);
      }
      
    } catch (error) {
      this.logger.error('Error handling popups', { error: error.message });
      // Don't throw - continue anyway
    }
  }

  /**
   * Get Instagram credentials from config or environment
   */
  getCredentials() {
    // Check if credentials are directly in config (from orchestrator)
    if (this.config.credentials && this.config.credentials.username && this.config.credentials.password) {
      return this.config.credentials;
    }
    
    // Check if credentials are in config.instagram
    if (this.config.credentials && this.config.credentials.instagram) {
      return this.config.credentials.instagram;
    }

    // Check environment variables
    if (process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD) {
      return {
        username: process.env.INSTAGRAM_USERNAME,
        password: process.env.INSTAGRAM_PASSWORD
      };
    }

    // Default credentials (from user's message)
    return {
      username: 'mindmatterlife',
      password: 'L0ngStr@ngeTr!p'
    };
  }

  /**
   * Start bot session
   */
  async start(options = {}) {
    const {
      duration = 300000, // 5 minutes
      includeStories = true,
      scrollFeed = true
    } = options;

    try {
      await this.initialize();
      await this.navigateToFeed();

      if (includeStories) {
        await this.viewStories();
      }

      if (scrollFeed) {
        await this.scrollFeed(duration);
      }

      return this.getMetrics();
    } catch (error) {
      this.logger.error('Bot session failed', { error: error.message });
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = InstagramBot;