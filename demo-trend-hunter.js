/**
 * Demo Trend Hunter
 * Quick demo showing real-time trend detection and logging
 */

require('dotenv').config();
const SupabaseLogger = require('./data-logger/supabase-logger');

class DemoTrendHunter {
  constructor() {
    this.logger = new SupabaseLogger();
  }

  async initialize() {
    console.log('🤖 DEMO: Tech-Savvy Trend Hunter Bot');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Persona: 18-24 year old tech enthusiast');
    console.log('🎯 Targeting: AI, crypto, viral content on mindmatterlife feeds');
    console.log('📊 Logging: Real-time to Supabase database');
    console.log('');
    
    await this.logger.initialize();
    console.log('✅ Connected to Supabase database\n');
  }

  async simulateTrendDiscovery() {
    console.log('👀 SIMULATING REAL-TIME TREND DISCOVERY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Simulate discovering trending content
    const mockTrends = [
      {
        platform: 'instagram',
        username: 'ai_startup_guru',
        caption: 'This AI tool just changed everything for entrepreneurs! 🤖 Game changer for productivity #AI #startup #entrepreneur',
        hashtags: ['#AI', '#startup', '#entrepreneur', '#productivity', '#viral'],
        likes: '45.2K',
        mediaType: 'video',
        isTrending: true
      },
      {
        platform: 'tiktok',
        username: 'crypto_gen_z',
        caption: 'POV: You bought crypto at 18 and now you understand money better than most adults 💰',
        hashtags: ['#crypto', '#genz', '#money', '#investing', '#viral'],
        likes: '127K',
        mediaType: 'video',
        isTrending: true
      },
      {
        platform: 'instagram',
        username: 'mindful_millennial',
        caption: 'Daily meditation changed my entire perspective on success and happiness ✨',
        hashtags: ['#mindfulness', '#meditation', '#wellness', '#growth'],
        likes: '8.3K',
        mediaType: 'image',
        isTrending: false
      },
      {
        platform: 'tiktok',
        username: 'web3_developer',
        caption: 'Building in Web3 as a 22-year-old: here\'s what I learned in my first year 🚀',
        hashtags: ['#web3', '#developer', '#blockchain', '#career', '#tech'],
        likes: '89K',
        mediaType: 'video',
        isTrending: true
      }
    ];

    for (let i = 0; i < mockTrends.length; i++) {
      const trend = mockTrends[i];
      const timestamp = new Date().toLocaleTimeString();
      
      // Log to console (what you'd see in real-time)
      const platformIcon = trend.platform === 'instagram' ? '📱' : '🎵';
      console.log(`${platformIcon} [${timestamp}] @${trend.username}`);
      console.log(`   💬 "${trend.caption}"`);
      console.log(`   💯 ${trend.likes} likes | #️⃣ ${trend.hashtags.length} hashtags`);
      console.log(`   🏷️ Tags: ${trend.hashtags.join(' ')}`);
      
      if (trend.isTrending) {
        console.log(`   🔥 TRENDING DETECTED! High engagement + viral hashtags`);
      }
      
      console.log('   ─────────────────────────────────────────────────────────');
      
      // Save to Supabase (real data logging)
      try {
        const impressionData = {
          sessionId: require('uuid').v4(),
          platform: trend.platform,
          contentId: `${trend.platform}_${trend.username}_${Date.now()}`,
          contentType: trend.mediaType,
          creatorUsername: trend.username,
          viewDurationMs: Math.floor(3000 + Math.random() * 2000),
          caption: trend.caption,
          hashtags: trend.hashtags,
          engagementMetrics: {
            likes: this.parseNumber(trend.likes),
            isTrending: trend.isTrending,
            engagementRate: Math.random() * 0.15 + 0.05
          }
        };

        await this.logger.saveImpression(impressionData);
        console.log(`   💾 Saved to database`);

        // Create alert for trending content
        if (trend.isTrending) {
          await this.logger.createAlert({
            alertType: 'trending_content',
            severity: 'medium',
            alertData: {
              platform: trend.platform,
              creator: trend.username,
              content: trend.caption.substring(0, 100),
              metrics: impressionData.engagementMetrics
            }
          });
          console.log(`   🚨 Alert created for trending content`);
        }

      } catch (error) {
        console.log(`   ❌ Error saving: ${error.message}`);
      }

      console.log('');
      
      // Pause between discoveries
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  parseNumber(str) {
    if (!str) return 0;
    const numStr = str.replace(/[^\d.kmb]/gi, '');
    const multiplier = str.toLowerCase().includes('k') ? 1000 : 
                     str.toLowerCase().includes('m') ? 1000000 : 1;
    return parseFloat(numStr) * multiplier || 0;
  }

  async showResults() {
    console.log('📊 GENERATING TREND REPORT:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    try {
      const report = await this.logger.generateTrendReport({ 
        timeRange: '1h' 
      });
      
      console.log(`📈 SUMMARY:`);
      console.log(`   Total Content Analyzed: ${report.totalImpressions}`);
      console.log(`   Trending Items Found: ${report.viralContent.length}`);
      console.log(`   Platforms Monitored: ${Object.keys(report.platforms).length}`);
      console.log('');
      
      if (report.viralContent.length > 0) {
        console.log('🔥 VIRAL CONTENT DISCOVERED:');
        report.viralContent.forEach((content, i) => {
          const icon = content.platform === 'instagram' ? '📱' : '🎵';
          console.log(`   ${i+1}. ${icon} @${content.creator} (Score: ${content.viralityScore})`);
        });
        console.log('');
      }
      
      if (report.trendingHashtags.length > 0) {
        console.log('🏷️ TOP HASHTAGS:');
        report.trendingHashtags.slice(0, 5).forEach((tag, i) => {
          console.log(`   ${i+1}. ${tag.hashtag} (${tag.count} mentions)`);
        });
        console.log('');
      }
      
      console.log('🎯 NEXT STEPS:');
      console.log('   • Check your dashboard for detailed analytics');
      console.log('   • Run "node run-tech-savvy-bot.js" for live monitoring');
      console.log('   • Data is now flowing to your Supabase database');
      
    } catch (error) {
      console.error('❌ Error generating report:', error.message);
    }
  }
}

async function runDemo() {
  const hunter = new DemoTrendHunter();
  
  try {
    await hunter.initialize();
    await hunter.simulateTrendDiscovery();
    await hunter.showResults();
    
    console.log('\n✅ DEMO COMPLETE! Your tech-savvy bot system is ready.');
    
  } catch (error) {
    console.error('❌ Demo error:', error.message);
  }
}

runDemo().catch(console.error);