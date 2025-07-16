/**
 * Trend Detection Engine
 * Identifies viral patterns and emerging trends from normalized data
 */

class TrendDetectionEngine {
  constructor() {
    this.viralThresholds = {
      engagementRate: 5, // 5% engagement rate
      growthRate: 100, // 100% growth in 24 hours
      crossPlatformMentions: 1000, // Mentioned 1000+ times across platforms
      creatorReach: 10000 // Creator has 10k+ followers
    };

    this.trendCategories = {
      fashion: ['fashion', 'style', 'outfit', 'wear', 'clothes', 'aesthetic'],
      food: ['recipe', 'food', 'cooking', 'baking', 'meal', 'dish'],
      lifestyle: ['life', 'routine', 'morning', 'night', 'day', 'habit'],
      tech: ['tech', 'gadget', 'app', 'software', 'device', 'digital'],
      fitness: ['workout', 'exercise', 'gym', 'fitness', 'health', 'wellness'],
      entertainment: ['movie', 'show', 'music', 'game', 'celebrity', 'drama']
    };

    this.emergingTrends = new Map();
    this.confirmedTrends = new Map();
  }

  /**
   * Analyze content batch for trends
   */
  analyzeTrends(normalizedDataBatch) {
    const trendCandidates = [];
    
    // Group by hashtags and keywords
    const hashtagGroups = this.groupByHashtags(normalizedDataBatch);
    const keywordGroups = this.extractKeywordGroups(normalizedDataBatch);
    
    // Analyze each group for trend potential
    hashtagGroups.forEach((contents, hashtag) => {
      const trendScore = this.calculateTrendScore(contents);
      if (trendScore.isViral || trendScore.isPotentiallyViral) {
        trendCandidates.push({
          type: 'hashtag',
          identifier: hashtag,
          score: trendScore,
          contents: contents,
          metrics: this.aggregateMetrics(contents)
        });
      }
    });

    keywordGroups.forEach((contents, keyword) => {
      const trendScore = this.calculateTrendScore(contents);
      if (trendScore.isViral || trendScore.isPotentiallyViral) {
        trendCandidates.push({
          type: 'keyword',
          identifier: keyword,
          score: trendScore,
          contents: contents,
          metrics: this.aggregateMetrics(contents)
        });
      }
    });

    // Detect cross-platform trends
    const crossPlatformTrends = this.detectCrossPlatformTrends(normalizedDataBatch);
    
    return {
      candidates: trendCandidates,
      crossPlatform: crossPlatformTrends,
      summary: this.generateTrendSummary(trendCandidates)
    };
  }

  /**
   * Group content by hashtags
   */
  groupByHashtags(data) {
    const groups = new Map();
    
    data.forEach(content => {
      content.content.hashtags.forEach(hashtag => {
        if (!groups.has(hashtag)) {
          groups.set(hashtag, []);
        }
        groups.get(hashtag).push(content);
      });
    });
    
    return groups;
  }

  /**
   * Extract and group by keywords
   */
  extractKeywordGroups(data) {
    const groups = new Map();
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);
    
    data.forEach(content => {
      const text = content.content.caption.toLowerCase();
      const words = text.split(/\s+/)
        .filter(word => word.length > 3 && !stopWords.has(word));
      
      words.forEach(word => {
        if (!groups.has(word)) {
          groups.set(word, []);
        }
        groups.get(word).push(content);
      });
    });
    
    // Filter to only significant groups
    const significantGroups = new Map();
    groups.forEach((contents, keyword) => {
      if (contents.length >= 5) { // At least 5 mentions
        significantGroups.set(keyword, contents);
      }
    });
    
    return significantGroups;
  }

  /**
   * Calculate trend score for a group of content
   */
  calculateTrendScore(contents) {
    const metrics = this.aggregateMetrics(contents);
    const timeSpan = this.calculateTimeSpan(contents);
    const growthRate = this.calculateGrowthRate(contents);
    
    const score = {
      viralScore: 0,
      engagementRate: metrics.avgEngagementRate,
      growthRate: growthRate,
      reach: metrics.totalReach,
      velocity: metrics.totalEngagement / timeSpan,
      creatorDiversity: this.calculateCreatorDiversity(contents),
      isViral: false,
      isPotentiallyViral: false,
      phase: 'dormant'
    };
    
    // Calculate viral score (0-100)
    score.viralScore = Math.min(
      (score.engagementRate / this.viralThresholds.engagementRate) * 25 +
      (score.growthRate / this.viralThresholds.growthRate) * 25 +
      (score.reach / 1000000) * 25 + // 1M reach benchmark
      (score.creatorDiversity / 100) * 25, // 100 unique creators benchmark
      100
    );
    
    // Determine viral status
    score.isViral = score.viralScore >= 80;
    score.isPotentiallyViral = score.viralScore >= 60 && score.viralScore < 80;
    
    // Determine phase
    if (score.isViral) {
      score.phase = 'viral';
    } else if (score.growthRate > 200) {
      score.phase = 'emerging';
    } else if (score.growthRate > 50) {
      score.phase = 'rising';
    } else if (score.growthRate < -20) {
      score.phase = 'declining';
    } else if (score.reach > 100000) {
      score.phase = 'peak';
    }
    
    return score;
  }

  /**
   * Aggregate metrics from content group
   */
  aggregateMetrics(contents) {
    const totalReach = contents.reduce((sum, c) => sum + c.metrics.impressions, 0);
    const totalEngagement = contents.reduce((sum, c) => 
      sum + c.metrics.likes + c.metrics.comments + c.metrics.shares + c.metrics.saves, 0);
    const avgEngagementRate = (totalEngagement / totalReach) * 100;
    
    return {
      totalReach,
      totalEngagement,
      avgEngagementRate,
      contentCount: contents.length,
      platformBreakdown: this.getPlatformBreakdown(contents)
    };
  }

  /**
   * Calculate time span of content group
   */
  calculateTimeSpan(contents) {
    const timestamps = contents.map(c => new Date(c.timestamp).getTime());
    const minTime = Math.min(...timestamps);
    const maxTime = Math.max(...timestamps);
    return (maxTime - minTime) / (1000 * 60 * 60); // Hours
  }

  /**
   * Calculate growth rate
   */
  calculateGrowthRate(contents) {
    // Sort by timestamp
    const sorted = contents.sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    if (sorted.length < 2) return 0;
    
    // Compare first half with second half
    const midpoint = Math.floor(sorted.length / 2);
    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);
    
    const firstMetrics = this.aggregateMetrics(firstHalf);
    const secondMetrics = this.aggregateMetrics(secondHalf);
    
    const growthRate = ((secondMetrics.avgEngagementRate - firstMetrics.avgEngagementRate) / 
      firstMetrics.avgEngagementRate) * 100;
    
    return growthRate;
  }

  /**
   * Calculate creator diversity
   */
  calculateCreatorDiversity(contents) {
    const uniqueCreators = new Set(contents.map(c => c.creator.username));
    return uniqueCreators.size;
  }

  /**
   * Get platform breakdown
   */
  getPlatformBreakdown(contents) {
    const breakdown = {};
    contents.forEach(content => {
      breakdown[content.platform] = (breakdown[content.platform] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Detect cross-platform trends
   */
  detectCrossPlatformTrends(data) {
    const crossPlatformMap = new Map();
    
    // Group by similar content across platforms
    data.forEach(content => {
      const key = this.generateContentKey(content);
      if (!crossPlatformMap.has(key)) {
        crossPlatformMap.set(key, {
          platforms: new Set(),
          contents: []
        });
      }
      
      const group = crossPlatformMap.get(key);
      group.platforms.add(content.platform);
      group.contents.push(content);
    });
    
    // Filter to only cross-platform content
    const crossPlatformTrends = [];
    crossPlatformMap.forEach((group, key) => {
      if (group.platforms.size > 1) {
        const trendScore = this.calculateTrendScore(group.contents);
        crossPlatformTrends.push({
          key,
          platforms: Array.from(group.platforms),
          score: trendScore,
          metrics: this.aggregateMetrics(group.contents)
        });
      }
    });
    
    return crossPlatformTrends.sort((a, b) => b.score.viralScore - a.score.viralScore);
  }

  /**
   * Generate content key for matching
   */
  generateContentKey(content) {
    // Simple key based on hashtags and keywords
    const hashtags = content.content.hashtags.sort().join('-');
    const keywords = this.extractKeywords(content.content.caption).slice(0, 3).join('-');
    return `${hashtags}-${keywords}`;
  }

  /**
   * Extract keywords from text
   */
  extractKeywords(text) {
    const words = text.toLowerCase().split(/\s+/)
      .filter(word => word.length > 4)
      .sort((a, b) => b.length - a.length);
    return words.slice(0, 5);
  }

  /**
   * Generate trend summary
   */
  generateTrendSummary(candidates) {
    const summary = {
      totalCandidates: candidates.length,
      viralTrends: candidates.filter(c => c.score.isViral).length,
      emergingTrends: candidates.filter(c => c.score.phase === 'emerging').length,
      topTrends: candidates
        .sort((a, b) => b.score.viralScore - a.score.viralScore)
        .slice(0, 10)
        .map(c => ({
          identifier: c.identifier,
          type: c.type,
          viralScore: Math.round(c.score.viralScore),
          reach: c.metrics.totalReach,
          phase: c.score.phase
        })),
      categoryBreakdown: this.categorzieTrends(candidates)
    };
    
    return summary;
  }

  /**
   * Categorize trends
   */
  categorzieTrends(candidates) {
    const categorized = {};
    
    candidates.forEach(candidate => {
      const category = this.detectCategory(candidate.identifier);
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(candidate.identifier);
    });
    
    return categorized;
  }

  /**
   * Detect category for a trend
   */
  detectCategory(identifier) {
    const lowerIdentifier = identifier.toLowerCase();
    
    for (const [category, keywords] of Object.entries(this.trendCategories)) {
      if (keywords.some(keyword => lowerIdentifier.includes(keyword))) {
        return category;
      }
    }
    
    return 'other';
  }

  /**
   * Track trend over time
   */
  trackTrend(trendIdentifier, metrics) {
    if (!this.emergingTrends.has(trendIdentifier)) {
      this.emergingTrends.set(trendIdentifier, {
        firstSeen: new Date(),
        history: [],
        currentPhase: 'emerging'
      });
    }
    
    const trend = this.emergingTrends.get(trendIdentifier);
    trend.history.push({
      timestamp: new Date(),
      metrics: metrics
    });
    
    // Move to confirmed if consistently viral
    if (trend.history.length > 5 && 
        trend.history.slice(-3).every(h => h.metrics.viralScore > 80)) {
      this.confirmedTrends.set(trendIdentifier, trend);
      this.emergingTrends.delete(trendIdentifier);
    }
  }

  /**
   * Get trend predictions
   */
  getTrendPredictions() {
    const predictions = [];
    
    this.emergingTrends.forEach((trend, identifier) => {
      if (trend.history.length >= 3) {
        const prediction = this.predictTrendTrajectory(trend.history);
        predictions.push({
          identifier,
          prediction,
          confidence: prediction.confidence,
          estimatedPeakTime: prediction.peakTime
        });
      }
    });
    
    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Predict trend trajectory
   */
  predictTrendTrajectory(history) {
    // Simple linear regression on viral scores
    const scores = history.map(h => h.metrics.viralScore);
    const timestamps = history.map(h => h.timestamp.getTime());
    
    const n = scores.length;
    const sumX = timestamps.reduce((a, b) => a + b, 0);
    const sumY = scores.reduce((a, b) => a + b, 0);
    const sumXY = timestamps.reduce((sum, x, i) => sum + x * scores[i], 0);
    const sumX2 = timestamps.reduce((sum, x) => sum + x * x, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Predict future
    const futureTime = Date.now() + (24 * 60 * 60 * 1000); // 24 hours from now
    const predictedScore = slope * futureTime + intercept;
    
    return {
      currentTrajectory: slope > 0 ? 'rising' : 'declining',
      predictedScore24h: Math.max(0, Math.min(100, predictedScore)),
      confidence: this.calculatePredictionConfidence(history),
      peakTime: slope > 0 ? new Date(futureTime + (48 * 60 * 60 * 1000)) : null
    };
  }

  /**
   * Calculate prediction confidence
   */
  calculatePredictionConfidence(history) {
    // Based on consistency of growth
    const scores = history.map(h => h.metrics.viralScore);
    const differences = [];
    
    for (let i = 1; i < scores.length; i++) {
      differences.push(scores[i] - scores[i - 1]);
    }
    
    const avgDiff = differences.reduce((a, b) => a + b, 0) / differences.length;
    const variance = differences.reduce((sum, diff) => 
      sum + Math.pow(diff - avgDiff, 2), 0) / differences.length;
    
    // Lower variance = higher confidence
    const confidence = Math.max(0, 100 - (variance * 10));
    return Math.round(confidence);
  }
}

module.exports = TrendDetectionEngine;