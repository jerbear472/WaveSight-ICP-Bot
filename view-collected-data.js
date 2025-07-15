/**
 * Data Viewer
 * Shows what the bots have collected in real-time
 */

require('dotenv').config();
const SupabaseLogger = require('./data-logger/supabase-logger');

async function viewData() {
  console.log('📊 VIEWING COLLECTED TREND DATA');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const logger = new SupabaseLogger();
  
  try {
    await logger.initialize();
    
    // Get trend report for last hour
    const report = await logger.generateTrendReport({ 
      timeRange: '1h' 
    });
    
    console.log(`📈 TREND SUMMARY (Last Hour):`);
    console.log(`   Total Impressions: ${report.totalImpressions}`);
    console.log(`   Total Engagements: ${report.totalEngagements}`);
    console.log(`   Platforms: ${Object.keys(report.platforms).join(', ')}`);
    console.log('');
    
    // Show platform breakdown
    console.log('📱 PLATFORM BREAKDOWN:');
    Object.entries(report.platforms).forEach(([platform, data]) => {
      const icon = platform === 'instagram' ? '📱' : '🎵';
      console.log(`   ${icon} ${platform}: ${data.impressions} impressions, ${data.engagements} engagements`);
    });
    console.log('');
    
    // Show top creators
    if (report.topCreators.length > 0) {
      console.log('⭐ TOP CREATORS DISCOVERED:');
      report.topCreators.slice(0, 5).forEach((creator, i) => {
        console.log(`   ${i+1}. @${creator.username} - ${creator.impressions} impressions`);
      });
      console.log('');
    }
    
    // Show trending hashtags
    if (report.trendingHashtags.length > 0) {
      console.log('🏷️ TRENDING HASHTAGS:');
      report.trendingHashtags.slice(0, 10).forEach((tag, i) => {
        console.log(`   ${i+1}. ${tag.hashtag} (${tag.count} mentions)`);
      });
      console.log('');
    }
    
    // Show viral content
    if (report.viralContent.length > 0) {
      console.log('🔥 VIRAL CONTENT DETECTED:');
      report.viralContent.slice(0, 3).forEach((content, i) => {
        const icon = content.platform === 'instagram' ? '📱' : '🎵';
        console.log(`   ${i+1}. ${icon} @${content.creator} - Score: ${content.viralityScore}`);
        console.log(`      "${content.caption?.substring(0, 60)}..."`);
      });
      console.log('');
    }
    
    console.log('💡 TIP: Run the bots with "node run-tech-savvy-bot.js" to collect more data!');
    console.log('🌐 View full analytics on your dashboard');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('relation') || error.message.includes('does not exist')) {
      console.log('\n💡 Database tables not found. Please run the Supabase schema first:');
      console.log('   1. Go to your Supabase dashboard');
      console.log('   2. Run the SQL in config/supabase-schema.sql');
      console.log('   3. Then run the bots again');
    }
  }
}

viewData().catch(console.error);