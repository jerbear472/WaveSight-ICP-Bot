/**
 * Data Normalization Pipeline for Bot-Collected Content
 * Standardizes data from different platforms into unified schema
 */

class DataNormalizer {
  constructor() {
    this.schema = require('../schemas/unified-trend-schema.json');
    this.trendPatterns = {
      normcore: ['normcore', 'normal', 'basic', 'simple', 'minimal', 'everyday'],
      homesteading: ['homestead', 'farm', 'self-sufficient', 'rural', 'sustainable', 'diy', 'offgrid'],
      antiPastaSalad: ['anti pasta', 'antipasta', 'salad', 'viral recipe', 'food trend'],
      bugatti: ['bugatti', 'luxury car', 'supercar', 'millionaire', 'wealth', 'success']
    };
  }

  /**
   * Normalize raw platform data into unified schema
   */
  normalizeContent(rawData, platform) {
    const normalizer = platform === 'tiktok' ? this.normalizeTikTok : this.normalizeInstagram;
    return normalizer.call(this, rawData);
  }

  /**
   * Normalize TikTok data
   */
  normalizeTikTok(rawData) {
    const normalized = {
      contentId: `tiktok_${rawData.id}`,
      platform: 'tiktok',
      timestamp: new Date(rawData.createTime * 1000).toISOString(),
      metrics: {
        impressions: rawData.stats.playCount || 0,
        likes: rawData.stats.diggCount || 0,
        comments: rawData.stats.commentCount || 0,
        shares: rawData.stats.shareCount || 0,
        saves: rawData.stats.collectCount || 0,
        engagementScore: this.calculateEngagementScore(rawData.stats),
        engagementVelocity: this.calculateVelocity(rawData)
      },
      content: {
        type: 'video',
        caption: rawData.desc || '',
        hashtags: this.extractHashtags(rawData.desc),
        mentions: this.extractMentions(rawData.desc),
        soundId: rawData.music?.id || null,
        duration: rawData.video?.duration || 0
      },
      creator: {
        username: rawData.author.uniqueId,
        followerCount: rawData.authorStats?.followerCount || 0,
        verifiedStatus: rawData.author.verified || false,
        creatorCategory: this.categorizeCreator(rawData.authorStats?.followerCount)
      },
      trendIndicators: this.analyzeTrends(rawData),
      geographic: {
        primaryRegion: rawData.locationCreated || 'unknown',
        topCountries: [] // Would need additional API calls
      },
      audience: this.estimateAudience(rawData),
      brandOpportunities: this.identifyBrandOpportunities(rawData)
    };

    return normalized;
  }

  /**
   * Normalize Instagram data
   */
  normalizeInstagram(rawData) {
    const normalized = {
      contentId: `instagram_${rawData.id}`,
      platform: 'instagram',
      timestamp: new Date(rawData.taken_at * 1000).toISOString(),
      metrics: {
        impressions: rawData.view_count || rawData.play_count || 0,
        likes: rawData.like_count || 0,
        comments: rawData.comment_count || 0,
        shares: rawData.share_count || 0,
        saves: rawData.save_count || 0,
        engagementScore: this.calculateEngagementScore({
          playCount: rawData.view_count || rawData.play_count,
          diggCount: rawData.like_count,
          commentCount: rawData.comment_count,
          shareCount: rawData.share_count,
          collectCount: rawData.save_count
        }),
        engagementVelocity: this.calculateVelocity(rawData)
      },
      content: {
        type: this.getInstagramContentType(rawData),
        caption: rawData.caption?.text || '',
        hashtags: this.extractHashtags(rawData.caption?.text),
        mentions: this.extractMentions(rawData.caption?.text),
        soundId: rawData.clips_metadata?.music_info?.music_asset_info?.audio_asset_id || null,
        duration: rawData.video_duration || 0
      },
      creator: {
        username: rawData.user.username,
        followerCount: rawData.user.follower_count || 0,
        verifiedStatus: rawData.user.is_verified || false,
        creatorCategory: this.categorizeCreator(rawData.user.follower_count)
      },
      trendIndicators: this.analyzeTrends(rawData),
      geographic: {
        primaryRegion: rawData.location?.name || 'unknown',
        topCountries: []
      },
      audience: this.estimateAudience(rawData),
      brandOpportunities: this.identifyBrandOpportunities(rawData)
    };

    return normalized;
  }

  /**
   * Calculate normalized engagement score
   */
  calculateEngagementScore(stats) {
    const impressions = stats.playCount || 1; // Avoid division by zero
    const engagementRaw = 
      (stats.diggCount || 0) * 1 +
      (stats.commentCount || 0) * 2 +
      (stats.shareCount || 0) * 3 +
      (stats.collectCount || 0) * 2.5;
    
    return Math.min((engagementRaw / impressions) * 1000, 1000);
  }

  /**
   * Calculate engagement velocity (growth rate per hour)
   */
  calculateVelocity(data) {
    const ageInHours = (Date.now() - new Date(data.createTime * 1000)) / (1000 * 60 * 60);
    const totalEngagement = 
      (data.stats?.diggCount || 0) + 
      (data.stats?.commentCount || 0) + 
      (data.stats?.shareCount || 0);
    
    return ageInHours > 0 ? totalEngagement / ageInHours : 0;
  }

  /**
   * Extract hashtags from text
   */
  extractHashtags(text) {
    if (!text) return [];
    const hashtags = text.match(/#\w+/g) || [];
    return hashtags.map(tag => tag.toLowerCase());
  }

  /**
   * Extract mentions from text
   */
  extractMentions(text) {
    if (!text) return [];
    const mentions = text.match(/@\w+/g) || [];
    return mentions.map(mention => mention.substring(1));
  }

  /**
   * Categorize creator by follower count
   */
  categorizeCreator(followerCount) {
    if (followerCount < 10000) return 'micro';
    if (followerCount < 100000) return 'mid-tier';
    if (followerCount < 1000000) return 'macro';
    return 'mega';
  }

  /**
   * Analyze content for trend indicators
   */
  analyzeTrends(data) {
    const text = (data.desc || data.caption?.text || '').toLowerCase();
    const hashtags = this.extractHashtags(text);
    const detectedTrends = [];

    // Check for known trend patterns
    for (const [trend, keywords] of Object.entries(this.trendPatterns)) {
      if (keywords.some(keyword => text.includes(keyword) || 
          hashtags.some(tag => tag.includes(keyword)))) {
        detectedTrends.push(trend);
      }
    }

    // Calculate viral score
    const engagement = data.stats || {};
    const viralScore = this.calculateViralScore(engagement, data);

    // Determine growth phase
    const growthPhase = this.determineGrowthPhase(data);

    return {
      viralScore,
      trendCategory: detectedTrends,
      growthPhase,
      crossPlatformReach: false // Would need multi-platform data
    };
  }

  /**
   * Calculate viral potential score (0-100)
   */
  calculateViralScore(stats, data) {
    const engagementRate = this.calculateEngagementScore(stats);
    const velocity = this.calculateVelocity(data);
    const creatorBoost = data.authorStats?.followerCount > 100000 ? 1.2 : 1;
    
    const score = Math.min(
      (engagementRate / 10 + velocity / 100) * creatorBoost,
      100
    );
    
    return Math.round(score);
  }

  /**
   * Determine current growth phase
   */
  determineGrowthPhase(data) {
    const velocity = this.calculateVelocity(data);
    const ageInHours = (Date.now() - new Date(data.createTime * 1000)) / (1000 * 60 * 60);
    
    if (ageInHours < 6 && velocity > 1000) return 'emerging';
    if (ageInHours < 24 && velocity > 500) return 'rising';
    if (ageInHours < 72 && velocity > 100) return 'peak';
    return 'declining';
  }

  /**
   * Estimate audience demographics
   */
  estimateAudience(data) {
    // This would typically use platform-specific audience insights
    // For now, using general estimates based on content type
    const hashtags = this.extractHashtags(data.desc || data.caption?.text || '');
    
    let primaryDemo = 'gen-z';
    if (hashtags.some(tag => tag.includes('millennial') || tag.includes('90s'))) {
      primaryDemo = 'millennial';
    }
    
    return {
      primaryDemographic: primaryDemo,
      estimatedAge: {
        '13-17': 0.15,
        '18-24': 0.45,
        '25-34': 0.25,
        '35-44': 0.10,
        '45+': 0.05
      }
    };
  }

  /**
   * Identify brand opportunities
   */
  identifyBrandOpportunities(data) {
    const text = (data.desc || data.caption?.text || '').toLowerCase();
    const brandMentions = this.extractBrandMentions(text);
    const isSponsored = text.includes('#ad') || text.includes('#sponsored');
    
    const marketingPotential = this.assessMarketingPotential(data);
    
    return {
      brandMentions,
      sponsoredContent: isSponsored,
      marketingPotential
    };
  }

  /**
   * Extract brand mentions from text
   */
  extractBrandMentions(text) {
    // Simple brand detection - would expand with comprehensive brand list
    const commonBrands = ['nike', 'adidas', 'apple', 'samsung', 'coca cola', 'pepsi', 'mcdonalds', 'starbucks'];
    return commonBrands.filter(brand => text.includes(brand));
  }

  /**
   * Assess marketing potential
   */
  assessMarketingPotential(data) {
    const viralScore = this.calculateViralScore(data.stats || {}, data);
    
    if (viralScore > 80) return 'viral';
    if (viralScore > 60) return 'high';
    if (viralScore > 30) return 'medium';
    return 'low';
  }

  /**
   * Get Instagram content type
   */
  getInstagramContentType(data) {
    if (data.media_type === 1) return 'image';
    if (data.media_type === 2) return 'video';
    if (data.media_type === 8) return 'carousel';
    if (data.product_type === 'clips') return 'reel';
    if (data.product_type === 'story') return 'story';
    return 'unknown';
  }

  /**
   * Batch normalize multiple content items
   */
  normalizeBatch(items, platform) {
    return items.map(item => {
      try {
        return this.normalizeContent(item, platform);
      } catch (error) {
        console.error(`Error normalizing item ${item.id}:`, error);
        return null;
      }
    }).filter(item => item !== null);
  }

  /**
   * Validate normalized data against schema
   */
  validateData(normalizedData) {
    // Simple validation - would expand with JSON schema validation
    const requiredFields = ['contentId', 'platform', 'timestamp', 'metrics', 'content', 'creator'];
    return requiredFields.every(field => normalizedData.hasOwnProperty(field));
  }
}

module.exports = DataNormalizer;