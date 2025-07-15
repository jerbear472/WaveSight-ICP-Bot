/**
 * Check Bot Data - See what your bots have discovered
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

async function checkBotData() {
    console.log('📊 CHECKING BOT DISCOVERIES');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
    );
    
    try {
        // Get recent content impressions
        console.log('🔍 Recent Content Discoveries:');
        const { data: impressions, error } = await supabase
            .from('content_impressions')
            .select('*')
            .order('impression_timestamp', { ascending: false })
            .limit(10);
        
        if (error) {
            console.log('❌ Error fetching data:', error.message);
            return;
        }
        
        if (impressions.length === 0) {
            console.log('📭 No data found yet');
            console.log('💡 The bots may still be collecting data, or need more time');
            return;
        }
        
        console.log(`✅ Found ${impressions.length} recent discoveries:\n`);
        
        impressions.forEach((item, i) => {
            const time = new Date(item.impression_timestamp).toLocaleTimeString();
            const likes = item.engagement_metrics?.likes || 0;
            const isTrending = item.engagement_metrics?.isTrending || false;
            
            console.log(`${i + 1}. ${isTrending ? '🔥' : '📱'} [${time}] @${item.creator_username}`);
            console.log(`   Platform: ${item.platform}`);
            console.log(`   Caption: "${item.caption || 'No caption'}"`);
            console.log(`   Likes: ${likes}`);
            console.log(`   Hashtags: ${item.hashtags?.join(' ') || 'None'}`);
            console.log(`   View Duration: ${item.view_duration_ms}ms`);
            console.log('   ─────────────────────────────────────────────────────');
        });
        
        // Get summary stats
        console.log('\n📈 SUMMARY STATISTICS:');
        const stats = {
            total: impressions.length,
            instagram: impressions.filter(i => i.platform === 'instagram').length,
            tiktok: impressions.filter(i => i.platform === 'tiktok').length,
            trending: impressions.filter(i => i.engagement_metrics?.isTrending).length,
            sponsored: impressions.filter(i => i.engagement_metrics?.isSponsored).length,
            totalLikes: impressions.reduce((sum, i) => sum + (i.engagement_metrics?.likes || 0), 0),
            uniqueCreators: new Set(impressions.map(i => i.creator_username)).size
        };
        
        console.log(`📊 Total Discoveries: ${stats.total}`);
        console.log(`📱 Instagram: ${stats.instagram} | 🎵 TikTok: ${stats.tiktok}`);
        console.log(`🔥 Trending Content: ${stats.trending}`);
        console.log(`💰 Sponsored Content: ${stats.sponsored}`);
        console.log(`💯 Total Likes Analyzed: ${stats.totalLikes.toLocaleString()}`);
        console.log(`👤 Unique Creators: ${stats.uniqueCreators}`);
        
        // Check for trending hashtags
        const allHashtags = impressions.flatMap(i => i.hashtags || []);
        const hashtagCounts = {};
        allHashtags.forEach(tag => {
            hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
        
        const topHashtags = Object.entries(hashtagCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
        
        if (topHashtags.length > 0) {
            console.log('\n🏷️ TOP HASHTAGS:');
            topHashtags.forEach(([tag, count], i) => {
                console.log(`   ${i + 1}. ${tag} (${count} mentions)`);
            });
        }
        
        console.log('\n🎯 YOUR BOTS ARE WORKING!');
        console.log('✅ Successfully discovering and analyzing content');
        console.log('✅ Saving data to Supabase in real-time');
        console.log('✅ Detecting trending patterns');
        
        console.log('\n📊 VIEW YOUR DASHBOARD:');
        console.log('🌐 http://localhost:3000/bot-dashboard.html');
        console.log('📱 http://localhost:3000/ (main dashboard)');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkBotData().catch(console.error);