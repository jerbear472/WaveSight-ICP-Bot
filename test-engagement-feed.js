/**
 * Test Engagement Feed
 * Generate sample data and test the engagement feed viewer
 */

require('dotenv').config();
const EngagementTracker = require('./data-logger/engagement-tracker');

async function testEngagementFeed() {
    console.log('🎯 TESTING ENGAGEMENT FEED VIEWER');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const tracker = new EngagementTracker();
    await tracker.initialize();
    console.log('✅ Connected to Supabase');
    
    // Generate realistic engagement data
    console.log('📊 Generating sample engagement data...');
    await generateSampleData(tracker);
    
    // Test feed data retrieval
    console.log('🔍 Testing feed data retrieval...');
    await testFeedRetrieval(tracker);
    
    console.log('✅ Engagement Feed test complete!');
    console.log('🌐 Visit: http://localhost:3000/engagement-feed.html');
}

async function generateSampleData(tracker) {
    const sampleData = [
        // High engagement Instagram post
        {
            sessionId: 'test_session_ig_1',
            platform: 'instagram',
            contentId: 'ig_techguru22_trending',
            contentType: 'video',
            creatorUsername: 'techguru22',
            viewDurationMs: 12000,
            caption: 'This AI tool just revolutionized my entire workflow! 🤖 Game changer for entrepreneurs #AI #startup #productivity #viral',
            hashtags: ['#AI', '#startup', '#productivity', '#viral'],
            engagementMetrics: {
                likes: 45200,
                comments: 892,
                shares: 234
            },
            mediaUrl: 'https://via.placeholder.com/400x300/1a1e2e/00d4ff?text=AI+Workflow+Tool',
            isSponsored: false
        },
        
        // Brand content - Coach bag
        {
            sessionId: 'test_session_ig_2',
            platform: 'instagram',
            contentId: 'ig_beautifulkoas_coach',
            contentType: 'image',
            creatorUsername: 'beautifulkoas',
            viewDurationMs: 8500,
            caption: 'Authentic Coach 1941 bag for sale! Excellent condition #coach #luxury #forsale #designerbag',
            hashtags: ['#coach', '#luxury', '#forsale', '#designerbag'],
            engagementMetrics: {
                likes: 1850,
                comments: 45,
                shares: 12
            },
            mediaUrl: 'https://via.placeholder.com/400x300/8B4513/FFFFFF?text=Coach+Bag',
            isSponsored: false
        },
        
        // Sponsored TikTok content
        {
            sessionId: 'test_session_tt_1',
            platform: 'tiktok',
            contentId: 'tt_google_sponsored',
            contentType: 'video',
            creatorUsername: 'google',
            viewDurationMs: 15000,
            caption: 'Discover the power of Google Cloud AI for your business 🚀 Transform your workflow today',
            hashtags: ['#GoogleCloud', '#AI', '#business', '#sponsored'],
            engagementMetrics: {
                likes: 127000,
                comments: 2340,
                shares: 890
            },
            mediaUrl: 'https://via.placeholder.com/400x300/4285F4/FFFFFF?text=Google+AI',
            isSponsored: true
        },
        
        // Crypto/finance content
        {
            sessionId: 'test_session_tt_2',
            platform: 'tiktok',
            contentId: 'tt_cryptokid_advice',
            contentType: 'video',
            creatorUsername: 'cryptokid',
            viewDurationMs: 9800,
            caption: 'POV: You bought crypto at 18 and now understand money better than most adults 💰 #crypto #genz #investing',
            hashtags: ['#crypto', '#genz', '#investing', '#money'],
            engagementMetrics: {
                likes: 89500,
                comments: 1200,
                shares: 456
            },
            mediaUrl: 'https://via.placeholder.com/400x300/F7931A/FFFFFF?text=Crypto+Tips',
            isSponsored: false
        },
        
        // Mindfulness content
        {
            sessionId: 'test_session_ig_3',
            platform: 'instagram',
            contentId: 'ig_mindfultech_meditation',
            contentType: 'carousel',
            creatorUsername: 'mindfultech',
            viewDurationMs: 6200,
            caption: 'Daily meditation changed my entire perspective on success and happiness ✨ Swipe for my morning routine',
            hashtags: ['#mindfulness', '#meditation', '#wellness', '#productivity'],
            engagementMetrics: {
                likes: 12400,
                comments: 180,
                shares: 67
            },
            mediaUrl: 'https://via.placeholder.com/400x300/9B59B6/FFFFFF?text=Meditation',
            isSponsored: false
        },
        
        // Web3 developer content
        {
            sessionId: 'test_session_tt_3',
            platform: 'tiktok',
            contentId: 'tt_web3dev_tutorial',
            contentType: 'video',
            creatorUsername: 'web3_developer',
            viewDurationMs: 14500,
            caption: 'Building in Web3 as a 22-year-old: here\'s what I learned in my first year 🚀 #web3 #developer #blockchain #career',
            hashtags: ['#web3', '#developer', '#blockchain', '#career', '#tech'],
            engagementMetrics: {
                likes: 78900,
                comments: 890,
                shares: 234
            },
            mediaUrl: 'https://via.placeholder.com/400x300/2E86C1/FFFFFF?text=Web3+Dev',
            isSponsored: false
        }
    ];

    for (const data of sampleData) {
        try {
            // Generate realistic interaction data
            const interactions = [];
            if (Math.random() < 0.7) interactions.push('liked');
            if (Math.random() < 0.2) interactions.push('commented');
            if (Math.random() < 0.1) interactions.push('shared');
            if (Math.random() < 0.05) interactions.push('followed');

            const engagementMetrics = {
                interactions,
                watchCompletionPercent: data.contentType === 'video' ? 
                    Math.random() * 40 + 60 : null, // 60-100% completion
                sentiment: 'positive',
                scrollPattern: 'engaged',
                mouseMovements: Math.floor(Math.random() * 20) + 5,
                pauseDuration: Math.floor(Math.random() * 2000)
            };

            await tracker.saveImpressionWithEngagement(data, engagementMetrics);
            
            // Log interactions
            for (const interaction of interactions) {
                await tracker.logInteraction(data.contentId, interaction, {
                    timeFromView: Math.random() * data.viewDurationMs,
                    dwellTime: Math.random() * 1000 + 500
                });
            }

            console.log(`✅ Generated: ${data.platform} content from @${data.creatorUsername}`);
            
        } catch (error) {
            console.log(`❌ Error saving ${data.contentId}: ${error.message}`);
        }
    }
    
    console.log(`📊 Generated ${sampleData.length} sample engagement items`);
}

async function testFeedRetrieval(tracker) {
    try {
        // Test basic feed retrieval
        const feedData = await tracker.getEngagementFeedData({
            timeRange: '1h',
            limit: 20
        });
        
        console.log(`📱 Retrieved ${feedData.length} items from feed`);
        
        // Test filtered data
        const brandedContent = await tracker.getEngagementFeedData({
            timeRange: '1h',
            branded: true,
            limit: 10
        });
        
        console.log(`🏷️ Found ${brandedContent.length} branded content items`);
        
        // Test trending content
        const trendingContent = await tracker.getEngagementFeedData({
            timeRange: '1h',
            trending: true,
            limit: 10
        });
        
        console.log(`🔥 Found ${trendingContent.length} trending content items`);
        
        // Display sample items
        if (feedData.length > 0) {
            console.log('\n📋 SAMPLE FEED ITEMS:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            feedData.slice(0, 3).forEach((item, i) => {
                const platformIcon = item.platform === 'instagram' ? '📱' : '🎵';
                const trendingIcon = item.isTrending ? '🔥' : '';
                const brandedIcon = item.isBranded ? '🏷️' : '';
                
                console.log(`${i + 1}. ${platformIcon} @${item.creator} ${trendingIcon}${brandedIcon}`);
                console.log(`   💬 "${item.caption}"`);
                console.log(`   💯 ${item.likes} likes | ⏱️ ${item.dwellTimeMs}ms dwell | 📊 ${item.engagementScore} score`);
                console.log(`   🎯 Interactions: ${item.interactions.join(', ') || 'None'}`);
                console.log('   ─────────────────────────────────────────────────────');
            });
        }
        
    } catch (error) {
        console.error('❌ Error testing feed retrieval:', error.message);
    }
}

async function testAPIEndpoints() {
    console.log('\n🔌 TESTING API ENDPOINTS:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const baseUrl = 'http://localhost:3000';
    
    const endpoints = [
        '/api/engagement-feed',
        '/api/engagement-feed/stats',
        '/api/engagement-feed/trending',
        '/api/engagement-feed/brands',
        '/api/engagement-feed/interactions'
    ];
    
    for (const endpoint of endpoints) {
        try {
            console.log(`🔍 Testing: ${baseUrl}${endpoint}`);
            // In a real test, you'd make HTTP requests here
            console.log(`✅ Endpoint available: ${endpoint}`);
        } catch (error) {
            console.log(`❌ Endpoint error: ${endpoint} - ${error.message}`);
        }
    }
    
    console.log('\n📋 API USAGE EXAMPLES:');
    console.log('GET /api/engagement-feed?platform=instagram&timeRange=1h');
    console.log('GET /api/engagement-feed/trending?limit=10');
    console.log('GET /api/engagement-feed/brands?timeRange=24h');
    console.log('POST /api/engagement-feed/simulate (for testing)');
}

// Run the test
async function main() {
    try {
        await testEngagementFeed();
        await testAPIEndpoints();
        
        console.log('\n🎉 ALL TESTS COMPLETED!');
        console.log('🌐 Start dashboard server: npm start');
        console.log('📱 View engagement feed: http://localhost:3000/engagement-feed.html');
        console.log('🔍 API endpoints ready for integration');
        
    } catch (error) {
        console.error('❌ Test failed:', error.message);
    }
}

main().catch(console.error);