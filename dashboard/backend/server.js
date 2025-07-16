/**
 * WaveSight Bot Backend Server
 * Handles real Instagram and TikTok automation
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Import bot controllers
const InstagramBot = require('./bots/instagram-bot');
const TikTokBot = require('./bots/tiktok-bot');
const BotSessionManager = require('./services/bot-session-manager');

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

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY // Use service key for backend operations
);

// Bot session manager
const sessionManager = new BotSessionManager(supabase, io);

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('start-bot', async (data) => {
    const { platform, profileType, duration } = data;
    
    try {
      // Create bot session
      const session = await sessionManager.createSession({
        platform,
        profileType,
        duration,
        socketId: socket.id
      });

      // Start appropriate bot
      let bot;
      if (platform === 'instagram') {
        bot = new InstagramBot(session, supabase, socket);
      } else if (platform === 'tiktok') {
        bot = new TikTokBot(session, supabase, socket);
      }

      // Start bot session
      await bot.start();
      
      socket.emit('bot-started', { sessionId: session.id });
    } catch (error) {
      console.error('Error starting bot:', error);
      socket.emit('bot-error', { error: error.message });
    }
  });

  socket.on('stop-bot', async (data) => {
    const { sessionId } = data;
    
    try {
      await sessionManager.stopSession(sessionId);
      socket.emit('bot-stopped', { sessionId });
    } catch (error) {
      console.error('Error stopping bot:', error);
      socket.emit('bot-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    // Clean up any active sessions for this socket
    sessionManager.cleanupSocketSessions(socket.id);
  });
});

// REST API endpoints

// Get bot sessions
app.get('/api/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bot_sessions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get discovered content
app.get('/api/content', async (req, res) => {
  const { platform, timeRange = '24h', viral = false } = req.query;
  
  try {
    let query = supabase
      .from('discovered_content')
      .select('*');

    if (platform) {
      query = query.eq('platform', platform);
    }

    if (viral === 'true') {
      query = query.eq('is_viral', true);
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
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get trending analysis
app.get('/api/trends', async (req, res) => {
  const { platform, timeRange = '24h' } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('detected_trends')
      .select('*')
      .eq('platform', platform || 'all')
      .order('viral_score', { ascending: false })
      .limit(20);

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get aggregated stats
app.get('/api/stats', async (req, res) => {
  const { platform, timeRange = '24h' } = req.query;
  
  try {
    // Get content stats
    const { data: contentStats, error: contentError } = await supabase
      .from('content_stats')
      .select('*')
      .order('date', { ascending: false })
      .limit(30);

    if (contentError) throw contentError;

    // Get trending hashtags
    const { data: trendingHashtags, error: hashtagError } = await supabase
      .from('trending_hashtags')
      .select('*')
      .order('usage_count', { ascending: false })
      .limit(10);

    if (hashtagError) throw hashtagError;

    res.json({ 
      success: true, 
      data: {
        contentStats,
        trendingHashtags
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WaveSight Bot Backend running on port ${PORT}`);
});