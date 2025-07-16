/**
 * Supabase Client Configuration
 * Handles all database interactions for bot data
 */

// Initialize Supabase client
const SUPABASE_URL = 'https://achuavagkhjenaypawij.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFjaHVhdmFna2hqZW5heXBhd2lqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI1OTY0MjQsImV4cCI6MjA2ODE3MjQyNH0.L4J5SIVGZDYAFAwNuR9b_hIvcpTJWGfu0Dvry7Umg2g';

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class BotDataService {
    constructor() {
        this.supabase = supabaseClient;
    }

    /**
     * Save bot session data
     */
    async saveBotSession(sessionData) {
        try {
            const { data, error } = await this.supabase
                .from('bot_sessions')
                .insert({
                    session_id: sessionData.sessionId,
                    bot_type: sessionData.botType,
                    platform: sessionData.platform,
                    profile_type: sessionData.profileType,
                    start_time: sessionData.startTime,
                    end_time: sessionData.endTime,
                    content_viewed: sessionData.contentViewed,
                    engagements: sessionData.engagements,
                    trends_found: sessionData.trendsFound
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving bot session:', error);
            throw error;
        }
    }

    /**
     * Save content discovered by bot
     */
    async saveDiscoveredContent(contentData) {
        try {
            const { data, error } = await this.supabase
                .from('discovered_content')
                .insert({
                    content_id: contentData.id,
                    session_id: contentData.sessionId,
                    platform: contentData.platform,
                    content_type: contentData.contentType,
                    creator_username: contentData.creator,
                    creator_id: contentData.creatorId,
                    caption: contentData.caption,
                    hashtags: contentData.hashtags,
                    url: contentData.url,
                    thumbnail_url: contentData.thumbnailUrl,
                    views: contentData.views,
                    likes: contentData.likes,
                    comments: contentData.comments,
                    shares: contentData.shares,
                    saves: contentData.saves,
                    engagement_rate: contentData.engagementRate,
                    is_sponsored: contentData.isSponsored,
                    is_viral: contentData.isViral,
                    discovered_at: contentData.timestamp,
                    dwell_time: contentData.dwellTime,
                    bot_engaged: contentData.botEngaged,
                    bot_action: contentData.botAction
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving discovered content:', error);
            throw error;
        }
    }

    /**
     * Save bot interactions
     */
    async saveBotInteraction(interactionData) {
        try {
            const { data, error } = await this.supabase
                .from('bot_interactions')
                .insert({
                    session_id: interactionData.sessionId,
                    content_id: interactionData.contentId,
                    interaction_type: interactionData.type, // 'like', 'comment', 'share', 'follow', 'save'
                    interaction_time: interactionData.timestamp,
                    dwell_time_ms: interactionData.dwellTime
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving bot interaction:', error);
            throw error;
        }
    }

    /**
     * Save detected trends
     */
    async saveTrendDetection(trendData) {
        try {
            const { data, error } = await this.supabase
                .from('detected_trends')
                .insert({
                    trend_id: trendData.id,
                    session_id: trendData.sessionId,
                    trend_type: trendData.type, // 'hashtag', 'audio', 'effect', 'challenge'
                    trend_name: trendData.name,
                    platform: trendData.platform,
                    viral_score: trendData.viralScore,
                    reach: trendData.reach,
                    engagement_rate: trendData.engagementRate,
                    growth_rate: trendData.growthRate,
                    detected_at: trendData.timestamp,
                    related_content: trendData.relatedContent
                });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving trend detection:', error);
            throw error;
        }
    }

    /**
     * Get content by session
     */
    async getSessionContent(sessionId) {
        try {
            const { data, error } = await this.supabase
                .from('discovered_content')
                .select('*')
                .eq('session_id', sessionId)
                .order('discovered_at', { ascending: false });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching session content:', error);
            throw error;
        }
    }

    /**
     * Get trending content
     */
    async getTrendingContent(platform = null, timeRange = '24h') {
        try {
            let query = this.supabase
                .from('discovered_content')
                .select('*')
                .eq('is_viral', true);

            if (platform) {
                query = query.eq('platform', platform);
            }

            // Add time range filter
            const now = new Date();
            let startTime = new Date();
            
            switch(timeRange) {
                case '1h':
                    startTime.setHours(now.getHours() - 1);
                    break;
                case '24h':
                    startTime.setDate(now.getDate() - 1);
                    break;
                case '7d':
                    startTime.setDate(now.getDate() - 7);
                    break;
                case '30d':
                    startTime.setDate(now.getDate() - 30);
                    break;
            }

            const { data, error } = await query
                .gte('discovered_at', startTime.toISOString())
                .order('engagement_rate', { ascending: false })
                .limit(100);

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error fetching trending content:', error);
            throw error;
        }
    }

    /**
     * Real-time subscription to new content
     */
    subscribeToNewContent(callback) {
        const subscription = this.supabase
            .channel('discovered_content_changes')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'discovered_content' 
                }, 
                callback
            )
            .subscribe();

        return subscription;
    }

    /**
     * Get aggregated stats
     */
    async getAggregatedStats(platform = null, timeRange = '24h') {
        try {
            // This would typically be a stored procedure or view in Supabase
            // For now, we'll fetch and aggregate client-side
            const content = await this.getTrendingContent(platform, timeRange);
            
            const stats = {
                totalImpressions: content.reduce((sum, item) => sum + (item.views || 0), 0),
                totalEngagements: content.reduce((sum, item) => sum + (item.likes || 0) + (item.comments || 0) + (item.shares || 0), 0),
                avgEngagementRate: content.reduce((sum, item) => sum + (item.engagement_rate || 0), 0) / content.length,
                viralContent: content.filter(item => item.is_viral).length,
                totalContent: content.length
            };

            return stats;
        } catch (error) {
            console.error('Error fetching aggregated stats:', error);
            throw error;
        }
    }
}

// Export for use in other modules
window.BotDataService = BotDataService;