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
      this.emit('status', {
        status: 'navigating',
        message: 'Opening Instagram...'
      });
      
      // Start with Instagram homepage - avoid any Facebook redirects
      this.logger.info('Navigating to Instagram homepage');
      
      // First clear any cookies that might cause Facebook redirect
      await this.page.context().clearCookies();
      
      await this.page.goto('https://www.instagram.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      });
      
      // Wait for initial page load
      await this.sleep(2000);
      
      // Analyze where we ended up
      const initialState = await this.analyzePageState();
      this.logger.info('Initial page state:', initialState);
      
      // Handle different scenarios
      if (initialState.isLoginPage && !initialState.hasLoginForm) {
        // We're on the app redirect page
        await this.handleAppRedirectPage();
      }
      
      this.logger.info('Navigated to Instagram homepage');
      
      // Check if we're on mobile Instagram by looking for mobile-specific elements
      const pageInfo = await this.page.evaluate(() => {
        // Check viewport width
        const width = window.innerWidth;
        const height = window.innerHeight;
        // Check for mobile-specific elements
        const hasMobileNav = document.querySelector('div[role="navigation"] svg[aria-label="Home"]') !== null;
        const hasDesktopNav = document.querySelector('nav[role="navigation"]') !== null;
        // Check URL for mobile indicators
        const isMobileUrl = window.location.href.includes('m.instagram.com');
        const url = window.location.href;
        
        return {
          isMobile: width < 768 || hasMobileNav || isMobileUrl || !hasDesktopNav,
          width,
          height,
          url,
          userAgent: navigator.userAgent
        };
      });
      
      this.logger.info('Page info:', pageInfo);
      const isMobileInstagram = pageInfo.isMobile;
      
      if (isMobileInstagram) {
        this.logger.warn('Detected mobile Instagram, forcing desktop version');
        
        // Set desktop viewport explicitly
        await this.page.setViewportSize({ width: 1920, height: 1080 });
        
        // Navigate again with desktop parameters
        await this.page.goto('https://www.instagram.com', { 
          waitUntil: 'networkidle',
          timeout: 30000 
        });
        
        await this.sleep(2000);
      }
      
      // Take screenshot for debugging
      await this.screenshot('instagram-initial');

      // Handle cookie consent first
      await this.handleCookieConsent();

      // Re-analyze after initial navigation
      const currentState = await this.analyzePageState();
      this.logger.info('Current page state:', currentState);
      
      // Determine if we need to login
      let needsLogin = false;
      
      if (currentState.hasFeed) {
        this.logger.info('Already logged in - feed detected');
      } else if (currentState.hasLoginForm) {
        this.logger.info('Login form detected - need to log in');
        needsLogin = true;
      } else if (currentState.isLoginPage) {
        this.logger.info('On login page but no form - need to handle');
        needsLogin = true;
      } else {
        this.logger.warn('Unknown state - will attempt login');
        needsLogin = true;
      }
      
      if (needsLogin) {
        this.logger.info('Need to log into Instagram');
        this.emit('status', {
          status: 'logging_in',
          message: 'Logging into Instagram'
        });
        
        // Ensure we have a proper login form
        const loginState = await this.analyzePageState();
        
        if (!loginState.hasLoginForm) {
          this.logger.warn('No login form yet - checking page type');
          
          if (loginState.isAppRedirect) {
            // Handle app redirect
            await this.handleAppRedirectPage();
          } else if (!loginState.isLoginPage) {
            // Navigate to login page with native login preference
            this.logger.info('Navigating to login page');
            await this.page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher', {
              waitUntil: 'networkidle'
            });
            await this.sleep(2000);
            
            // Hide Facebook login button to prevent accidental clicks
            await this.page.evaluate(() => {
              const fbButtons = document.querySelectorAll('button[type="button"]');
              fbButtons.forEach(btn => {
                if (btn.textContent && btn.textContent.includes('Facebook')) {
                  btn.style.display = 'none';
                }
              });
            });
          }
          
          // Verify we now have the form
          const finalState = await this.analyzePageState();
          if (!finalState.hasLoginForm) {
            this.logger.error('Still no login form');
            await this.screenshot('no-login-form');
            throw new Error('Cannot find Instagram login form');
          }
        }
        
        // Perform Instagram web login
        await this.performLogin();
        
        // After login, wait for navigation
        await this.sleep(3000);
        
        // Handle post-login popups
        this.logger.info('Handling post-login popups...');
        await this.handleAllLoginPopups();
        
        // Ensure we're on the home feed
        const afterLoginUrl = this.page.url();
        if (!afterLoginUrl.endsWith('instagram.com/') && !afterLoginUrl.includes('/feed')) {
          this.logger.info('Navigating to home feed after login...');
          await this.page.goto('https://www.instagram.com', { waitUntil: 'domcontentloaded' });
          await this.sleep(2000);
        }
      } else {
        // No login required or already logged in
        this.logger.info('No login required - can browse publicly');
        this.emit('status', { status: 'browsing', message: 'Browsing without login' });
        
        // Still need to handle popups
        await this.handleAllLoginPopups();
      }

      // Wait for feed to load - try multiple selectors
      const feedSelectors = [
        'article[role="presentation"]',
        'article',
        'div[role="main"] article',
        'main article',
        // For public profiles
        'div[style*="flex-direction: column"] > div > div',
        'main div[role="button"]',
        // For explore page
        'div[style*="position: relative"] img'
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
   * Analyze current page state
   */
  async analyzePageState() {
    const state = await this.page.evaluate(() => {
      const url = window.location.href;
      const bodyText = document.body.innerText || '';
      
      return {
        url: url,
        isLoginPage: url.includes('/accounts/login'),
        hasLoginForm: !!document.querySelector('input[name="username"]') && !!document.querySelector('input[name="password"]'),
        hasUsernameField: !!document.querySelector('input[name="username"]'),
        hasPasswordField: !!document.querySelector('input[name="password"]'),
        hasSubmitButton: !!document.querySelector('button[type="submit"]'),
        hasFeed: !!document.querySelector('article') || !!document.querySelector('main[role="main"]'),
        isAppRedirect: bodyText.includes('Open in app') || bodyText.includes('Get the app') || bodyText.includes('Open Instagram'),
        bodyPreview: bodyText.substring(0, 200),
        buttons: Array.from(document.querySelectorAll('button, a[role="button"]')).map(b => ({
          text: b.innerText || b.textContent || '',
          type: b.tagName.toLowerCase()
        }))
      };
    });
    
    return state;
  }
  
  /**
   * Handle app redirect page
   */
  async handleAppRedirectPage() {
    this.logger.warn('On app redirect page - looking for web login option');
    
    // Look for login buttons that aren't app-related
    const buttons = await this.page.$$('button, a[role="button"], a[href*="login"]');
    
    for (const button of buttons) {
      try {
        const text = await button.innerText();
        const href = await button.getAttribute('href');
        
        this.logger.info(`Found button/link: ${text} (href: ${href})`);
        
        // Click if it looks like a login option
        if (text && (text.match(/log\s*in/i) || text.match(/sign\s*in/i)) && !text.toLowerCase().includes('app')) {
          this.logger.info(`Clicking: ${text}`);
          await button.click();
          await this.sleep(2000);
          
          // Check if we now have a login form
          const newState = await this.analyzePageState();
          if (newState.hasLoginForm) {
            this.logger.info('Successfully reached login form');
            return;
          }
        }
      } catch (e) {
        // Continue with next button
      }
    }
    
    // If still no form, try direct navigation with native login
    this.logger.warn('Could not find web login button - trying direct navigation');
    await this.page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher', {
      waitUntil: 'networkidle'
    });
    await this.sleep(2000);
    
    // Hide Facebook login to ensure we use native Instagram login
    await this.page.evaluate(() => {
      const fbButtons = document.querySelectorAll('button');
      fbButtons.forEach(btn => {
        const text = btn.textContent || btn.innerText || '';
        if (text.includes('Facebook') || text.includes('Meta')) {
          btn.style.display = 'none';
        }
      });
    });
  }

  /**
   * Try to bypass login and browse without signing in
   */
  async tryBypassLogin() {
    try {
      this.logger.info('Attempting to bypass login...');
      
      // Look for common bypass options
      const bypassSelectors = [
        'a:has-text("Not Now")',
        'button:has-text("Not Now")',
        'a:has-text("Skip")',
        'button:has-text("Skip")',
        'a[href*="/explore"]',
        'a[href*="/directory"]',
        // Try the Instagram logo to go to home
        'a[href="/"]',
        'div[role="button"] svg[aria-label="Instagram"]',
        // Close button on login modal
        'button[aria-label="Close"]',
        'div[role="button"][aria-label="Close"]',
        'svg[aria-label="Close"]'
      ];
      
      for (const selector of bypassSelectors) {
        try {
          const element = await this.page.$(selector);
          if (element && await element.isVisible()) {
            this.logger.info(`Found bypass option: ${selector}`);
            await element.click();
            await this.sleep(2000);
            
            // Check if we're still on login page
            const currentUrl = this.page.url();
            if (!currentUrl.includes('/accounts/login')) {
              return true;
            }
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
      
      // Try navigating directly to explore or directory pages
      this.logger.info('Trying to navigate to public pages...');
      
      try {
        await this.page.goto('https://www.instagram.com/explore/', {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        await this.sleep(2000);
        const exploreUrl = this.page.url();
        
        if (!exploreUrl.includes('/accounts/login')) {
          this.logger.info('Successfully navigated to explore page');
          return true;
        }
      } catch (e) {
        this.logger.warn('Could not navigate to explore page');
      }
      
      // Try the directory
      try {
        await this.page.goto('https://www.instagram.com/directory/profiles/', {
          waitUntil: 'domcontentloaded',
          timeout: 10000
        });
        
        await this.sleep(2000);
        const directoryUrl = this.page.url();
        
        if (!directoryUrl.includes('/accounts/login')) {
          this.logger.info('Successfully navigated to directory');
          return true;
        }
      } catch (e) {
        this.logger.warn('Could not navigate to directory');
      }
      
      // Try navigating to a popular public profile
      const publicProfiles = [
        'instagram',
        'cristiano',
        'leomessi',
        'selenagomez',
        'kyliejenner',
        'therock',
        'arianagrande',
        'kimkardashian',
        'beyonce',
        'khloekardashian'
      ];
      
      for (const profile of publicProfiles) {
        try {
          this.logger.info(`Trying to view public profile: ${profile}`);
          await this.page.goto(`https://www.instagram.com/${profile}/`, {
            waitUntil: 'domcontentloaded',
            timeout: 10000
          });
          
          await this.sleep(2000);
          const profileUrl = this.page.url();
          
          if (!profileUrl.includes('/accounts/login')) {
            this.logger.info(`Successfully navigated to ${profile}'s profile`);
            return true;
          }
        } catch (e) {
          // Try next profile
        }
      }
      
      return false;
    } catch (error) {
      this.logger.error('Error trying to bypass login:', error);
      return false;
    }
  }

  /**
   * Handle cookie consent popups
   */
  async handleCookieConsent() {
    try {
      const cookieTexts = [
        'Allow essential and optional cookies',
        'Allow all cookies',
        'Accept All',
        'Accept Cookies',
        'Allow Cookies'
      ];
      
      for (const text of cookieTexts) {
        const button = await this.page.$(`button:has-text("${text}")`);
        if (button && await button.isVisible()) {
          await button.click();
          this.logger.info('Accepted cookie consent');
          await this.sleep(1000);
          return true;
        }
      }
      
      // Also check for "Only allow essential cookies" if we need to
      const essentialButton = await this.page.$('button:has-text("Only allow essential cookies")');
      if (essentialButton && await essentialButton.isVisible()) {
        await essentialButton.click();
        this.logger.info('Accepted essential cookies only');
        await this.sleep(1000);
        return true;
      }
    } catch (e) {
      this.logger.debug('No cookie consent found or error:', e.message);
    }
    return false;
  }

  /**
   * Scroll through feed and interact with content
   */
  async scrollFeed(duration = 300000) { // 5 minutes default
    const startTime = Date.now();
    const { behaviorPatterns, personalityTraits } = this.icpProfile;

    // Set scroll behavior - FASTER speeds for better coverage
    const scrollSpeedMap = {
      'fast': { 
        pause: [500, 1200],          // 0.5-1.2 seconds between scrolls (much faster)
        scrollAmount: [400, 800],     // Larger scroll distances
        microPause: [100, 300]        // Shorter pauses
      },
      'moderate': { 
        pause: [800, 1800],          // 0.8-1.8 seconds
        scrollAmount: [350, 650],     
        microPause: [200, 400]
      },
      'slow': { 
        pause: [1200, 2500],         // 1.2-2.5 seconds
        scrollAmount: [300, 500],     
        microPause: [300, 600]
      }
    };
    
    // Use moderate as default for more natural behavior
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
          // Check if we should stop
          if (!this.isActive) {
            this.logger.info('Bot stop requested, breaking post loop');
            break;
          }
          
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
          
          // Check if we should stop (user pressed stop or duration limit)
          const elapsed = Date.now() - startTime;
          if (!this.isActive || elapsed >= duration) {
            this.logger.info(this.isActive ? 'Duration limit reached' : 'User stopped bot', { 
              elapsed: elapsed,
              targetDuration: duration,
              posts: this.viewedPosts.size 
            });
            break;
          }
        }

        // Human-like scroll patterns
        if (Math.random() < 0.7) {
          // 70% of time: Normal scroll
          const scrollAmount = this.randomBetween(...scrollBehavior.scrollAmount);
          await this.humanScroll(scrollAmount);
        } else if (Math.random() < 0.5) {
          // 15% of time: Quick double scroll (like when skipping content)
          const smallScroll = this.randomBetween(150, 250);
          await this.humanScroll(smallScroll);
          await this.randomSleep(200, 400);
          await this.humanScroll(smallScroll);
        } else {
          // 15% of time: Long scroll (like when looking for something specific)
          const longScroll = this.randomBetween(600, 900);
          await this.humanScroll(longScroll);
        }
        
        // Occasional micro-pauses (like reading or thinking)
        if (Math.random() < 0.3) {
          await this.randomSleep(...scrollBehavior.microPause);
        }
        
        // Main pause after scrolling
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
    while (Date.now() - startTime < duration && this.isActive) {
      // Small natural scroll movements - use our smooth scroll implementation
      if (Math.random() < 0.3) {
        // Very small scrolls while reading (5-30 pixels)
        const microScrollDistance = 5 + Math.random() * 25;
        
        // Use smooth scrolling for micro-movements too
        await this.page.evaluate(async (distance) => {
          const scrollElement = document.scrollingElement || document.body;
          const startPos = scrollElement.scrollTop;
          const endPos = startPos + distance;
          const duration = 200 + Math.random() * 300; // 200-500ms for micro scrolls
          const startTime = performance.now();
          
          const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easeOutQuad = 1 - (1 - progress) * (1 - progress);
            
            scrollElement.scrollTop = startPos + (endPos - startPos) * easeOutQuad;
            
            if (progress < 1) {
              requestAnimationFrame(animate);
            }
          };
          
          requestAnimationFrame(animate);
          await new Promise(resolve => setTimeout(resolve, duration));
        }, microScrollDistance);
      }

      // Occasional mouse movements simulating reading
      if (Math.random() < 0.2 && boundingBox) {
        // Move mouse as if following text/content
        const x = boundingBox.x + Math.random() * boundingBox.width;
        const y = boundingBox.y + (0.2 + Math.random() * 0.6) * boundingBox.height; // Focus on middle area
        await this.humanMouseMove(x, y);
      }

      // Natural reading pauses
      await this.sleep(500 + Math.random() * 1500);
    }
  }

  /**
   * Determine if bot should engage based on persona
   */
  shouldEngage(postData) {
    const { personalityTraits, behaviorPatterns, demographics } = this.icpProfile;
    
    // Base engagement probability from profile
    const engagementRates = {
      'high': 0.3,
      'very_high': 0.4,
      'moderate': 0.15,
      'selective': 0.08,
      'low': 0.05
    };
    
    let engageProbability = engagementRates[behaviorPatterns.engagementRate] || 0.1;
    
    // Adjust based on content match with interests
    const caption = (postData.caption || '').toLowerCase();
    const username = (postData.username || '').toLowerCase();
    
    // Check if content matches persona interests
    let interestMatch = 0;
    
    // Tech enthusiast personas
    if (this.icpProfile.profileName.includes('tech') || this.icpProfile.profileName.includes('Tech')) {
      if (caption.match(/\b(tech|ai|startup|crypto|web3|programming|code|app|software)\b/i)) {
        interestMatch += 0.3;
      }
    }
    
    // Finance focused personas
    if (this.icpProfile.profileName.includes('finance') || this.icpProfile.profileName.includes('Finance')) {
      if (caption.match(/\b(invest|stock|crypto|money|finance|trading|wealth|business)\b/i)) {
        interestMatch += 0.3;
      }
    }
    
    // Health & wellness personas
    if (this.icpProfile.profileName.includes('health') || this.icpProfile.profileName.includes('wellness')) {
      if (caption.match(/\b(health|fitness|yoga|wellness|nutrition|mindful|meditation|workout)\b/i)) {
        interestMatch += 0.3;
      }
    }
    
    // Entertainment focused
    if (behaviorPatterns.contentInteraction === 'entertainment_focused') {
      if (postData.mediaType === 'video' || postData.isReel) {
        interestMatch += 0.2;
      }
    }
    
    // Adjust probability based on interest match
    engageProbability *= (1 + interestMatch);
    
    // Random decision based on adjusted probability
    return Math.random() < engageProbability;
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

      this.logger.info('Performing Instagram native login', { username: credentials.username });
      
      // Check if we're on a Meta/Facebook login page and redirect if needed
      const currentUrl = this.page.url();
      if (currentUrl.includes('facebook.com') || currentUrl.includes('meta.com')) {
        this.logger.warn('On Facebook/Meta login page - redirecting to Instagram login');
        
        // Clear cookies and force Instagram native login
        await this.page.context().clearCookies();
        
        // Navigate directly to Instagram's native login
        await this.page.goto('https://www.instagram.com/accounts/login/?source=auth_switcher', { 
          waitUntil: 'domcontentloaded' 
        });
        await this.sleep(2000);
        
        // If still on Facebook, try alternate approach
        const newUrl = this.page.url();
        if (newUrl.includes('facebook.com') || newUrl.includes('meta.com')) {
          this.logger.warn('Still on Facebook - trying direct Instagram login URL');
          await this.page.goto('https://www.instagram.com/accounts/login/?hl=en', {
            waitUntil: 'domcontentloaded'
          });
          await this.sleep(2000);
        }
      }

      // Wait for Instagram login form to be visible
      this.logger.info('Waiting for login form...');
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
      
      // Ensure we're on Instagram's native login, not Facebook
      await this.page.evaluate(() => {
        // Hide any Facebook login buttons
        const buttons = document.querySelectorAll('button, a');
        buttons.forEach(element => {
          const text = (element.textContent || element.innerText || '').toLowerCase();
          if (text.includes('facebook') || text.includes('continue with facebook') || text.includes('log in with facebook')) {
            element.style.display = 'none';
            element.style.visibility = 'hidden';
          }
        });
      });
      
      // Check what type of login page we're on
      const pageContent = await this.page.evaluate(() => {
        return {
          hasUsernameInput: !!document.querySelector('input[name="username"]'),
          hasPasswordInput: !!document.querySelector('input[name="password"]'),
          hasFacebookButton: !!document.querySelector('button[type="button"]')?.textContent?.includes('Facebook'),
          url: window.location.href,
          title: document.title
        };
      });
      
      this.logger.info('Login page analysis:', pageContent);
      
      // Take a screenshot for debugging
      await this.screenshot('login-form-found');
      
      this.logger.info('Login form found, filling credentials');
      
      // Clear and fill username
      this.logger.info('Filling username field');
      const usernameInput = await this.page.locator('input[name="username"]');
      await usernameInput.click();
      await usernameInput.clear();
      await usernameInput.type(credentials.username, { delay: 100 });
      await this.randomSleep(800, 1200);

      // Clear and fill password  
      this.logger.info('Filling password field');
      const passwordInput = await this.page.locator('input[name="password"]');
      await passwordInput.click();
      await passwordInput.clear();
      await passwordInput.type(credentials.password, { delay: 100 });
      await this.randomSleep(800, 1200);
      
      // Ensure form is ready
      await this.page.evaluate(() => {
        // Trigger any form validation
        const inputs = document.querySelectorAll('input');
        inputs.forEach(input => {
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      });
      
      // Wait a bit for form validation
      await this.randomSleep(500, 1000);
      
      // Wait for button to be enabled
      await this.page.waitForFunction(() => {
        const button = document.querySelector('button[type="submit"]');
        return button && !button.disabled;
      }, { timeout: 5000 });
      
      // Click the login button
      const loginButton = await this.page.locator('button[type="submit"]').first();
      this.logger.info('Clicking login button');
      
      // Try multiple click methods for reliability
      try {
        await loginButton.click();
      } catch (e) {
        this.logger.warn('First click failed, trying alternative method');
        await this.page.evaluate(() => {
          const button = document.querySelector('button[type="submit"]');
          if (button) button.click();
        });
      }
      
      // Navigation and popup handling is done in the code above

      this.logger.info('Login form submitted, waiting for navigation');
      
      // Wait for either successful login or error message
      try {
        await Promise.race([
          // Wait for navigation away from login page
          this.page.waitForFunction(() => !window.location.href.includes('/accounts/login'), { timeout: 15000 }),
          // Or wait for home feed
          this.page.waitForSelector('article', { timeout: 15000 }),
          // Or wait for error message
          this.page.waitForSelector('div[role="alert"]', { timeout: 5000 })
        ]);
      } catch (e) {
        this.logger.warn('Navigation wait timeout - checking current state');
      }
      
      // Check for captcha
      await this.checkForCaptcha();
      
      // Wait a bit more for page to stabilize
      await this.sleep(3000);
      
      // Check if login was successful
      const afterLoginUrl = this.page.url();
      this.logger.info(`After login URL: ${afterLoginUrl}`);
      
      // Check if we're on the app redirect page
      const pageContentText = await this.page.evaluate(() => document.body.textContent);
      if (pageContentText && (pageContentText.includes('Open Instagram') || pageContentText.includes('Get the Instagram app'))) {
        this.logger.warn('Redirected to app page after login - clicking "Not Now" or navigating away');
        
        // Look for "Not Now" or "Use Instagram on the web" options
        const notNowButtons = [
          'button:has-text("Not Now")',
          'a:has-text("Not Now")',
          'button:has-text("Continue")',
          'a:has-text("Continue")',
          'button:has-text("Use Instagram on the web")',
          'a:has-text("Use Instagram on the web")'
        ];
        
        let clicked = false;
        for (const selector of notNowButtons) {
          try {
            const button = await this.page.$(selector);
            if (button && await button.isVisible()) {
              await button.click();
              clicked = true;
              this.logger.info(`Clicked "${selector}" to stay on web`);
              await this.sleep(2000);
              break;
            }
          } catch (e) {
            // Try next selector
          }
        }
        
        // If we couldn't click anything, navigate directly to Instagram home
        if (!clicked) {
          this.logger.info('Could not find dismiss button - navigating to Instagram home');
          await this.page.goto('https://www.instagram.com/', {
            waitUntil: 'domcontentloaded'
          });
          await this.sleep(2000);
        }
      }
      
      // Check for login errors
      const errorMessage = await this.page.$('div[role="alert"], span[data-testid="login-error-message"], p[data-testid="login-error-message"]');
      if (errorMessage && await errorMessage.isVisible()) {
        const errorText = await errorMessage.textContent();
        this.logger.error(`Login error displayed: ${errorText}`);
        throw new Error(`Instagram login failed: ${errorText}`);
      }
      
      // Handle various post-login redirects and popups
      if (afterLoginUrl.includes('onetap') || afterLoginUrl.includes('save')) {
        // Handle the "Save your login info?" page
        this.logger.info('On save login page, dismissing...');
        await this.dismissPopup(['Not Now', 'Not now', 'Skip']);
      }
      
      // Use comprehensive popup handler
      await this.handleAllLoginPopups();
      
      // Wait for navigation after login
      try {
        await this.page.waitForNavigation({ 
          waitUntil: 'networkidle',
          timeout: 15000 
        });
      } catch (e) {
        this.logger.warn('Navigation timeout - checking current state');
      }
      
      // Check where we ended up
      const postLoginState = await this.analyzePageState();
      this.logger.info('Post-login state:', postLoginState);
      
      if (postLoginState.hasFeed) {
        this.logger.info('Instagram login successful - feed detected');
        this.emit('status', { 
          status: 'logged_in',
          message: 'Successfully logged into Instagram'
        });
      } else if (postLoginState.isLoginPage && postLoginState.hasLoginForm) {
        // Still on login page - likely wrong credentials
        const errorText = await this.page.evaluate(() => {
          const alert = document.querySelector('div[role="alert"]');
          return alert ? alert.innerText : '';
        });
        throw new Error(`Login failed: ${errorText || 'Invalid credentials'}`);
      } else {
        // Some other page - might be a security check
        this.logger.warn('Landed on unexpected page after login');
        await this.screenshot('post-login-unexpected');
      }
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
      const maxAttempts = 15; // More attempts
      let attempts = 0;
      let lastUrl = '';
      
      while (attempts < maxAttempts) {
        attempts++;
        const currentUrl = this.page.url();
        
        // Only log if URL changed
        if (currentUrl !== lastUrl) {
          this.logger.info(`Handling popups - Attempt ${attempts}, URL: ${currentUrl}`);
          lastUrl = currentUrl;
        }
        
        let popupHandled = false;
        
        // Wait a bit for any popups to appear
        await this.sleep(1000);
        
        // FIRST: Always try to close any dialog with X button
        popupHandled = await this.closeAnyDialogWithX() || popupHandled;
        if (popupHandled) {
          this.logger.info('Closed popup with X button');
          await this.sleep(1000);
          continue;
        }
        
        // 1. Handle "Save Your Login Info?" popup (most common)
        popupHandled = await this.handleSaveLoginPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 2. Handle "Turn on Notifications" popup
        popupHandled = await this.handleNotificationPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 3. Handle "Add Instagram to your Home screen?" popup
        popupHandled = await this.handleAddToHomePopup() || popupHandled;
        if (popupHandled) continue;
        
        // 4. Handle Two-Factor Authentication
        popupHandled = await this.handleTwoFactorAuth() || popupHandled;
        if (popupHandled) continue;
        
        // 5. Handle "Was This You?" security check
        popupHandled = await this.handleSecurityCheck() || popupHandled;
        if (popupHandled) continue;
        
        // 6. Handle "Update Your App" popup
        popupHandled = await this.handleUpdateAppPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 7. Handle "Connect Contacts" popup
        popupHandled = await this.handleContactsPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 8. Handle "See suggested accounts" popup
        popupHandled = await this.handleSuggestedAccountsPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 9. Handle "Allow Instagram to use cookies" popup
        popupHandled = await this.handleCookiesPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 10. Handle "Something went wrong" error
        popupHandled = await this.handleErrorPopup() || popupHandled;
        if (popupHandled) continue;
        
        // 11. Handle generic dialogs with close buttons
        popupHandled = await this.handleGenericDialogs() || popupHandled;
        if (popupHandled) continue;
        
        // 12. Check if we're on the home feed
        const onFeed = await this.checkIfOnFeed();
        
        if (onFeed) {
          this.logger.info('Successfully reached Instagram feed');
          break;
        }
        
        // 10. If still stuck after 4 attempts, try different strategies
        if (attempts >= 4 && !onFeed) {
          if (attempts === 4) {
            this.logger.info('Attempting direct navigation to home feed');
            await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
          } else if (attempts === 6) {
            this.logger.info('Trying to press Escape key');
            await this.page.keyboard.press('Escape');
          } else if (attempts === 8) {
            this.logger.info('Clicking outside any dialogs');
            await this.page.mouse.click(100, 100);
          }
          await this.sleep(2000);
        }
        
        await this.sleep(1000);
      }
      
    } catch (error) {
      this.logger.error('Error handling popups', { error: error.message });
      // Don't throw - continue anyway
    }
  }
  
  /**
   * Close any dialog with X button
   */
  async closeAnyDialogWithX() {
    try {
      // Multiple selectors for close buttons
      const closeSelectors = [
        // SVG X buttons
        'svg[aria-label="Close"]',
        'button svg[aria-label="Close"]',
        '[role="button"] svg[aria-label="Close"]',
        
        // Button with X text
        'button:has-text("×")',
        'button:has-text("X")',
        '[role="button"]:has-text("×")',
        
        // Aria-label close buttons
        'button[aria-label="Close"]',
        '[role="button"][aria-label="Close"]',
        'div[role="button"][aria-label="Close"]',
        
        // Common close button classes
        'button[class*="close"]',
        'button[class*="dismiss"]',
        
        // Dialog close buttons
        '[role="dialog"] button[aria-label="Close"]',
        '[role="dialog"] [role="button"][aria-label="Close"]',
        'div[role="dialog"] svg[aria-label="Close"]'
      ];
      
      for (const selector of closeSelectors) {
        try {
          const elements = await this.page.$$(selector);
          for (const element of elements) {
            if (await element.isVisible()) {
              this.logger.info(`Found close button with selector: ${selector}`);
              
              try {
                // Try to click the element directly
                await element.click();
                this.logger.info('Clicked close button directly');
                await this.sleep(1000);
                return true;
              } catch (e1) {
                // If that fails, try clicking parent
                try {
                  const parent = await element.evaluateHandle(el => {
                    if (el.tagName === 'svg' || el.tagName === 'SVG') {
                      return el.closest('button') || el.parentElement;
                    }
                    return el.parentElement;
                  });
                  await parent.click();
                  this.logger.info('Clicked close button parent');
                  await this.sleep(1000);
                  return true;
                } catch (e2) {
                  this.logger.debug('Could not click close button');
                }
              }
            }
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
      
      return false;
    } catch (error) {
      this.logger.debug('Error in closeAnyDialogWithX:', error.message);
      return false;
    }
  }
  
  /**
   * Handle "Save Your Login Info?" popup
   */
  async handleSaveLoginPopup() {
    try {
      const pageText = await this.page.evaluate(() => document.body.textContent);
      const currentUrl = this.page.url();
      
      if (pageText.includes('Save Your Login') || pageText.includes('save your login') || 
          pageText.includes('Save login') || currentUrl.includes('save') || currentUrl.includes('onetap')) {
        
        const buttonTexts = ['Not Now', 'Not now', 'Skip', 'Cancel', 'Maybe Later'];
        
        for (const text of buttonTexts) {
          const buttons = await this.page.$$(`button:has-text("${text}"), a:has-text("${text}"), [role="button"]:has-text("${text}")`);
          for (const button of buttons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info(`Clicked "${text}" on save login popup`);
              await this.sleep(2000);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling save login popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Turn on Notifications" popup
   */
  async handleNotificationPopup() {
    try {
      const notificationTexts = ['Turn on Notifications', 'Enable Notifications', 'Get Notifications'];
      
      for (const text of notificationTexts) {
        const dialog = await this.page.$(`[role="dialog"]:has-text("${text}")`);
        if (dialog) {
          const dismissButtons = await dialog.$$('button:has-text("Not Now"), button:has-text("Maybe Later"), button:has-text("Cancel")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Dismissed notification popup');
              await this.sleep(2000);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling notification popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Add Instagram to Home Screen" popup
   */
  async handleAddToHomePopup() {
    try {
      const addToHomeTexts = ['Add Instagram', 'Add to Home Screen', 'Install App'];
      
      for (const text of addToHomeTexts) {
        const dialog = await this.page.$(`[role="dialog"]:has-text("${text}")`);
        if (dialog) {
          const dismissButtons = await dialog.$$('button:has-text("Cancel"), button:has-text("Not Now"), button:has-text("Skip")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Dismissed add to home screen popup');
              await this.sleep(2000);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling add to home popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle Two-Factor Authentication
   */
  async handleTwoFactorAuth() {
    try {
      const pageText = await this.page.evaluate(() => document.body.textContent);
      
      if (pageText.includes('Two-Factor') || pageText.includes('Security Code') || 
          pageText.includes('Enter Code') || pageText.includes('Verify Your Account')) {
        
        this.logger.warn('Two-factor authentication required');
        this.emit('status', {
          status: 'two_factor_required',
          message: 'Two-factor authentication code needed'
        });
        
        // Wait for user to enter code (give them 2 minutes)
        this.logger.info('Waiting for 2FA code to be entered...');
        await this.sleep(120000);
        return true;
      }
    } catch (e) {
      this.logger.debug('Error handling 2FA:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Was This You?" security check
   */
  async handleSecurityCheck() {
    try {
      const pageText = await this.page.evaluate(() => document.body.textContent);
      
      if (pageText.includes('Was This You') || pageText.includes('Suspicious Login') || 
          pageText.includes('Verify Your Identity')) {
        
        // Look for "This Was Me" button
        const confirmButtons = await this.page.$$('button:has-text("This Was Me"), button:has-text("Yes"), button:has-text("Confirm")');
        for (const button of confirmButtons) {
          if (await button.isVisible()) {
            await button.click();
            this.logger.info('Confirmed security check');
            await this.sleep(3000);
            return true;
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling security check:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Update Your App" popup
   */
  async handleUpdateAppPopup() {
    try {
      const updateTexts = ['Update App', 'Update Instagram', 'New Version Available'];
      
      for (const text of updateTexts) {
        if (await this.page.$(`text=${text}`)) {
          const dismissButtons = await this.page.$$('button:has-text("Not Now"), button:has-text("Later"), button:has-text("Skip")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Dismissed update app popup');
              await this.sleep(2000);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling update popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Connect Contacts" popup
   */
  async handleContactsPopup() {
    try {
      const contactTexts = ['Connect Contacts', 'Find Friends', 'Sync Contacts'];
      
      for (const text of contactTexts) {
        if (await this.page.$(`text=${text}`)) {
          const dismissButtons = await this.page.$$('button:has-text("Not Now"), button:has-text("Skip"), button:has-text("Cancel")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Dismissed contacts popup');
              await this.sleep(2000);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling contacts popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "See suggested accounts" popup
   */
  async handleSuggestedAccountsPopup() {
    try {
      const suggestedTexts = ['Suggested for You', 'See All', 'Discover People'];
      
      for (const text of suggestedTexts) {
        const pageText = await this.page.evaluate(() => document.body.textContent);
        if (pageText.includes(text)) {
          // Look for close or dismiss buttons
          const dismissButtons = await this.page.$$('button[aria-label="Close"], svg[aria-label="Close"], button:has-text("×")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              const clickable = await button.evaluateHandle(el => el.closest('button') || el);
              await clickable.click();
              this.logger.info('Dismissed suggested accounts popup');
              await this.sleep(1500);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling suggested accounts popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Allow Instagram to use cookies" popup
   */
  async handleCookiesPopup() {
    try {
      const pageText = await this.page.evaluate(() => document.body.textContent);
      
      if (pageText.includes('We use cookies') || pageText.includes('Cookie Policy')) {
        // Look for "Accept" or "Allow" buttons
        const acceptButtons = await this.page.$$('button:has-text("Accept"), button:has-text("Allow"), button:has-text("OK")');
        for (const button of acceptButtons) {
          if (await button.isVisible()) {
            await button.click();
            this.logger.info('Accepted cookies policy');
            await this.sleep(1500);
            return true;
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling cookies popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle "Something went wrong" error popup
   */
  async handleErrorPopup() {
    try {
      const errorTexts = ['Something went wrong', 'Try Again', 'Error', 'Oops'];
      const pageText = await this.page.evaluate(() => document.body.textContent);
      
      for (const text of errorTexts) {
        if (pageText.includes(text)) {
          // Look for retry or dismiss buttons
          const buttons = await this.page.$$('button:has-text("Try Again"), button:has-text("OK"), button:has-text("Dismiss"), button:has-text("Close")');
          for (const button of buttons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Handled error popup');
              await this.sleep(2000);
              return true;
            }
          }
          
          // If no button found, try reloading
          this.logger.info('No dismiss button found for error, reloading page');
          await this.page.reload({ waitUntil: 'networkidle' });
          await this.sleep(3000);
          return true;
        }
      }
    } catch (e) {
      this.logger.debug('Error handling error popup:', e.message);
    }
    return false;
  }
  
  /**
   * Handle generic dialogs with close buttons
   */
  async handleGenericDialogs() {
    try {
      // First try the more general closeAnyDialogWithX
      if (await this.closeAnyDialogWithX()) {
        return true;
      }
      
      // Look for any visible dialogs
      const dialogs = await this.page.$$('[role="dialog"]');
      
      for (const dialog of dialogs) {
        if (await dialog.isVisible()) {
          // Try dismiss buttons as fallback
          const dismissButtons = await dialog.$$('button:has-text("OK"), button:has-text("Done"), button:has-text("Close")');
          for (const button of dismissButtons) {
            if (await button.isVisible()) {
              await button.click();
              this.logger.info('Dismissed dialog');
              await this.sleep(1500);
              return true;
            }
          }
        }
      }
    } catch (e) {
      this.logger.debug('Error handling generic dialogs:', e.message);
    }
    return false;
  }
  
  /**
   * Check if we're on the Instagram feed
   */
  async checkIfOnFeed() {
    try {
      const currentUrl = this.page.url();
      
      // URL checks
      if (currentUrl === 'https://www.instagram.com/' || 
          currentUrl.endsWith('instagram.com/') || 
          currentUrl.includes('/feed')) {
        
        // Also check for feed content
        const feedSelectors = [
          'article',
          '[role="main"]',
          'div[data-testid="feeds-feed"]',
          'main article',
          'div[role="main"] article'
        ];
        
        for (const selector of feedSelectors) {
          if (await this.page.$(selector)) {
            return true;
          }
        }
      }
      
      return false;
    } catch (e) {
      this.logger.debug('Error checking feed status:', e.message);
      return false;
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