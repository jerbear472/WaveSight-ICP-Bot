/**
 * Engagement Tracker
 * Enhanced data logging with detailed engagement metrics for the feed viewer
 */

const SupabaseLogger = require('./supabase-logger');

class EngagementTracker extends SupabaseLogger {
    constructor() {
        super();
        this.brandKeywords = [
            'nike', 'adidas', 'apple', 'samsung', 'coca-cola', 'pepsi', 
            'amazon', 'google', 'meta', 'facebook', 'instagram', 'tiktok',
            'microsoft', 'tesla', 'netflix', 'spotify', 'uber', 'airbnb',
            'mindmatter', 'coach', 'gucci', 'prada', 'louis vuitton'
        ];
    }

    /**
     * Enhanced impression saving with engagement metrics
     */
    async saveImpressionWithEngagement(impressionData, engagementMetrics = {}) {
        try {
            // Calculate enhanced metrics
            const enhancedData = {
                ...impressionData,
                
                // Basic impression data
                session_id: impressionData.sessionId,
                platform: impressionData.platform,
                content_id: impressionData.contentId,
                content_type: impressionData.contentType || 'post',
                creator_username: impressionData.creatorUsername,
                creator_id: impressionData.creatorId || null,
                impression_timestamp: new Date().toISOString(),
                view_duration_ms: impressionData.viewDurationMs || 0,
                scroll_depth: impressionData.scrollDepth || 0,
                is_sponsored: impressionData.isSponsored || false,
                hashtags: impressionData.hashtags || [],
                caption: impressionData.caption || '',
                media_url: impressionData.mediaUrl || null,
                
                // Enhanced engagement metrics
                engagement_metrics: {
                    ...impressionData.engagementMetrics,
                    
                    // Dwell time analysis
                    dwellTimeMs: impressionData.viewDurationMs || 0,
                    dwellTimeCategory: this.categorizeDwellTime(impressionData.viewDurationMs),
                    
                    // Watch completion for videos
                    watchCompletionPercent: engagementMetrics.watchCompletionPercent || null,
                    
                    // Interaction detection
                    interactions: engagementMetrics.interactions || [],
                    interactionCount: (engagementMetrics.interactions || []).length,
                    
                    // Brand detection
                    isBranded: this.detectBrandContent(impressionData.caption, impressionData.creatorUsername),
                    detectedBrands: this.extractBrands(impressionData.caption, impressionData.creatorUsername),
                    
                    // Trend analysis
                    isTrending: this.detectTrendingContent(impressionData),
                    viralityScore: this.calculateViralityScore(impressionData),
                    
                    // Engagement score
                    engagementScore: this.calculateEngagementScore(impressionData, engagementMetrics),
                    
                    // Content analysis
                    contentSentiment: engagementMetrics.sentiment || 'neutral',
                    hasCall2Action: this.detectCallToAction(impressionData.caption),
                    
                    // Timing data
                    timeOfDay: new Date().getHours(),
                    dayOfWeek: new Date().getDay(),
                    
                    // Bot behavior metrics
                    scrollPattern: engagementMetrics.scrollPattern || 'normal',
                    mouseMovements: engagementMetrics.mouseMovements || 0,
                    pauseDuration: engagementMetrics.pauseDuration || 0
                }
            };

            // Save to database
            const { data, error } = await this.supabase
                .from('content_impressions')
                .insert(enhancedData)
                .select()
                .single();

            if (error) {
                this.logger.error('Failed to save enhanced impression', { error: error.message });
                throw error;
            }

            this.logger.info('Enhanced impression saved', { 
                id: data.id,
                platform: impressionData.platform,
                creator: impressionData.creatorUsername,
                engagementScore: enhancedData.engagement_metrics.engagementScore
            });

            // Create alerts for high-engagement content
            if (enhancedData.engagement_metrics.engagementScore > 80) {
                await this.createHighEngagementAlert(data);
            }

            // Create brand alerts
            if (enhancedData.engagement_metrics.isBranded) {
                await this.createBrandAlert(data);
            }

            return data;

        } catch (error) {
            this.logger.error('Error saving enhanced impression', { error: error.message });
            throw error;
        }
    }

    /**
     * Log detailed interaction events
     */
    async logInteraction(impressionId, interactionType, interactionData = {}) {
        try {
            const interaction = {
                impression_id: impressionId,
                event_type: interactionType,
                event_timestamp: new Date().toISOString(),
                event_data: {
                    ...interactionData,
                    
                    // Enhanced interaction data
                    interactionStrength: this.getInteractionStrength(interactionType),
                    timeFromView: interactionData.timeFromView || 0,
                    elementClicked: interactionData.elementClicked || null,
                    scrollPosition: interactionData.scrollPosition || 0,
                    
                    // Mouse/touch data
                    clickPosition: interactionData.clickPosition || null,
                    movementPattern: interactionData.movementPattern || 'normal',
                    
                    // Context data
                    previousAction: interactionData.previousAction || null,
                    sessionContext: interactionData.sessionContext || {}
                },
                dwell_time_ms: interactionData.dwellTime || 0
            };

            const { data, error } = await this.supabase
                .from('engagement_events')
                .insert(interaction)
                .select()
                .single();

            if (error) {
                this.logger.error('Failed to save interaction', { error: error.message });
                throw error;
            }

            this.logger.info('Interaction logged', {
                type: interactionType,
                impressionId: impressionId,
                strength: interaction.event_data.interactionStrength
            });

            return data;

        } catch (error) {
            this.logger.error('Error logging interaction', { error: error.message });
            throw error;
        }
    }

    /**
     * Get recent engagement data for the feed viewer
     */
    async getEngagementFeedData(filters = {}) {
        try {
            const {
                platform = null,
                contentType = null,
                timeRange = '1h',
                limit = 50,
                branded = null,
                trending = null
            } = filters;

            let query = this.supabase
                .from('content_impressions')
                .select(`
                    *,
                    engagement_events(*)
                `)
                .order('impression_timestamp', { ascending: false })
                .limit(limit);

            // Apply filters
            if (platform) {
                query = query.eq('platform', platform);
            }

            if (contentType) {
                query = query.eq('content_type', contentType);
            }

            // Time range filter
            const timeRanges = {
                '5m': 5 * 60 * 1000,
                '1h': 60 * 60 * 1000,
                '24h': 24 * 60 * 60 * 1000,
                '7d': 7 * 24 * 60 * 60 * 1000
            };

            if (timeRanges[timeRange]) {
                const cutoff = new Date(Date.now() - timeRanges[timeRange]).toISOString();
                query = query.gte('impression_timestamp', cutoff);
            }

            const { data, error } = await query;

            if (error) {
                this.logger.error('Failed to get engagement feed data', { error: error.message });
                throw error;
            }

            // Process and enhance the data
            const processedData = data.map(item => this.processEngagementItem(item));

            // Apply additional filters
            let filteredData = processedData;

            if (branded !== null) {
                filteredData = filteredData.filter(item => 
                    item.engagement_metrics?.isBranded === branded
                );
            }

            if (trending !== null) {
                filteredData = filteredData.filter(item => 
                    item.engagement_metrics?.isTrending === trending
                );
            }

            this.logger.info('Retrieved engagement feed data', {
                totalItems: filteredData.length,
                filters: filters
            });

            return filteredData;

        } catch (error) {
            this.logger.error('Error getting engagement feed data', { error: error.message });
            throw error;
        }
    }

    /**
     * Process engagement item for feed display
     */
    processEngagementItem(item) {
        const interactions = (item.engagement_events || []).map(event => event.event_type);
        
        return {
            id: item.id,
            platform: item.platform,
            contentType: item.content_type,
            creator: item.creator_username,
            caption: item.caption || '',
            hashtags: item.hashtags || [],
            timestamp: item.impression_timestamp,
            
            // Engagement metrics
            likes: item.engagement_metrics?.likes || 0,
            dwellTimeMs: item.view_duration_ms || 0,
            watchCompletionPercent: item.engagement_metrics?.watchCompletionPercent || null,
            interactions: interactions,
            
            // Classification
            isTrending: item.engagement_metrics?.isTrending || false,
            isBranded: item.engagement_metrics?.isBranded || false,
            isSponsored: item.is_sponsored || false,
            
            // Calculated metrics
            engagementScore: item.engagement_metrics?.engagementScore || 0,
            viralityScore: item.engagement_metrics?.viralityScore || 0,
            
            // Media info
            mediaUrl: item.media_url,
            thumbnailUrl: this.generateThumbnailUrl(item),
            
            // Additional data
            scrollDepth: item.scroll_depth || 0,
            detectedBrands: item.engagement_metrics?.detectedBrands || []
        };
    }

    // Helper methods
    categorizeDwellTime(dwellTimeMs) {
        if (dwellTimeMs < 1000) return 'brief';
        if (dwellTimeMs < 5000) return 'normal';
        if (dwellTimeMs < 15000) return 'engaged';
        return 'highly_engaged';
    }

    detectBrandContent(caption, creator) {
        const text = ((caption || '') + ' ' + (creator || '')).toLowerCase();
        return this.brandKeywords.some(brand => text.includes(brand));
    }

    extractBrands(caption, creator) {
        const text = ((caption || '') + ' ' + (creator || '')).toLowerCase();
        return this.brandKeywords.filter(brand => text.includes(brand));
    }

    detectTrendingContent(impressionData) {
        const likes = impressionData.engagementMetrics?.likes || 0;
        const hashtags = impressionData.hashtags || [];
        
        // High engagement threshold
        if (likes > 10000) return true;
        
        // Viral hashtags
        const viralTags = ['#viral', '#trending', '#fyp', '#foryou', '#blowup'];
        if (hashtags.some(tag => viralTags.includes(tag.toLowerCase()))) return true;
        
        // High dwell time
        if (impressionData.viewDurationMs > 10000) return true;
        
        return false;
    }

    calculateViralityScore(impressionData) {
        let score = 0;
        
        // Likes contribution (0-40 points)
        const likes = impressionData.engagementMetrics?.likes || 0;
        score += Math.min(likes / 1000, 40);
        
        // Dwell time contribution (0-30 points)
        const dwellTime = impressionData.viewDurationMs || 0;
        score += Math.min(dwellTime / 1000, 30);
        
        // Hashtag contribution (0-20 points)
        const hashtags = impressionData.hashtags || [];
        score += Math.min(hashtags.length * 2, 20);
        
        // Sponsored penalty (-10 points)
        if (impressionData.isSponsored) score -= 10;
        
        return Math.max(0, Math.round(score));
    }

    calculateEngagementScore(impressionData, engagementMetrics) {
        let score = 0;
        
        // Base engagement from likes
        const likes = impressionData.engagementMetrics?.likes || 0;
        score += Math.min(likes / 1000, 30);
        
        // Dwell time score
        const dwellTime = impressionData.viewDurationMs || 0;
        score += Math.min(dwellTime / 500, 25);
        
        // Interaction score
        const interactions = engagementMetrics.interactions || [];
        score += interactions.length * 10;
        
        // Watch completion bonus (videos)
        if (engagementMetrics.watchCompletionPercent) {
            score += engagementMetrics.watchCompletionPercent / 4;
        }
        
        // Trending bonus
        if (this.detectTrendingContent(impressionData)) {
            score += 15;
        }
        
        return Math.round(Math.min(score, 100));
    }

    detectCallToAction(caption) {
        const cta_keywords = [
            'follow', 'like', 'subscribe', 'comment', 'share', 'buy', 'shop',
            'click', 'visit', 'check out', 'link in bio', 'swipe up', 'dm'
        ];
        
        const text = (caption || '').toLowerCase();
        return cta_keywords.some(keyword => text.includes(keyword));
    }

    getInteractionStrength(interactionType) {
        const strengths = {
            'view': 1,
            'like': 3,
            'comment': 5,
            'share': 7,
            'follow': 10,
            'save': 6,
            'click': 4
        };
        
        return strengths[interactionType] || 1;
    }

    generateThumbnailUrl(item) {
        // In production, generate actual thumbnails
        return `https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=${item.platform.charAt(0).toUpperCase()}`;
    }

    async createHighEngagementAlert(impressionData) {
        return this.createAlert({
            alertType: 'high_engagement',
            severity: 'medium',
            alertData: {
                platform: impressionData.platform,
                creator: impressionData.creator_username,
                content: impressionData.caption?.substring(0, 100),
                engagementScore: impressionData.engagement_metrics?.engagementScore,
                reason: 'High engagement score detected'
            }
        });
    }

    async createBrandAlert(impressionData) {
        return this.createAlert({
            alertType: 'brand_mention',
            severity: 'low',
            alertData: {
                platform: impressionData.platform,
                creator: impressionData.creator_username,
                content: impressionData.caption?.substring(0, 100),
                detectedBrands: impressionData.engagement_metrics?.detectedBrands,
                reason: 'Brand content detected'
            }
        });
    }
}

module.exports = EngagementTracker;