/**
 * Minimal ICPScope Server for Render Deployment
 * This version removes heavy dependencies to ensure fast deployment
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const port = process.env.PORT || process.env.DASHBOARD_PORT || 3000;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dashboard/public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Mock data endpoints for demo
app.get('/api/dashboard-data', async (req, res) => {
  try {
    // Mock data for demonstration
    const mockData = {
      timestamp: new Date().toISOString(),
      timeRange: req.query.timeRange || '24h',
      summary: {
        totalImpressions: 12543,
        totalEngagements: 1876,
        viralContentCount: 23,
        breakoutCreatorsCount: 8,
        anomaliesCount: 2
      },
      trends: {
        totalImpressions: 12543,
        totalEngagements: 1876,
        platforms: {
          instagram: {
            impressions: 7832,
            engagements: 1234,
            avgViewDuration: 8500
          },
          tiktok: {
            impressions: 4711,
            engagements: 642,
            avgViewDuration: 12300
          }
        }
      },
      viralContent: [
        {
          contentId: 'post_12345',
          platform: 'instagram',
          creator: 'techinfluencer',
          caption: 'Amazing new AI breakthrough that will change everything! 🤖',
          metrics: { likes: 45000, comments: 2300, shares: 1200 },
          viralityScore: 87.5
        },
        {
          contentId: 'video_67890',
          platform: 'tiktok',
          creator: 'cryptoguru',
          caption: 'This crypto trend is about to explode! 💰',
          metrics: { likes: 125000, comments: 8900, shares: 5600 },
          viralityScore: 92.1
        }
      ],
      breakoutCreators: [
        {
          username: 'newtech_reviewer',
          platform: 'instagram',
          growthRate: 45.2,
          engagementRate: 12.8,
          momentum: 'high'
        },
        {
          username: 'ai_startup_insider',
          platform: 'tiktok',
          growthRate: 67.9,
          engagementRate: 15.3,
          momentum: 'explosive'
        }
      ],
      hashtags: [
        { hashtag: '#AI', count: 5670, trendingScore: 89.2 },
        { hashtag: '#crypto', count: 4532, trendingScore: 78.5 },
        { hashtag: '#tech', count: 3890, trendingScore: 72.1 }
      ],
      anomalies: [
        {
          type: 'engagement_spike',
          severity: 'high',
          description: 'Unusual engagement spike detected in AI content',
          timestamp: new Date().toISOString()
        }
      ],
      icpBehavior: {
        genZTech: {
          avgSessionDuration: 8.5,
          topInterests: ['AI', 'crypto', 'gaming'],
          engagementRate: 12.4
        }
      }
    };

    res.json(mockData);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bot control endpoint
app.post('/api/bot/start', async (req, res) => {
  try {
    const { profileType, platform, duration } = req.body;
    
    res.json({
      sessionId: 'demo-session-' + Date.now(),
      message: `Demo bot session started for ${profileType} on ${platform}`,
      status: 'running'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Serve main dashboard
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/index.html'));
});

// Error handling
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
app.listen(port, () => {
  console.log(`🚀 ICPScope Dashboard running on port ${port}`);
  console.log(`📱 Visit your dashboard at: http://localhost:${port}`);
});

module.exports = app;