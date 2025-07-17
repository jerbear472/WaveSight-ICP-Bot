/**
 * Supabase Data Logger
 * Handles all database operations for ICP bot data
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const winston = require('winston');

class SupabaseLogger {
  constructor() {
    this.supabase = null;
    this.isInitialized = false;

    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'data-logger' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/data-logger.log' 
        })
      ]
    });
  }

  /**
   * Initialize Supabase connection
   */
  async initialize() {
    try {
      const supabaseUrl = process.env.SUPABASE_URL;
      const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase credentials in environment variables');
      }

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          persistSession: false
        }
      });

      // Test connection
      const { error } = await this.supabase.from('icp_profiles').select('count');
      if (error && error.code !== 'PGRST116') { // Table doesn't exist is ok for now
        throw error;
      }

      this.isInitialized = true;
      this.logger.info('Supabase connection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Supabase', { error: error.message });
      throw error;
    }
  }

  /**
   * Save ICP Profile
   */
  async saveICPProfile(profile) {
    try {
      const { data, error } = await this.supabase
        .from('icp_profiles')
        .insert({
          profile_name: profile.profileName,
          age_range: profile.ageRange,
          gender: profile.gender,
          interests: profile.interests,
          device_type: profile.deviceType,
          region: profile.region,
          language: profile.language,
          income_bracket: profile.incomeBracket,
          behavior_patterns: profile.behaviorPatterns
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('ICP profile saved', { profileId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to save ICP profile', { error: error.message });
      throw error;
    }
  }

  /**
   * Get active ICP profiles
   */
  async getActiveICPProfiles() {
    try {
      const { data, error } = await this.supabase
        .from('icp_profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      this.logger.error('Failed to get ICP profiles', { error: error.message });
      return [];
    }
  }

  /**
   * Save bot session
   */
  async saveBotSession(sessionData) {
    try {
      const { data, error } = await this.supabase
        .from('bot_sessions')
        .insert({
          session_id: sessionData.id,
          platform: sessionData.platform,
          profile_type: sessionData.profileType || 'unknown',
          start_time: sessionData.startTime,
          end_time: sessionData.endTime,
          status: sessionData.status,
          duration_ms: sessionData.endTime ? (new Date(sessionData.endTime) - new Date(sessionData.startTime)) : null
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Bot session saved', { sessionId: data.id });
      return data;
    } catch (error) {
      this.logger.error('Failed to save bot session', { error: error.message });
      throw error;
    }
  }

  /**
   * Save content impression
   */
  async saveImpression(impression) {
    try {
      const { data, error } = await this.supabase
        .from('content_impressions')
        .insert({
          session_id: impression.sessionId,
          platform: impression.platform,
          content_id: impression.contentId,
          content_type: impression.contentType,
          creator_username: impression.creatorUsername,
          creator_id: impression.creatorId,
          view_duration_ms: impression.viewDurationMs,
          scroll_depth: impression.scrollDepth,
          is_sponsored: impression.isSponsored,
          hashtags: impression.hashtags,
          caption: impression.caption?.substring(0, 500), // Limit caption length
          engagement_metrics: impression.engagementMetrics
        })
        .select()
        .single();

      if (error) throw error;

      // Update creator profile
      await this.updateCreatorProfile({
        platform: impression.platform,
        creatorId: impression.creatorId || impression.creatorUsername,
        username: impression.creatorUsername,
        metrics: impression.engagementMetrics
      });

      return data;
    } catch (error) {
      this.logger.error('Failed to save impression', { error: error.message });
      throw error;
    }
  }

  /**
   * Save engagement event
   */
  async saveEngagement(engagement) {
    try {
      const { data, error } = await this.supabase
        .from('engagement_events')
        .insert({
          impression_id: engagement.impressionId,
          session_id: engagement.sessionId,
          event_type: engagement.eventType,
          event_data: engagement.eventData,
          dwell_time_ms: engagement.dwellTimeMs
        })
        .select()
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      this.logger.error('Failed to save engagement', { error: error.message });
      throw error;
    }
  }

  /**
   * Update or create creator profile
   */
  async updateCreatorProfile(creatorData) {
    try {
      const { platform, creatorId, username, metrics } = creatorData;

      // Check if creator exists
      const { data: existing } = await this.supabase
        .from('creator_profiles')
        .select('id, follower_count')
        .eq('platform', platform)
        .eq('creator_id', creatorId)
        .single();

      if (existing) {
        // Update existing
        await this.supabase
          .from('creator_profiles')
          .update({
            username: username,
            last_updated: new Date().toISOString()
          })
          .eq('id', existing.id);
      } else {
        // Insert new
        await this.supabase
          .from('creator_profiles')
          .insert({
            platform,
            creator_id: creatorId,
            username,
            follower_count: metrics?.followers || 0,
            profile_data: metrics
          });
      }
    } catch (error) {
      // Non-critical error, just log
      this.logger.warn('Failed to update creator profile', { error: error.message });
    }
  }

  /**
   * Save multiple impressions in batch
   */
  async saveImpressionsBatch(impressions) {
    try {
      const chunks = this.chunkArray(impressions, 100); // Supabase limit
      
      for (const chunk of chunks) {
        const { error } = await this.supabase
          .from('content_impressions')
          .insert(chunk);

        if (error) throw error;
      }

      this.logger.info(`Saved ${impressions.length} impressions in batch`);
    } catch (error) {
      this.logger.error('Failed to save impressions batch', { error: error.message });
      throw error;
    }
  }

  /**
   * Generate trend report
   */
  async generateTrendReport(options = {}) {
    const {
      timeRange = '24h',
      platform = null,
      icpProfileId = null
    } = options;

    try {
      const timeFilter = this.getTimeFilter(timeRange);
      
      // Get aggregated metrics
      let query = this.supabase
        .from('content_impressions')
        .select(`
          *,
          engagement_events(event_type)
        `)
        .gte('impression_timestamp', timeFilter);

      if (platform) {
        query = query.eq('platform', platform);
      }

      const { data: impressions, error } = await query;
      if (error) throw error;

      // Process data
      const report = {
        timeRange,
        totalImpressions: impressions.length,
        totalEngagements: impressions.reduce((sum, imp) => 
          sum + (imp.engagement_events?.length || 0), 0
        ),
        platforms: {},
        topCreators: [],
        trendingHashtags: [],
        viralContent: []
      };

      // Aggregate by platform
      const platformGroups = this.groupBy(impressions, 'platform');
      for (const [platform, platformImpressions] of Object.entries(platformGroups)) {
        report.platforms[platform] = {
          impressions: platformImpressions.length,
          engagements: platformImpressions.reduce((sum, imp) => 
            sum + (imp.engagement_events?.length || 0), 0
          ),
          avgViewDuration: this.average(platformImpressions.map(imp => imp.view_duration_ms))
        };
      }

      // Top creators
      const creatorGroups = this.groupBy(impressions, 'creator_username');
      report.topCreators = Object.entries(creatorGroups)
        .map(([creator, creatorImpressions]) => ({
          username: creator,
          impressions: creatorImpressions.length,
          engagements: creatorImpressions.reduce((sum, imp) => 
            sum + (imp.engagement_events?.length || 0), 0
          )
        }))
        .sort((a, b) => b.impressions - a.impressions)
        .slice(0, 20);

      // Trending hashtags
      const allHashtags = impressions.flatMap(imp => imp.hashtags || []);
      const hashtagCounts = this.countOccurrences(allHashtags);
      report.trendingHashtags = Object.entries(hashtagCounts)
        .map(([tag, count]) => ({ hashtag: tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 50);

      // Viral content detection
      report.viralContent = impressions
        .filter(imp => {
          const engagementRate = (imp.engagement_events?.length || 0) > 0 ? 1 : 0;
          const metrics = imp.engagement_metrics || {};
          return metrics.likes > 10000 || engagementRate > 0.5;
        })
        .map(imp => ({
          contentId: imp.content_id,
          platform: imp.platform,
          creator: imp.creator_username,
          caption: imp.caption,
          metrics: imp.engagement_metrics,
          viralityScore: this.calculateViralityScore(imp)
        }))
        .sort((a, b) => b.viralityScore - a.viralityScore)
        .slice(0, 10);

      return report;
    } catch (error) {
      this.logger.error('Failed to generate trend report', { error: error.message });
      throw error;
    }
  }

  /**
   * Calculate virality score for content
   */
  calculateViralityScore(impression) {
    const metrics = impression.engagement_metrics || {};
    const engagements = impression.engagement_events?.length || 0;
    
    let score = 0;
    
    // Engagement signals
    score += Math.min(metrics.likes / 1000, 50);
    score += Math.min(metrics.comments / 100, 30);
    score += Math.min(metrics.shares / 50, 20);
    
    // Our bot engagement
    score += engagements * 10;
    
    // View duration
    if (impression.view_duration_ms > 10000) {
      score += 10;
    }
    
    return Math.min(score, 100);
  }

  /**
   * Create alert
   */
  async createAlert(alertData) {
    try {
      const { data, error } = await this.supabase
        .from('alerts')
        .insert({
          alert_type: alertData.alertType,
          severity: alertData.severity,
          icp_profile_id: alertData.icpProfileId,
          campaign_id: alertData.campaignId,
          alert_data: alertData.alertData
        })
        .select()
        .single();

      if (error) throw error;

      this.logger.info('Alert created', { 
        alertId: data.id, 
        type: alertData.alertType 
      });
      
      return data;
    } catch (error) {
      this.logger.error('Failed to create alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Clean up old sessions
   */
  async cleanupOldSessions(retentionDays) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      const { error } = await this.supabase
        .from('bot_sessions')
        .delete()
        .lt('created_at', cutoffDate.toISOString());

      if (error) throw error;

      this.logger.info(`Cleaned up sessions older than ${retentionDays} days`);
    } catch (error) {
      this.logger.error('Failed to cleanup old sessions', { error: error.message });
    }
  }

  /**
   * Aggregate daily metrics
   */
  async aggregateDailyMetrics() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const today = new Date(yesterday);
      today.setDate(today.getDate() + 1);

      // Get all impressions for yesterday
      const { data: impressions, error } = await this.supabase
        .from('content_impressions')
        .select('*, engagement_events(event_type)')
        .gte('impression_timestamp', yesterday.toISOString())
        .lt('impression_timestamp', today.toISOString());

      if (error) throw error;

      // Group by hour and platform
      const hourlyMetrics = {};
      
      for (const impression of impressions) {
        const hour = new Date(impression.impression_timestamp).getHours();
        const key = `${impression.platform}_${hour}`;
        
        if (!hourlyMetrics[key]) {
          hourlyMetrics[key] = {
            platform: impression.platform,
            hour,
            impressions: 0,
            engagements: 0,
            totalDuration: 0
          };
        }
        
        hourlyMetrics[key].impressions++;
        hourlyMetrics[key].engagements += impression.engagement_events?.length || 0;
        hourlyMetrics[key].totalDuration += impression.view_duration_ms || 0;
      }

      // Save aggregated metrics
      for (const metrics of Object.values(hourlyMetrics)) {
        await this.supabase
          .from('trend_metrics')
          .insert({
            metric_date: yesterday.toISOString().split('T')[0],
            metric_hour: metrics.hour,
            platform: metrics.platform,
            total_impressions: metrics.impressions,
            total_engagements: metrics.engagements,
            avg_view_duration_ms: metrics.totalDuration / metrics.impressions
          });
      }

      this.logger.info('Daily metrics aggregated successfully');
    } catch (error) {
      this.logger.error('Failed to aggregate daily metrics', { error: error.message });
    }
  }

  /**
   * Utility functions
   */
  
  getTimeFilter(timeRange) {
    const now = new Date();
    const ranges = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };
    
    const ms = ranges[timeRange] || ranges['24h'];
    return new Date(now.getTime() - ms).toISOString();
  }

  groupBy(array, key) {
    return array.reduce((groups, item) => {
      const group = item[key] || 'unknown';
      groups[group] = groups[group] || [];
      groups[group].push(item);
      return groups;
    }, {});
  }

  countOccurrences(array) {
    return array.reduce((counts, item) => {
      counts[item] = (counts[item] || 0) + 1;
      return counts;
    }, {});
  }

  average(numbers) {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, n) => sum + (n || 0), 0) / numbers.length;
  }

  chunkArray(array, size) {
    const chunks = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

module.exports = SupabaseLogger;