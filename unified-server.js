/**
 * Unified WaveSight Server
 * Runs both frontend dashboard and bot backend together
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { Server } = require('socket.io');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Import bot controllers
const InstagramBot = require('./dashboard/backend/bots/instagram-bot');
const TikTokBot = require('./dashboard/backend/bots/tiktok-bot');
const BotSessionManager = require('./dashboard/backend/services/bot-session-manager');

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from dashboard
app.use(express.static(path.join(__dirname, 'dashboard/public')));

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

// Bot session manager
const sessionManager = new BotSessionManager(supabase, io);

// Active bot sessions
const activeSessions = new Map();

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('✅ Client connected:', socket.id);

  socket.on('start-bot', async (data) => {
    console.log('🚀 Starting bot:', data);
    const { platform, profileType, duration, browser } = data;
    
    try {
      // Generate session ID
      const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Create session object
      const session = {
        id: sessionId,
        session_id: sessionId,
        socketId: socket.id,
        platform,
        profileType: profileType || 'gen-z-tech-enthusiast',
        duration: duration || 300000, // 5 minutes default
        browser: browser || 'chrome',
        startTime: Date.now()
      };

      // Create bot instance
      let bot;
      if (platform === 'instagram') {
        bot = new InstagramBot(session, supabase, socket);
      } else if (platform === 'tiktok') {
        bot = new TikTokBot(session, supabase, socket);
      } else {
        throw new Error('Invalid platform');
      }

      // Store session
      activeSessions.set(sessionId, { session, bot });

      // Emit bot started event
      socket.emit('bot-started', {
        sessionId,
        platform,
        status: 'starting'
      });

      // Start the bot
      await bot.start();
      
    } catch (error) {
      console.error('❌ Error starting bot:', error);
      socket.emit('bot-error', {
        platform,
        error: error.message,
        message: error.message
      });
    }
  });

  socket.on('stop-bot', async (data) => {
    console.log('🛑 Stopping bot:', data);
    const { sessionId, platform } = data;
    
    try {
      const sessionData = activeSessions.get(sessionId);
      if (sessionData && sessionData.bot) {
        await sessionData.bot.stop();
        activeSessions.delete(sessionId);
        
        socket.emit('bot-stopped', {
          sessionId,
          platform
        });
      }
    } catch (error) {
      console.error('Error stopping bot:', error);
      socket.emit('bot-error', {
        error: error.message,
        platform
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('❌ Client disconnected:', socket.id);
    // Clean up any active sessions for this socket
    for (const [sessionId, sessionData] of activeSessions.entries()) {
      if (sessionData.session.socketId === socket.id) {
        sessionData.bot.stop().catch(console.error);
        activeSessions.delete(sessionId);
      }
    }
  });
});

// REST API endpoints

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'WaveSight Unified Server',
    timestamp: new Date().toISOString(),
    activeSessions: activeSessions.size
  });
});

// API endpoints for dashboard data
app.get('/api/dashboard-data', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;
    
    // Mock data structure that matches what the dashboard expects
    const dashboardData = {
      timestamp: new Date().toISOString(),
      timeRange,
      summary: {
        totalImpressions: 0,
        totalEngagements: 0,
        viralContentCount: 0,
        breakoutCreatorsCount: 0,
        anomaliesCount: 0
      },
      trends: {
        totalImpressions: 0,
        totalEngagements: 0,
        platforms: {
          instagram: {
            impressions: 0,
            engagements: 0,
            avgViewDuration: 0,
            status: 'ready',
            account: process.env.INSTAGRAM_USERNAME || 'Not configured'
          },
          tiktok: {
            impressions: 0,
            engagements: 0,
            avgViewDuration: 0,
            status: 'ready',
            account: process.env.TIKTOK_USERNAME || 'Not configured'
          }
        }
      },
      viralContent: [],
      breakoutCreators: [],
      hashtags: [],
      anomalies: [],
      icpBehavior: {}
    };

    // If we have Supabase configured, fetch real data
    if (supabase) {
      try {
        // Get recent sessions
        const { data: sessions } = await supabase
          .from('bot_sessions')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        if (sessions && sessions.length > 0) {
          // Calculate totals from sessions
          sessions.forEach(session => {
            dashboardData.summary.totalImpressions += session.content_viewed || 0;
            dashboardData.summary.totalEngagements += session.engagements || 0;
            
            if (session.platform === 'instagram') {
              dashboardData.trends.platforms.instagram.impressions += session.content_viewed || 0;
              dashboardData.trends.platforms.instagram.engagements += session.engagements || 0;
            } else if (session.platform === 'tiktok') {
              dashboardData.trends.platforms.tiktok.impressions += session.content_viewed || 0;
              dashboardData.trends.platforms.tiktok.engagements += session.engagements || 0;
            }
          });
        }

        // Get viral content
        const { data: viralContent } = await supabase
          .from('discovered_content')
          .select('*')
          .eq('is_viral', true)
          .order('engagement_rate', { ascending: false })
          .limit(5);

        if (viralContent) {
          dashboardData.viralContent = viralContent.map(content => ({
            contentId: content.content_id,
            platform: content.platform,
            creator: content.creator_username,
            caption: content.caption,
            metrics: {
              likes: content.likes,
              comments: content.comments,
              shares: content.shares
            },
            viralityScore: content.engagement_rate
          }));
          dashboardData.summary.viralContentCount = viralContent.length;
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      }
    }

    res.json(dashboardData);
  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Serve the dashboard HTML
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/dashboard-simple.html'));
});

// Fallback to dashboard for any other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard/public/dashboard-simple.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`
🚀 WaveSight Unified Server running on port ${PORT}
📱 Dashboard: http://localhost:${PORT}
🤖 Bot Backend: WebSocket on same port
✅ Ready to start bot sessions!
  `);
});