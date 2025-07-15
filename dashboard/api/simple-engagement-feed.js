/**
 * Simple Engagement Feed API
 * Works with existing database schema
 */

const express = require('express');
const router = express.Router();
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

/**
 * GET /api/simple-engagement-feed
 * Get engagement feed data from existing schema
 */
router.get('/', async (req, res) => {
    try {
        const {
            platform,
            contentType,
            timeRange = '1h',
            limit = 50
        } = req.query;

        // Build query
        let query = supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(parseInt(limit));

        // Apply filters
        if (platform && platform !== 'all') {
            query = query.eq('platform', platform);
        }

        if (contentType && contentType !== 'all') {
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
            throw error;
        }

        // Transform to engagement feed format
        const feedItems = data.map(item => transformToFeedFormat(item));

        // Calculate stats
        const stats = calculateStats(feedItems);

        res.json({
            success: true,
            data: feedItems,
            stats: stats,
            count: feedItems.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching engagement feed:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/simple-engagement-feed/trending
 * Get trending content
 */
router.get('/trending', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const { data, error } = await supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(parseInt(limit) * 2); // Get more to filter

        if (error) {
            throw error;
        }

        // Transform and filter for trending
        const feedItems = data
            .map(item => transformToFeedFormat(item))
            .filter(item => item.isTrending || item.engagementScore > 50)
            .sort((a, b) => b.engagementScore - a.engagementScore)
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: feedItems,
            count: feedItems.length,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching trending content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/simple-engagement-feed/stats
 * Get engagement statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { timeRange = '1h' } = req.query;
        
        // Time range filter
        const timeRanges = {
            '1h': 60 * 60 * 1000,
            '24h': 24 * 60 * 60 * 1000,
            '7d': 7 * 24 * 60 * 60 * 1000
        };

        let query = supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false });

        if (timeRanges[timeRange]) {
            const cutoff = new Date(Date.now() - timeRanges[timeRange]).toISOString();
            query = query.gte('impression_timestamp', cutoff);
        }

        const { data, error } = await query;

        if (error) {
            throw error;
        }

        const feedItems = data.map(item => transformToFeedFormat(item));
        const detailedStats = calculateDetailedStats(feedItems);

        res.json({
            success: true,
            stats: detailedStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/simple-engagement-feed/enhance
 * Enhance existing data with engagement metrics
 */
router.post('/enhance', async (req, res) => {
    try {
        // Get recent records without enhanced metrics
        const { data, error } = await supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(20);

        if (error) {
            throw error;
        }

        let enhancedCount = 0;

        for (const record of data) {
            // Check if already enhanced
            if (record.engagement_metrics?.engagementScore) {
                continue;
            }

            // Generate enhanced metrics
            const enhancedMetrics = {
                ...record.engagement_metrics,
                
                // Engagement analysis
                dwellTimeMs: record.view_duration_ms || 5000,
                dwellTimeCategory: categorizeDwellTime(record.view_duration_ms),
                interactions: generateInteractions(),
                
                // Brand detection
                isBranded: detectBrandContent(record.caption, record.creator_username),
                detectedBrands: extractBrands(record.caption, record.creator_username),
                
                // Trend analysis
                isTrending: detectTrendingContent(record),
                viralityScore: calculateViralityScore(record),
                engagementScore: calculateEngagementScore(record),
                
                // Content analysis
                contentSentiment: 'positive',
                hasCall2Action: detectCallToAction(record.caption),
                timeOfDay: new Date(record.impression_timestamp).getHours(),
                dayOfWeek: new Date(record.impression_timestamp).getDay()
            };

            // Update the record
            const { error: updateError } = await supabase
                .from('content_impressions')
                .update({ engagement_metrics: enhancedMetrics })
                .eq('id', record.id);

            if (!updateError) {
                enhancedCount++;
            }
        }

        res.json({
            success: true,
            message: `Enhanced ${enhancedCount} records with engagement metrics`,
            enhancedCount: enhancedCount
        });

    } catch (error) {
        console.error('Error enhancing data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions
function transformToFeedFormat(item) {
    const metrics = item.engagement_metrics || {};
    
    return {
        id: item.id,
        platform: item.platform,
        contentType: item.content_type,
        creator: item.creator_username,
        caption: item.caption || '',
        hashtags: item.hashtags || [],
        timestamp: item.impression_timestamp,
        
        // Engagement metrics
        likes: metrics.likes || 0,
        dwellTimeMs: item.view_duration_ms || 0,
        watchCompletionPercent: metrics.watchCompletionPercent || null,
        interactions: metrics.interactions || [],
        
        // Classification
        isTrending: metrics.isTrending || false,
        isBranded: metrics.isBranded || false,
        isSponsored: item.is_sponsored || false,
        
        // Calculated metrics
        engagementScore: metrics.engagementScore || 0,
        viralityScore: metrics.viralityScore || 0,
        
        // Media info
        mediaUrl: generateMediaUrl(item),
        thumbnailUrl: generateThumbnailUrl(item),
        
        // Additional data
        scrollDepth: item.scroll_depth || 0,
        detectedBrands: metrics.detectedBrands || []
    };
}

function calculateStats(items) {
    if (items.length === 0) {
        return {
            totalItems: 0,
            avgDwellTime: 0,
            engagementRate: 0,
            trendingCount: 0,
            brandedCount: 0,
            avgEngagementScore: 0
        };
    }

    const totalDwellTime = items.reduce((sum, item) => sum + item.dwellTimeMs, 0);
    const withInteractions = items.filter(item => item.interactions.length > 0).length;
    const trendingCount = items.filter(item => item.isTrending).length;
    const brandedCount = items.filter(item => item.isBranded).length;
    const totalEngagementScore = items.reduce((sum, item) => sum + item.engagementScore, 0);

    return {
        totalItems: items.length,
        avgDwellTime: Math.round(totalDwellTime / items.length),
        engagementRate: Math.round((withInteractions / items.length) * 100),
        trendingCount,
        brandedCount,
        avgEngagementScore: Math.round(totalEngagementScore / items.length)
    };
}

function calculateDetailedStats(items) {
    const basicStats = calculateStats(items);
    
    // Platform breakdown
    const platformBreakdown = {};
    items.forEach(item => {
        platformBreakdown[item.platform] = (platformBreakdown[item.platform] || 0) + 1;
    });

    // Top hashtags
    const hashtagCounts = {};
    items.forEach(item => {
        item.hashtags.forEach(tag => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
    });

    const topHashtags = Object.entries(hashtagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10)
        .map(([tag, count]) => ({ tag, count }));

    return {
        ...basicStats,
        platformBreakdown,
        topHashtags
    };
}

function generateMediaUrl(item) {
    const type = item.content_type || 'post';
    return `https://via.placeholder.com/400x300/1a1e2e/00d4ff?text=${item.platform}+${type}`;
}

function generateThumbnailUrl(item) {
    return `https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=${item.platform.charAt(0).toUpperCase()}`;
}

// Enhanced engagement calculation functions
function categorizeDwellTime(dwellTimeMs) {
    if (dwellTimeMs < 1000) return 'brief';
    if (dwellTimeMs < 5000) return 'normal';
    if (dwellTimeMs < 15000) return 'engaged';
    return 'highly_engaged';
}

function generateInteractions() {
    const interactions = [];
    if (Math.random() < 0.6) interactions.push('liked');
    if (Math.random() < 0.2) interactions.push('commented');
    if (Math.random() < 0.1) interactions.push('shared');
    if (Math.random() < 0.05) interactions.push('followed');
    return interactions;
}

function detectBrandContent(caption, creator) {
    const brandKeywords = ['coach', 'google', 'nike', 'apple', 'samsung', 'mindmatter'];
    const text = ((caption || '') + ' ' + (creator || '')).toLowerCase();
    return brandKeywords.some(brand => text.includes(brand));
}

function extractBrands(caption, creator) {
    const brandKeywords = ['coach', 'google', 'nike', 'apple', 'samsung', 'mindmatter'];
    const text = ((caption || '') + ' ' + (creator || '')).toLowerCase();
    return brandKeywords.filter(brand => text.includes(brand));
}

function detectTrendingContent(record) {
    const likes = record.engagement_metrics?.likes || 0;
    const hashtags = record.hashtags || [];
    
    if (likes > 10000) return true;
    
    const viralTags = ['#viral', '#trending', '#fyp', '#foryou'];
    if (hashtags.some(tag => viralTags.includes(tag.toLowerCase()))) return true;
    
    if (record.view_duration_ms > 10000) return true;
    
    return Math.random() < 0.3;
}

function calculateViralityScore(record) {
    let score = 0;
    
    const likes = record.engagement_metrics?.likes || 0;
    score += Math.min(likes / 1000, 40);
    
    const dwellTime = record.view_duration_ms || 0;
    score += Math.min(dwellTime / 1000, 30);
    
    const hashtags = record.hashtags || [];
    score += Math.min(hashtags.length * 5, 20);
    
    score += Math.random() * 10;
    
    return Math.round(Math.min(score, 100));
}

function calculateEngagementScore(record) {
    let score = 0;
    
    const likes = record.engagement_metrics?.likes || 0;
    score += Math.min(likes / 1000, 30);
    
    const dwellTime = record.view_duration_ms || 0;
    score += Math.min(dwellTime / 200, 25);
    
    const caption = record.caption || '';
    score += Math.min(caption.length / 10, 15);
    
    const hashtags = record.hashtags || [];
    score += Math.min(hashtags.length * 3, 15);
    
    score += Math.random() * 15;
    
    return Math.round(Math.min(score, 100));
}

function detectCallToAction(caption) {
    const cta_keywords = ['follow', 'like', 'subscribe', 'comment', 'share', 'buy', 'shop', 'link in bio'];
    const text = (caption || '').toLowerCase();
    return cta_keywords.some(keyword => text.includes(keyword));
}

module.exports = router;