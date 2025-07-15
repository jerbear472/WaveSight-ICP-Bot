/**
 * Trend Analytics Processor
 * Advanced analytics engine for processing ICP bot data into actionable insights
 */

const winston = require('winston');
const moment = require('moment');
const _ = require('lodash');
const SupabaseLogger = require('../data-logger/supabase-logger');

class TrendProcessor {
  constructor() {
    this.dataLogger = new SupabaseLogger();
    this.isInitialized = false;

    // Analytics configuration
    this.config = {
      viralityThreshold: 75,
      trendingThreshold: 50,
      breakoutCreatorThreshold: 1000,
      anomalyDetectionSensitivity: 2, // Standard deviations
      forecastingWindow: 24, // Hours
      minDataPoints: 10
    };

    // Set up logger
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
      defaultMeta: { service: 'trend-processor' },
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ 
          filename: 'logs/trend-processor.log' 
        })
      ]
    });

    // Cached data for performance
    this.cache = {
      hourlyMetrics: new Map(),
      creatorProfiles: new Map(),
      trendingHashtags: new Map(),
      lastUpdate: null
    };
  }

  /**
   * Initialize analytics processor
   */
  async initialize() {
    try {
      await this.dataLogger.initialize();
      this.isInitialized = true;
      this.logger.info('Trend processor initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize trend processor', { error: error.message });
      throw error;
    }
  }

  /**
   * Process all trending data and generate insights
   */
  async processAllTrends() {
    try {
      this.logger.info('Starting comprehensive trend analysis...');

      const results = await Promise.all([
        this.detectViralContent(),
        this.identifyBreakoutCreators(),
        this.analyzeHashtagTrends(),
        this.performAnomalyDetection(),
        this.generateContentForecasts(),
        this.analyzeICPBehaviorPatterns(),
        this.detectCompetitorActivity()
      ]);

      const analysis = {
        timestamp: new Date().toISOString(),
        viralContent: results[0],
        breakoutCreators: results[1],
        hashtagTrends: results[2],
        anomalies: results[3],
        forecasts: results[4],
        icpInsights: results[5],
        competitorActivity: results[6]
      };

      this.logger.info('Trend analysis completed', {
        viralContent: analysis.viralContent.length,
        breakoutCreators: analysis.breakoutCreators.length,
        trendingHashtags: analysis.hashtagTrends.length,
        anomalies: analysis.anomalies.length
      });

      return analysis;
    } catch (error) {
      this.logger.error('Failed to process trends', { error: error.message });
      throw error;
    }
  }

  /**
   * Detect viral content based on engagement patterns
   */
  async detectViralContent(timeRange = '24h') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select(`
          *,
          engagement_events(event_type, event_timestamp)
        `)
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .order('impression_timestamp', { ascending: false });

      if (error) throw error;

      const viralContent = impressions
        .map(impression => this.calculateViralityMetrics(impression))
        .filter(content => content.viralityScore >= this.config.viralityThreshold)
        .sort((a, b) => b.viralityScore - a.viralityScore)
        .slice(0, 20);

      // Categorize viral content
      const categorized = this.categorizeViralContent(viralContent);

      this.logger.info('Viral content detected', { count: viralContent.length });
      return categorized;
    } catch (error) {
      this.logger.error('Failed to detect viral content', { error: error.message });
      return [];
    }
  }

  /**
   * Calculate comprehensive virality metrics
   */
  calculateViralityMetrics(impression) {
    const metrics = impression.engagement_metrics || {};
    const engagements = impression.engagement_events || [];
    
    // Base metrics
    const likes = metrics.likes || 0;
    const comments = metrics.comments || 0;
    const shares = metrics.shares || 0;
    const views = metrics.views || 1;
    
    // Calculate engagement rate
    const engagementRate = (likes + comments + shares) / Math.max(views, 1);
    
    // Calculate velocity (engagements per hour)
    const contentAge = moment().diff(moment(impression.impression_timestamp), 'hours');
    const velocity = (likes + comments + shares) / Math.max(contentAge, 1);
    
    // Calculate our ICP engagement
    const icpEngagementRate = engagements.length > 0 ? 1 : 0;
    const icpEngagementTypes = _.uniq(engagements.map(e => e.event_type)).length;
    
    // Calculate virality score
    const viralityScore = this.calculateViralityScore({
      engagementRate,
      velocity,
      icpEngagementRate,
      icpEngagementTypes,
      likes,
      shares,
      viewDuration: impression.view_duration_ms
    });

    return {
      contentId: impression.content_id,
      platform: impression.platform,
      creator: impression.creator_username,
      caption: impression.caption,
      hashtags: impression.hashtags,
      timestamp: impression.impression_timestamp,
      metrics: {
        likes,
        comments,
        shares,
        views,
        engagementRate,
        velocity,
        icpEngagementRate,
        viewDuration: impression.view_duration_ms
      },
      viralityScore,
      isSponsored: impression.is_sponsored
    };
  }

  /**
   * Calculate virality score using weighted formula
   */
  calculateViralityScore(params) {
    const {
      engagementRate,
      velocity,
      icpEngagementRate,
      icpEngagementTypes,
      likes,
      shares,
      viewDuration
    } = params;

    let score = 0;
    
    // Engagement rate component (0-40 points)
    score += Math.min(engagementRate * 1000, 40);
    
    // Velocity component (0-30 points)
    score += Math.min(velocity / 100, 30);
    
    // ICP engagement component (0-20 points)
    score += icpEngagementRate * 15;
    score += icpEngagementTypes * 2.5;
    
    // Scale factors (0-10 points)
    if (likes > 100000) score += 10;
    else if (likes > 10000) score += 7;
    else if (likes > 1000) score += 3;
    
    if (shares > 1000) score += 5;
    
    // View duration bonus
    if (viewDuration > 30000) score += 5; // 30+ seconds
    
    return Math.min(score, 100);
  }

  /**
   * Categorize viral content by type
   */
  categorizeViralContent(viralContent) {
    const categories = {
      organic: [],
      sponsored: [],
      entertainment: [],
      educational: [],
      trending: [],
      breakout: []
    };

    viralContent.forEach(content => {
      if (content.isSponsored) {
        categories.sponsored.push(content);
      } else {
        categories.organic.push(content);
      }

      // Categorize by hashtags
      const hashtags = content.hashtags || [];
      if (hashtags.some(tag => tag.includes('funny') || tag.includes('meme'))) {
        categories.entertainment.push(content);
      }
      if (hashtags.some(tag => tag.includes('learn') || tag.includes('howto'))) {
        categories.educational.push(content);
      }
      if (hashtags.some(tag => tag.includes('trend') || tag.includes('viral'))) {
        categories.trending.push(content);
      }
    });

    return categories;
  }

  /**
   * Identify breakout creators gaining momentum
   */
  async identifyBreakoutCreators(timeRange = '7d') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select(`
          creator_username,
          creator_id,
          platform,
          impression_timestamp,
          engagement_metrics,
          engagement_events(event_type)
        `)
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .not('creator_username', 'is', null);

      if (error) throw error;

      // Group by creator
      const creatorGroups = _.groupBy(impressions, 'creator_username');
      
      const breakoutCreators = [];

      for (const [creator, creatorImpressions] of Object.entries(creatorGroups)) {
        const analysis = this.analyzeCreatorMomentum(creator, creatorImpressions);
        
        if (analysis.isBreakout) {
          breakoutCreators.push(analysis);
        }
      }

      // Sort by growth momentum
      breakoutCreators.sort((a, b) => b.growthMomentum - a.growthMomentum);

      this.logger.info('Breakout creators identified', { count: breakoutCreators.length });
      return breakoutCreators.slice(0, 10);
    } catch (error) {
      this.logger.error('Failed to identify breakout creators', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze individual creator momentum
   */
  analyzeCreatorMomentum(creator, impressions) {
    const sortedImpressions = impressions.sort((a, b) => 
      new Date(a.impression_timestamp) - new Date(b.impression_timestamp)
    );

    const totalImpressions = impressions.length;
    const totalEngagements = impressions.reduce((sum, imp) => 
      sum + (imp.engagement_events?.length || 0), 0
    );

    // Calculate growth over time
    const timeWindows = this.createTimeWindows(sortedImpressions, 24); // 24-hour windows
    const growthRate = this.calculateGrowthRate(timeWindows);
    
    // Calculate engagement consistency
    const engagementConsistency = this.calculateEngagementConsistency(impressions);
    
    // Calculate reach momentum
    const reachMomentum = this.calculateReachMomentum(impressions);
    
    // Determine if breakout
    const isBreakout = (
      growthRate > 0.5 && // 50% growth
      totalImpressions >= this.config.breakoutCreatorThreshold &&
      engagementConsistency > 0.3 &&
      reachMomentum > 0.4
    );

    return {
      creator,
      platform: impressions[0].platform,
      totalImpressions,
      totalEngagements,
      engagementRate: totalEngagements / totalImpressions,
      growthRate,
      growthMomentum: growthRate * engagementConsistency * reachMomentum,
      engagementConsistency,
      reachMomentum,
      isBreakout,
      timeRange: {
        start: sortedImpressions[0].impression_timestamp,
        end: sortedImpressions[sortedImpressions.length - 1].impression_timestamp
      }
    };
  }

  /**
   * Create time windows for analysis
   */
  createTimeWindows(impressions, windowHours) {
    const windows = [];
    const startTime = moment(impressions[0].impression_timestamp);
    const endTime = moment(impressions[impressions.length - 1].impression_timestamp);
    
    let currentWindow = startTime.clone();
    
    while (currentWindow.isBefore(endTime)) {
      const windowEnd = currentWindow.clone().add(windowHours, 'hours');
      const windowImpressions = impressions.filter(imp => {
        const impTime = moment(imp.impression_timestamp);
        return impTime.isBetween(currentWindow, windowEnd);
      });
      
      if (windowImpressions.length > 0) {
        windows.push({
          start: currentWindow.toISOString(),
          end: windowEnd.toISOString(),
          impressions: windowImpressions.length,
          engagements: windowImpressions.reduce((sum, imp) => 
            sum + (imp.engagement_events?.length || 0), 0
          )
        });
      }
      
      currentWindow = windowEnd;
    }
    
    return windows;
  }

  /**
   * Calculate growth rate across time windows
   */
  calculateGrowthRate(windows) {
    if (windows.length < 2) return 0;
    
    const firstHalf = windows.slice(0, Math.ceil(windows.length / 2));
    const secondHalf = windows.slice(Math.floor(windows.length / 2));
    
    const firstHalfAvg = _.meanBy(firstHalf, 'impressions');
    const secondHalfAvg = _.meanBy(secondHalf, 'impressions');
    
    return secondHalfAvg > 0 ? (secondHalfAvg - firstHalfAvg) / firstHalfAvg : 0;
  }

  /**
   * Calculate engagement consistency
   */
  calculateEngagementConsistency(impressions) {
    const engagementRates = impressions.map(imp => 
      (imp.engagement_events?.length || 0) > 0 ? 1 : 0
    );
    
    const mean = _.mean(engagementRates);
    const variance = _.mean(engagementRates.map(rate => Math.pow(rate - mean, 2)));
    
    return 1 - variance; // Higher consistency = lower variance
  }

  /**
   * Calculate reach momentum based on ICP exposure
   */
  calculateReachMomentum(impressions) {
    const totalViewTime = impressions.reduce((sum, imp) => 
      sum + (imp.view_duration_ms || 0), 0
    );
    
    const avgViewTime = totalViewTime / impressions.length;
    const maxViewTime = Math.max(...impressions.map(imp => imp.view_duration_ms || 0));
    
    return avgViewTime / Math.max(maxViewTime, 1);
  }

  /**
   * Analyze hashtag trends
   */
  async analyzeHashtagTrends(timeRange = '24h') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select('hashtags, impression_timestamp, engagement_events(event_type)')
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .not('hashtags', 'is', null);

      if (error) throw error;

      // Extract all hashtags with timestamps
      const hashtagData = [];
      impressions.forEach(imp => {
        if (imp.hashtags) {
          imp.hashtags.forEach(tag => {
            hashtagData.push({
              hashtag: tag,
              timestamp: imp.impression_timestamp,
              engagements: imp.engagement_events?.length || 0
            });
          });
        }
      });

      // Group by hashtag
      const hashtagGroups = _.groupBy(hashtagData, 'hashtag');
      
      const trends = [];
      
      for (const [hashtag, data] of Object.entries(hashtagGroups)) {
        const trend = this.analyzeHashtagTrend(hashtag, data);
        if (trend.isSignificant) {
          trends.push(trend);
        }
      }

      // Sort by trending score
      trends.sort((a, b) => b.trendingScore - a.trendingScore);

      this.logger.info('Hashtag trends analyzed', { count: trends.length });
      return trends.slice(0, 50);
    } catch (error) {
      this.logger.error('Failed to analyze hashtag trends', { error: error.message });
      return [];
    }
  }

  /**
   * Analyze individual hashtag trend
   */
  analyzeHashtagTrend(hashtag, data) {
    const totalMentions = data.length;
    const totalEngagements = data.reduce((sum, d) => sum + d.engagements, 0);
    
    // Calculate momentum (mentions over time)
    const sortedData = data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const timeWindows = this.createHashtagTimeWindows(sortedData, 6); // 6-hour windows
    const momentum = this.calculateHashtagMomentum(timeWindows);
    
    // Calculate engagement rate
    const engagementRate = totalEngagements / totalMentions;
    
    // Calculate trending score
    const trendingScore = Math.min(
      (totalMentions / 10) * 20 + // Volume component
      momentum * 40 + // Momentum component
      engagementRate * 100 * 40, // Engagement component
      100
    );

    return {
      hashtag,
      totalMentions,
      totalEngagements,
      engagementRate,
      momentum,
      trendingScore,
      isSignificant: trendingScore >= this.config.trendingThreshold,
      timeRange: {
        start: sortedData[0].timestamp,
        end: sortedData[sortedData.length - 1].timestamp
      }
    };
  }

  /**
   * Create time windows for hashtag analysis
   */
  createHashtagTimeWindows(data, windowHours) {
    const windows = [];
    const startTime = moment(data[0].timestamp);
    const endTime = moment(data[data.length - 1].timestamp);
    
    let currentWindow = startTime.clone();
    
    while (currentWindow.isBefore(endTime)) {
      const windowEnd = currentWindow.clone().add(windowHours, 'hours');
      const windowData = data.filter(d => {
        const dataTime = moment(d.timestamp);
        return dataTime.isBetween(currentWindow, windowEnd);
      });
      
      if (windowData.length > 0) {
        windows.push({
          start: currentWindow.toISOString(),
          mentions: windowData.length,
          engagements: windowData.reduce((sum, d) => sum + d.engagements, 0)
        });
      }
      
      currentWindow = windowEnd;
    }
    
    return windows;
  }

  /**
   * Calculate hashtag momentum
   */
  calculateHashtagMomentum(windows) {
    if (windows.length < 2) return 0;
    
    const recentWindows = windows.slice(-3); // Last 3 windows
    const earlierWindows = windows.slice(0, -3);
    
    if (earlierWindows.length === 0) return 0;
    
    const recentAvg = _.meanBy(recentWindows, 'mentions');
    const earlierAvg = _.meanBy(earlierWindows, 'mentions');
    
    return earlierAvg > 0 ? (recentAvg - earlierAvg) / earlierAvg : 0;
  }

  /**
   * Perform anomaly detection on engagement patterns
   */
  async performAnomalyDetection(timeRange = '24h') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select(`
          *,
          engagement_events(event_type, event_timestamp)
        `)
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .order('impression_timestamp', { ascending: true });

      if (error) throw error;

      const anomalies = [];
      
      // Group by hour for time-series analysis
      const hourlyData = this.groupImpressionsByHour(impressions);
      
      // Detect engagement anomalies
      const engagementAnomalies = this.detectEngagementAnomalies(hourlyData);
      anomalies.push(...engagementAnomalies);
      
      // Detect content anomalies
      const contentAnomalies = this.detectContentAnomalies(impressions);
      anomalies.push(...contentAnomalies);
      
      // Detect creator anomalies
      const creatorAnomalies = this.detectCreatorAnomalies(impressions);
      anomalies.push(...creatorAnomalies);

      this.logger.info('Anomaly detection completed', { count: anomalies.length });
      return anomalies;
    } catch (error) {
      this.logger.error('Failed to perform anomaly detection', { error: error.message });
      return [];
    }
  }

  /**
   * Group impressions by hour
   */
  groupImpressionsByHour(impressions) {
    const hourlyGroups = _.groupBy(impressions, imp => 
      moment(imp.impression_timestamp).format('YYYY-MM-DD HH')
    );
    
    return Object.entries(hourlyGroups).map(([hour, hourImpressions]) => ({
      hour,
      timestamp: moment(hour, 'YYYY-MM-DD HH').toISOString(),
      impressions: hourImpressions.length,
      engagements: hourImpressions.reduce((sum, imp) => 
        sum + (imp.engagement_events?.length || 0), 0
      ),
      avgViewDuration: _.meanBy(hourImpressions, 'view_duration_ms'),
      uniqueCreators: _.uniqBy(hourImpressions, 'creator_username').length
    }));
  }

  /**
   * Detect engagement anomalies
   */
  detectEngagementAnomalies(hourlyData) {
    const anomalies = [];
    
    if (hourlyData.length < this.config.minDataPoints) return anomalies;
    
    // Calculate statistical thresholds
    const engagementRates = hourlyData.map(h => h.engagements / Math.max(h.impressions, 1));
    const mean = _.mean(engagementRates);
    const stdDev = Math.sqrt(_.mean(engagementRates.map(rate => Math.pow(rate - mean, 2))));
    
    const threshold = this.config.anomalyDetectionSensitivity * stdDev;
    
    hourlyData.forEach(hourData => {
      const engagementRate = hourData.engagements / Math.max(hourData.impressions, 1);
      const deviation = Math.abs(engagementRate - mean);
      
      if (deviation > threshold) {
        anomalies.push({
          type: 'engagement_anomaly',
          severity: deviation > threshold * 2 ? 'high' : 'medium',
          timestamp: hourData.timestamp,
          data: {
            hour: hourData.hour,
            engagementRate,
            normalRate: mean,
            deviation,
            description: engagementRate > mean + threshold 
              ? 'Unusually high engagement rate detected'
              : 'Unusually low engagement rate detected'
          }
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Detect content anomalies
   */
  detectContentAnomalies(impressions) {
    const anomalies = [];
    
    // Detect sudden spikes in sponsored content
    const sponsoredContent = impressions.filter(imp => imp.is_sponsored);
    const sponsoredRate = sponsoredContent.length / impressions.length;
    
    if (sponsoredRate > 0.3) { // More than 30% sponsored
      anomalies.push({
        type: 'content_anomaly',
        severity: 'medium',
        timestamp: new Date().toISOString(),
        data: {
          sponsoredRate,
          description: 'High sponsored content rate detected'
        }
      });
    }
    
    // Detect unusual hashtag patterns
    const allHashtags = impressions.flatMap(imp => imp.hashtags || []);
    const hashtagCounts = _.countBy(allHashtags);
    const topHashtags = Object.entries(hashtagCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    
    topHashtags.forEach(([hashtag, count]) => {
      if (count > impressions.length * 0.2) { // More than 20% of content
        anomalies.push({
          type: 'content_anomaly',
          severity: 'low',
          timestamp: new Date().toISOString(),
          data: {
            hashtag,
            frequency: count / impressions.length,
            description: `Unusual concentration of hashtag: ${hashtag}`
          }
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Detect creator anomalies
   */
  detectCreatorAnomalies(impressions) {
    const anomalies = [];
    
    // Group by creator
    const creatorGroups = _.groupBy(impressions, 'creator_username');
    
    Object.entries(creatorGroups).forEach(([creator, creatorImpressions]) => {
      const impressionCount = creatorImpressions.length;
      const totalImpressions = impressions.length;
      
      // Detect creator domination
      if (impressionCount > totalImpressions * 0.15) { // More than 15% of content
        anomalies.push({
          type: 'creator_anomaly',
          severity: 'medium',
          timestamp: new Date().toISOString(),
          data: {
            creator,
            dominance: impressionCount / totalImpressions,
            description: `Creator dominating feed: ${creator}`
          }
        });
      }
      
      // Detect unusual engagement patterns for creator
      const engagements = creatorImpressions.reduce((sum, imp) => 
        sum + (imp.engagement_events?.length || 0), 0
      );
      const engagementRate = engagements / impressionCount;
      
      if (engagementRate > 0.8) { // More than 80% engagement rate
        anomalies.push({
          type: 'creator_anomaly',
          severity: 'high',
          timestamp: new Date().toISOString(),
          data: {
            creator,
            engagementRate,
            description: `Unusually high engagement rate for creator: ${creator}`
          }
        });
      }
    });
    
    return anomalies;
  }

  /**
   * Generate content forecasts
   */
  async generateContentForecasts(timeRange = '7d') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select('*')
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .order('impression_timestamp', { ascending: true });

      if (error) throw error;

      const forecasts = [];
      
      // Forecast trending hashtags
      const hashtagForecast = this.forecastHashtagTrends(impressions);
      forecasts.push(...hashtagForecast);
      
      // Forecast creator momentum
      const creatorForecast = this.forecastCreatorMomentum(impressions);
      forecasts.push(...creatorForecast);
      
      // Forecast engagement patterns
      const engagementForecast = this.forecastEngagementPatterns(impressions);
      forecasts.push(...engagementForecast);

      this.logger.info('Content forecasts generated', { count: forecasts.length });
      return forecasts;
    } catch (error) {
      this.logger.error('Failed to generate content forecasts', { error: error.message });
      return [];
    }
  }

  /**
   * Forecast hashtag trends
   */
  forecastHashtagTrends(impressions) {
    const forecasts = [];
    
    // Group hashtags by day
    const dailyHashtags = this.groupHashtagsByDay(impressions);
    
    Object.entries(dailyHashtags).forEach(([hashtag, dailyData]) => {
      if (dailyData.length >= 3) { // Need at least 3 days
        const trend = this.calculateHashtagTrendLine(dailyData);
        
        if (trend.slope > 0.1) { // Positive trend
          forecasts.push({
            type: 'hashtag_forecast',
            hashtag,
            confidence: Math.min(trend.r2 * 100, 100),
            prediction: 'increasing',
            timeHorizon: '24h',
            currentMentions: dailyData[dailyData.length - 1].mentions,
            predictedMentions: Math.round(
              dailyData[dailyData.length - 1].mentions * (1 + trend.slope)
            ),
            trend
          });
        }
      }
    });
    
    return forecasts;
  }

  /**
   * Group hashtags by day
   */
  groupHashtagsByDay(impressions) {
    const hashtagsByDay = {};
    
    impressions.forEach(imp => {
      const day = moment(imp.impression_timestamp).format('YYYY-MM-DD');
      const hashtags = imp.hashtags || [];
      
      hashtags.forEach(hashtag => {
        if (!hashtagsByDay[hashtag]) {
          hashtagsByDay[hashtag] = {};
        }
        if (!hashtagsByDay[hashtag][day]) {
          hashtagsByDay[hashtag][day] = 0;
        }
        hashtagsByDay[hashtag][day]++;
      });
    });
    
    // Convert to array format
    const result = {};
    Object.entries(hashtagsByDay).forEach(([hashtag, days]) => {
      result[hashtag] = Object.entries(days)
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([day, mentions]) => ({ day, mentions }));
    });
    
    return result;
  }

  /**
   * Calculate trend line for hashtag data
   */
  calculateHashtagTrendLine(data) {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data.map(d => d.mentions);
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const r2 = 1 - (residualSumSquares / totalSumSquares);
    
    return { slope, intercept, r2 };
  }

  /**
   * Forecast creator momentum
   */
  forecastCreatorMomentum(impressions) {
    const forecasts = [];
    
    // Group by creator
    const creatorGroups = _.groupBy(impressions, 'creator_username');
    
    Object.entries(creatorGroups).forEach(([creator, creatorImpressions]) => {
      if (creatorImpressions.length >= 5) { // Need sufficient data
        const momentum = this.calculateCreatorMomentumForecast(creatorImpressions);
        
        if (momentum.isSignificant) {
          forecasts.push({
            type: 'creator_forecast',
            creator,
            platform: creatorImpressions[0].platform,
            confidence: momentum.confidence,
            prediction: momentum.trend,
            timeHorizon: '24h',
            currentEngagementRate: momentum.currentEngagementRate,
            predictedEngagementRate: momentum.predictedEngagementRate,
            momentum
          });
        }
      }
    });
    
    return forecasts;
  }

  /**
   * Calculate creator momentum forecast
   */
  calculateCreatorMomentumForecast(impressions) {
    const sortedImpressions = impressions.sort((a, b) => 
      new Date(a.impression_timestamp) - new Date(b.impression_timestamp)
    );
    
    // Group by day
    const dailyData = this.groupImpressionsByDay(sortedImpressions);
    
    if (dailyData.length < 3) {
      return { isSignificant: false };
    }
    
    // Calculate trend
    const engagementRates = dailyData.map(d => d.engagements / Math.max(d.impressions, 1));
    const trend = this.calculateTrendLine(engagementRates);
    
    const isSignificant = Math.abs(trend.slope) > 0.05 && trend.r2 > 0.5;
    
    return {
      isSignificant,
      confidence: trend.r2 * 100,
      trend: trend.slope > 0 ? 'increasing' : 'decreasing',
      currentEngagementRate: engagementRates[engagementRates.length - 1],
      predictedEngagementRate: Math.max(0, 
        engagementRates[engagementRates.length - 1] + trend.slope
      ),
      slope: trend.slope,
      r2: trend.r2
    };
  }

  /**
   * Group impressions by day
   */
  groupImpressionsByDay(impressions) {
    const dailyGroups = _.groupBy(impressions, imp => 
      moment(imp.impression_timestamp).format('YYYY-MM-DD')
    );
    
    return Object.entries(dailyGroups).map(([day, dayImpressions]) => ({
      day,
      impressions: dayImpressions.length,
      engagements: dayImpressions.reduce((sum, imp) => 
        sum + (imp.engagement_events?.length || 0), 0
      )
    }));
  }

  /**
   * Calculate trend line
   */
  calculateTrendLine(data) {
    const n = data.length;
    const x = data.map((_, i) => i);
    const y = data;
    
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumXX = x.reduce((sum, val) => sum + val * val, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Calculate R-squared
    const yMean = sumY / n;
    const totalSumSquares = y.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const residualSumSquares = y.reduce((sum, val, i) => {
      const predicted = slope * x[i] + intercept;
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const r2 = totalSumSquares > 0 ? 1 - (residualSumSquares / totalSumSquares) : 0;
    
    return { slope, intercept, r2 };
  }

  /**
   * Forecast engagement patterns
   */
  forecastEngagementPatterns(impressions) {
    const forecasts = [];
    
    // Group by hour of day
    const hourlyEngagement = this.groupEngagementByHour(impressions);
    
    // Find peak engagement hours
    const peakHours = this.findPeakEngagementHours(hourlyEngagement);
    
    forecasts.push({
      type: 'engagement_forecast',
      prediction: 'peak_hours',
      timeHorizon: '24h',
      peakHours,
      confidence: 80,
      recommendation: `Optimal posting times: ${peakHours.map(h => `${h}:00`).join(', ')}`
    });
    
    return forecasts;
  }

  /**
   * Group engagement by hour
   */
  groupEngagementByHour(impressions) {
    const hourlyGroups = _.groupBy(impressions, imp => 
      moment(imp.impression_timestamp).hour()
    );
    
    const hourlyData = {};
    
    for (let hour = 0; hour < 24; hour++) {
      const hourImpressions = hourlyGroups[hour] || [];
      hourlyData[hour] = {
        impressions: hourImpressions.length,
        engagements: hourImpressions.reduce((sum, imp) => 
          sum + (imp.engagement_events?.length || 0), 0
        )
      };
    }
    
    return hourlyData;
  }

  /**
   * Find peak engagement hours
   */
  findPeakEngagementHours(hourlyData) {
    const hours = Object.entries(hourlyData)
      .map(([hour, data]) => ({
        hour: parseInt(hour),
        engagementRate: data.engagements / Math.max(data.impressions, 1)
      }))
      .sort((a, b) => b.engagementRate - a.engagementRate);
    
    return hours.slice(0, 3).map(h => h.hour);
  }

  /**
   * Analyze ICP behavior patterns
   */
  async analyzeICPBehaviorPatterns(timeRange = '7d') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select(`
          *,
          engagement_events(event_type),
          bot_sessions!session_id(icp_profile_id)
        `)
        .gte('impression_timestamp', this.getTimeFilter(timeRange));

      if (error) throw error;

      const patterns = this.analyzeICPPatterns(impressions);
      
      this.logger.info('ICP behavior patterns analyzed', { 
        profiles: Object.keys(patterns).length 
      });
      
      return patterns;
    } catch (error) {
      this.logger.error('Failed to analyze ICP patterns', { error: error.message });
      return {};
    }
  }

  /**
   * Analyze ICP patterns
   */
  analyzeICPPatterns(impressions) {
    // Group by ICP profile
    const icpGroups = _.groupBy(impressions, imp => 
      imp.bot_sessions?.icp_profile_id
    );
    
    const patterns = {};
    
    Object.entries(icpGroups).forEach(([icpId, icpImpressions]) => {
      if (icpId && icpId !== 'null') {
        patterns[icpId] = {
          totalImpressions: icpImpressions.length,
          totalEngagements: icpImpressions.reduce((sum, imp) => 
            sum + (imp.engagement_events?.length || 0), 0
          ),
          avgViewDuration: _.meanBy(icpImpressions, 'view_duration_ms'),
          preferredPlatforms: this.getPreferredPlatforms(icpImpressions),
          contentPreferences: this.getContentPreferences(icpImpressions),
          engagementPatterns: this.getEngagementPatterns(icpImpressions),
          activeHours: this.getActiveHours(icpImpressions)
        };
      }
    });
    
    return patterns;
  }

  /**
   * Get preferred platforms for ICP
   */
  getPreferredPlatforms(impressions) {
    const platformGroups = _.groupBy(impressions, 'platform');
    
    return Object.entries(platformGroups)
      .map(([platform, platformImpressions]) => ({
        platform,
        impressions: platformImpressions.length,
        engagements: platformImpressions.reduce((sum, imp) => 
          sum + (imp.engagement_events?.length || 0), 0
        )
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Get content preferences
   */
  getContentPreferences(impressions) {
    const contentTypes = _.groupBy(impressions, 'content_type');
    
    return Object.entries(contentTypes)
      .map(([type, typeImpressions]) => ({
        type,
        impressions: typeImpressions.length,
        avgViewDuration: _.meanBy(typeImpressions, 'view_duration_ms')
      }))
      .sort((a, b) => b.impressions - a.impressions);
  }

  /**
   * Get engagement patterns
   */
  getEngagementPatterns(impressions) {
    const engagementTypes = {};
    
    impressions.forEach(imp => {
      if (imp.engagement_events) {
        imp.engagement_events.forEach(event => {
          engagementTypes[event.event_type] = (engagementTypes[event.event_type] || 0) + 1;
        });
      }
    });
    
    return Object.entries(engagementTypes)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get active hours
   */
  getActiveHours(impressions) {
    const hourlyActivity = {};
    
    impressions.forEach(imp => {
      const hour = moment(imp.impression_timestamp).hour();
      hourlyActivity[hour] = (hourlyActivity[hour] || 0) + 1;
    });
    
    return Object.entries(hourlyActivity)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Detect competitor activity
   */
  async detectCompetitorActivity(timeRange = '24h') {
    try {
      const { data: impressions, error } = await this.dataLogger.supabase
        .from('content_impressions')
        .select('*')
        .gte('impression_timestamp', this.getTimeFilter(timeRange))
        .eq('is_sponsored', true);

      if (error) throw error;

      const competitorActivity = this.analyzeCompetitorActivity(impressions);
      
      this.logger.info('Competitor activity analyzed', { 
        competitors: Object.keys(competitorActivity).length 
      });
      
      return competitorActivity;
    } catch (error) {
      this.logger.error('Failed to detect competitor activity', { error: error.message });
      return {};
    }
  }

  /**
   * Analyze competitor activity
   */
  analyzeCompetitorActivity(sponsoredImpressions) {
    const creatorGroups = _.groupBy(sponsoredImpressions, 'creator_username');
    
    const activity = {};
    
    Object.entries(creatorGroups).forEach(([creator, creatorImpressions]) => {
      activity[creator] = {
        adCount: creatorImpressions.length,
        platforms: _.uniq(creatorImpressions.map(imp => imp.platform)),
        totalEngagements: creatorImpressions.reduce((sum, imp) => 
          sum + (imp.engagement_events?.length || 0), 0
        ),
        avgViewDuration: _.meanBy(creatorImpressions, 'view_duration_ms'),
        hashtags: _.uniq(creatorImpressions.flatMap(imp => imp.hashtags || []))
      };
    });
    
    return activity;
  }

  /**
   * Utility function to get time filter
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
}

// Run processor if called directly
if (require.main === module) {
  const processor = new TrendProcessor();
  
  processor.initialize()
    .then(() => processor.processAllTrends())
    .then(results => {
      console.log('Trend analysis completed:', {
        viralContent: results.viralContent.length,
        breakoutCreators: results.breakoutCreators.length,
        anomalies: results.anomalies.length
      });
    })
    .catch(console.error);
}

module.exports = TrendProcessor;