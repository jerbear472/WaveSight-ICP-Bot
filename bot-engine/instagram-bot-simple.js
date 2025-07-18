/**
 * Simplified Instagram Bot for Testing
 * Focus on getting login working first
 */

const BotBase = require('./bot-base');

class InstagramBotSimple extends BotBase {
  constructor(icpProfile, config = {}) {
    super(icpProfile, {
      ...config,
      platform: 'instagram'
    });
  }

  async navigateAndLogin() {
    try {
      this.emit('status', {
        status: 'starting',
        message: 'Starting Instagram bot...'
      });

      // Get credentials
      const credentials = this.getCredentials();
      if (!credentials || !credentials.username || !credentials.password) {
        throw new Error('Instagram credentials not configured');
      }

      this.logger.info('Starting simple Instagram login', { username: credentials.username });
      
      // Clear cookies and go directly to login page
      await this.page.context().clearCookies();
      
      // Navigate directly to Instagram login
      this.logger.info('Navigating to Instagram login page');
      await this.page.goto('https://www.instagram.com/accounts/login/', { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });
      
      // Wait for page to load
      await this.sleep(3000);
      
      // Take screenshot
      await this.screenshot('login-page');
      
      // Wait for and fill username
      this.logger.info('Waiting for username field');
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
      
      this.logger.info('Filling username');
      await this.page.fill('input[name="username"]', credentials.username);
      await this.sleep(1000);
      
      // Fill password
      this.logger.info('Filling password');
      await this.page.fill('input[name="password"]', credentials.password);
      await this.sleep(1000);
      
      // Take screenshot before submitting
      await this.screenshot('before-submit');
      
      // Click login button
      this.logger.info('Clicking login button');
      await this.page.click('button[type="submit"]');
      
      this.emit('status', {
        status: 'logging_in',
        message: 'Submitted login form'
      });
      
      // Wait for navigation
      this.logger.info('Waiting for login to complete');
      await this.sleep(3000);
      
      // Take screenshot to see what's on screen
      await this.screenshot('after-login-before-popup-check');
      
      // Handle save password popup
      await this.handleSavePasswordPopup();
      
      await this.sleep(2000);
      
      // Take screenshot after handling popup
      await this.screenshot('after-popup-handling');
      
      // Check current URL
      const currentUrl = this.page.url();
      this.logger.info('Current URL after login:', currentUrl);
      
      // Check if we have any feed content
      const hasFeed = await this.page.evaluate(() => {
        return document.querySelector('article') !== null || 
               document.querySelector('main[role="main"]') !== null;
      });
      
      if (hasFeed) {
        this.logger.info('Login successful - feed detected');
        this.emit('status', {
          status: 'logged_in',
          message: 'Successfully logged in'
        });
        return true;
      } else {
        this.logger.warn('No feed detected after login');
        
        // Check for any popups to dismiss
        await this.dismissAnyPopups();
        
        // Try navigating to home
        await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
        await this.sleep(3000);
        
        return true;
      }
      
    } catch (error) {
      this.logger.error('Login failed:', error);
      await this.screenshot('error-state');
      throw error;
    }
  }
  
  async handleSavePasswordPopup() {
    try {
      this.logger.info('Checking for save password popup');
      
      // Look for "Save Your Login Info?" or "Save Login Info" popup
      // Try multiple selectors that Instagram uses
      const popupSelectors = [
        'button:has-text("Not Now")',
        'button:has-text("Not now")', 
        'div[role="button"]:has-text("Not Now")',
        'div[role="button"]:has-text("Not now")',
        'button:text-is("Not Now")',
        'div:text-is("Not Now")',
        '//button[contains(text(), "Not Now")]',
        '//div[@role="button" and contains(text(), "Not Now")]'
      ];
      
      for (const selector of popupSelectors) {
        try {
          const element = selector.startsWith('//') 
            ? await this.page.locator(selector).first()
            : await this.page.locator(selector).first();
            
          if (await element.isVisible({ timeout: 1000 })) {
            this.logger.info(`Found save password popup with selector: ${selector}`);
            await element.click();
            this.logger.info('Clicked "Not Now" on save password popup');
            await this.sleep(1000);
            return;
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
      
      // If no popup found with selectors, try text search
      const allButtons = await this.page.$$('button, div[role="button"]');
      for (const button of allButtons) {
        try {
          const text = await button.textContent();
          if (text && (text.includes('Not Now') || text.includes('Not now'))) {
            this.logger.info(`Found "Not Now" button by text search: "${text}"`);
            await button.click();
            await this.sleep(1000);
            return;
          }
        } catch (e) {
          // Continue
        }
      }
      
      this.logger.info('No save password popup found');
      
    } catch (error) {
      this.logger.debug('Error handling save password popup:', error);
    }
  }
  
  async dismissAnyPopups() {
    try {
      // Try to dismiss common popups
      const dismissButtons = [
        'button:has-text("Not Now")',
        'button:has-text("Cancel")',
        'button:has-text("Skip")',
        'button[aria-label="Close"]',
        'svg[aria-label="Close"]'
      ];
      
      for (const selector of dismissButtons) {
        try {
          const button = await this.page.$(selector);
          if (button && await button.isVisible()) {
            await button.click();
            this.logger.info(`Dismissed popup with: ${selector}`);
            await this.sleep(1000);
          }
        } catch (e) {
          // Continue trying other selectors
        }
      }
    } catch (error) {
      this.logger.debug('Error dismissing popups:', error);
    }
  }
  
  async scrollFeed(duration = 60000) {
    const startTime = Date.now();
    const viewedPosts = new Set();
    
    this.emit('status', {
      status: 'scrolling',
      message: 'Started scrolling feed'
    });
    
    this.logger.info('Starting to scroll feed');
    
    // Try to dismiss any remaining popups before scrolling
    await this.handleSavePasswordPopup();
    await this.dismissAnyPopups();
    
    let noPostsCount = 0;
    
    while (Date.now() - startTime < duration && this.isActive) {
      try {
        // Get all visible posts
        const posts = await this.page.$$('article');
        this.logger.info(`Visible posts: ${posts.length}`);
        
        // If no posts found, try to handle popups and navigate
        if (posts.length === 0) {
          noPostsCount++;
          if (noPostsCount === 3) {
            this.logger.warn('No posts found after 3 attempts, checking for popups');
            await this.screenshot('no-posts-found');
            await this.handleSavePasswordPopup();
            await this.dismissAnyPopups();
            
            // Try clicking anywhere to dismiss overlays
            await this.page.click('body').catch(() => {});
            
            // Try navigating to home explicitly
            if (noPostsCount === 5) {
              this.logger.info('Navigating to home page');
              await this.page.goto('https://www.instagram.com/', { waitUntil: 'domcontentloaded' });
              await this.sleep(3000);
            }
          }
        } else {
          noPostsCount = 0; // Reset counter when posts are found
        }
        
        // Process each post
        for (const post of posts) {
          try {
            // Extract post data
            const postData = await this.extractPostData(post);
            
            // Skip if already viewed
            if (viewedPosts.has(postData.contentId)) continue;
            viewedPosts.add(postData.contentId);
            
            // Log the impression
            const impression = await this.logImpression({
              ...postData,
              platform: 'instagram',
              viewDuration: 3000 // Default 3 seconds
            });
            
            // Emit content discovered event for database storage
            const contentData = {
              contentId: postData.contentId,
              platform: 'instagram',
              contentType: postData.contentType,
              creator: postData.creatorUsername,  // DataRecorder expects 'creator' not 'creatorUsername'
              creatorHandle: postData.creatorHandle,
              caption: postData.caption,
              hashtags: postData.hashtags,
              thumbnailUrl: postData.thumbnailUrl,
              likes: postData.metrics.likes,
              comments: postData.metrics.comments,
              shares: postData.metrics.shares,
              saves: postData.metrics.saves,
              url: await this.page.url(),
              timestamp: new Date().toISOString()
            };
            
            this.emit('content-discovered', contentData);
            
            this.logger.info('Logged post:', {
              creator: postData.creatorUsername,
              handle: postData.creatorHandle,
              likes: postData.metrics.likes,
              comments: postData.metrics.comments,
              caption: postData.caption.substring(0, 50) + '...'
            });
            
          } catch (error) {
            this.logger.warn('Error processing post:', error);
          }
        }
        
        // Scroll down
        await this.page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        
        // Wait before next scroll
        await this.sleep(2000);
        
      } catch (error) {
        this.logger.error('Error during scroll:', error);
      }
    }
    
    this.logger.info(`Scrolling completed. Viewed ${viewedPosts.size} posts`);
    this.emit('status', {
      status: 'completed',
      message: `Scrolling completed. Viewed ${viewedPosts.size} posts`
    });
  }
  
  async extractPostData(postElement) {
    const data = {
      contentId: '',
      contentType: 'post',
      creatorUsername: '',
      creatorHandle: '',
      caption: '',
      hashtags: [],
      thumbnailUrl: '',
      metrics: {
        likes: 0,
        comments: 0,
        shares: 0,
        saves: 0
      }
    };
    
    try {
      // Extract post ID
      data.contentId = await this.extractPostId(postElement);
      
      // Extract creator username
      const usernameElement = await postElement.$('header a[role="link"] span');
      if (usernameElement) {
        data.creatorUsername = await usernameElement.innerText();
      }
      
      // Also try to get the @ handle if different
      const handleElement = await postElement.$('header a[role="link"]');
      if (handleElement) {
        const href = await handleElement.getAttribute('href');
        if (href) {
          // Extract handle from URL like /username/
          const match = href.match(/\/([^\/]+)\/?$/);
          if (match) {
            data.creatorHandle = match[1];
          }
        }
      }
      
      // If no separate handle found, use username
      if (!data.creatorHandle && data.creatorUsername) {
        data.creatorHandle = data.creatorUsername;
      }
      
      // Extract caption and hashtags
      const captionElements = await postElement.$$('h1');
      if (captionElements.length > 0) {
        data.caption = await captionElements[0].innerText();
        // Extract hashtags from caption
        data.hashtags = this.extractHashtags(data.caption);
      }
      
      // Extract thumbnail URL
      const imgElement = await postElement.$('img[srcset]');
      if (imgElement) {
        data.thumbnailUrl = await imgElement.getAttribute('src');
      }
      
      // Extract metrics - Instagram hides exact counts sometimes
      // Look for like button and its text
      const likeSection = await postElement.$('section > div > div');
      if (likeSection) {
        const likeText = await likeSection.innerText();
        if (likeText.includes('like')) {
          data.metrics.likes = this.parseMetricValue(likeText);
        }
      }
      
      // Try to find comment count
      const viewCommentsLink = await postElement.$('a[href*="/comments/"]');
      if (viewCommentsLink) {
        const commentText = await viewCommentsLink.innerText();
        if (commentText.includes('comment')) {
          data.metrics.comments = this.parseMetricValue(commentText);
        }
      }
      
    } catch (error) {
      this.logger.debug('Error extracting post data:', error);
    }
    
    return data;
  }
  
  async extractPostId(postElement) {
    try {
      // Try to get from post link
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
  
  extractHashtags(text) {
    const hashtagRegex = /#[a-zA-Z0-9_]+/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.toLowerCase()) : [];
  }
  
  parseMetricValue(text) {
    if (!text) return 0;
    
    // Remove non-numeric characters except K, M
    const cleaned = text.replace(/[^0-9KM.,]/gi, '').toUpperCase();
    
    if (cleaned.includes('K')) {
      return Math.floor(parseFloat(cleaned) * 1000);
    } else if (cleaned.includes('M')) {
      return Math.floor(parseFloat(cleaned) * 1000000);
    }
    
    return parseInt(cleaned.replace(/,/g, '')) || 0;
  }
  
  getCredentials() {
    // Check if credentials are directly in config
    if (this.config.credentials && this.config.credentials.username && this.config.credentials.password) {
      return this.config.credentials;
    }
    
    // Check environment variables
    if (process.env.INSTAGRAM_USERNAME && process.env.INSTAGRAM_PASSWORD) {
      return {
        username: process.env.INSTAGRAM_USERNAME,
        password: process.env.INSTAGRAM_PASSWORD
      };
    }

    // Default credentials
    return {
      username: 'mindmatterlife',
      password: 'L0ngStr@ngeTr!p'
    };
  }

  async start(options = {}) {
    const { duration = 60000 } = options;

    try {
      await this.initialize();
      await this.navigateAndLogin();
      await this.scrollFeed(duration);
      return this.getMetrics();
    } catch (error) {
      this.logger.error('Bot session failed', { error: error.message });
      throw error;
    } finally {
      await this.cleanup();
    }
  }
}

module.exports = InstagramBotSimple;