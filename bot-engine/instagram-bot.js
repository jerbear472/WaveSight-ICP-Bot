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
      // Feed selectors
      feedPost: 'article[role="presentation"]',
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
      await this.page.goto(this.baseUrl, { 
        waitUntil: 'networkidle',
        timeout: 30000 
      });

      // Handle cookie consent if present
      const cookieButton = await this.page.$('button:has-text("Allow essential and optional cookies")');
      if (cookieButton) {
        await cookieButton.click();
        await this.sleep(1000);
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
        // Check if we're logged in at all
        const usernameInput = await this.page.locator('input[name="username"]').count();
        if (usernameInput > 0) {
          throw new Error('Not logged in - username input found');
        }
        this.logger.warn('No specific feed selectors found, but appears to be logged in');
      }
      
      this.logger.info('Successfully navigated to Instagram feed');
      return true;
    } catch (error) {
      this.logger.error('Failed to navigate to Instagram', { error: error.message });
      throw error;
    }
  }

  /**
   * Scroll through feed and interact with content
   */
  async scrollFeed(duration = 300000) { // 5 minutes default
    const startTime = Date.now();
    const { behaviorPatterns, personalityTraits } = this.icpProfile;

    this.logger.info('Starting feed scroll', { duration, profile: this.icpProfile.profileName });

    while (Date.now() - startTime < duration && this.isActive) {
      try {
        // Get visible posts
        const posts = await this.page.$$(this.selectors.feedPost);
        
        for (const post of posts) {
          // Check if post is in viewport
          const isVisible = await post.isIntersectingViewport();
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

          // Random pause between posts
          await this.randomSleep(500, 2000);
        }

        // Scroll to load more content
        await this.humanScroll(400 + Math.random() * 200);
        await this.randomSleep(1000, 3000);

      } catch (error) {
        this.logger.error('Error during feed scroll', { error: error.message });
        await this.screenshot('error-feed-scroll');
      }
    }

    this.logger.info('Feed scroll completed', { 
      duration: Date.now() - startTime,
      impressions: this.impressions.length,
      engagements: this.engagements.length
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
    const { personalityTraits } = this.icpProfile;
    const engagementTypes = [];

    // Like decision
    if (Math.random() < personalityTraits.impulsiveness * 0.5) {
      const likeButton = await postElement.$(this.selectors.likeButton);
      if (likeButton) {
        await this.randomSleep(500, 1500);
        await likeButton.click();
        engagementTypes.push('like');
        
        await this.logEngagement(impressionId, 'like', {
          contentId: postData.contentId
        });
      }
    }

    // Follow decision (lower probability)
    if (Math.random() < 0.05 && !postData.isSponsored) {
      const followButton = await postElement.$(this.selectors.followButton);
      if (followButton) {
        await this.randomSleep(1000, 2000);
        await followButton.click();
        engagementTypes.push('follow');
        
        await this.logEngagement(impressionId, 'follow', {
          creator: postData.creatorUsername
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