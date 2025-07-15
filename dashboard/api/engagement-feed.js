/**
 * Engagement Feed API
 * Serves live engagement data to the dashboard
 */

const express = require('express');
const router = express.Router();
const EngagementTracker = require('../../data-logger/engagement-tracker');

const engagementTracker = new EngagementTracker();

// Initialize the tracker
engagementTracker.initialize().catch(console.error);

/**
 * GET /api/engagement-feed
 * Get live engagement feed data with filters
 */
router.get('/', async (req, res) => {
    try {
        const {
            platform,
            contentType,
            timeRange = '1h',
            limit = 50,
            branded,
            trending,
            minEngagement
        } = req.query;

        const filters = {
            platform: platform !== 'all' ? platform : null,
            contentType: contentType !== 'all' ? contentType : null,
            timeRange,
            limit: parseInt(limit),
            branded: branded === 'true' ? true : branded === 'false' ? false : null,
            trending: trending === 'true' ? true : trending === 'false' ? false : null
        };

        let data = await engagementTracker.getEngagementFeedData(filters);

        // Apply minimum engagement filter
        if (minEngagement) {
            const minScore = parseInt(minEngagement);
            data = data.filter(item => item.engagementScore >= minScore);
        }

        // Calculate feed statistics
        const stats = calculateFeedStats(data);

        res.json({
            success: true,
            data: data,
            stats: stats,
            filters: filters,
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
 * GET /api/engagement-feed/stats
 * Get engagement statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { timeRange = '1h' } = req.query;
        
        const data = await engagementTracker.getEngagementFeedData({
            timeRange,
            limit: 1000
        });

        const stats = calculateDetailedStats(data);

        res.json({
            success: true,
            stats: stats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching engagement stats:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engagement-feed/trending
 * Get trending content
 */
router.get('/trending', async (req, res) => {
    try {
        const { timeRange = '1h', limit = 20 } = req.query;
        
        let data = await engagementTracker.getEngagementFeedData({
            timeRange,
            limit: parseInt(limit) * 2, // Get more to filter
            trending: true
        });

        // Sort by engagement score and virality
        data = data
            .filter(item => item.isTrending || item.engagementScore > 60)
            .sort((a, b) => (b.engagementScore + b.viralityScore) - (a.engagementScore + a.viralityScore))
            .slice(0, parseInt(limit));

        res.json({
            success: true,
            data: data,
            count: data.length,
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
 * GET /api/engagement-feed/brands
 * Get brand-related content
 */
router.get('/brands', async (req, res) => {
    try {
        const { timeRange = '24h', limit = 50 } = req.query;
        
        const data = await engagementTracker.getEngagementFeedData({
            timeRange,
            limit: parseInt(limit),
            branded: true
        });

        // Group by detected brands
        const brandGroups = {};
        data.forEach(item => {
            item.detectedBrands.forEach(brand => {
                if (!brandGroups[brand]) {
                    brandGroups[brand] = [];
                }
                brandGroups[brand].push(item);
            });
        });

        // Calculate brand engagement scores
        const brandStats = Object.entries(brandGroups).map(([brand, items]) => ({
            brand,
            count: items.length,
            avgEngagement: items.reduce((sum, item) => sum + item.engagementScore, 0) / items.length,
            totalLikes: items.reduce((sum, item) => sum + item.likes, 0),
            platforms: [...new Set(items.map(item => item.platform))],
            recentItems: items.slice(0, 5)
        })).sort((a, b) => b.avgEngagement - a.avgEngagement);

        res.json({
            success: true,
            data: data,
            brandStats: brandStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching brand content:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * GET /api/engagement-feed/interactions
 * Get interaction patterns
 */
router.get('/interactions', async (req, res) => {
    try {
        const { timeRange = '1h' } = req.query;
        
        const data = await engagementTracker.getEngagementFeedData({
            timeRange,
            limit: 1000
        });

        // Analyze interaction patterns
        const interactionStats = analyzeInteractionPatterns(data);

        res.json({
            success: true,
            stats: interactionStats,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Error fetching interaction data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * POST /api/engagement-feed/simulate
 * Simulate live engagement data for testing
 */
router.post('/simulate', async (req, res) => {
    try {
        const { count = 10 } = req.body;
        
        // Generate and save simulated engagement data
        const simulatedData = [];
        
        for (let i = 0; i < count; i++) {
            const mockItem = generateMockEngagementItem();
            
            // Save to database
            await engagementTracker.saveImpressionWithEngagement(mockItem, {
                interactions: mockItem.interactions || [],
                watchCompletionPercent: mockItem.watchCompletionPercent,
                sentiment: 'positive'
            });
            
            simulatedData.push(mockItem);
        }

        res.json({
            success: true,
            message: `Generated ${count} simulated engagement items`,
            data: simulatedData
        });

    } catch (error) {
        console.error('Error simulating engagement data:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper functions
function calculateFeedStats(data) {
    if (data.length === 0) {
        return {
            totalItems: 0,
            avgDwellTime: 0,
            engagementRate: 0,
            trendingCount: 0,
            brandedCount: 0,
            platformBreakdown: {}
        };
    }

    const totalDwellTime = data.reduce((sum, item) => sum + item.dwellTimeMs, 0);
    const withInteractions = data.filter(item => item.interactions.length > 0).length;
    const trendingCount = data.filter(item => item.isTrending).length;
    const brandedCount = data.filter(item => item.isBranded).length;

    // Platform breakdown
    const platformBreakdown = {};
    data.forEach(item => {
        if (!platformBreakdown[item.platform]) {
            platformBreakdown[item.platform] = 0;
        }
        platformBreakdown[item.platform]++;
    });

    return {
        totalItems: data.length,
        avgDwellTime: Math.round(totalDwellTime / data.length),
        engagementRate: Math.round((withInteractions / data.length) * 100),
        trendingCount,
        brandedCount,
        platformBreakdown
    };
}

function calculateDetailedStats(data) {
    const stats = calculateFeedStats(data);
    
    // Additional detailed metrics
    const avgEngagementScore = data.length > 0 ? 
        Math.round(data.reduce((sum, item) => sum + item.engagementScore, 0) / data.length) : 0;
    
    const topHashtags = {};
    data.forEach(item => {
        item.hashtags.forEach(tag => {
            topHashtags[tag] = (topHashtags[tag] || 0) + 1;
        });
    });

    const topCreators = {};
    data.forEach(item => {
        topCreators[item.creator] = (topCreators[item.creator] || 0) + 1;
    });

    return {
        ...stats,
        avgEngagementScore,
        topHashtags: Object.entries(topHashtags)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([tag, count]) => ({ tag, count })),
        topCreators: Object.entries(topCreators)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([creator, count]) => ({ creator, count }))
    };
}

function analyzeInteractionPatterns(data) {
    const interactions = data.flatMap(item => item.interactions);
    const interactionCounts = {};
    
    interactions.forEach(interaction => {
        interactionCounts[interaction] = (interactionCounts[interaction] || 0) + 1;
    });

    const dwellTimeByEngagement = {
        low: [],
        medium: [],
        high: []
    };

    data.forEach(item => {
        if (item.engagementScore < 30) {
            dwellTimeByEngagement.low.push(item.dwellTimeMs);
        } else if (item.engagementScore < 70) {
            dwellTimeByEngagement.medium.push(item.dwellTimeMs);
        } else {
            dwellTimeByEngagement.high.push(item.dwellTimeMs);
        }
    });

    return {
        interactionCounts,
        avgDwellByEngagement: {
            low: average(dwellTimeByEngagement.low),
            medium: average(dwellTimeByEngagement.medium),
            high: average(dwellTimeByEngagement.high)
        },
        interactionRate: data.length > 0 ? 
            (data.filter(item => item.interactions.length > 0).length / data.length) * 100 : 0
    };
}

function average(numbers) {
    return numbers.length > 0 ? 
        Math.round(numbers.reduce((sum, num) => sum + num, 0) / numbers.length) : 0;
}

function generateMockEngagementItem() {
    const platforms = ['instagram', 'tiktok'];
    const contentTypes = ['image', 'video', 'carousel'];
    const creators = ['pisspoorandfancy', 'google', 'beautifulkoas', 'techguru22', 'aiexplorer'];
    const captions = [
        'This AI tool just changed everything! 🤖 #AI #startup',
        'Crypto market update for beginners #crypto #investing',
        'ABLE leather tote for sale #forsale #fashion',
        'Building startup at 22 - lessons learned #entrepreneur',
        'Daily meditation changed my life ✨ #mindfulness'
    ];

    const platform = platforms[Math.floor(Math.random() * platforms.length)];
    const contentType = contentTypes[Math.floor(Math.random() * contentTypes.length)];
    const creator = creators[Math.floor(Math.random() * creators.length)];
    const caption = captions[Math.floor(Math.random() * captions.length)];

    return {
        sessionId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform,
        contentId: `${platform}_${creator}_${Date.now()}`,
        contentType,
        creatorUsername: creator,
        viewDurationMs: Math.floor(Math.random() * 15000) + 2000,
        caption,
        hashtags: caption.match(/#[a-zA-Z0-9_]+/g) || [],
        engagementMetrics: {
            likes: Math.floor(Math.random() * 50000) + 100,
            isTrending: Math.random() < 0.3
        },
        interactions: Math.random() < 0.4 ? ['liked'] : [],
        watchCompletionPercent: contentType === 'video' ? Math.random() * 100 : null
    };
}

module.exports = router;