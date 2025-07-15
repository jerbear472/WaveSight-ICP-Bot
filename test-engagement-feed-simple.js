/**
 * Simple Engagement Feed Test
 * Use existing working bot data and enhance with engagement metrics
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function testSimpleEngagementFeed() {
    console.log('🎯 SIMPLE ENGAGEMENT FEED TEST');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    
    // Add some enhanced engagement data to existing records
    console.log('📊 Enhancing existing data with engagement metrics...');
    
    try {
        // Get existing content impressions
        const { data: existingData, error } = await supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(5);
        
        if (error) {
            console.log('❌ Error fetching existing data:', error.message);
            return;
        }
        
        console.log(`📱 Found ${existingData.length} existing records`);
        
        // Enhance each record with engagement metrics
        for (const record of existingData) {
            // Generate realistic engagement metrics
            const enhancedMetrics = {
                ...record.engagement_metrics,
                
                // Dwell time analysis
                dwellTimeMs: record.view_duration_ms || 5000,
                dwellTimeCategory: categorizeDwellTime(record.view_duration_ms),
                
                // Interaction simulation
                interactions: generateInteractions(),
                interactionCount: Math.floor(Math.random() * 3),
                
                // Brand detection
                isBranded: detectBrandContent(record.caption, record.creator_username),
                detectedBrands: extractBrands(record.caption, record.creator_username),
                
                // Trend analysis
                isTrending: detectTrendingContent(record),
                viralityScore: calculateViralityScore(record),
                
                // Engagement score
                engagementScore: calculateEngagementScore(record),
                
                // Content analysis
                contentSentiment: 'positive',
                hasCall2Action: detectCallToAction(record.caption),
                
                // Timing data
                timeOfDay: new Date().getHours(),
                dayOfWeek: new Date().getDay()
            };
            
            // Update the record
            const { error: updateError } = await supabase
                .from('content_impressions')
                .update({ engagement_metrics: enhancedMetrics })
                .eq('id', record.id);
            
            if (updateError) {
                console.log(`❌ Error updating ${record.id}: ${updateError.message}`);
            } else {
                console.log(`✅ Enhanced @${record.creator_username} (Score: ${enhancedMetrics.engagementScore})`);
            }
        }
        
        // Test the engagement feed API simulation
        console.log('\n📊 Testing API data format...');
        await testAPIDataFormat(supabase);
        
        console.log('\n✅ Simple engagement feed test complete!');
        console.log('🌐 Start server: cd dashboard && npm start');
        console.log('📱 View feed: http://localhost:3000/engagement-feed.html');
        
    } catch (error) {
        console.error('❌ Test error:', error.message);
    }
}

async function testAPIDataFormat(supabase) {
    try {
        // Get enhanced data in API format
        const { data, error } = await supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(10);
        
        if (error) {
            console.log('❌ Error fetching API data:', error.message);
            return;
        }
        
        // Transform to engagement feed format
        const feedItems = data.map(item => ({
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
            interactions: item.engagement_metrics?.interactions || [],
            
            // Classification
            isTrending: item.engagement_metrics?.isTrending || false,
            isBranded: item.engagement_metrics?.isBranded || false,
            isSponsored: item.is_sponsored || false,
            
            // Calculated metrics
            engagementScore: item.engagement_metrics?.engagementScore || 0,
            viralityScore: item.engagement_metrics?.viralityScore || 0,
            
            // Media info
            mediaUrl: `https://via.placeholder.com/400x300/1a1e2e/00d4ff?text=${item.platform}+content`,
            thumbnailUrl: `https://via.placeholder.com/80x80/1a1e2e/00d4ff?text=${item.platform.charAt(0).toUpperCase()}`,
            
            // Additional data
            scrollDepth: item.scroll_depth || 0,
            detectedBrands: item.engagement_metrics?.detectedBrands || []
        }));
        
        console.log(`📊 Transformed ${feedItems.length} items for API format`);
        
        if (feedItems.length > 0) {
            console.log('\n📋 SAMPLE API DATA:');
            const sample = feedItems[0];
            console.log(`{`);
            console.log(`  "id": "${sample.id}",`);
            console.log(`  "platform": "${sample.platform}",`);
            console.log(`  "creator": "${sample.creator}",`);
            console.log(`  "caption": "${sample.caption}",`);
            console.log(`  "likes": ${sample.likes},`);
            console.log(`  "dwellTimeMs": ${sample.dwellTimeMs},`);
            console.log(`  "engagementScore": ${sample.engagementScore},`);
            console.log(`  "isTrending": ${sample.isTrending},`);
            console.log(`  "isBranded": ${sample.isBranded}`);
            console.log(`}`);
        }
        
    } catch (error) {
        console.log('❌ API format test error:', error.message);
    }
}

// Helper functions
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
    
    // High engagement threshold
    if (likes > 10000) return true;
    
    // Viral hashtags
    const viralTags = ['#viral', '#trending', '#fyp', '#foryou'];
    if (hashtags.some(tag => viralTags.includes(tag.toLowerCase()))) return true;
    
    // High dwell time
    if (record.view_duration_ms > 10000) return true;
    
    return Math.random() < 0.3; // 30% chance for demo
}

function calculateViralityScore(record) {
    let score = 0;
    
    // Likes contribution
    const likes = record.engagement_metrics?.likes || 0;
    score += Math.min(likes / 1000, 40);
    
    // Dwell time contribution
    const dwellTime = record.view_duration_ms || 0;
    score += Math.min(dwellTime / 1000, 30);
    
    // Hashtag contribution
    const hashtags = record.hashtags || [];
    score += Math.min(hashtags.length * 5, 20);
    
    // Random component for demo
    score += Math.random() * 10;
    
    return Math.round(Math.min(score, 100));
}

function calculateEngagementScore(record) {
    let score = 0;
    
    // Base engagement from likes
    const likes = record.engagement_metrics?.likes || 0;
    score += Math.min(likes / 1000, 30);
    
    // Dwell time score
    const dwellTime = record.view_duration_ms || 0;
    score += Math.min(dwellTime / 200, 25);
    
    // Caption length (more content = higher engagement potential)
    const caption = record.caption || '';
    score += Math.min(caption.length / 10, 15);
    
    // Hashtag bonus
    const hashtags = record.hashtags || [];
    score += Math.min(hashtags.length * 3, 15);
    
    // Random component for variety
    score += Math.random() * 15;
    
    return Math.round(Math.min(score, 100));
}

function detectCallToAction(caption) {
    const cta_keywords = ['follow', 'like', 'subscribe', 'comment', 'share', 'buy', 'shop', 'link in bio'];
    const text = (caption || '').toLowerCase();
    return cta_keywords.some(keyword => text.includes(keyword));
}

testSimpleEngagementFeed().catch(console.error);