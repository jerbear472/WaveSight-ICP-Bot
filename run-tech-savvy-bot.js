/**
 * Tech-Savvy Bot Runner
 * Runs Instagram and TikTok bots with real-time trend logging
 */

require('dotenv').config();
const InstagramBot = require('./bot-engine/instagram-bot');
const TikTokBot = require('./bot-engine/tiktok-bot');
const ICPProfileGenerator = require('./bot-engine/icp-profile-generator');
const SupabaseLogger = require('./data-logger/supabase-logger');

class TechSavvyBotRunner {
  constructor() {
    this.dataLogger = new SupabaseLogger();
    this.profileGenerator = new ICPProfileGenerator();
    this.activeBots = [];
    this.isRunning = false;
  }

  async initialize() {
    console.log('🤖 Initializing Tech-Savvy Bot System...');
    await this.dataLogger.initialize();
    console.log('✅ Supabase connection established');
  }

  createTechSavvyProfile() {
    // Enhanced tech-savvy profile for mindmatterlife audience
    const profile = this.profileGenerator.generateProfile('gen_z_tech_enthusiast', {
      profileName: 'TechSavvy_Trendhunter',
      interests: ['AI', 'crypto', 'NFTs', 'startups', 'web3', 'fintech', 'gaming', 'productivity', 'mindfulness'],
      behaviorPatterns: {
        scrollSpeed: 'fast',
        engagementRate: 'very_high',
        contentPreference: ['viral_trends', 'tech_news', 'motivational', 'educational'],
        activeHours: [9, 13, 17, 21],
        trendSensitivity: 'extreme',
        engagementThreshold: 0.8,
        viralityDetection: true
      }
    });

    console.log('👤 Created Tech-Savvy Profile:');
    console.log(`   Name: ${profile.profileName}`);
    console.log(`   Age: ${profile.ageRange}`);
    console.log(`   Interests: ${profile.interests.join(', ')}`);
    console.log(`   Device: ${profile.deviceType}`);
    console.log('');

    return profile;
  }

  async runInstagramBot(duration = 300000) {
    const profile = this.createTechSavvyProfile();
    const bot = new InstagramBot(profile);
    
    console.log('📱 Starting Instagram Tech-Savvy Bot...');
    console.log('🔍 Hunting for trends on Instagram @mindmatterlife feed...\n');

    try {
      await bot.initialize();
      await bot.start();
      await bot.navigateToFeed();

      console.log('👀 MONITORING INSTAGRAM FEED - Real-time trend detection:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Custom monitoring with real-time logging
      const startTime = Date.now();
      let contentCount = 0;
      let trendingCount = 0;

      while (Date.now() - startTime < duration && this.isRunning) {
        try {
          // Get current posts on screen
          const posts = await bot.page.$$('article');
          
          for (const post of posts) {
            const postData = await this.extractDetailedPostData(bot.page, post);
            
            if (postData && !bot.viewedPosts.has(postData.contentId)) {
              bot.viewedPosts.add(postData.contentId);
              contentCount++;

              // Real-time console logging
              this.logTrendingContent('Instagram', postData);

              // Check if content is trending
              const isTrending = this.detectTrendingContent(postData);
              if (isTrending) {
                trendingCount++;
                console.log(`🔥 TRENDING DETECTED: ${postData.caption?.substring(0, 60)}...`);
              }

              // Save to Supabase
              await this.saveTrendData('instagram', postData, isTrending);

              // Simulate human viewing behavior
              await bot.page.waitForTimeout(2000 + Math.random() * 3000);
            }
          }

          // Scroll to load more content
          await bot.page.evaluate(() => window.scrollBy(0, 400 + Math.random() * 200));
          await bot.page.waitForTimeout(1500 + Math.random() * 1000);

        } catch (error) {
          console.log(`⚠️ Error processing content: ${error.message}`);
        }
      }

      console.log(`\n📊 Instagram Session Complete:`);
      console.log(`   📈 Content Analyzed: ${contentCount}`);
      console.log(`   🔥 Trending Items: ${trendingCount}`);
      console.log(`   💾 Data saved to Supabase\n`);

      await bot.stop();

    } catch (error) {
      console.error('❌ Instagram bot error:', error.message);
    }
  }

  async runTikTokBot(duration = 300000) {
    const profile = this.createTechSavvyProfile();
    const bot = new TikTokBot(profile);
    
    console.log('🎵 Starting TikTok Tech-Savvy Bot...');
    console.log('🔍 Hunting for trends on TikTok @mindmatterlife feed...\n');

    try {
      await bot.initialize();
      await bot.start();
      await bot.navigateToFeed();

      console.log('👀 MONITORING TIKTOK FEED - Real-time trend detection:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

      // Custom monitoring with real-time logging
      const startTime = Date.now();
      let videoCount = 0;
      let trendingCount = 0;

      while (Date.now() - startTime < duration && this.isRunning) {
        try {
          // Look for video elements
          const videos = await bot.page.$$('video, div[data-e2e*="video"]');
          
          for (const video of videos) {
            const videoData = await this.extractDetailedVideoData(bot.page, video);
            
            if (videoData && !bot.viewedVideos.has(videoData.contentId)) {
              bot.viewedVideos.add(videoData.contentId);
              videoCount++;

              // Real-time console logging
              this.logTrendingContent('TikTok', videoData);

              // Check if content is trending
              const isTrending = this.detectTrendingContent(videoData);
              if (isTrending) {
                trendingCount++;
                console.log(`🔥 VIRAL DETECTED: ${videoData.caption?.substring(0, 60)}...`);
              }

              // Save to Supabase
              await this.saveTrendData('tiktok', videoData, isTrending);

              // Simulate human viewing behavior
              await bot.page.waitForTimeout(3000 + Math.random() * 4000);
            }
          }

          // Scroll to next videos
          await bot.page.keyboard.press('ArrowDown');
          await bot.page.waitForTimeout(2000 + Math.random() * 1000);

        } catch (error) {
          console.log(`⚠️ Error processing video: ${error.message}`);
        }
      }

      console.log(`\n📊 TikTok Session Complete:`);
      console.log(`   📹 Videos Analyzed: ${videoCount}`);
      console.log(`   🔥 Viral Content: ${trendingCount}`);
      console.log(`   💾 Data saved to Supabase\n`);

      await bot.stop();

    } catch (error) {
      console.error('❌ TikTok bot error:', error.message);
    }
  }

  async extractDetailedPostData(page, postElement) {
    try {
      const data = await page.evaluate((post) => {
        // Extract username
        const usernameEl = post.querySelector('a[role="link"]');
        const username = usernameEl?.textContent?.trim() || 'unknown';

        // Extract caption
        const captionEl = post.querySelector('span[dir="auto"]');
        const caption = captionEl?.textContent?.trim() || '';

        // Extract hashtags
        const hashtags = Array.from(post.querySelectorAll('a[href*="/explore/tags/"]'))
          .map(el => el.textContent.trim());

        // Extract metrics
        const likeEl = post.querySelector('section button span');
        const likes = likeEl?.textContent?.trim() || '0';

        // Extract image/video
        const mediaEl = post.querySelector('img, video');
        const mediaType = mediaEl?.tagName?.toLowerCase() || 'unknown';

        return {
          username,
          caption,
          hashtags,
          likes,
          mediaType,
          timestamp: new Date().toISOString(),
          contentId: `ig_${username}_${Date.now()}`
        };
      }, postElement);

      return data;
    } catch (error) {
      return null;
    }
  }

  async extractDetailedVideoData(page, videoElement) {
    try {
      const data = await page.evaluate((video) => {
        // Find the video container
        const container = video.closest('div[data-e2e*="recommend"]') || video.parentElement;

        // Extract username
        const usernameEl = container?.querySelector('a[data-e2e*="video-author"]');
        const username = usernameEl?.textContent?.trim() || 'unknown';

        // Extract caption
        const captionEl = container?.querySelector('div[data-e2e*="video-desc"]');
        const caption = captionEl?.textContent?.trim() || '';

        // Extract hashtags
        const hashtags = Array.from(container?.querySelectorAll('a[href*="/tag/"]') || [])
          .map(el => el.textContent.trim());

        // Extract metrics
        const likeEl = container?.querySelector('strong[data-e2e*="like-count"]');
        const likes = likeEl?.textContent?.trim() || '0';

        return {
          username,
          caption,
          hashtags,
          likes,
          mediaType: 'video',
          timestamp: new Date().toISOString(),
          contentId: `tt_${username}_${Date.now()}`
        };
      }, videoElement);

      return data;
    } catch (error) {
      return null;
    }
  }

  logTrendingContent(platform, content) {
    const platformIcon = platform === 'Instagram' ? '📱' : '🎵';
    const time = new Date().toLocaleTimeString();
    
    console.log(`${platformIcon} [${time}] @${content.username}`);
    console.log(`   💬 "${content.caption?.substring(0, 80) || 'No caption'}${content.caption?.length > 80 ? '...' : ''}"`);
    console.log(`   💯 ${content.likes} likes | #️⃣ ${content.hashtags?.length || 0} hashtags`);
    console.log(`   🏷️ Tags: ${content.hashtags?.slice(0, 3).join(' ') || 'none'}`);
    console.log('   ─────────────────────────────────────────────────────');
  }

  detectTrendingContent(content) {
    // Simple trending detection algorithm
    const likesNum = this.parseNumber(content.likes);
    const hasViralHashtags = content.hashtags?.some(tag => 
      ['viral', 'trending', 'fyp', 'foryou', 'blowup'].includes(tag.toLowerCase().replace('#', ''))
    );
    const hasAIContent = content.caption?.toLowerCase().includes('ai') || 
                        content.hashtags?.some(tag => tag.toLowerCase().includes('ai'));
    
    // Trending if: high engagement OR viral hashtags OR AI-related
    return likesNum > 10000 || hasViralHashtags || hasAIContent;
  }

  parseNumber(str) {
    if (!str) return 0;
    const numStr = str.replace(/[^\d.kmb]/gi, '');
    const multiplier = str.toLowerCase().includes('k') ? 1000 : 
                     str.toLowerCase().includes('m') ? 1000000 : 1;
    return parseFloat(numStr) * multiplier || 0;
  }

  async saveTrendData(platform, content, isTrending) {
    try {
      // Save impression data
      const impressionData = {
        sessionId: require('uuid').v4(),
        platform: platform,
        contentId: content.contentId,
        contentType: content.mediaType,
        creatorUsername: content.username,
        viewDurationMs: 3000 + Math.random() * 2000,
        caption: content.caption,
        hashtags: content.hashtags,
        engagementMetrics: {
          likes: this.parseNumber(content.likes),
          isTrending: isTrending
        }
      };

      await this.dataLogger.saveImpression(impressionData);

      // If trending, create an alert
      if (isTrending) {
        await this.dataLogger.createAlert({
          alertType: 'trending_content',
          severity: 'medium',
          alertData: {
            platform: platform,
            creator: content.username,
            content: content.caption?.substring(0, 100),
            metrics: impressionData.engagementMetrics
          }
        });
      }

    } catch (error) {
      console.log(`⚠️ Failed to save data: ${error.message}`);
    }
  }

  async runBothPlatforms(duration = 300000) {
    console.log('🚀 Starting Dual Platform Tech-Savvy Bot System');
    console.log('🎯 Target: Tech trends, AI content, viral patterns');
    console.log('📊 Logging: Real-time to Supabase + console');
    console.log('⏱️ Duration:', duration / 1000 / 60, 'minutes\n');

    this.isRunning = true;

    // Run both platforms concurrently
    const promises = [
      this.runInstagramBot(duration),
      this.runTikTokBot(duration)
    ];

    await Promise.all(promises);

    console.log('🏁 Both platforms completed! Check your dashboard for trend data.');
  }

  stop() {
    this.isRunning = false;
    console.log('🛑 Stopping all bots...');
  }
}

// Main execution
async function main() {
  const runner = new TechSavvyBotRunner();
  
  try {
    await runner.initialize();
    
    // Run for 5 minutes on both platforms
    await runner.runBothPlatforms(5 * 60 * 1000);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    runner.stop();
    process.exit(0);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received interrupt signal, shutting down gracefully...');
  process.exit(0);
});

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = TechSavvyBotRunner;